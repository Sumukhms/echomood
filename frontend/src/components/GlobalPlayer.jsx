import { useEffect, useRef, useState } from "react";
import LiveLyrics from "./LiveLyrics";

function formatTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function GlobalPlayer({
  queue,
  currentTrackIndex,
  playNext,
  playPrevious,
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const currentTrack = queue[currentTrackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.file_url) return;

    setCurrentTime(0);
    audio.load();
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [currentTrack]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.file_url) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (event) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Number(event.target.value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const hasTrack = Boolean(currentTrack?.file_url);
  const canSkipBack = currentTrackIndex > 0;
  const canSkipForward = currentTrackIndex < queue.length - 1;

  if (!queue.length) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/45 backdrop-blur-2xl">
      <audio
        ref={audioRef}
        src={currentTrack?.file_url || ""}
        onLoadedMetadata={(event) =>
          setDuration(event.currentTarget.duration || 0)
        }
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime || 0)
        }
        onEnded={() => {
          setIsPlaying(false);
          playNext();
        }}
      />

      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 mb-1">
              Now Playing
            </p>
            {hasTrack ? (
              <>
                <p className="text-sm text-white truncate">
                  {currentTrack.track_name}
                </p>
                <p className="text-xs text-zinc-400 truncate">
                  {currentTrack.artist_name}
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                Select a track from your Vault to play.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 md:w-[60%]">
            <button
              onClick={playPrevious}
              disabled={!canSkipBack}
              className="px-3 py-2 text-xs tracking-widest uppercase rounded-full border border-white/20 text-zinc-300 hover:bg-white/10 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={togglePlayback}
              disabled={!hasTrack}
              className="px-4 py-2 text-xs tracking-widest uppercase rounded-full border border-gold-500/50 text-gold-300 hover:bg-gold-500/20 disabled:opacity-40"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={playNext}
              disabled={!canSkipForward}
              className="px-3 py-2 text-xs tracking-widest uppercase rounded-full border border-white/20 text-zinc-300 hover:bg-white/10 disabled:opacity-40"
            >
              Next
            </button>
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              disabled={!hasTrack}
              className={`px-3 py-2 text-xs tracking-widest uppercase rounded-full border ${
                showLyrics
                  ? "border-gold-500/50 text-gold-300 bg-gold-500/20"
                  : "border-white/20 text-zinc-300 hover:bg-white/10"
              } disabled:opacity-40`}
            >
              Lyrics
            </button>
            <span className="text-xs text-zinc-400 w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={Math.min(currentTime, duration || 0)}
              onChange={handleSeek}
              disabled={!hasTrack}
              className="w-full accent-[#d4af37] disabled:opacity-40"
            />
            <span className="text-xs text-zinc-400 w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {showLyrics && (
        <div className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl">
          <LiveLyrics track={currentTrack} currentTime={currentTime} />
        </div>
      )}
    </div>
  );
}
