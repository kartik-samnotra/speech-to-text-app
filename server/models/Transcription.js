// server/models/Transcription.js
const mongoose = require('mongoose');

// Define the schema for storing transcription records
const TranscriptionSchema = new mongoose.Schema({
    audioName: { 
        type: String, 
        required: true 
    },
    transcription: { 
        type: String, 
        required: true 
    },
    // Store the date the transcription was created
    date: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Transcription', TranscriptionSchema);