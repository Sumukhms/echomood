import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import SearchBar from "./SearchBar";
import UnifiedAIPanel from "./UnifiedAIPanel";

const getVibeGradient = (mood) => {
  switch (mood?.toLowerCase()) {
    case "happy": return "linear-gradient(135deg, #ea580c 0%, #fcd34d 100%)";
    case "sad": return "linear-gradient(135deg, #1e3a8a 0%, #60a5fa 100%)";
    case "angry": return "linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)";
    case "calm": return "linear-gradient(135deg, #064e3b 0%, #34d399 100%)";
    case "energetic": return "linear-gradient(135deg, #be185d 0%, #f472b6 100%)";
    case "romantic": return "linear-gradient(135deg, #9f1239 0%, #fb7185 100%)";
    case "nostalgic": return "linear-gradient(135deg, #854d0e 0%, #fbbf24 100%)";
    case "focused": return "linear-gradient(135deg, #4c1d95 0%, #a78bfa 100%)";
    case "party": return "linear-gradient(135deg, #6d28d9 0%, #c084fc 100%)";
    case "sleepy": return "linear-gradient(135deg, #0f172a 0%, #64748b 100%)";
    default: return "linear-gradient(135deg, #52525b 0%, #09090b 100%)";
  }
};

export default function Home({ currentUser, userProfile, onPlayTrack }) {
  const [libraryData, setLibraryData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Playlist View State
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [vibeHistory, setVibeHistory] = useState([]);

  const fetchVibeHistory = async () => {
    if (!currentUser?.username) return;
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/mood/history?username=${currentUser.username}`);
      if (res.data?.success) {
        setVibeHistory(res.data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch vibe history", err);
    }
  };

  useEffect(() => {
    fetchVibeHistory();
  }, [currentUser]);

  const vibeStats = useMemo(() => {
    if (vibeHistory.length === 0) return null;
    const counts = {};
    vibeHistory.forEach(h => {
      const m = h.mood;
      counts[m] = (counts[m] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const dominantMood = sorted[0][0];
    
    const total = vibeHistory.length;
    const breakdown = sorted.map(([mood, count]) => ({
      mood,
      count,
      percentage: Math.round((count / total) * 100)
    }));
    
    let advice = "Your vibes are balanced. Continue exploring new soundscapes!";
    if (dominantMood === "happy") {
      advice = "You're radiating positive energy! Keep the momentum going with upbeat house or pop beats.";
    } else if (dominantMood === "sad") {
      advice = "It seems you're in a reflective, gentle mood. Indulge in warm acoustic sounds or low-key lo-fi tracks.";
    } else if (dominantMood === "calm") {
      advice = "You are in a peaceful flow state. Keep it centered with some ambient synths or acoustic guitar tracks.";
    } else if (dominantMood === "energetic") {
      advice = "High-octane energy detected! Tap into hard electronic music or high-bpm dance playlists.";
    } else if (dominantMood === "focused") {
      advice = "Deep focus zone. Keep distractions away with deep house, classical, or synthwave study mixes.";
    }
    
    return { dominantMood, breakdown, advice };
  }, [vibeHistory]);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        setIsLoading(true);
        setError("");
        const params = { _t: Date.now() };
        if (currentUser?.username) {
          params.username = currentUser.username;
        }
        const response = await axios.get("http://127.0.0.1:5000/api/library/home", { params });
        setLibraryData(response.data?.library ?? {});
      } catch {
        setError("Unable to load the library right now. Is the server running?");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLibrary();
  }, [currentUser, userProfile]);

  const handleSearchResults = (results, query) => {
    setSearchResults(results);
    setSearchQuery(query);
    setActivePlaylist(null);
  };

  const handleClearSearch = () => {
    setSearchResults([]);
    setSearchQuery("");
  };

  const handlePlay = (track, trackList) => {
    onPlayTrack?.(track, trackList);
  };

  const handleMoodDetected = (mood, tracks, explanation) => {
    setActivePlaylist({
      name: `✨ AI Gen: ${mood}`,
      description: explanation || "A custom mix created by your AI DJ.",
      tracks: tracks,
      isAi: true,
      mood: mood // Save the mood for cover generation
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(fetchVibeHistory, 1000);
  };

  const handleSaveAiPlaylist = async () => {
    if (!currentUser?.username || !activePlaylist || !activePlaylist.isAi) return;
    setIsSaving(true);
    try {
      const validCovers = ["happy", "sad", "energetic", "calm", "focused"];
      const coverName = validCovers.includes(activePlaylist.mood?.toLowerCase()) 
        ? activePlaylist.mood.toLowerCase() 
        : "calm";
        
      await axios.post("http://127.0.0.1:5000/api/playlists/save_ai", {
        username: currentUser.username,
        name: activePlaylist.name,
        tracks: activePlaylist.tracks,
        cover_url: `/covers/${coverName}.png`
      });
      // Emit library update event
      window.dispatchEvent(new Event('libraryUpdate'));
      // Update UI to show it's saved (remove 'isAi' flag so button disappears)
      setActivePlaylist(prev => ({ ...prev, isAi: false, description: "Saved to your library." }));
    } catch (error) {
      console.error("Failed to save AI playlist", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderTrackCard = (track, trackList, idx) => (
    <div
      key={`${track.track_name}-${track.artist_name}-${idx}`}
      onClick={() => handlePlay(track, trackList)}
      className="relative flex-shrink-0 w-48 h-64 p-4 border rounded-2xl bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 hover:shadow-xl transition-all group cursor-pointer flex flex-col"
    >
      {track.cover_url ? (
        <div className="w-full h-32 rounded-xl overflow-hidden bg-black mb-3 relative pointer-events-none shadow-md group-hover:shadow-lg transition-all">
          <img
            src={track.cover_url}
            alt={track.track_name}
            className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div 
          className="w-full h-32 rounded-xl mb-3 pointer-events-none opacity-80 shadow-md"
          style={{ background: getVibeGradient(track.mood || (track.mood_tags ? track.mood_tags[0] : null)) }}
        />
      )}
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
      <div className="absolute bottom-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-gold-500 text-black opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-lg hover:scale-105">
        <span className="text-xl ml-1">▶</span>
      </div>
    </div>
  );

  const renderMixCard = (categoryName, tracks) => {
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    const covers = tracks.map(t => t.cover_url).filter(Boolean).slice(0, 4);

    return (
      <div
        key={categoryName}
        onClick={() => setActivePlaylist({ name: categoryName, tracks, description: "Curated especially for you." })}
        className="relative group cursor-pointer overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 hover:border-gold-500/50 transition-all hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] h-64 flex flex-col"
      >
        <div className="flex-1 w-full grid grid-cols-2 grid-rows-2 gap-0.5 bg-black opacity-60 group-hover:opacity-40 transition-opacity">
          {covers.map((c, i) => (
            <img key={i} src={c} alt="mix cover" className="w-full h-full object-cover" />
          ))}
          {covers.length < 4 && Array.from({ length: 4 - covers.length }).map((_, i) => (
            <div key={`empty-${i}`} className="w-full h-full bg-zinc-800" />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
          <div>
            <span className="text-[10px] tracking-widest uppercase text-gold-400 font-bold mb-1 block">Made For You</span>
            <h3 className="text-2xl font-serif text-white group-hover:text-gold-300 transition-colors">{categoryName}</h3>
            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
              {tracks.slice(0, 3).map(t => t.artist_name).join(", ")} and more
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderShelf = (categoryName, tracks) => {
    // Deprecated: We now render all categories as MixCards (Playlist view)
    return null;
  };

  const isFeatured = (name) => name.startsWith("Your Daily Mix") || name.startsWith("This Is") || name === "Decade Throwbacks";
  const featuredMixes = Object.entries(libraryData).filter(([name]) => isFeatured(name));
  const regularShelves = Object.entries(libraryData).filter(([name]) => !isFeatured(name));
  
  // Collect 10 random standalone tracks for "Quick Picks"
  const quickPicks = useMemo(() => {
    if (!libraryData) return [];
    let all = [];
    Object.values(libraryData).forEach(tracks => {
      if (Array.isArray(tracks)) all.push(...tracks);
    });
    // Shuffle and pick 30 tracks for a massive pool of singles
    const shuffled = all.sort(() => 0.5 - Math.random());
    // Deduplicate by track name
    const seen = new Set();
    const finalPicks = [];
    for (let t of shuffled) {
      if (!seen.has(t.track_name.toLowerCase())) {
        seen.add(t.track_name.toLowerCase());
        finalPicks.push(t);
        if (finalPicks.length === 30) break;
      }
    }
    return finalPicks;
  }, [libraryData]);

  // --- PLAYLIST VIEW RENDERING ---
  if (activePlaylist) {
    const { name, description, tracks, isAi } = activePlaylist;
    const coverImage = tracks.find(t => t.cover_url)?.cover_url;

    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 animate-fade-in">
        <button 
          onClick={() => setActivePlaylist(null)}
          className="text-zinc-400 hover:text-white flex items-center gap-2 mb-8 text-sm uppercase tracking-widest transition-colors"
        >
          <span>←</span> Back to Home
        </button>

        <div className="flex flex-col md:flex-row items-end gap-8 mb-10 pb-10 border-b border-white/10">
          <div className="w-52 h-52 shrink-0 rounded-lg overflow-hidden shadow-2xl relative bg-zinc-800">
            {coverImage ? (
              <img src={coverImage} alt="playlist cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: getVibeGradient('party') }} />
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-white block mb-2 font-bold">{isAi ? 'AI Generated' : 'Playlist'}</p>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4">{name}</h1>
            <p className="text-zinc-400 text-sm">{description}</p>
            <p className="text-zinc-500 text-xs mt-2 font-bold tracking-widest uppercase">
              Echomood • {tracks.length} songs
            </p>
          </div>
        </div>

        <div className="mb-10 flex gap-4 items-center">
          <button 
            onClick={() => handlePlay(tracks[0], tracks)}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-gold-500 text-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]"
          >
            <span className="text-2xl ml-1">▶</span>
          </button>
          {isAi && (
            <button 
              onClick={handleSaveAiPlaylist}
              disabled={isSaving}
              className="px-6 py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all font-medium tracking-wide border border-white/10 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save to Library"}
            </button>
          )}
        </div>

        {/* Tracks List */}
        <div className="flex flex-col gap-2">
          {tracks.map((track, idx) => (
            <div 
              key={idx}
              onClick={() => handlePlay(track, tracks)}
              className="group flex items-center p-3 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
            >
              <div className="w-8 text-center text-zinc-500 group-hover:hidden text-sm">
                {idx + 1}
              </div>
              <div className="w-8 text-center text-white hidden group-hover:block text-sm">
                ▶
              </div>
              
              <img src={track.cover_url || '/placeholder.jpg'} alt="cover" className="w-12 h-12 object-cover rounded mr-4 bg-zinc-800" />
              
              <div className="flex-1">
                <p className="text-white font-medium group-hover:text-gold-400 transition-colors line-clamp-1">{track.track_name}</p>
                <p className="text-zinc-400 text-sm line-clamp-1">{track.artist_name}</p>
              </div>
              
              {track.mood && (
                <div className="hidden md:block px-4">
                  <span className="text-[10px] tracking-widest uppercase px-2 py-1 rounded-full border border-white/20 text-zinc-300">
                    {track.mood}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- HOME VIEW RENDERING ---

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-20 animate-fade-in">
      
      {/* AI DJ Integrated Globally */}
      <div className="mb-14">
        <UnifiedAIPanel
          userProfile={userProfile}
          username={currentUser?.username}
          onAnalyzeComplete={handleMoodDetected}
        />
      </div>

      {/* Vibe Insights Dashboard Widget */}
      {vibeHistory.length > 0 && vibeStats && (
        <div className="mb-14 border rounded-3xl border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-8 animate-fade-in">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Left side: Vibe breakdown */}
            <div className="flex-1 w-full">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">📊</span>
                <div>
                  <h3 className="font-serif text-2xl text-white">Your Vibe Insights</h3>
                  <p className="text-xs text-zinc-500 tracking-wider uppercase mt-0.5">Vibe analytics based on your AI DJ check-ins</p>
                </div>
              </div>
              
              <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
                Dominant Mood: <span className="font-serif text-lg text-gold-400 capitalize italic font-bold">{vibeStats.dominantMood}</span>. {vibeStats.advice}
              </p>

              {/* Progress bars representing percentages */}
              <div className="space-y-4">
                {vibeStats.breakdown.slice(0, 3).map(({ mood, percentage }) => (
                  <div key={mood} className="w-full">
                    <div className="flex justify-between text-xs mb-1.5 uppercase tracking-widest text-zinc-400">
                      <span className="font-medium text-white">{mood}</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all duration-1000" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side: Check-in timeline */}
            <div className="w-full lg:w-96 shrink-0 bg-black/40 border border-white/5 rounded-2xl p-5">
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Vibe Log Timeline</h4>
              <div className="space-y-4">
                {vibeHistory.slice(0, 4).map((h, i) => {
                  const checkinTime = new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const checkinDate = new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
                  
                  let sourceIcon = "📝";
                  if (h.source === "voice") sourceIcon = "🎙️";
                  if (h.source === "face") sourceIcon = "📷";
                  
                  return (
                    <div key={i} className="flex items-center gap-3.5 pb-3 border-b border-white/5 last:border-b-0 last:pb-0">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
                        {sourceIcon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white capitalize font-medium">{h.mood} Vibe</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5 capitalize">{h.source} Check-in</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-zinc-400">{checkinTime}</p>
                        <p className="text-[9px] text-zinc-600 mt-0.5">{checkinDate}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      <div className="mb-10">
        <SearchBar
          onSearchResults={handleSearchResults}
          onClear={handleClearSearch}
        />
      </div>

      {isLoading && (
        <div className="animate-pulse">
          <div className="h-8 bg-white/5 rounded w-48 mb-6 mt-8"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex flex-col gap-3">
                <div className="w-full h-32 rounded-xl bg-white/5"></div>
                <div className="h-4 bg-white/5 rounded w-3/4"></div>
                <div className="h-3 bg-white/5 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="p-10 text-center border rounded-2xl border-red-400/30 bg-red-500/10 backdrop-blur-md">
          <p className="text-lg text-red-200 mb-2">{error}</p>
          <p className="text-sm text-red-300/60">
            Ensure the Python backend is running perfectly.
          </p>
        </div>
      )}

      {/* Search results */}
      {!isLoading && searchQuery !== "" && (
        <div className="animate-fade-in mb-14">
          {searchResults.length === 0 ? (
            <div className="py-20 text-center border rounded-3xl border-white/5 bg-white/5 backdrop-blur-md">
              <h3 className="text-2xl font-serif text-white mb-2">No matches found</h3>
              <p className="text-zinc-500">
                We couldn't find anything for "{searchQuery}". Try a different mood or artist.
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end mb-6">
                <h3 className="text-2xl font-serif text-white">Top Results for "{searchQuery}"</h3>
                <span 
                  onClick={() => setActivePlaylist({ name: `Search: ${searchQuery}`, tracks: searchResults, description: "Your search results" })}
                  className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white cursor-pointer"
                >
                  View as Playlist
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {searchResults.map((track, idx) => renderTrackCard(track, searchResults, idx))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Spotify-style Home Layout */}
      {!isLoading && !error && searchQuery === "" && (
        <div className="animate-fade-in space-y-14">
          
          {/* Made For You Grid */}
          {featuredMixes.length > 0 && (
            <section>
              <h2 className="text-3xl font-serif text-white mb-6 px-1">Made For You</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredMixes.map(([name, tracks]) => renderMixCard(name, tracks))}
              </div>
            </section>
          )}

          {/* Regular Categories as Playlists */}
          {regularShelves.length > 0 && (
            <section className="mb-14">
              <h2 className="text-3xl font-serif text-white mb-6 px-1">Browse Categories</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {regularShelves.map(([categoryName, tracks]) => renderMixCard(categoryName, tracks))}
              </div>
            </section>
          )}

          {/* Standalone Quick Picks (Moved Below Playlists) */}
          {quickPicks.length > 0 && (
            <section>
              <h2 className="text-3xl font-serif text-white mb-6 px-1">Quick Picks (Singles)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickPicks.map((track, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handlePlay(track, quickPicks)} 
                    className="group flex items-center p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors shadow-sm hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]"
                  >
                    <div className="relative w-14 h-14 shrink-0">
                      <img src={track.cover_url || '/placeholder.jpg'} alt="cover" className="w-full h-full object-cover rounded shadow-md bg-zinc-800" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity">
                        <span className="text-white text-lg ml-1">▶</span>
                      </div>
                    </div>
                    <div className="ml-4 flex-1 overflow-hidden">
                      <p className="text-white font-medium text-sm truncate group-hover:text-gold-400 transition-colors">{track.track_name}</p>
                      <p className="text-zinc-400 text-xs truncate mt-1">{track.artist_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}