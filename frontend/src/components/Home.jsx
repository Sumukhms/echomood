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
        const response = await axios.get(
          "http://127.0.0.1:5000/api/library/home",
        );
        const library = response.data?.library ?? {};
        setLibraryData(library);
      } catch (err) {
        console.error("Failed to load global library:", err);
        setError("Unable to load the library right now.");
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

  const renderTrackCard = (track, trackList, idx) => (
    <div
      key={`${track.track_name}-${track.artist_name}-${idx}`}
      className="relative flex-shrink-0 w-48 h-64 p-4 border rounded-2xl bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 hover:shadow-lg transition-all group cursor-pointer flex flex-col"
      onClick={() => onPlayTrack && onPlayTrack(trackList, idx)}
    >
      {/* Track artwork placeholder */}
      <div className="w-full h-32 rounded-xl bg-gradient-to-br from-gold-500/20 to-purple-500/20 mb-3 flex items-center justify-center">
        <span className="text-xs text-zinc-400">♪♪</span>
      </div>

      {/* Track info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-serif text-sm text-white truncate group-hover:text-gold-400 transition-colors">
            {track.track_name}
          </h4>
          <p className="text-xs font-light text-zinc-400 truncate mt-1">
            {track.artist_name}
          </p>
        </div>

        {/* Mood tag */}
        {track.mood && (
          <span className="text-[10px] tracking-widest uppercase px-2 py-1 rounded-full border border-gold-500/40 text-gold-300 bg-gold-500/10 w-fit mt-2">
            {track.mood}
          </span>
        )}
      </div>

      {/* Play button overlay */}
      <button
        className="absolute inset-0 flex items-center justify-center rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
        title="Play"
      >
        <span className="text-2xl text-gold-400">▶</span>
      </button>
    </div>
  );

  const renderShelf = (categoryName, tracks) => {
    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    return (
      <div key={categoryName} className="mb-12">
        <h3 className="text-xl font-serif text-gold-400 mb-4 px-6">
          {categoryName}
        </h3>
        <div className="flex overflow-x-auto gap-4 px-6 pb-4 scroll-smooth">
          {tracks.map((track, idx) => renderTrackCard(track, [...tracks], idx))}
        </div>
      </div>
    );
  };

  const renderSearchResults = () => {
    if (searchResults.length === 0) {
      return (
        <div className="p-8 text-center border rounded-2xl border-white/10 bg-black/20">
          <p className="text-sm text-zinc-300">
            No results found for "{searchQuery}". Try a different search.
          </p>
        </div>
      );
    }

    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <p className="text-sm text-zinc-400 px-6">
            Found {searchResults.length} result
            {searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-6">
          {searchResults.map((track, idx) =>
            renderTrackCard(track, searchResults, idx),
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-8 px-6">
        <h2 className="text-4xl font-serif text-white mb-2">Global Library</h2>
        <p className="text-sm text-zinc-400">
          Curated soundscapes from around the world, organized just for you.
        </p>
      </div>

      <SearchBar
        onSearchResults={handleSearchResults}
        onClear={handleClearSearch}
      />

      {isLoading && (
        <div className="p-8 text-center border rounded-2xl border-white/10 bg-black/20">
          <p className="text-sm text-zinc-300">Loading global library...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="p-8 text-center border rounded-2xl border-red-400/30 bg-red-500/10">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {!isLoading && !error && Object.keys(libraryData).length === 0 && (
        <div className="p-8 text-center border rounded-2xl border-white/10 bg-black/20">
          <p className="text-sm text-zinc-300">
            Library is empty. Run the seed script to populate it.
          </p>
        </div>
      )}

      {!isLoading &&
        !error &&
        Object.keys(libraryData).length > 0 &&
        searchQuery === "" && (
          <div className="animate-fade-in">
            {Object.entries(libraryData).map(([categoryName, tracks]) =>
              renderShelf(categoryName, tracks),
            )}
          </div>
        )}

      {!isLoading && !error && searchQuery !== "" && renderSearchResults()}
    </div>
  );
}
