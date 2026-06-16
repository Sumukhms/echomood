import { useState, useEffect, useRef } from "react";
import axios from "axios";

const getVibeGradient = (mood) => {
  switch (mood?.toLowerCase()) {
    case "happy": return "linear-gradient(135deg, #ea580c 0%, #fcd34d 100%)";
    case "sad": return "linear-gradient(135deg, #1e3a8a 0%, #60a5fa 100%)";
    case "angry": return "linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)";
    case "calm": return "linear-gradient(135deg, #064e3b 0%, #34d399 100%)";
    case "energetic": return "linear-gradient(135deg, #be185d 0%, #f472b6 100%)";
    case "romantic": return "linear-gradient(135deg, #9f1239 0%, #fb7185 100%)";
    case "nostalgic": return "linear-gradient(135deg, #854d0e 0%, #fbbf24 100%)";
    case "focused": return "linear-gradient(135deg, #4c1d95 0%, #a78bfa 100%)";
    case "party": return "linear-gradient(135deg, #6d28d9 0%, #c084fc 100%)";
    case "sleepy": return "linear-gradient(135deg, #0f172a 0%, #64748b 100%)";
    default: return "linear-gradient(135deg, #52525b 0%, #09090b 100%)";
  }
};

export default function SongCard({
  track,
  onPlay,
  recommendedTracks = [],
  username,
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Each card has its own isolated dropdown state
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [addedToPlaylist, setAddedToPlaylist] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showPlaylistMenu) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowPlaylistMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPlaylistMenu]);

  // Lazy-load playlists only when dropdown is first opened
  const handleOpenPlaylistMenu = async () => {
    const next = !showPlaylistMenu;
    setShowPlaylistMenu(next);
    if (next && !playlistsLoaded && username) {
      try {
        const res = await axios.get(
          `https://sumukh25-echomood-api.hf.space/api/playlists/all?username=${username}`
        );
        setUserPlaylists(Array.isArray(res.data) ? res.data : []);
      } catch {
        setUserPlaylists([]);
      } finally {
        setPlaylistsLoaded(true);
      }
    }
  };

  const handleSaveTrack = async () => {
    if (isSaved || isSaving || !username) return;
    try {
      setIsSaving(true);
      await axios.post("https://sumukh25-echomood-api.hf.space/api/vault/save_track", {
        username,
        track_name: track.track_name,
        artist_name: track.artist_name,
        preview_url: track.preview_url || track.file_url,
        mood: track.mood || "calm",
      });
      setIsSaved(true);
    } catch (err) {
      console.error("Failed to save track:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFeedback = async (action) => {
    if (feedbackGiven || !username) return;
    try {
      await axios.post("https://sumukh25-echomood-api.hf.space/api/feedback", {
        username,
        track_name: track.track_name,
        artist_name: track.artist_name,
        mood: track.mood || "calm",
        action: action
      });
      setFeedbackGiven(action);
    } catch (err) {
      console.error(`Failed to send feedback ${action}:`, err);
    }
  };

  const handleAddToPlaylist = async (playlistId, playlistName) => {
    try {
      await axios.post("https://sumukh25-echomood-api.hf.space/api/playlists/add_track", {
        playlist_id: playlistId,
        track: {
          track_name: track.track_name,
          artist_name: track.artist_name,
          file_url: track.file_url || track.preview_url,
          preview_url: track.preview_url || track.file_url,
          is_external: track.is_external ?? true,
          mood_tags: track.mood_tags || [track.mood || "calm"],
        },
      });
      setAddedToPlaylist(playlistName);
      setShowPlaylistMenu(false);
      setTimeout(() => setAddedToPlaylist(null), 2000);
    } catch (err) {
      console.error("Failed to add to playlist:", err);
    }
  };

  return (
    // overflow-visible so the dropdown is not clipped by the grid cell
    <div className="relative flex flex-col p-4 transition-all duration-500 border group bg-white/5 backdrop-blur-md border-white/10 rounded-2xl hover:bg-white/10 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(212,175,55,0.15)] overflow-visible">
      {/* Album Cover */}
      <div className="relative w-full overflow-hidden aspect-square rounded-xl bg-zinc-900 flex items-center justify-center">
        {/* Save-to-vault heart button */}
        <button
          onClick={handleSaveTrack}
          disabled={isSaved || isSaving || !username}
          className={`absolute top-2 right-2 z-10 flex items-center justify-center w-9 h-9 rounded-full border transition-all ${
            isSaved
              ? "bg-gold-500 border-gold-500 text-black"
              : "bg-black/60 border-white/20 text-white hover:border-gold-500 hover:text-gold-400"
          } disabled:opacity-60`}
          title={isSaved ? "Saved to Vault" : "Save to Vault"}
        >
          <span className="text-sm leading-none">
            {isSaved ? "♥" : isSaving ? "…" : "♡"}
          </span>
        </button>

        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={track.track_name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div 
            className="absolute inset-0 w-full h-full opacity-80" 
            style={{ background: getVibeGradient(track.mood || (track.mood_tags ? track.mood_tags[0] : null)) }}
          />
        )}
      </div>

      {/* Track info */}
      <div className="pt-4 pb-2 text-left">
        <h4 className="font-serif text-lg text-white truncate group-hover:text-gold-400 transition-colors">
          {track.track_name}
        </h4>
        <p className="text-sm font-light text-zinc-400 truncate mt-0.5">
          {track.artist_name}
        </p>

        <p className="text-[10px] tracking-widest uppercase text-zinc-500 mt-2">
          {addedToPlaylist
            ? `✓ Added to ${addedToPlaylist}`
            : isSaved
            ? "Saved in Vault"
            : "Tap ♡ to save"}
        </p>

        {/* Play button */}
        <button
          onClick={() => onPlay && onPlay(track, recommendedTracks)}
          className="mt-3 w-full py-2 text-xs tracking-widest uppercase rounded-xl border border-gold-500/50 text-gold-300 hover:bg-gold-500/20 transition-all"
        >
          Play
        </button>

        {/* Feedback Buttons */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => handleFeedback('like')}
            disabled={!!feedbackGiven}
            className={`flex-1 py-1.5 text-xs tracking-widest uppercase rounded-xl border transition-all ${
              feedbackGiven === 'like'
                ? "border-green-500/50 text-green-400 bg-green-500/10"
                : "border-white/15 text-zinc-400 hover:border-green-500/50 hover:text-green-400 hover:bg-green-500/10"
            }`}
          >
            👍 {feedbackGiven === 'like' ? 'Liked' : 'Like'}
          </button>
          <button
            onClick={() => handleFeedback('skip')}
            disabled={!!feedbackGiven}
            className={`flex-1 py-1.5 text-xs tracking-widest uppercase rounded-xl border transition-all ${
              feedbackGiven === 'skip'
                ? "border-red-500/50 text-red-400 bg-red-500/10"
                : "border-white/15 text-zinc-400 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10"
            }`}
          >
            👎 {feedbackGiven === 'skip' ? 'Skipped' : 'Skip'}
          </button>
        </div>

        {/* Add to playlist — dropdown is portalled above grid via z-[999] */}
        <div className="relative mt-2" ref={dropdownRef}>
          <button
            onClick={handleOpenPlaylistMenu}
            className="w-full py-1.5 text-xs tracking-widest uppercase rounded-xl border border-white/15 text-zinc-400 hover:border-white/30 hover:text-white transition-all"
            title="Add to playlist"
          >
            + Playlist
          </button>

          {showPlaylistMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-52 bg-zinc-900/95 border border-white/10 rounded-xl shadow-2xl z-[999] p-2 backdrop-blur-md">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 px-2">
                Add to Playlist
              </p>
              {!playlistsLoaded && (
                <p className="text-xs text-zinc-400 px-2 py-1">Loading…</p>
              )}
              {playlistsLoaded && userPlaylists.length === 0 && (
                <p className="text-xs text-zinc-400 px-2 py-1">
                  No playlists yet. Create one in the sidebar.
                </p>
              )}
              {userPlaylists.map((p) => (
                <button
                  key={p._id}
                  onClick={() => handleAddToPlaylist(p._id, p.name)}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gold-600/20 text-white rounded-lg transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}