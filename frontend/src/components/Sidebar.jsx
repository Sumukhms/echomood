import { useState, useEffect } from "react";
import axios from "axios";

export default function Sidebar({ username, onSelectPlaylist }) {
  const [playlists, setPlaylists] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (username) fetchPlaylists();
  }, [username]);

  const fetchPlaylists = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(
        `http://127.0.0.1:5000/api/playlists/all?username=${username}`
      );
      setPlaylists(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load playlists:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await axios.post("http://127.0.0.1:5000/api/playlists/create", {
        username,
        name: trimmed,
      });
      setNewName("");
      setIsCreating(false);
      fetchPlaylists();
    } catch (err) {
      console.error("Failed to create playlist:", err);
    }
  };

  const handleSelect = (playlist) => {
    setActiveId(playlist._id);
    onSelectPlaylist?.(playlist);
  };

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen border-r border-white/10 bg-black/40 backdrop-blur-md p-5 gap-4 flex-shrink-0">
      <h2 className="text-sm font-serif text-gold-400 uppercase tracking-widest">
        Library
      </h2>

      {/* Create playlist */}
      {isCreating ? (
        <form onSubmit={handleCreate} className="flex flex-col gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Playlist name…"
            className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-gold-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-1.5 text-xs tracking-widest uppercase rounded-lg bg-gold-500/20 border border-gold-500/40 text-gold-300 hover:bg-gold-500/30 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => { setIsCreating(false); setNewName(""); }}
              className="flex-1 py-1.5 text-xs tracking-widest uppercase rounded-lg border border-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full py-2 text-xs tracking-widest uppercase rounded-xl border border-white/10 text-zinc-400 hover:border-gold-500/50 hover:text-gold-300 transition-all"
        >
          + New Playlist
        </button>
      )}

      <div className="h-px bg-white/10" />

      {/* Playlist list */}
      <div className="flex flex-col gap-1 overflow-y-auto flex-1">
        {isLoading && (
          <p className="text-xs text-zinc-500 px-1">Loading playlists…</p>
        )}
        {!isLoading && playlists.length === 0 && (
          <p className="text-xs text-zinc-600 px-1 italic">No playlists yet</p>
        )}
        {playlists.map((p) => (
          <button
            key={p._id}
            onClick={() => handleSelect(p)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-all truncate ${
              activeId === p._id
                ? "bg-white/10 text-gold-400"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {p.name}
            {p.tracks?.length > 0 && (
              <span className="ml-1 text-[10px] text-zinc-600">
                ({p.tracks.length})
              </span>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}