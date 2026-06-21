import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import UnifiedAIPanel from "./components/UnifiedAIPanel";
import SongCard from "./components/SongCard";
import Onboarding from "./components/Onboarding";
import VaultUpload from "./components/VaultUpload";
import VaultGallery from "./components/VaultGallery";
import GlobalPlayer from "./components/GlobalPlayer";
import AuthScreen from "./components/AuthScreen";
import Home from "./components/Home";
import Sidebar from "./components/Sidebar";
import Profile from "./components/Profile";
import Library from "./components/Library";
import Community from "./components/Community";

// Normalise so GlobalPlayer always reads .file_url
function normaliseTrack(t) {
  return { ...t, file_url: t.file_url || t.preview_url || "" };
}

const getMoodBackground = (mood) => {
  switch (mood?.toLowerCase()) {
    case "happy": return "radial-gradient(circle at center, #ea580c 0%, #09090b 100%)";
    case "sad": return "radial-gradient(circle at center, #1e3a8a 0%, #09090b 100%)";
    case "angry": return "radial-gradient(circle at center, #7f1d1d 0%, #09090b 100%)";
    case "calm": return "radial-gradient(circle at center, #064e3b 0%, #09090b 100%)";
    case "energetic": return "radial-gradient(circle at center, #be185d 0%, #09090b 100%)";
    case "romantic": return "radial-gradient(circle at center, #9f1239 0%, #09090b 100%)";
    case "nostalgic": return "radial-gradient(circle at center, #854d0e 0%, #09090b 100%)";
    case "focused": return "radial-gradient(circle at center, #4c1d95 0%, #09090b 100%)";
    case "party": return "radial-gradient(circle at center, #6d28d9 0%, #09090b 100%)";
    case "sleepy": return "radial-gradient(circle at center, #0f172a 0%, #09090b 100%)";
    default: return "radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(9,9,11,1) 100%)";
  }
};

function EmptyState({ message, hint }) {
  return (
    <div className="p-10 text-center border rounded-2xl border-white/10 bg-white/5 backdrop-blur-md">
      <p className="text-sm text-zinc-300">{message}</p>
      {hint && <p className="text-xs text-zinc-500 mt-2">{hint}</p>}
    </div>
  );
}

