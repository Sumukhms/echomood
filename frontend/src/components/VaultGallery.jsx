import { useEffect, useState } from "react";
import axios from "axios";

export default function VaultGallery({ username, onPlayTrack }) {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeExternalUrl, setActiveExternalUrl] = useState("");

  useEffect(() => {
    if (!username) {
      setTimeout(() => {
        setTracks([]);
        setIsLoading(false);
      }, 0);
      return;
    }
    const fetchTracks = async () => {
      try {
        setIsLoading(true);
        setError("");
        const res = await axios.get("http://localhost:5000/api/vault/tracks", {
          params: { username },
        });
        const fetched = res.data?.tracks ?? [];
        setTracks(Array.isArray(fetched) ? fetched : []);
      } catch {
        setError("Unable to load your vault tracks right now.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTracks();
  }, [username]);

  // Local (non-YouTube) tracks only go into the audio queue
  const localTracks = tracks.filter((t) => !t.is_external);

  const handleLocalPlay = (track) => {
    // Pass (clickedTrack, fullLocalTrackList) to match the universal handlePlay signature
    onPlayTrack?.(track, localTracks);
  };

  const toggleExternalPlayer = (url) => {
    setActiveExternalUrl((prev) => (prev === url ? "" : url));
  };

  return (
    <div className="w-full border rounded-3xl border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="mb-6">
        <p className="text-xs tracking-widest text-zinc-500 uppercase mb-2">
          Personal Vault Library
        </p>
        <h3 className="font-serif text-2xl text-white">Saved Tracks</h3>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="p-8 text-center border rounded-2xl border-white/10 bg-black/20">
          <p className="text-sm text-zinc-300">Loading your vault…</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="p-8 text-center border rounded-2xl border-red-400/30 bg-red-500/10">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && tracks.length === 0 && (
        <div className="p-10 text-center border rounded-2xl border-white/10 bg-black/20">
          <p className="text-sm text-zinc-300">Your vault is empty.</p>
          <p className="text-xs text-zinc-500 mt-2">
            Upload an MP3 above, or save tracks from the AI DJ recommendations using the ♡ button.
          </p>
        </div>
      )}

      {/* Track grid */}
      {!isLoading && !error && tracks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tracks.map((track, index) => (
            <div
              key={`${track.file_url}-${index}`}
              className="relative flex flex-col p-4 transition-all duration-500 border group bg-white/5 backdrop-blur-md border-white/10 rounded-2xl hover:bg-white/10 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(212,175,55,0.15)]"
            >
              {/* Track info */}
              <div className="pb-3">
                <h4 className="font-serif text-lg text-white truncate group-hover:text-gold-400 transition-colors">
                  {track.track_name}
                </h4>
                <p className="text-sm font-light text-zinc-400 truncate mt-0.5">
                  {track.artist_name}
                </p>
                {track.is_external && (
                  <p className="text-[10px] tracking-widest uppercase text-gold-500/60 mt-1">
                    YouTube
                  </p>
                )}
              </div>

              {/* Mood tags */}
              {(track.mood_tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {track.mood_tags.map((tag) => (
                    <span
                      key={`${track.file_url}-${tag}`}
                      className="px-2 py-1 text-[10px] tracking-widest uppercase rounded-full border border-gold-500/40 text-gold-300 bg-gold-500/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Playback */}
              {track.is_external ? (
                <>
                  <button
                    onClick={() => toggleExternalPlayer(track.file_url)}
                    className="w-full py-2 mt-auto text-xs tracking-widest uppercase rounded-xl border border-gold-500/50 text-gold-300 hover:bg-gold-500/20 transition-all"
                  >
                    {activeExternalUrl === track.file_url
                      ? "Hide Player"
                      : "Play on YouTube"}
                  </button>
                  {activeExternalUrl === track.file_url && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30 aspect-video">
                      <iframe
                        src={track.file_url}
                        title={`${track.track_name}-player`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => handleLocalPlay(track)}
                  className="w-full py-2 mt-auto text-xs tracking-widest uppercase rounded-xl border border-gold-500/50 text-gold-300 hover:bg-gold-500/20 transition-all"
                >
                  Play
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}