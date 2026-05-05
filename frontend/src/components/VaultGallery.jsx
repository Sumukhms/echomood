import { useEffect, useState } from 'react';
import axios from 'axios';

export default function VaultGallery({ onPlayTrack }) {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVaultTracks = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await axios.get('http://127.0.0.1:5000/api/vault/tracks');
        const fetchedTracks = response.data?.tracks ?? [];
        setTracks(Array.isArray(fetchedTracks) ? fetchedTracks : []);
      } catch (err) {
        console.error('Failed to load vault tracks:', err);
        setError('Unable to load your vault tracks right now.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaultTracks();
  }, []);

  return (
    <div className="w-full border rounded-3xl border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="mb-6">
        <p className="text-xs tracking-widest text-zinc-500 uppercase mb-2">Personal Vault Library</p>
        <h3 className="font-serif text-2xl text-white">Saved Tracks</h3>
      </div>

      {isLoading && (
        <div className="p-6 text-center border rounded-2xl border-white/10 bg-black/20">
          <p className="text-sm text-zinc-300">Loading your vault tracks...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="p-6 text-center border rounded-2xl border-red-400/30 bg-red-500/10">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {!isLoading && !error && tracks.length === 0 && (
        <div className="p-6 text-center border rounded-2xl border-white/10 bg-black/20">
          <p className="text-sm text-zinc-300">No tracks in your vault yet.</p>
          <p className="text-xs text-zinc-500 mt-2">Upload a song above and it will appear here.</p>
        </div>
      )}

      {!isLoading && !error && tracks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tracks.map((track, index) => (
            <div
              key={`${track.file_url}-${index}`}
              className="relative flex flex-col p-4 transition-all duration-500 border group bg-white/5 backdrop-blur-md border-white/10 rounded-2xl hover:bg-white/10 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(212,175,55,0.15)]"
            >
              <div className="pb-3 text-left">
                <h4 className="font-serif text-lg text-white truncate group-hover:text-gold-400 transition-colors">
                  {track.track_name}
                </h4>
                <p className="text-sm font-light text-zinc-400 truncate mt-0.5">
                  {track.artist_name}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {(track.mood_tags || []).map((tag) => (
                  <span
                    key={`${track.file_url}-${tag}`}
                    className="px-2 py-1 text-[10px] tracking-widest uppercase rounded-full border border-gold-500/40 text-gold-300 bg-gold-500/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <button
                onClick={() => onPlayTrack && onPlayTrack(track)}
                className="w-full py-2 mt-auto text-xs tracking-widest uppercase rounded-xl border border-gold-500/50 text-gold-300 hover:bg-gold-500/20 transition-all"
              >
                Play
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
