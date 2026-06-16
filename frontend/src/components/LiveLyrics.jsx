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
      className="h-full max-h-[60vh] overflow-y-auto px-4 md:px-12 py-[30vh] space-y-6 scrollbar-hide relative"
      style={{ scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
    >
      <style>
        {`
          @keyframes karaokeFill {
            0% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .karaoke-fill {
            background: linear-gradient(to right, #ffffff 50%, rgba(255, 255, 255, 0.4) 50%);
            background-size: 200% auto;
            background-position: 100% 50%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: karaokeFill 2.5s linear forwards;
          }
        `}
      </style>
      {lyrics.map((line, index) => {
        const isActive = index === activeIndex;
        return (
          <div
            key={index}
            className={
              isActive
                ? "text-3xl sm:text-4xl lg:text-5xl font-bold text-white shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-700 ease-out transform scale-105 origin-left karaoke-fill"
                : "text-white opacity-30 text-lg sm:text-xl font-medium transition-all duration-700 hover:opacity-60"
            }
            style={isActive ? { 
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              backgroundColor: "rgba(255,255,255,0.05)"
            } : {
              padding: "0.5rem 1rem"
            }}
          >
            {line.text || "♪"}
          </div>
        );
      })}
    </div>
  );
}
