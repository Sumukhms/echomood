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
  // Tool Toggles
  const [showAiTools, setShowAiTools] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Playlist View State
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [vibeHistory, setVibeHistory] = useState([]);

  const fetchVibeHistory = async () => {
    if (!currentUser?.username) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/mood/history?username=${currentUser.username}`);
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

  const [isGeneratingRadio, setIsGeneratingRadio] = useState(false);

  const handleStartSmartRadio = async () => {
    setIsGeneratingRadio(true);
    try {
      const dominantMood = vibeStats?.dominantMood || (userProfile?.preferences?.vibes && userProfile.preferences.vibes[0]) || "calm";
      const payload = {
        username: currentUser?.username,
        seed_mood: dominantMood
      };
      const res = await axios.post("http://localhost:5000/api/radio/next", payload);
      if (res.data?.success && res.data.tracks?.length > 0) {
        onPlayTrack(res.data.tracks[0], res.data.tracks, { isEndless: true, seedMood: dominantMood });
      }
    } catch (err) {
      console.error("Failed to start smart radio", err);
    } finally {
      setIsGeneratingRadio(false);
    }
  };

  const handleStartQuickVibe = async (vibe) => {
    setIsGeneratingRadio(true);
    try {
      const payload = {
        username: currentUser?.username,
        seed_mood: vibe
      };
      const res = await axios.post("http://localhost:5000/api/radio/next", payload);
      if (res.data?.success && res.data.tracks?.length > 0) {
        onPlayTrack(res.data.tracks[0], res.data.tracks, { isEndless: true, seedMood: vibe });
      }
    } catch (err) {
      console.error(`Failed to start ${vibe} radio`, err);
    } finally {
      setIsGeneratingRadio(false);
    }
  };

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        setIsLoading(true);
        setError("");
        const params = { _t: Date.now() };
        if (currentUser?.username) {
          params.username = currentUser.username;
        }
        const response = await axios.get("http://localhost:5000/api/library/home", { params });
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

  const generatePlaylistName = (mood) => {
    const m = mood?.toLowerCase() || "";
    const prefixes = ["Midnight", "Neon", "Velvet", "Golden", "Astral", "Electric", "Silent", "Echoing", "Vibrant", "Deep", "Crystal"];
    const nouns = {
      happy: ["Sunshine", "Vibes", "Groove", "Glow", "Breeze"],
      sad: ["Tears", "Shadows", "Rain", "Echoes", "Melancholy"],
      energetic: ["Pulse", "Surge", "Fire", "Storm", "Rush"],
      calm: ["Whispers", "Breeze", "Waves", "Zen", "Horizons"],
      focused: ["Flow", "Mind", "Clarity", "Zone", "Currents"],
      romantic: ["Heartbeats", "Blush", "Embrace", "Desire", "Sparks"]
    };
    const suffix = nouns[m] || ["Mix", "Session", "Journey", "Soundscape", "Aura"];
    
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = suffix[Math.floor(Math.random() * suffix.length)];
    
    return `✨ ${randomPrefix} ${randomSuffix}`;
  };

  const handleMoodDetected = (mood, tracks, explanation) => {
    setActivePlaylist({
      name: generatePlaylistName(mood),
      description: explanation || "A custom mix created by your AI DJ.",
      tracks: tracks,
      isAi: true,
      mood: mood // Save the mood for cover generation
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(fetchVibeHistory, 1000);
  };

  const handleSavePlaylist = async () => {
    if (!currentUser?.username || !activePlaylist) return;
    setIsSaving(true);
    try {
      const coverImage = activePlaylist.tracks?.find(t => t.cover_url)?.cover_url;
      const validCovers = ["happy", "sad", "energetic", "calm", "focused"];
      const coverName = validCovers.includes(activePlaylist.mood?.toLowerCase()) 
        ? activePlaylist.mood.toLowerCase() 
        : "calm";
      const finalCoverUrl = coverImage || `/covers/${coverName}.png`;
        
      await axios.post("http://localhost:5000/api/playlists/save_ai", {
        username: currentUser.username,
        name: activePlaylist.name,
        tracks: activePlaylist.tracks,
        cover_url: finalCoverUrl
      });
      // Emit library update event
      window.dispatchEvent(new Event('libraryUpdate'));
      // Update UI to show it's saved
      setActivePlaylist(prev => ({ ...prev, isSaved: true }));
    } catch (error) {
      console.error("Failed to save playlist", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderTrackCard = (track, trackList, idx) => (
    <div
      key={`${track.track_name}-${track.artist_name}-${idx}`}
      onClick={() => handlePlay(track, trackList)}
      className="flex flex-col group cursor-pointer w-full hover:scale-[1.02] transition-transform min-w-0"
    >
      <div className="aspect-square w-full rounded-2xl overflow-hidden relative border border-white/10 group-hover:border-gold-500/50 transition-all bg-zinc-900 flex-shrink-0 shadow-md">
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={track.track_name}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 pointer-events-none"
          />
        ) : (
          <div 
            className="w-full h-full opacity-80 pointer-events-none"
            style={{ background: getVibeGradient(track.mood || (track.mood_tags ? track.mood_tags[0] : null)) }}
          />
        )}
        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gold-500 text-black flex items-center justify-center shadow-lg transition-all transform scale-90 sm:scale-100 opacity-100 sm:opacity-0 group-hover:opacity-100 hover:scale-105">
          <span className="text-sm sm:text-lg ml-0.5">▶</span>
        </div>
      </div>
      <div className="mt-2.5 px-1 min-w-0">
        <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-gold-400 transition-colors">
          {track.track_name}
        </h4>
        <p className="text-[10px] sm:text-xs text-zinc-400 truncate mt-0.5">
          {track.artist_name}
        </p>
        {track.mood && (
          <span className="inline-block text-[8px] sm:text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-full border border-gold-500/40 text-gold-300 bg-gold-500/10 mt-1.5">
            {track.mood}
          </span>
        )}
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
        className="flex flex-col group cursor-pointer w-full hover:scale-[1.02] transition-transform min-w-0"
      >
        <div className="aspect-square w-full rounded-2xl overflow-hidden relative border border-white/10 group-hover:border-gold-500/50 transition-all bg-zinc-900 flex-shrink-0 shadow-md">
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 bg-black opacity-80 group-hover:opacity-60 transition-opacity">
            {covers.map((c, i) => (
              <img key={i} src={c} alt="mix cover" className="w-full h-full object-cover pointer-events-none" />
            ))}
            {covers.length < 4 && Array.from({ length: 4 - covers.length }).map((_, i) => (
              <div key={`empty-${i}`} className="w-full h-full bg-zinc-800" />
            ))}
          </div>
          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gold-500 text-black flex items-center justify-center shadow-lg transition-all transform scale-90 sm:scale-100 opacity-100 sm:opacity-0 group-hover:opacity-100 hover:scale-105">
            <span className="text-sm sm:text-lg ml-0.5">▶</span>
          </div>
        </div>
        <div className="mt-2.5 px-1 min-w-0">
          <span className="text-[8px] sm:text-[9px] tracking-widest uppercase text-gold-400 font-bold mb-0.5 sm:mb-1 block">Made For You</span>
          <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-gold-400 transition-colors">
            {categoryName}
          </h4>
          <p className="text-[10px] sm:text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
            {tracks.slice(0, 3).map(t => t.artist_name).join(", ")} and more
          </p>
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
  const regularShelves = Object.entries(libraryData).filter(([name]) => !isFeatured(name) && name !== "Popular Artists");
  
  const popularArtists = libraryData["Popular Artists"] || [];
  
  // Collect 10 random standalone tracks for "Quick Picks"
  const quickPicks = useMemo(() => {
    if (!libraryData) return [];
    let all = [];
    Object.values(libraryData).forEach(tracks => {
      if (Array.isArray(tracks)) all.push(...tracks);
    });
    // Shuffle and pick tracks for a massive pool of singles
    const shuffled = all.sort(() => 0.5 - Math.random());
    // Deduplicate by track name
    const seen = new Set();
    const finalPicks = [];
    for (let t of shuffled) {
      if (!seen.has(t.track_name.toLowerCase())) {
        seen.add(t.track_name.toLowerCase());
        finalPicks.push(t);
        if (finalPicks.length === 200) break;
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

        <div className="flex flex-col md:flex-row items-center md:items-end text-center md:text-left gap-6 sm:gap-8 mb-8 sm:mb-10 pb-8 sm:pb-10 border-b border-white/10">
          <div className="w-48 h-48 sm:w-40 sm:h-40 md:w-52 md:h-52 shrink-0 rounded-lg overflow-hidden shadow-2xl relative bg-zinc-800">
            {coverImage ? (
              <img src={coverImage} alt="playlist cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: getVibeGradient('party') }} />
            )}
          </div>
          <div className="flex flex-col items-center md:items-start w-full">
            <p className="text-xs uppercase tracking-widest text-white block mb-2 font-bold">{isAi ? 'AI Generated' : 'Playlist'}</p>
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tighter mb-4">{name}</h1>
            <p className="text-zinc-400 text-sm">{description}</p>
            <p className="text-zinc-500 text-xs mt-2 font-bold tracking-widest uppercase">
              Echomood • {tracks.length} songs
            </p>
          </div>
        </div>

        <div className="mb-10 flex gap-3 sm:gap-4 items-center justify-center md:justify-start flex-wrap">
          <button 
            onClick={() => handlePlay(tracks[0], tracks)}
            className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-gold-500 text-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] shrink-0"
          >
            <span className="text-xl sm:text-2xl ml-1">▶</span>
          </button>
          
          <button
            onClick={async () => {
              const shareUrl = `${window.location.origin}/?play=${encodeURIComponent(tracks[0]?.track_name || name)}`;
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: `Listen to ${name} on EchoMood`,
                    text: `Check out this playlist I'm vibing to!`,
                    url: shareUrl
                  });
                } catch (e) {}
              } else {
                navigator.clipboard.writeText(shareUrl);
                alert("Playlist link copied!");
              }
            }}
            className="px-4 py-3 sm:px-6 sm:py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all text-xs sm:text-sm font-medium tracking-wide border border-white/10 flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
            <span className="hidden sm:inline">Share</span>
          </button>

          {isAi && (
            <button 
              onClick={() => onPlayTrack(tracks[0], tracks, { isEndless: true, seedMood: activePlaylist.mood })}
              disabled={isGeneratingRadio}
              className="px-4 py-3 sm:px-6 sm:py-3 rounded-full bg-gold-500 text-black hover:bg-gold-400 hover:scale-105 transition-all text-xs sm:text-sm font-medium tracking-wide shadow-[0_0_20px_rgba(234,179,8,0.2)] flex items-center gap-2 shrink-0"
            >
              <span>🎧</span> Start Endless DJ Session
            </button>
          )}

          {activePlaylist.isSaved ? (
            <button 
              disabled={true}
              className="px-4 py-3 sm:px-6 sm:py-3 rounded-full bg-emerald-500/25 text-emerald-400 text-xs sm:text-sm font-medium tracking-wide border border-emerald-500/30 flex items-center gap-2 shrink-0 cursor-default"
            >
              <span>✓</span> Saved to Library
            </button>
          ) : (
            <button 
              onClick={handleSavePlaylist}
              disabled={isSaving}
              className="px-4 py-3 sm:px-6 sm:py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all text-xs sm:text-sm font-medium tracking-wide border border-white/10 disabled:opacity-50 shrink-0"
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
                <p className="text-sm sm:text-base text-white font-medium group-hover:text-gold-400 transition-colors line-clamp-1">{track.track_name}</p>
                <p className="text-xs sm:text-sm text-zinc-400 line-clamp-1">{track.artist_name}</p>
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
      
      {/* Sleek AI DJ Banner */}
      <div 
        onClick={() => setShowAiModal(true)}
        className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-gold-500/10 via-zinc-900 to-black border border-gold-500/20 p-4 sm:p-5 flex items-center justify-between cursor-pointer group hover:border-gold-500/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            ✨
          </div>
          <div>
            <h3 className="text-white font-serif text-lg sm:text-xl font-bold tracking-wide group-hover:text-gold-400 transition-colors">Need a vibe check? Start AI DJ</h3>
            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">Let your camera, voice, or text dictate the perfect mix.</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center justify-center px-6 py-2 rounded-full bg-white/10 text-white font-medium text-sm group-hover:bg-gold-500 group-hover:text-black transition-colors">
          Open AI DJ
        </div>
      </div>

      {/* AI DJ Modal Overlay */}
      {showAiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-gold-500/20 rounded-3xl shadow-2xl p-6 hide-scrollbar">
            <button 
              onClick={() => setShowAiModal(false)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white text-xl transition-colors z-10"
            >
              ✕
            </button>
            <h2 className="text-2xl font-serif text-white mb-6 pr-12">Your Personal AI DJ</h2>
            <UnifiedAIPanel
              userProfile={userProfile}
              username={currentUser?.username}
              onAnalyzeComplete={(mood, tracks, explanation) => {
                setShowAiModal(false);
                handleMoodDetected(mood, tracks, explanation);
              }}
            />
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
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 md:gap-6">
                {searchResults.map((track, idx) => renderTrackCard(track, searchResults, idx))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Spotify-style Home Layout */}
      {!isLoading && !error && searchQuery === "" && (
        <div className="animate-fade-in space-y-14">
          
          {/* Popular Artists Circular Row */}
          {popularArtists.length > 0 && (
            <section>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-white mb-6 px-1">Popular Artists</h2>
              <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 hide-scrollbar snap-x">
                {Array.from(new Map(popularArtists.map(t => [t.artist_name, t])).values()).map((track, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setActivePlaylist({ name: `This Is ${track.artist_name}`, tracks: popularArtists.filter(t => t.artist_name === track.artist_name), description: `Best of ${track.artist_name}` })}
                    className="flex flex-col items-center gap-3 cursor-pointer group min-w-[100px] sm:min-w-[120px] snap-start shrink-0"
                  >
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-transparent group-hover:border-gold-500 transition-all shadow-lg relative">
                      {track.artist_image_url ? (
                        <img src={track.artist_image_url} alt={track.artist_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-80 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                           <span className="text-3xl sm:text-4xl text-white font-bold tracking-tighter opacity-50">{track.artist_name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-white text-center truncate w-full px-2 group-hover:text-gold-400 transition-colors">{track.artist_name}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Made For You Grid */}
          {featuredMixes.length > 0 && (
            <section>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-white mb-6 px-1">Made For You</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
                {featuredMixes.map(([name, tracks]) => renderMixCard(name, tracks))}
              </div>
            </section>
          )}

          {/* Regular Categories as Playlists */}
          {regularShelves.length > 0 && (
            <section className="mb-14">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-white mb-6 px-1">Browse Categories</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                {regularShelves.map(([categoryName, tracks]) => renderMixCard(categoryName, tracks))}
              </div>
            </section>
          )}

          {/* Standalone Quick Picks (Moved Below Playlists) */}
          {quickPicks.length > 0 && (
            <section className="pt-8 border-t border-white/5">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-white mb-8 text-center">Discover Songs</h2>
              <div className="flex flex-col gap-2 sm:gap-3 max-w-4xl mx-auto pb-20">
                {quickPicks.map((track, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handlePlay(track, quickPicks)} 
                    className="group flex items-center justify-between p-3 sm:p-4 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-all hover:scale-[1.01] border border-transparent hover:border-gold-500/30"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="text-zinc-500 text-sm font-medium w-8 text-center hidden sm:block group-hover:hidden">
                        {idx + 1}
                      </div>
                      <div className="text-gold-500 text-sm font-medium w-8 text-center hidden group-hover:block sm:group-hover:block">
                        ▶
                      </div>
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 shadow-md">
                        <img src={track.cover_url || '/placeholder.jpg'} alt="cover" className="w-full h-full object-cover rounded-md bg-zinc-800" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors rounded-md" />
                      </div>
                      <div className="ml-4 flex-1 overflow-hidden min-w-0 pr-4">
                        <p className="text-white font-semibold text-sm sm:text-base truncate group-hover:text-gold-400 transition-colors">{track.track_name}</p>
                        <p className="text-zinc-400 text-xs sm:text-sm truncate mt-0.5">{track.artist_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <button className="text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 hidden sm:block">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      </button>
                      <button className="text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                      </button>
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