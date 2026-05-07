import { useEffect, useRef, useState } from "react";

function formatTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function isYouTube(url) {
  return (
    typeof url === "string" &&
    (url.includes("youtube.com") || url.includes("youtu.be"))
  );
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
  const [audioError, setAudioError] = useState(false);

  const currentTrack = queue[currentTrackIndex] ?? null;
  const trackUrl = currentTrack?.file_url || "";
  const isExternal = isYouTube(trackUrl);

  // When track changes: reset state, pause any existing audio, then auto-play local
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setAudioError(false);
    setIsPlaying(false);

    if (!trackUrl || isExternal) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.load();
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [trackUrl, isExternal]);

  // Pause local audio whenever we switch to an external/YouTube track
  useEffect(() => {
    if (isExternal) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isExternal]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || isExternal) return;
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

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || isExternal) return;
    const next = Number(e.target.value);
    audio.currentTime = next;
    setCurrentTime(next);
  };

  if (!queue.length) return null;

  const canSkipBack = currentTrackIndex > 0;
  const canSkipForward = currentTrackIndex < queue.length - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/50 backdrop-blur-2xl">
      {/* Hidden audio element — only used for local mp3 tracks */}
      <audio
        ref={audioRef}
        src={!isExternal && trackUrl ? trackUrl : ""}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
        onEnded={() => {
          setIsPlaying(false);
          playNext();
        }}
        onError={() => setAudioError(true)}
      />

      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Track info */}
          <div className="min-w-0 flex-shrink-0 md:w-56">
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 mb-0.5">
              Now Playing
            </p>
            {currentTrack ? (
              <>
                <p className="text-sm text-white truncate font-medium">
                  {currentTrack.track_name}
                </p>
                <p className="text-xs text-zinc-400 truncate">
                  {currentTrack.artist_name}
                </p>
                {isExternal && (
                  <p className="text-[10px] tracking-widest uppercase text-gold-500/70 mt-0.5">
                    YouTube — use card player
                  </p>
                )}
                {audioError && !isExternal && (
                  <p className="text-[10px] text-red-400 mt-0.5">
                    Audio unavailable
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-400">No track selected</p>
            )}
          </div>

          {/* Controls + scrubber */}
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={playPrevious}
              disabled={!canSkipBack}
              className="px-3 py-2 text-xs tracking-widest uppercase rounded-full border border-white/20 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors flex-shrink-0"
            >
              Prev
            </button>

            <button
              onClick={togglePlayback}
              disabled={!currentTrack || isExternal || audioError}
              className="px-4 py-2 text-xs tracking-widest uppercase rounded-full border border-gold-500/50 text-gold-300 hover:bg-gold-500/20 disabled:opacity-30 transition-colors flex-shrink-0"
              title={isExternal ? "Use the card player for YouTube tracks" : undefined}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>

            <button
              onClick={playNext}
              disabled={!canSkipForward}
              className="px-3 py-2 text-xs tracking-widest uppercase rounded-full border border-white/20 text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors flex-shrink-0"
            >
              Next
            </button>

            {/* Scrubber — hidden for YouTube */}
            {!isExternal ? (
              <>
                <span className="text-xs text-zinc-400 w-10 text-right flex-shrink-0">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={handleSeek}
                  disabled={!currentTrack || audioError}
                  className="w-full accent-[#d4af37] disabled:opacity-30"
                />
                <span className="text-xs text-zinc-400 w-10 flex-shrink-0">
                  {formatTime(duration)}
                </span>
              </>
            ) : (
              <span className="text-xs text-zinc-500 italic flex-1">
                Playback controls disabled for embedded YouTube tracks
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}