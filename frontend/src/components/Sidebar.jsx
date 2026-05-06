import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Sidebar({
  username,
  setActivePlaylist,
  activePlaylistId,
}) {
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  useEffect(() => {
    if (username) fetchPlaylists();
  }, [username]);

  const fetchPlaylists = async () => {
    const res = await axios.get(
      `http://127.0.0.1:5000/api/playlists/all?username=${username}`,
    );
    setPlaylists(res.data);
  };

  const createNewPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await axios.post("http://127.0.0.1:5000/api/playlists/create", {
      username,
      name: newPlaylistName.trim(),
    });
    setNewPlaylistName("");
    fetchPlaylists();
  };

  return (
    <div className="w-64 h-full bg-black/40 backdrop-blur-md border-r border-white/10 p-6 flex flex-col gap-6">
      <h2 className="text-xl font-serif text-gold-400">Library</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          placeholder="New playlist name"
          className="flex-1 px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-gold-500"
        />
        <button
          onClick={createNewPlaylist}
          className="px-4 py-2 bg-gold-600/20 border border-gold-600/40 text-gold-400 rounded-lg hover:bg-gold-600/30 transition-all"
        >
          Create
        </button>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto">
        {playlists.map((p) => (
          <button
            key={p._id}
            onClick={() => setActivePlaylist(p)}
            className={`text-left px-4 py-2 rounded-md transition-all ${
              activePlaylistId === p._id
                ? "bg-white/10 text-gold-400"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
