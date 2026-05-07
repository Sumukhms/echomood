import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { parseLRC } from "../utils/lrcParser";

export default function LiveLyrics({ track, currentTime }) {
  const [lyrics, setLyrics] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (track && track.track_name && track.artist_name) {
      fetchLyrics();
    }
  }, [track]);

  useEffect(() => {
    if (lyrics.length > 0) {
      // Find the active line (closest time <= currentTime)
      let newActiveIndex = -1;
      for (let i = 0; i < lyrics.length; i++) {
        if (lyrics[i].time <= currentTime) {
          newActiveIndex = i;
        } else {
          break;
        }
      }
      setActiveIndex(newActiveIndex);

      // Scroll to keep active line centered
      if (containerRef.current && newActiveIndex >= 0) {
        const container = containerRef.current;
        const activeElement = container.children[newActiveIndex];
        if (activeElement) {
          const containerHeight = container.clientHeight;
          const elementHeight = activeElement.clientHeight;
          const elementTop = activeElement.offsetTop;
          const scrollTop =
            elementTop - containerHeight / 2 + elementHeight / 2;
          container.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: "smooth",
          });
        }
      }
    }
  }, [currentTime, lyrics]);

  const fetchLyrics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://127.0.0.1:5000/api/lyrics?track_name=${encodeURIComponent(track.track_name)}&artist_name=${encodeURIComponent(track.artist_name)}`,
      );
      if (res.data.success && res.data.lrc) {
        const parsedLyrics = parseLRC(res.data.lrc);
        setLyrics(parsedLyrics);
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
      className="h-64 overflow-y-auto px-6 py-4 space-y-2"
    >
      {lyrics.map((line, index) => (
        <div
          key={index}
          className={`transition-all duration-300 ${
            index === activeIndex
              ? "text-gold-400 text-2xl font-bold scale-105"
              : "text-zinc-500 text-lg"
          }`}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}
