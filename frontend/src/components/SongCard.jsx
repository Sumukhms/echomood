import { useState } from "react";
import axios from "axios";

export default function SongCard({
  track,
  onPlay,
  recommendedTracks = [],
  username,
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveTrack = async () => {
    if (isSaved || isSaving) return;
    if (!username) {
      return alert("You must be logged in to save tracks.");
    }

    try {
      setIsSaving(true);
      await axios.post("http://127.0.0.1:5000/api/vault/save_track", {
        username,
        track_name: track.track_name,
        artist_name: track.artist_name,
        preview_url: track.preview_url,
        mood: track.mood || "calm",
      });
      setIsSaved(true);
    } catch (error) {
      console.error("Failed to save track:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative flex flex-col p-4 transition-all duration-500 border group bg-white/5 backdrop-blur-md border-white/10 rounded-2xl hover:bg-white/10 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(212,175,55,0.15)]">
      {/* YouTube iframe Container */}
      <div className="relative w-full overflow-hidden aspect-video rounded-xl bg-zinc-900">
        <button
          onClick={handleSaveTrack}
          disabled={isSaved || isSaving}
          className={`absolute top-2 right-2 z-10 flex items-center justify-center w-9 h-9 rounded-full border transition-all ${
            isSaved
              ? "bg-gold-500 border-gold-500 text-black"
              : "bg-black/60 border-white/20 text-white hover:border-gold-500 hover:text-gold-400"
          } disabled:opacity-90`}
          title={isSaved ? "Saved to Vault" : "Save to Vault"}
        >
          <span className="text-sm">
            {isSaved ? "♥" : isSaving ? "..." : "♡"}
          </span>
        </button>
        <iframe
          src={track.preview_url}
          title={track.track_name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        ></iframe>
      </div>

      {/* Track Info */}
      <div className="pt-4 pb-2 text-left">
        <h4 className="font-serif text-lg text-white truncate line-clamp-1 group-hover:text-gold-400 transition-colors">
          {track.track_name}
        </h4>
        <p className="text-sm font-light text-zinc-400 truncate mt-0.5">
          {track.artist_name}
        </p>
        <p className="text-[10px] tracking-widest uppercase text-zinc-500 mt-2">
          {isSaved ? "Saved in Vault" : "Tap heart to save"}
        </p>
        <button
          onClick={() => onPlay && onPlay(track, recommendedTracks)}
          className="mt-3 w-full py-2 text-xs tracking-widest uppercase rounded-xl border border-gold-500/50 text-gold-300 hover:bg-gold-500/20 transition-all"
        >
          Play
        </button>
      </div>
    </div>
  );
}
