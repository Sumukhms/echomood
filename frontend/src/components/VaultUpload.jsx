import { useState } from 'react';
import axios from 'axios';

export default function VaultUpload() {
  const [file, setFile] = useState(null);
  const [trackName, setTrackName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [moods, setMoods] = useState('');
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select an audio file first!");

    setStatus('uploading');
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('track_name', trackName);
    formData.append('artist_name', artistName);
    formData.append('moods', moods); // e.g., "energetic, party"

    try {
      await axios.post('http://127.0.0.1:5000/api/vault/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatus('success');
      // Reset form after 2 seconds
      setTimeout(() => {
        setStatus('idle');
        setFile(null); setTrackName(''); setArtistName(''); setMoods('');
      }, 2000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="w-full max-w-md p-8 border backdrop-blur-xl bg-white/5 border-white/10 rounded-3xl">
      <h2 className="text-2xl font-serif text-gold-400 mb-6">The Personal Vault</h2>
      
      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        <div>
          <label className="text-xs tracking-widest text-zinc-500 uppercase">Audio File (.mp3, .wav)</label>
          <input 
            type="file" 
            accept="audio/*"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full p-3 mt-1 text-sm bg-black/50 border border-white/10 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:bg-gold-500 file:text-black hover:file:bg-gold-400"
          />
        </div>

        <div>
          <label className="text-xs tracking-widest text-zinc-500 uppercase">Track Name</label>
          <input type="text" value={trackName} onChange={(e) => setTrackName(e.target.value)} required className="w-full p-3 mt-1 text-sm bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold-500" placeholder="e.g. Midnight Drive" />
        </div>

        <div>
          <label className="text-xs tracking-widest text-zinc-500 uppercase">Artist Name</label>
          <input type="text" value={artistName} onChange={(e) => setArtistName(e.target.value)} required className="w-full p-3 mt-1 text-sm bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold-500" placeholder="e.g. The Synthwave Kids" />
        </div>

        <div>
          <label className="text-xs tracking-widest text-zinc-500 uppercase">Mood Tags (Comma Separated)</label>
          <input type="text" value={moods} onChange={(e) => setMoods(e.target.value)} required className="w-full p-3 mt-1 text-sm bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold-500" placeholder="e.g. nostalgic, calm, energetic" />
        </div>

        <button 
          type="submit" 
          disabled={status === 'uploading'}
          className="w-full py-4 mt-4 text-sm tracking-widest text-black transition-all rounded-xl bg-gold-500 hover:bg-gold-400 disabled:opacity-50"
        >
          {status === 'uploading' ? 'SECURING IN VAULT...' : status === 'success' ? '✅ UPLOADED!' : 'UPLOAD TO VAULT'}
        </button>
      </form>
    </div>
  );
}