export default function App() {
  const [systemActive, setSystemActive] = useState(false);
  const [detectedMood, setDetectedMood] = useState(null);
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [isDjVoiceEnabled, setIsDjVoiceEnabled] = useState(true);
  
  const [userProfile, setUserProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("echomood_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // DJ Mode State
  const [djEnergy, setDjEnergy] = useState(50);
  const [djVibe, setDjVibe] = useState(50);
  const [isDjActive, setIsDjActive] = useState(false);
  const [djLoading, setDjLoading] = useState(false);

  const [queue, setQueue] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isEndlessSession, setIsEndlessSession] = useState(false);
  const [sessionMood, setSessionMood] = useState(null);

  // Deep-link pending play (for users who aren't logged in yet)
  const [pendingPlay, setPendingPlay] = useState(null);

  // Player Modes
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0: off, 1: all, 2: one

  useEffect(() => {
    if (currentUser?.username) {
      axios.get(`http://localhost:5000/api/profile?username=${currentUser.username}`)
        .then(res => {
          const prefs = res.data.preferences;
          if (prefs && prefs.languages && prefs.languages.length > 0) {
            setUserProfile({ ...prefs, is_public: res.data.is_public });
            setSystemActive(true);
            setActiveTab("home");
          }
        })
        .catch(err => console.error("Error fetching profile:", err));
    }
  }, [currentUser]);

  // Deep-Link Sharing Parser
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playQuery = params.get("play");
    if (playQuery) {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (currentUser?.username && systemActive === true) {
        // User is logged in and has profile — play immediately
        axios.get(`http://localhost:5000/api/library/search?q=${encodeURIComponent(playQuery)}&username=${currentUser.username}`)
          .then(res => {
            if (res.data.success && res.data.tracks?.length > 0) {
              setQueue([normaliseTrack(res.data.tracks[0])]);
              setCurrentTrackIndex(0);
            }
          })
          .catch(err => console.error("Deep-link error:", err));
      } else {
        // User not logged in yet — store for later
        setPendingPlay(playQuery);
      }
    }
  }, []);

  // Replay pending deep-link after login + profile setup
  useEffect(() => {
    if (pendingPlay && currentUser?.username && systemActive === true) {
      axios.get(`http://localhost:5000/api/library/search?q=${encodeURIComponent(pendingPlay)}&username=${currentUser.username}`)
        .then(res => {
          if (res.data.success && res.data.tracks?.length > 0) {
            setQueue([normaliseTrack(res.data.tracks[0])]);
            setCurrentTrackIndex(0);
          }
        })
        .catch(err => console.error("Pending deep-link error:", err))
        .finally(() => setPendingPlay(null));
    }
  }, [pendingPlay, currentUser, systemActive]);

  const playTrackAtIndex = (index) => {
    setCurrentTrackIndex(index);
  };

  const removeFromQueue = (index) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
    if (index < currentTrackIndex) {
      setCurrentTrackIndex(prev => prev - 1);
    } else if (index === currentTrackIndex && index === queue.length - 1) {
      setCurrentTrackIndex(0);
    }
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("echomood_user");
    setCurrentUser(null);
    setSystemActive(false);
    setUserProfile(null);
    setQueue([]);
    setAiExplanation(null);
  }, []);

  const playTrack = (trackList, startIndex, options = {}) => {
    if (!Array.isArray(trackList) || trackList.length === 0) return;
    const safeIndex = Math.max(0, Math.min(startIndex, trackList.length - 1));
    setQueue(trackList.map(normaliseTrack));
    setCurrentTrackIndex(safeIndex);
    setIsEndlessSession(!!options.isEndless);
  };

  const playNext = async () => {
    if (isShuffle && queue.length > 1) {
      let randomIndex = currentTrackIndex;
      while (randomIndex === currentTrackIndex) {
        randomIndex = Math.floor(Math.random() * queue.length);
      }
      setCurrentTrackIndex(randomIndex);
      return;
    }

    if (currentTrackIndex < queue.length - 1) {
      setCurrentTrackIndex((prev) => prev + 1);
    } else if (repeatMode === 1) {
      // Repeat All Mode
      setCurrentTrackIndex(0);
    } else if (isEndlessSession && queue.length > 0) {
      // Infinite "Smart Radio" / "Endless DJ" Mode: Fetch more tracks
      const currentTrack = queue[currentTrackIndex];
      const currentMood = sessionMood || currentTrack?.mood || (currentTrack?.mood_tags ? currentTrack.mood_tags[0] : "calm");
      try {
        const res = await axios.post("http://localhost:5000/api/radio/next", {
          username: currentUser?.username,
          seed_mood: currentMood,
          seed_source: currentTrack?.source || ""
        });
        if (res.data?.success && res.data.tracks.length > 0) {
          const newTracks = res.data.tracks.map(normaliseTrack);
          setQueue(prev => [...prev, ...newTracks]);
          setCurrentTrackIndex(prev => prev + 1);
        }
      } catch (e) {
        console.error("Smart Radio failed:", e);
      }
    }
  };

  const playPrevious = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex((prev) => prev - 1);
    } else if (repeatMode === 1) {
      setCurrentTrackIndex(queue.length - 1);
    }
  };

  // Single universal handler used by ALL panels
  // signature: handlePlay(clickedTrack, fullTrackList, options)
  const handlePlay = (clickedTrack, trackList, options = {}) => {
      const list = Array.isArray(trackList) ? trackList : [clickedTrack];
      const needle = clickedTrack.file_url || clickedTrack.preview_url;
      const idx = list.findIndex(
        (t) => (t.file_url || t.preview_url) === needle
      );
      playTrack(list, idx >= 0 ? idx : 0, options);
  };

  const handleOnboardingComplete = (preferences) => {
    setUserProfile(preferences);
    setSystemActive(true);
    setActiveTab("ai-dj");
  };

  const handleMoodDetected = (mood, tracks, explanation) => {
    setDetectedMood(mood);
    setRecommendedTracks(tracks);
    setAiExplanation(explanation);
  };

  useEffect(() => {
    if (aiExplanation && isDjVoiceEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(aiExplanation);
      
      const savedVoiceUri = localStorage.getItem(`echomood_voice_${currentUser?.username}`);
      const savedPitch = parseFloat(localStorage.getItem(`echomood_pitch_${currentUser?.username}`) || '1.0');
      const savedRate = parseFloat(localStorage.getItem(`echomood_rate_${currentUser?.username}`) || '1.0');

      if (savedVoiceUri) {
        const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === savedVoiceUri);
        if (voice) utterance.voice = voice;
      }
      
      utterance.pitch = savedPitch;
      utterance.rate = savedRate;
      window.speechSynthesis.speak(utterance);
    }
  }, [aiExplanation, isDjVoiceEnabled, currentUser]);

  if (!currentUser) return <AuthScreen setAuth={setCurrentUser} />;

  const isDashboard = systemActive === true;



  // ── Party Mode panel ────────────────────────────────────────────────────────
  // DJ Mode: fetch tracks based on energy and vibe
  const fetchDJTracks = async (energy, vibe) => {
    setDjLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/dj/next", {
        energy,
        vibe,
        username: currentUser?.username
      });
      if (res.data?.success && res.data.tracks?.length > 0) {
        const tracks = res.data.tracks.map(normaliseTrack);
        setQueue(tracks);
        setCurrentTrackIndex(0);
        setIsEndlessSession(true);
        setSessionMood(res.data.mood);
        setIsDjActive(true);
      }
    } catch (err) {
      console.error("DJ Mode fetch failed:", err);
    } finally {
      setDjLoading(false);
    }
  };

  const DJ_PRESETS = [
    { name: "Chill Lounge", emoji: "🌊", energy: 20, vibe: 60, color: "from-cyan-500/20 to-blue-600/20 border-cyan-500/30" },
    { name: "Late Night Drive", emoji: "🌙", energy: 40, vibe: 40, color: "from-indigo-500/20 to-purple-600/20 border-indigo-500/30" },
    { name: "House Party", emoji: "🔥", energy: 90, vibe: 80, color: "from-orange-500/20 to-red-600/20 border-orange-500/30" },
    { name: "Workout Beast", emoji: "💪", energy: 95, vibe: 70, color: "from-green-500/20 to-emerald-600/20 border-green-500/30" },
    { name: "Heartbreak Hours", emoji: "💔", energy: 20, vibe: 15, color: "from-blue-500/20 to-slate-600/20 border-blue-500/30" },
    { name: "Study Zone", emoji: "📚", energy: 30, vibe: 50, color: "from-violet-500/20 to-fuchsia-600/20 border-violet-500/30" },
  ];

  const getVibeLabel = (v) => {
    if (v <= 20) return "Melancholic";
    if (v <= 40) return "Moody";
    if (v <= 60) return "Balanced";
    if (v <= 80) return "Uplifting";
    return "Euphoric";
  };

  const getEnergyLabel = (e) => {
    if (e <= 20) return "Ambient";
    if (e <= 40) return "Relaxed";
    if (e <= 60) return "Moderate";
    if (e <= 80) return "High Energy";
    return "Maximum";
  };

  const renderDJPanel = () => {
    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-in">
        <div className="p-8 border rounded-3xl bg-gradient-to-br from-gold-500/10 to-transparent border-gold-500/20 backdrop-blur-md">
          <div className="text-center mb-8">
            <h3 className="font-serif text-3xl text-gold-400 mb-2">🎧 DJ Mode</h3>
            <p className="text-sm text-zinc-300">
              Set your energy and vibe to generate a continuous, curated music session.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {DJ_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  setDjEnergy(preset.energy);
                  setDjVibe(preset.vibe);
                  fetchDJTracks(preset.energy, preset.vibe);
                }}
                disabled={djLoading}
                className={`p-4 rounded-2xl border bg-gradient-to-br ${preset.color} backdrop-blur-sm hover:scale-[1.03] active:scale-95 transition-all duration-200 text-left disabled:opacity-50`}
              >
                <span className="text-2xl">{preset.emoji}</span>
                <p className="text-sm font-medium text-white mt-1">{preset.name}</p>
              </button>
            ))}
          </div>

          {/* Mood Mixer Sliders */}
          <div className="space-y-6 mb-8 p-6 rounded-2xl bg-black/40 border border-white/5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs tracking-widest uppercase text-zinc-400">Energy</label>
                <span className="text-xs text-gold-400 font-medium">{getEnergyLabel(djEnergy)}</span>
              </div>
              <input
                type="range" min="0" max="100" value={djEnergy}
                onChange={(e) => setDjEnergy(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-zinc-800 accent-gold-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                <span>Chill</span><span>Hype</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs tracking-widest uppercase text-zinc-400">Vibe</label>
                <span className="text-xs text-gold-400 font-medium">{getVibeLabel(djVibe)}</span>
              </div>
              <input
                type="range" min="0" max="100" value={djVibe}
                onChange={(e) => setDjVibe(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-zinc-800 accent-gold-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                <span>Sad</span><span>Happy</span>
              </div>
            </div>
          </div>

          {/* Launch Button */}
          <button
            onClick={() => fetchDJTracks(djEnergy, djVibe)}
            disabled={djLoading}
            className="w-full py-4 bg-gold-500 text-black font-semibold rounded-2xl hover:bg-gold-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {djLoading ? (
              <><span className="animate-spin">⏳</span> Curating your session...</>
            ) : isDjActive ? (
              <>🔄 Refresh Mix</>
            ) : (
              <>🎵 Start DJ Session</>
            )}
          </button>

          {isDjActive && (
            <p className="text-center text-xs text-zinc-500 mt-4">
              DJ Mode is active · Songs auto-queue as you listen · Adjust sliders and hit Refresh to change the vibe
            </p>
          )}
        </div>
      </div>
    );
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className={`relative min-h-screen font-sans text-zinc-200 bg-zinc-950 overflow-x-hidden ${queue.length > 0 ? 'pb-44 md:pb-28' : 'pb-24 md:pb-10'}`}>
      {/* Ambient background */}
      <div
        className="fixed inset-0 z-0 bg-center bg-cover opacity-40 mix-blend-luminosity transition-all duration-1000"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2560&auto=format&fit=crop")',
          backgroundColor: "#09090b",
        }}
      />
      <div 
        className="fixed inset-0 z-0 opacity-70 transition-all duration-1000 mix-blend-color" 
        style={{ background: getMoodBackground(detectedMood) }} 
      />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(9,9,11,1)_100%)] opacity-80" />

      {/* Layout: sidebar + scrollable main */}
      <div className="relative z-10 flex min-h-screen">
        {isDashboard && (
          <Sidebar
            username={currentUser.username}
            onSelectPlaylist={(playlist) => {
              if (playlist?.tracks?.length > 0) {
                playTrack(playlist.tracks, 0);
              }
            }}
            onLogout={handleLogout}
          />
        )}

        <main className="flex flex-col items-center flex-1 min-w-0 p-6 py-16">
          
          {/* PWA Install Banner */}
          {deferredPrompt && (
            <div className="fixed top-0 left-0 right-0 bg-zinc-900 border-b border-gold-500/30 text-white px-4 py-3 flex items-center justify-between z-50 shadow-lg">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="EchoMood" className="w-8 h-8 rounded-lg shadow-lg" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white tracking-wide">Install EchoMood</span>
                  <span className="text-[10px] text-zinc-300">Add to your home screen for the full app experience.</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleInstallClick}
                  className="bg-gold-500 text-black text-xs font-bold px-4 py-1.5 rounded-full hover:bg-gold-400 transition-colors shadow-lg"
                >
                  Install
                </button>
                <button 
                  onClick={() => setDeferredPrompt(null)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-gold-500 uppercase tracking-[0.3em] text-xs font-semibold mb-3">
              Premium Auditory Experience
            </h2>
            <h1 className="font-serif text-5xl font-medium tracking-wide text-white italic md:text-6xl">
              Echomood
            </h1>
          </div>

          {/* Welcome screen */}
          {!systemActive && !userProfile && (
            <div className="w-full max-w-2xl p-12 text-center border backdrop-blur-xl bg-white/5 border-white/10 rounded-3xl">
              <p className="max-w-md mx-auto mb-10 text-sm font-light leading-relaxed text-zinc-400">
                Discover curated soundscapes tailored to your exact emotional
                frequency.
              </p>
              <button
                onClick={() => setSystemActive("onboarding")}
                className="px-8 py-3 text-sm tracking-widest text-black transition-all rounded-full bg-gold-500 hover:bg-gold-400"
              >
                INITIALIZE SYSTEM
              </button>
            </div>
          )}

          {/* Onboarding */}
          {systemActive === "onboarding" && (
            <Onboarding 
              onComplete={handleOnboardingComplete} 
              username={currentUser?.username}
            />
          )}

          {/* Dashboard */}
          {isDashboard && (
            <div className="w-full max-w-6xl">
              {/* Tab bar */}
              <div className="w-full mb-8 border border-white/10 bg-black/30 backdrop-blur-xl rounded-2xl hidden md:block">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] tracking-[0.25em] uppercase text-zinc-500">
                      Dashboard
                    </p>
                    <h3 className="text-lg font-serif text-white">
                      {currentUser.username}&apos;s Command Center
                    </h3>
                  </div>
                  <div className="inline-flex p-1 border rounded-full bg-white/5 border-white/10">
                    {[
                      { id: "home", label: "Home" },
                      { id: "library", label: "Your Library" },
                      { id: "vault", label: "Personal Vault" },
                      { id: "party", label: "DJ Mode" },
                      { id: "community", label: "Community" },
                      { id: "profile", label: "Profile" },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`px-6 py-2 text-xs tracking-widest uppercase rounded-full transition-all ${
                          activeTab === id
                            ? "bg-gold-500 text-black"
                            : "text-zinc-300 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panels — all mounted, visibility toggled to preserve state */}
              <div className={activeTab === "home" ? "block" : "hidden"}>
                <Home currentUser={currentUser} userProfile={userProfile} onPlayTrack={handlePlay} />
              </div>

              <div className={activeTab === "profile" ? "block" : "hidden"}>
                <Profile username={currentUser.username} userProfile={userProfile} onProfileUpdate={(p) => setUserProfile({...p, is_public: userProfile?.is_public})} onLogout={handleLogout} />
              </div>

              <div className={activeTab === "library" ? "block" : "hidden"}>
                <Library currentUser={currentUser} onPlayTrack={handlePlay} />
              </div>

              <div className={activeTab === "community" ? "block" : "hidden"}>
                <Community username={currentUser.username} onPlayTrack={handlePlay} />
              </div>

              <div className={activeTab === "vault" ? "block" : "hidden"}>
                <div className="w-full">
                  <div className="flex justify-center mb-8">
                    <VaultUpload username={currentUser.username} />
                  </div>
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent mb-8" />
                  <VaultGallery
                    username={currentUser.username}
                    onPlayTrack={handlePlay}
                  />
                </div>
              </div>

              <div className={activeTab === "party" ? "block" : "hidden"}>
                {renderDJPanel()}
              </div>


            </div>
          )}
        </main>
      </div>

      {isDashboard && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-black/85 backdrop-blur-lg border-t border-white/10 h-16 flex justify-around items-center px-2">
          {[
            { id: "home", label: "Home", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
            { id: "library", label: "Library", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg> },
            { id: "vault", label: "Vault", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> },
            { id: "party", label: "DJ", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg> },
            { id: "community", label: "Feed", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
            { id: "profile", label: "Profile", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors ${
                activeTab === id ? "text-gold-500 font-medium" : "text-zinc-400 hover:text-white"
              }`}
            >
              <span className="w-5 h-5 mb-0.5">{icon}</span>
              <span className="text-[9px] tracking-widest font-normal uppercase">{label}</span>
            </button>
          ))}
        </div>
      )}

      <GlobalPlayer
        queue={queue}
        currentTrackIndex={currentTrackIndex}
        playNext={playNext}
        playPrevious={playPrevious}
        username={currentUser?.username}
        isShuffle={isShuffle}
        setIsShuffle={setIsShuffle}
        repeatMode={repeatMode}
        setRepeatMode={setRepeatMode}
        playTrackAtIndex={playTrackAtIndex}
        removeFromQueue={removeFromQueue}
      />
    </div>
  );
}