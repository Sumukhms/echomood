import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { parseLRC } from "../utils/lrcParser";

export default function LiveLyrics({ track, currentTime, onLineChange }) {
  const [lyrics, setLyrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchLyrics = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `http://127.0.0.1:5000/api/lyrics?track_name=${encodeURIComponent(track.track_name)}&artist_name=${encodeURIComponent(track.artist_name)}`,
        );
        if (res.data.success && res.data.syncedLyrics) {
          const parsedLyrics = parseLRC(res.data.syncedLyrics);
          setLyrics(parsedLyrics);
        } else if (res.data.success && res.data.plainLyrics) {
          // Fallback to plain lyrics (not synced, so we just set time to 0)
          const lines = res.data.plainLyrics.split('\n');
          setLyrics(lines.map(line => ({ time: 0, text: line })));
        } else {
          setLyrics([]);
        }
      } catch (error) {
        console.error("Failed to fetch lyrics:", error);
        setLyrics([]);
      } finally {
        setLoading(false);
      }
    };

    if (track && track.track_name && track.artist_name) {
      fetchLyrics();
    }
  }, [track]);

  let activeIndex = -1;
  if (lyrics.length > 0) {
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  const prevActiveIndexRef = useRef(-1);
  useEffect(() => {
    if (activeIndex !== prevActiveIndexRef.current) {
      prevActiveIndexRef.current = activeIndex;
      if (onLineChange && activeIndex >= 0 && lyrics[activeIndex]) {
        onLineChange(lyrics[activeIndex].text);
      }
    }
  }, [activeIndex, onLineChange, lyrics]);

  useEffect(() => {
    if (lyrics.length > 0 && containerRef.current && activeIndex >= 0) {
      const container = containerRef.current;
      const activeElement = container.children[activeIndex];
      if (activeElement) {
        const containerHeight = container.clientHeight;
        const elementHeight = activeElement.clientHeight;
        const elementTop = activeElement.offsetTop;
        const scrollTop = elementTop - containerHeight / 2 + elementHeight / 2;
        container.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });
      }
    }
  }, [activeIndex, lyrics.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading lyrics...</div>
      </div>
    );
  }

  if (lyrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 text-center">
          <div className="text-lg mb-2">🎵</div>
          <div>No lyrics available</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full max-h-[60vh] overflow-y-auto px-4 md:px-12 py-[30vh] space-y-6 scrollbar-hide"
      style={{ scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
    >
      {lyrics.map((line, index) => {
        const isActive = index === activeIndex;
        const isPast = index < activeIndex;
        return (
          <div
            key={index}
            className={`transition-all duration-700 ease-out origin-left ${
              isActive
                ? "text-white text-4xl md:text-6xl font-bold scale-100 opacity-100 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]"
                : isPast
                  ? "text-zinc-500 text-2xl md:text-4xl font-medium scale-95 opacity-40"
                  : "text-zinc-400 text-3xl md:text-5xl font-semibold scale-95 opacity-60"
            }`}
            style={isActive ? { textShadow: "0 0 30px rgba(255,255,255,0.4)" } : {}}
          >
            {line.text || "♪"}
          </div>
        );
      })}
    </div>
  );
}
