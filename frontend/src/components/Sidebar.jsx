import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Sidebar({ username, onSelectPlaylist, activePlaylistId }) {
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    if (username) fetchPlaylists();
  }, [username]);

  const fetchPlaylists = async () => {
    const res = await axios.get(`http://127.0.0.1:5000/api/playlists/all?username=${username}`);
    setPlaylists(res.data);
  };

  const createNewPlaylist = async () => {
    const name = prompt("Enter playlist name:");
    if (!name) return;
    await axios.post('http://127.0.0.1:5000/api/playlists/create', { username, name });
    fetchPlaylists();
  };

  return (
    <div className="w-64 h-full bg-black/40 backdrop-blur-md border-r border-white/10 p-6 flex flex-col gap-6">
      <h2 className="text-xl font-serif text-gold-400">Library</h2>
      
      <button 
        onClick={createNewPlaylist}
        className="w-full py-2 bg-gold-600/20 border border-gold-600/40 text-gold-400 rounded-lg hover:bg-gold-600/30 transition-all"
      >
        + Create Playlist
      </button>

      <div className="flex flex-col gap-2 overflow-y-auto">
        {playlists.map(p => (
          <button
            key={p._id}
            onClick={() => onSelectPlaylist(p)}
            className={`text-left px-4 py-2 rounded-md transition-all ${
              activePlaylistId === p._id ? 'bg-white/10 text-gold-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}