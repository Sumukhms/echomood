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

  const [isGeneratingRadio, setIsGeneratingRadio] = useState(false);

  const handleStartSmartRadio = async () => {
    setIsGeneratingRadio(true);
    try {
      const dominantMood = vibeStats?.dominantMood || (userProfile?.preferences?.vibes && userProfile.preferences.vibes[0]) || "calm";
      const payload = {
        username: currentUser?.username,
        seed_mood: dominantMood
      };
      const res = await axios.post("http://127.0.0.1:5000/api/radio/next", payload);
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
      const res = await axios.post("http://127.0.0.1:5000/api/radio/next", payload);
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
          <div className="w-28 h-28 sm:w-40 sm:h-40 md:w-52 md:h-52 shrink-0 rounded-lg overflow-hidden shadow-2xl relative bg-zinc-800">
            {coverImage ? (
              <img src={coverImage} alt="playlist cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: getVibeGradient('party') }} />
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-white block mb-2 font-bold">{isAi ? 'AI Generated' : 'Playlist'}</p>
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tighter mb-4">{name}</h1>
            <p className="text-zinc-400 text-sm">{description}</p>
            <p className="text-zinc-500 text-xs mt-2 font-bold tracking-widest uppercase">
              Echomood • {tracks.length} songs
            </p>
          </div>
        </div>

        <div className="mb-10 flex gap-4 items-center flex-wrap">
          <button 
            onClick={() => handlePlay(tracks[0], tracks)}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-gold-500 text-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]"
          >
            <span className="text-2xl ml-1">▶</span>
          </button>
          {isAi && (
            <>
              <button 
                onClick={() => onPlayTrack(tracks[0], tracks, { isEndless: true, seedMood: activePlaylist.mood })}
                disabled={isGeneratingRadio}
                className="px-6 py-3 rounded-full bg-gold-500 text-black hover:bg-gold-400 hover:scale-105 transition-all font-medium tracking-wide shadow-[0_0_20px_rgba(234,179,8,0.2)] flex items-center gap-2"
              >
                <span>🎧</span> Start Endless DJ Session
              </button>
              <button 
                onClick={handleSaveAiPlaylist}
                disabled={isSaving}
                className="px-6 py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all font-medium tracking-wide border border-white/10 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save to Library"}
              </button>
            </>
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
      
      {/* AI DJ Integrated Globally */}
      <div className="mb-14">
        <UnifiedAIPanel
          userProfile={userProfile}
          username={currentUser?.username}
          onAnalyzeComplete={handleMoodDetected}
        />
      </div>

      {/* Instant Vibes / Smart Radio Section */}
      <section className="mb-14">
        <h2 className="text-lg sm:text-xl md:text-2xl font-serif text-white mb-6 px-1">Instant Vibes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Smart Radio Card */}
          <div 
            onClick={handleStartSmartRadio}
            className="relative overflow-hidden rounded-2xl border border-gold-500/20 bg-gradient-to-br from-gold-500/10 via-zinc-900 to-zinc-950 p-4 hover:border-gold-500/50 transition-all cursor-pointer group hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] flex items-center justify-between gap-3 min-h-[72px]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-2xl shrink-0 p-2 bg-gold-500/10 rounded-xl border border-gold-500/20">📻</div>
              <div className="min-w-0">
                <p className="text-[10px] tracking-wider uppercase text-gold-400 font-bold mb-0.5">Endless Radio</p>
                <h3 className="text-xs sm:text-sm font-serif text-white group-hover:text-gold-300 transition-colors truncate font-bold">Smart Radio</h3>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-gold-500 text-black flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform">
              <span className="text-base ml-0.5">▶</span>
            </div>
          </div>

          {/* Zen Mode Card */}
          <div 
            onClick={() => handleStartQuickVibe("calm")}
            className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-950 p-4 hover:border-emerald-500/50 transition-all cursor-pointer group hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center justify-between gap-3 min-h-[72px]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-2xl shrink-0 p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">🍃</div>
              <div className="min-w-0">
                <p className="text-[10px] tracking-wider uppercase text-emerald-400 font-bold mb-0.5">Zen Chill</p>
                <h3 className="text-xs sm:text-sm font-serif text-white group-hover:text-emerald-300 transition-colors truncate font-bold">Relaxation</h3>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform">
              <span className="text-base ml-0.5">▶</span>
            </div>
          </div>

          {/* Energy Boost Card */}
          <div 
            onClick={() => handleStartQuickVibe("energetic")}
            className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-zinc-900 to-zinc-950 p-4 hover:border-pink-500/50 transition-all cursor-pointer group hover:shadow-[0_0_20px_rgba(236,72,153,0.15)] flex items-center justify-between gap-3 min-h-[72px] col-span-2 md:col-span-1"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-2xl shrink-0 p-2 bg-pink-500/10 rounded-xl border border-pink-500/20">⚡</div>
              <div className="min-w-0">
                <p className="text-[10px] tracking-wider uppercase text-pink-400 font-bold mb-0.5">High Tempo</p>
                <h3 className="text-xs sm:text-sm font-serif text-white group-hover:text-pink-300 transition-colors truncate font-bold">Energy Boost</h3>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-pink-500 text-black flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform">
              <span className="text-base ml-0.5">▶</span>
            </div>
          </div>
        </div>
      </section>

      {/* Vibe Insights Dashboard Widget */}
      {vibeHistory.length > 0 && vibeStats && (
        <div className="mb-14 border rounded-3xl border-white/10 bg-white/5 backdrop-blur-xl p-3 sm:p-5 md:p-8 animate-fade-in">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Left side: Vibe breakdown */}
            <div className="flex-1 w-full">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">📊</span>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl md:text-2xl text-white">Your Vibe Insights</h3>
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
            <section>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-white mb-6 px-1">Quick Picks (Singles)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 sm:gap-2 md:gap-4">
                {quickPicks.map((track, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handlePlay(track, quickPicks)} 
                    className="group flex items-center p-1.5 sm:p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors shadow-sm hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] min-w-0"
                  >
                    <div className="relative w-10 h-10 sm:w-14 sm:h-14 shrink-0">
                      <img src={track.cover_url || '/placeholder.jpg'} alt="cover" className="w-full h-full object-cover rounded shadow-md bg-zinc-800" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity">
                        <span className="text-white text-base sm:text-lg ml-1">▶</span>
                      </div>
                    </div>
                    <div className="ml-3 sm:ml-4 flex-1 overflow-hidden min-w-0">
                      <p className="text-white font-medium text-xs sm:text-sm truncate group-hover:text-gold-400 transition-colors">{track.track_name}</p>
                      <p className="text-zinc-400 text-[10px] sm:text-xs truncate mt-0.5 sm:mt-1">{track.artist_name}</p>
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