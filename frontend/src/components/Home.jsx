import { useEffect, useState } from "react";
import axios from "axios";
import SearchBar from "./SearchBar";

export default function Home({ currentUser, onPlayTrack }) {
  const [libraryData, setLibraryData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await axios.get("http://127.0.0.1:5000/api/library/home");
        setLibraryData(response.data?.library ?? {});
      } catch {
        setError("Unable to load the library right now. Is the server running?");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLibrary();
  }, []);

  const handleSearchResults = (results, query) => {
    setSearchResults(results);
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchResults([]);
    setSearchQuery("");
  };

  // Correct signature: onPlayTrack(clickedTrack, fullTrackList)
  const handlePlay = (track, trackList) => {
    onPlayTrack?.(track, trackList);
  };

  const renderTrackCard = (track, trackList, idx) => (
    <div
      key={`${track.track_name}-${track.artist_name}-${idx}`}
      onClick={() => handlePlay(track, trackList)}
      className="relative flex-shrink-0 w-48 h-64 p-4 border rounded-2xl bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 hover:shadow-lg transition-all group cursor-pointer flex flex-col"
    >
      <div className="w-full h-32 rounded-xl bg-gradient-to-br from-gold-500/20 to-purple-500/20 mb-3 flex items-center justify-center">
        <span className="text-2xl opacity-50">♪</span>
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-serif text-sm text-white truncate group-hover:text-gold-400 transition-colors">
            {track.track_name}
          </h4>
          <p className="text-xs font-light text-zinc-400 truncate mt-1">
            {track.artist_name}
          </p>
        </div>
        {track.mood && (
          <span className="text-[10px] tracking-widest uppercase px-2 py-1 rounded-full border border-gold-500/40 text-gold-300 bg-gold-500/10 w-fit mt-2">
            {track.mood}
          </span>
        )}
      </div>
      {/* Play overlay */}
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
        <span className="text-2xl text-gold-400">▶</span>
      </div>
    </div>
  );

  const renderShelf = (categoryName, tracks) => {
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    // Pass the same array reference to every card so the queue is full
    const trackList = [...tracks];
    return (
      <div key={categoryName} className="mb-12">
        <h3 className="text-xl font-serif text-gold-400 mb-4 px-1">
          {categoryName}
        </h3>
        <div className="flex overflow-x-auto gap-4 pb-4 scroll-smooth">
          {trackList.map((track, idx) =>
            renderTrackCard(track, trackList, idx)
          )}
        </div>
      </div>
    );
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-4xl font-serif text-white mb-2">Global Library</h2>
        <p className="text-sm text-zinc-400">
          Curated soundscapes from around the world, organised just for you.
        </p>
      </div>

      <SearchBar
        onSearchResults={handleSearchResults}
        onClear={handleClearSearch}
      />

      {/* Loading */}
      {isLoading && (
        <div className="p-10 text-center border rounded-2xl border-white/10 bg-white/5 backdrop-blur-md">
          <p className="text-sm text-zinc-300">Loading global library…</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="p-10 text-center border rounded-2xl border-red-400/30 bg-red-500/10 backdrop-blur-md">
          <p className="text-sm text-red-200">{error}</p>
          <p className="text-xs text-red-300/60 mt-2">
            Run the seed script to populate the library, then restart the server.
          </p>
        </div>
      )}

      {/* Empty library */}
      {!isLoading && !error && Object.keys(libraryData).length === 0 && searchQuery === "" && (
        <div className="p-10 text-center border rounded-2xl border-white/10 bg-white/5 backdrop-blur-md">
          <p className="text-sm text-zinc-300">The library is empty.</p>
          <p className="text-xs text-zinc-500 mt-2">
            Run <code className="text-gold-400">python seed_library.py</code> to populate it.
          </p>
        </div>
      )}

      {/* Library shelves */}
      {!isLoading && !error && Object.keys(libraryData).length > 0 && searchQuery === "" && (
        <div className="animate-fade-in">
          {Object.entries(libraryData).map(([categoryName, tracks]) =>
            renderShelf(categoryName, tracks)
          )}
        </div>
      )}

      {/* Search results */}
      {!isLoading && searchQuery !== "" && (
        <div className="animate-fade-in">
          {searchResults.length === 0 ? (
            <div className="p-10 text-center border rounded-2xl border-white/10 bg-white/5 backdrop-blur-md">
              <p className="text-sm text-zinc-300">
                No results for &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                Try searching by track name, artist, mood, or category.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-400 mb-6">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {searchResults.map((track, idx) =>
                  renderTrackCard(track, searchResults, idx)
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}