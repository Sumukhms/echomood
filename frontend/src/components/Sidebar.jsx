import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export default function Sidebar({ username, onSelectPlaylist, onLogout }) {
  const [playlists, setPlaylists] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPlaylists = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(
        `https://sumukh25-echomood-api.hf.space/api/playlists/all?username=${username}`
      );
      setPlaylists(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load playlists:", err);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (username) fetchPlaylists();
    window.addEventListener('libraryUpdate', fetchPlaylists);
    return () => window.removeEventListener('libraryUpdate', fetchPlaylists);
  }, [username, fetchPlaylists]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await axios.post("https://sumukh25-echomood-api.hf.space/api/playlists/create", {
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
      <div className="flex flex-col flex-1 overflow-hidden">
        {isLoading && (
          <div className="flex flex-col gap-2 px-1 mt-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-full h-8 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        )}
        {!isLoading && playlists.length === 0 && (
          <p className="text-xs text-zinc-600 px-1 italic">No playlists yet</p>
        )}
        
        {!isLoading && playlists.length > 0 && (
          <div className="flex flex-col h-full gap-4">
            {/* Pinned Section */}
            {playlists.filter(p => p.is_pinned).length > 0 && (
              <div className="flex flex-col gap-1">
                <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2 mb-1">Pinned</h3>
                {playlists.filter(p => p.is_pinned).map(p => (
                  <button
                    key={p._id}
                    onClick={() => handleSelect(p)}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-all truncate flex items-center justify-between ${
                      activeId === p._id
                        ? "bg-white/10 text-gold-400"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate flex-1">{p.name}</span>
                    <span className="text-[10px] text-zinc-600 ml-2">📌</span>
                  </button>
                ))}
              </div>
            )}

            {/* Unpinned Section (Scrollable) */}
            {playlists.filter(p => !p.is_pinned).length > 0 && (
              <div className="flex flex-col gap-1 flex-1 min-h-0">
                <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2 mb-1">All Playlists</h3>
                <div className="overflow-y-auto pr-1 flex flex-col gap-1 flex-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                  {playlists.filter(p => !p.is_pinned).map(p => (
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logout button at the bottom */}
      <div className="mt-auto pt-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full py-2 text-xs tracking-widest uppercase rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}