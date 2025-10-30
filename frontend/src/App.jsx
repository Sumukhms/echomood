import { useState } from 'react';
import axios from 'axios';
import './App.css';

// The URL of your backend server
const API_URL = 'http://localhost:8888/api/mood/detect';

function App() {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleDetectMood = async () => {
    if (!text) {
      setError('Please enter some text.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      // Make the API call to your backend
      const response = await axios.post(API_URL, {
        text: text,
        activity: 'text-input' // a descriptive activity name
      });
      
      setResult(response.data);

    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError('Failed to get a response from the server. Is it running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <h1>EchoMood</h1>
      <p>How are you feeling right now?</p>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g., Today was a fantastic day!"
        rows="3"
        style={{ width: '100%', padding: '10px', marginTop: '10px' }}
      />

      <button onClick={handleDetectMood} disabled={isLoading} style={{ marginTop: '10px' }}>
        {isLoading ? 'Getting Recommendations...' : 'Detect Mood & Get Music'}
      </button>

      {error && <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>}
      
      {result && (
        <div style={{ marginTop: '20px', textAlign: 'left' }}>
          <h2>Detected Mood: <span style={{ textTransform: 'capitalize' }}>{result.detectedMood}</span></h2>
          
          {result.recommendations && result.recommendations.length > 0 ? (
            <>
              <h3>Here are some songs for you:</h3>
              <ul>
                {result.recommendations.map((song, index) => (
                  <li key={index}>
                    <strong>{song.track_name}</strong> by {song.artist_name}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>Could not find any song recommendations for this mood.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;