import { useState, useEffect, useRef } from 'react';
import { FaSpotify, FaPlay, FaPause } from 'react-icons/fa';

export default function SongCard({ song }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Create the Audio object on mount
  useEffect(() => {
    if (song.preview_url) {
      audioRef.current = new Audio(song.preview_url);
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [song.preview_url]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="bg-black bg-opacity-40 p-4 rounded-lg shadow-lg flex items-center gap-4 transition-transform hover:scale-[1.03]">
      {song.preview_url && (
        <button
          onClick={togglePlay}
          className="w-12 h-12 flex-shrink-0 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white"
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
      )}
      {!song.preview_url && (
        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gray-600 flex items-center justify-center text-gray-400" title="No preview available">
          <FaPlay />
        </div>
      )}
      
      <div className="min-w-0">
        <h4 className="font-bold truncate" title={song.track_name}>
          {song.track_name}
        </h4>
        <p className="text-sm opacity-80 truncate" title={song.artist_name}>
          {song.artist_name}
        </p>
      </div>
      
      <a
        href={song.external_url}
        target="_blank"
        rel="noopener noreferrer"
        title="Listen on Spotify"
        className="ml-auto text-green-400 hover:text-green-300 flex-shrink-0"
      >
        <FaSpotify size={24} />
      </a>
    </div>
  );
}