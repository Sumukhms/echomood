import { useState, useCallback, useEffect } from "react";
import axios from "axios";

export default function SearchBar({ onSearchResults, onClear }) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search function
  const performSearch = useCallback(
    async (searchQuery) => {
      if (!searchQuery || searchQuery.trim().length === 0) {
        onClear();
        return;
      }

      try {
        setIsSearching(true);
        const response = await axios.get(
          "https://sumukh25-echomood-api.hf.space/api/library/search",
          {
            params: { q: searchQuery },
          },
        );
        const results = response.data?.results ?? [];
        onSearchResults(results, searchQuery);
      } catch (err) {
        console.error("Search failed:", err);
        onSearchResults([], searchQuery);
      } finally {
        setIsSearching(false);
      }
    },
    [onSearchResults, onClear],
  );

  // Debounce handler
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleClear = () => {
    setQuery("");
    onClear();
  };

  return (
    <div className="w-full mb-12">
      <div className="relative max-w-2xl mx-auto">
        <div className="relative flex items-center">
          {/* Search Icon */}
          <svg
            className="absolute left-4 w-5 h-5 text-gold-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          {/* Input Field */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by track name, artist, mood, or category..."
            className="w-full pl-12 pr-12 py-4 text-white bg-black/40 border border-white/20 rounded-full focus:outline-none focus:border-gold-500 transition placeholder-zinc-500"
          />

          {/* Clear Button */}
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-4 text-zinc-400 hover:text-gold-400 transition"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Loading indicator */}
        {isSearching && (
          <div className="absolute top-full left-0 right-0 mt-2 text-center text-xs text-zinc-400">
            Searching...
          </div>
        )}
      </div>
    </div>
  );
}
