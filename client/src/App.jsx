import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Upload, Clock } from 'lucide-react';

// Base API URL is handled by the "proxy" entry in client/package.json

function App() {
  const [audioFile, setAudioFile] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/api/history');
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
      setError('Failed to load history. Check server connection.');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) { // 10MB limit check
        setError('File size exceeds 10MB. Please upload a smaller file.');
        setAudioFile(null);
        return;
    }
    setAudioFile(file);
    setTranscription('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile) {
      setError('Please select an audio file (WAV or FLAC recommended).');
      return;
    }

    setLoading(true);
    setTranscription('');
    setError('');

    const formData = new FormData();
    formData.append('audioFile', audioFile);

    try {
      const response = await axios.post('/api/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setTranscription(response.data.transcription);
      setAudioFile(null); // Clear file input
      // Reset input element value so same file can be uploaded again
      e.target.reset(); 
      fetchHistory(); // Refresh history
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Unknown server or API error occurred.';
      console.error('Transcription Error Details:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center py-6 mb-8 border-b border-gray-200">
            <h1 className="text-4xl font-extrabold text-primary tracking-tight sm:text-5xl">
                Speech-to-Text Transcriber
            </h1>
            <p className="mt-2 text-lg text-gray-500">
                Full-stack MVP using React, Express, MongoDB, and Google Speech API
            </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
            {/* --- Transcription Form & Result (2/3 width) --- */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-primary/10">
                    <h2 className="text-2xl font-semibold text-gray-800 flex items-center mb-6">
                        <Upload className="w-5 h-5 mr-2 text-primary" />
                        Upload & Transcribe Audio
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <label className="block">
                            <span className="text-gray-700 font-medium">Select Audio File (WAV, FLAC, MP3)</span>
                            <input 
                                type="file" 
                                accept="audio/*" 
                                onChange={handleFileChange} 
                                className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                            {audioFile && (
                                <p className="text-xs mt-1 text-gray-500">File selected: {audioFile.name}</p>
                            )}
                        </label>
                        
                        <button 
                            type="submit" 
                            disabled={!audioFile || loading}
                            className={`w-full py-3 px-4 rounded-xl text-white font-bold transition duration-300 shadow-md ${
                                !audioFile || loading 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-primary hover:bg-secondary shadow-primary/30 hover:shadow-secondary/50'
                            }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Processing Audio...
                                </span>
                            ) : 'Transcribe and Save to Database'}
                        </button>
                    </form>
                </div>

                {/* Transcription Result Panel */}
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-primary/10">
                    <h3 className="text-xl font-semibold text-primary mb-4">Transcription Result</h3>
                    
                    {error && (
                        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-4">
                            <p className="font-semibold">Error:</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div className="min-h-40 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {transcription || (loading ? 'Waiting for result...' : 'Upload an audio file to begin transcription.')}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- History Section (1/3 width) --- */}
            <div className="lg:col-span-1">
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-800 flex items-center mb-6">
                        <Clock className="w-5 h-5 mr-2 text-gray-500" />
                        Transcription History
                    </h2>
                    
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto history-scroll">
                        {history.length > 0 ? (
                            history.map((item) => (
                                <div key={item._id} className="p-4 border border-gray-100 rounded-lg bg-white shadow-sm hover:shadow-md transition duration-200">
                                    <p className="font-bold text-sm text-primary truncate">{item.audioName}</p>
                                    <p className="text-xs italic text-gray-500 mt-0.5 mb-2">
                                        {formatDate(item.date)}
                                    </p>
                                    <p className="mt-1 text-gray-700 text-sm italic">
                                        "{item.transcription.substring(0, 80)}..."
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-4">No transcription history yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default App;