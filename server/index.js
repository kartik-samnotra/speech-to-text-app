// server/index.js - Full-Stack Transcription Server
require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');

// Import the Mongoose model
const Transcription = require('./models/Transcription'); 

const app = express();
const port = process.env.PORT || 5000;

// --- Middleware Setup ---
// Configure CORS to allow the React client (default Vite port 5173) to connect
app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json());

// Set up MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Multer storage: Files are saved temporarily in the 'uploads/' folder before transcription
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// --- API Route: Transcribe Audio ---
app.post('/api/transcribe', upload.single('audioFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ success: false, error: 'No audio file uploaded.' });
    }

    const audioPath = req.file.path;
    // The Google SpeechClient automatically uses the GOOGLE_APPLICATION_CREDENTIALS path
    const client = new SpeechClient();

    let transcriptionText = '';
    
    try {
        const audioBuffer = fs.readFileSync(audioPath);
        const audio = { content: audioBuffer.toString('base64') };
        
        // Configuration for the transcription request
        // NOTE: This configuration assumes standard 16000Hz WAV/FLAC files.
        // For MP3s, you might need to adjust the encoding to 'MP3'
        const config = {
            encoding: 'LINEAR16', 
            sampleRateHertz: 16000, 
            languageCode: 'en-US',
            // optional: Enable speaker diarization if you expect multiple speakers
            // enableSpeakerDiarization: true,
        };
        
        const request = { audio, config };
        
        console.log(`Starting transcription for: ${req.file.originalname}`);
        const [response] = await client.recognize(request);
        
        // Extract the full transcription text
        transcriptionText = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        // Save the result to the database
        const newTranscription = new Transcription({
            audioName: req.file.originalname,
            transcription: transcriptionText || 'No clear speech detected.',
        });
        await newTranscription.save();

        // Clean up the temporary file (CRITICAL for disk space!)
        fs.unlinkSync(audioPath);

        res.json({ success: true, transcription: newTranscription.transcription });
    } catch (error) {
        console.error('Transcription/API Error:', error.message);
        
        // Clean up the temporary file on error too
        if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
        }

        // Save a failure record if transcription failed but file upload was successful
        if (!transcriptionText && req.file) {
             const failedTranscription = new Transcription({
                audioName: req.file.originalname + ' (Failed)',
                transcription: `Error during transcription: ${error.message.substring(0, 100)}...`,
            });
            await failedTranscription.save();
        }

        res.status(500).json({ 
            success: false, 
            error: 'Transcription failed. Check server console and API credentials.',
            details: error.message 
        });
    }
});

// --- API Route: Fetch History ---
app.get('/api/history', async (req, res) => {
    try {
        // Fetch last 10 transcriptions, sorted by newest first
        const history = await Transcription.find().sort({ date: -1 }).limit(10);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history', details: error.message });
    }
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
