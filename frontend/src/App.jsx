import { useState, useCallback, useEffect, useRef } from "react";
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

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
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

  // Party Session State
  const [partyCode, setPartyCode] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [partyGuests, setPartyGuests] = useState([]);
  const [partyQueue, setPartyQueue] = useState([]);
  const [partyNowPlaying, setPartyNowPlaying] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [partyError, setPartyError] = useState("");
  const [partyLoading, setPartyLoading] = useState(false);
  const [songRequest, setSongRequest] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [djTab, setDjTab] = useState('solo'); // 'solo' or 'party'
  const [djSource, setDjSource] = useState('global'); // 'global' or 'library'
  const [partyMessages, setPartyMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [partyHost, setPartyHost] = useState("Host");
  
  const partySyncRef = useRef(null);
  const syncFailCount = useRef(0);
  const searchDebounceRef = useRef(null);
  const globalPlayerStateRef = useRef({ isPlaying: false, currentTime: 0 });

  // Listen for GlobalPlayer state changes
  useEffect(() => {
    const handleStateChange = (e) => {
      globalPlayerStateRef.current = e.detail;
    };
    window.addEventListener('playerStateChange', handleStateChange);
    return () => window.removeEventListener('playerStateChange', handleStateChange);
  }, []);

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

  // Party sync polling (every 4s) – must be before early return to preserve hook order
  useEffect(() => {
    if (partyCode) {
      syncFailCount.current = 0;
      const doSync = async () => {
        if (!partyCode) return;
        try {
          const currentTrack = queue[currentTrackIndex] || null;
          const payload = { code: partyCode, username: currentUser?.username };
          if (isHost && currentTrack) {
            payload.current_track = currentTrack;
            payload.is_playing = globalPlayerStateRef.current.isPlaying;
            payload.current_time = globalPlayerStateRef.current.currentTime;
          }
          const res = await axios.post("http://localhost:5000/api/party/sync", payload);
          if (res.data?.success) {
            syncFailCount.current = 0;
            const session = res.data.session;
            setPartyGuests(session.guests || []);
            setPartyQueue(session.queue || []);
            setPartyMessages(session.messages || []);
            setPartyHost(session.host || "Host");
            // Track what the host is playing
            if (session.current_track) {
              setPartyNowPlaying(session.current_track);
            }
            if (!isHost && session.current_track) {
              const hostTrack = session.current_track;
              const hostUrl = hostTrack.file_url || hostTrack.preview_url;
              const currentUrl = (queue[currentTrackIndex])?.file_url || (queue[currentTrackIndex])?.preview_url;
              
              let trackChanged = false;
              if (hostUrl && hostUrl !== currentUrl) {
                setQueue([normaliseTrack(hostTrack)]);
                setCurrentTrackIndex(0);
                trackChanged = true;
              }

              // Dispatch command to GlobalPlayer to sync time/play state
              window.dispatchEvent(new CustomEvent('partySyncCommand', {
                detail: {
                  isPlaying: session.is_playing,
                  currentTime: session.current_time,
                  trackChanged
                }
              }));
            }
          }
        } catch (_) {
          syncFailCount.current += 1;
          if (syncFailCount.current >= 5) {
            if (partySyncRef.current) clearInterval(partySyncRef.current);
            setPartyCode(null);
            setIsHost(false);
            setPartyGuests([]);
            setPartyQueue([]);
            setPartyError("Connection lost. Party ended.");
            setTimeout(() => setPartyError(""), 4000);
          }
        }
      };
      doSync();
      partySyncRef.current = setInterval(doSync, 4000);
      return () => {
        if (partySyncRef.current) clearInterval(partySyncRef.current);
      };
    }
  }, [partyCode, isHost, queue, currentTrackIndex, currentUser]);

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
        username: currentUser?.username,
        source: djSource
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

  const fetchDJTracksForParty = async (energy, vibe) => {
    if (!partyCode) return;
    setDjLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/dj/next", {
        energy,
        vibe,
        username: currentUser?.username,
        source: djSource
      });
      if (res.data?.success && res.data.tracks?.length > 0) {
        // Add each track to the party queue
        for (const track of res.data.tracks) {
          await axios.post("http://localhost:5000/api/party/add", {
            code: partyCode,
            track: track,
            username: currentUser?.username || "Host"
          });
        }
      }
    } catch (err) {
      console.error("Party Auto-DJ fetch failed:", err);
    } finally {
      setDjLoading(false);
    }
  };

  // ── Party Session Functions ─────────────────────────────────────────────────
  const createParty = async () => {
    setPartyLoading(true);
    setPartyError("");
    try {
      const res = await axios.post("http://localhost:5000/api/party/create", {
        username: currentUser?.username
      });
      if (res.data?.success) {
        setPartyCode(res.data.code);
        setIsHost(true);
        setPartyGuests([]);
        setPartyQueue([]);
      }
    } catch (err) {
      setPartyError("Failed to create party.");
    } finally {
      setPartyLoading(false);
    }
  };

  const joinParty = async () => {
    if (!joinCode.trim()) return;
    setPartyLoading(true);
    setPartyError("");
    try {
      const res = await axios.post("http://localhost:5000/api/party/join", {
        username: currentUser?.username,
        code: joinCode.trim().toUpperCase()
      });
      if (res.data?.success) {
        setPartyCode(joinCode.trim().toUpperCase());
        setIsHost(false);
        const session = res.data.session;
        setPartyGuests(session.guests || []);
        setPartyQueue(session.queue || []);
      }
    } catch (err) {
      setPartyError(err.response?.data?.error || "Invalid party code.");
    } finally {
      setPartyLoading(false);
      setJoinCode("");
    }
  };

  const leaveParty = () => {
    if (partySyncRef.current) clearInterval(partySyncRef.current);
    setPartyCode(null);
    setIsHost(false);
    setPartyGuests([]);
    setPartyQueue([]);
    setPartyError("");
  };

  const requestSong = async (trackToRequest) => {
    if (!trackToRequest || !partyCode) return;
    setRequestLoading(true);
    try {
      await axios.post("http://localhost:5000/api/party/add", {
        code: partyCode,
        track: trackToRequest
      });
      syncParty(); // Refresh queue immediately
    } catch (err) {
      console.error("Song request failed:", err);
      setPartyError("Failed to add song.");
      setTimeout(() => setPartyError(""), 2000);
    } finally {
      setRequestLoading(false);
      setSongRequest("");
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSongRequest(val);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!val.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/library/search", {
          params: { q: val, username: currentUser?.username }
        });
        if (res.data?.success) {
          setSearchSuggestions(res.data.results || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Live search failed:", err);
      }
    }, 400); // 400ms debounce
  };

  const upvoteTrack = async (trackIndex) => {
    if (!partyCode) return;
    try {
      const res = await axios.post("http://localhost:5000/api/party/upvote", {
        code: partyCode,
        track_index: trackIndex,
        username: currentUser?.username || "Guest"
      });
      if (res.data?.success) {
        setPartyQueue(res.data.queue);
      }
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  const playFromPartyQueue = (track, index) => {
    handlePlay(track, partyQueue);
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!partyCode || !chatInput.trim()) return;
    try {
      const res = await axios.post("http://localhost:5000/api/party/chat", {
        code: partyCode,
        username: currentUser?.username || "Anonymous",
        text: chatInput.trim()
      });
      if (res.data?.success) {
        setPartyMessages(res.data.messages);
        setChatInput("");
      }
    } catch (err) {
      console.error("Failed to send chat message", err);
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
    // Dynamic BG for Solo Mix
    const hue = 240 - (djVibe * 2); // Vibe 0 -> Hue 240 (Blue), Vibe 100 -> Hue 40 (Orange)
    const saturation = 50 + (djEnergy / 2);
    const dynamicStyle = {
      background: `radial-gradient(circle at top, hsl(${hue}, ${saturation}%, 20%) 0%, transparent 80%)`
    };

    return (
      <div className="w-full max-w-3xl mx-auto animate-fade-in space-y-6">
        {/* Tab Switcher */}
        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl relative z-10">
          <button 
            onClick={() => setDjTab('solo')} 
            className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${djTab === 'solo' ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            🎧 Solo Mix
          </button>
          <button 
            onClick={() => setDjTab('party')} 
            className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${djTab === 'party' ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            🎉 Party Room
            {partyCode && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
          </button>
        </div>

        {djTab === 'solo' ? (
          /* ── Solo DJ Controls ─────────────────────────────────── */
          <div className="p-8 border rounded-3xl bg-black/40 border-white/10 backdrop-blur-2xl relative overflow-hidden transition-colors duration-1000" style={dynamicStyle}>
            <div className="text-center mb-8 relative z-10">
              <h3 className="font-serif text-3xl text-white mb-2 font-light">Set the Vibe</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Generate a continuous, endless music session tailored to your mood.
              </p>
              
              {/* Source Toggle */}
              <div className="inline-flex items-center p-1 bg-black/40 border border-white/10 rounded-xl max-w-xs mx-auto">
                <button 
                  onClick={() => setDjSource('global')}
                  className={`flex-1 py-2 px-4 text-xs font-semibold rounded-lg transition-all ${djSource === 'global' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
                >
                  🌍 Global Hits
                </button>
                <button 
                  onClick={() => setDjSource('library')}
                  className={`flex-1 py-2 px-4 text-xs font-semibold rounded-lg transition-all ${djSource === 'library' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
                >
                  📚 My Library
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10 relative z-10">
              {DJ_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setDjEnergy(preset.energy);
                    setDjVibe(preset.vibe);
                    fetchDJTracks(preset.energy, preset.vibe);
                  }}
                  disabled={djLoading}
                  className={`p-4 rounded-2xl border bg-gradient-to-br ${preset.color} backdrop-blur-md hover:scale-[1.02] hover:shadow-xl active:scale-95 transition-all duration-300 text-left disabled:opacity-50`}
                >
                  <span className="text-2xl block mb-2">{preset.emoji}</span>
                  <p className="text-sm font-medium text-white">{preset.name}</p>
                </button>
              ))}
            </div>

            {/* Mood Mixer Sliders */}
            <div className="space-y-8 mb-10 p-6 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-sm relative z-10">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs tracking-widest uppercase text-zinc-400">Energy Level</label>
                  <span className="text-xs text-white font-medium bg-white/10 px-2 py-1 rounded-full">{getEnergyLabel(djEnergy)}</span>
                </div>
                <input
                  type="range" min="0" max="100" value={djEnergy}
                  onChange={(e) => setDjEnergy(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-zinc-800 accent-white cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-2 font-medium tracking-widest uppercase">
                  <span>Chill</span><span>Hype</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs tracking-widest uppercase text-zinc-400">Vibe Resonance</label>
                  <span className="text-xs text-white font-medium bg-white/10 px-2 py-1 rounded-full">{getVibeLabel(djVibe)}</span>
                </div>
                <input
                  type="range" min="0" max="100" value={djVibe}
                  onChange={(e) => setDjVibe(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-zinc-800 accent-white cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-2 font-medium tracking-widest uppercase">
                  <span>Melancholic</span><span>Euphoric</span>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={() => fetchDJTracks(djEnergy, djVibe)}
              disabled={djLoading}
              className="w-full py-4 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl hover:shadow-white/20 relative z-10"
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
              <p className="text-center text-xs text-zinc-400 mt-5 relative z-10">
                DJ Mode is active · Songs auto-queue as you listen
              </p>
            )}
          </div>
        ) : (
          /* ── Collaborative Party Section ─────────────────────── */
          <div className="p-6 sm:p-8 border rounded-3xl bg-gradient-to-br from-purple-900/20 via-black to-black border-purple-500/20 backdrop-blur-2xl">
            <div className="text-center mb-8">
              <h3 className="font-serif text-3xl text-purple-300 mb-2">Party Session</h3>
              <p className="text-sm text-zinc-400">
                Sync music, queue songs, and chat with friends in real-time.
              </p>
            </div>

            {partyError && (
              <div className="mb-6 text-center text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 animate-fade-in">
                {partyError}
              </div>
            )}

            {!partyCode ? (
              /* ── No active party: Create or Join ─── */
              <div className="space-y-6 max-w-sm mx-auto">
                <button
                  onClick={createParty}
                  disabled={partyLoading}
                  className="w-full py-4 bg-purple-600 text-white font-semibold rounded-2xl hover:bg-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {partyLoading ? "Creating..." : "🎤 Host a Party Room"}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">or join</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    maxLength={4}
                    className="flex-1 p-4 bg-black/60 border border-white/10 rounded-2xl text-white text-center text-xl tracking-[0.5em] font-black uppercase placeholder:text-zinc-700 placeholder:tracking-widest placeholder:text-sm placeholder:font-normal focus:outline-none focus:border-purple-500 focus:bg-purple-900/10 transition-all"
                  />
                  <button
                    onClick={joinParty}
                    disabled={partyLoading || !joinCode.trim()}
                    className="px-8 py-4 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/20 border border-white/5 transition-all disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>
              </div>
            ) : (
              /* ── Active Party ─────────────────────── */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in">
                
                {/* Left Column: Player & Queue */}
                <div className="md:col-span-7 space-y-6">
                  {/* Host Auto-DJ Panel */}
                  {isHost && (
                    <div className="p-5 bg-purple-500/10 border border-purple-500/20 rounded-2xl relative overflow-hidden backdrop-blur-sm">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                       <div className="flex justify-between items-center mb-4 relative z-10">
                         <div>
                           <h4 className="text-sm font-bold text-white flex items-center gap-2">
                             <span>🤖</span> Party Auto-DJ
                           </h4>
                           <p className="text-[10px] text-purple-200 mt-1">Use the sliders in "Solo Mix" to set the vibe, then click below to add AI tracks to the party queue.</p>
                         </div>
                       </div>
                       <button 
                         onClick={() => fetchDJTracksForParty(djEnergy, djVibe)} 
                         className="w-full py-3 bg-purple-600 rounded-xl text-sm font-bold text-white hover:bg-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all relative z-10 disabled:opacity-50" 
                         disabled={djLoading}
                       >
                         {djLoading ? "Generating..." : "✨ Generate & Add 8 Tracks"}
                       </button>
                    </div>
                  )}

                  {/* Room Info Header */}
                  <div className="flex items-center justify-between p-5 bg-purple-500/10 border border-purple-500/20 rounded-2xl backdrop-blur-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{isHost ? 'Your Room' : 'Connected to Room'}</p>
                      <div className="flex items-center gap-3">
                        <p className="text-4xl font-black tracking-[0.3em] text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">{partyCode}</p>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(partyCode);
                            alert("Code copied!");
                          }}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
                          title="Copy Code"
                        >
                          <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="flex -space-x-2 mb-2">
                        {partyGuests.slice(0, 5).map((g, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-black flex items-center justify-center text-xs font-bold text-white shadow-lg" title={g}>
                            {g.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {partyGuests.length > 5 && (
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-[10px] font-bold text-zinc-400">
                            +{partyGuests.length - 5}
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-500 to-orange-500 border-2 border-black flex items-center justify-center text-xs font-bold text-black shadow-lg z-10" title={partyHost}>
                          👑
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                        {1 + partyGuests.length} Online
                      </p>
                    </div>
                  </div>

                  {/* Now Playing (Host's Track) */}
                  {partyNowPlaying && (
                    <div className="p-4 bg-gradient-to-r from-purple-900/30 to-black border border-purple-500/20 rounded-2xl animate-fade-in relative overflow-hidden group shadow-lg">
                      <div className="absolute top-0 right-0 p-3 opacity-20">
                        <svg className="w-16 h-16 text-purple-400 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-3 flex items-center gap-2">
                        <span className="flex items-end gap-[2px] h-3">
                          <span className="w-0.5 h-full bg-purple-400 animate-eq-1"></span>
                          <span className="w-0.5 h-3/4 bg-purple-400 animate-eq-2"></span>
                          <span className="w-0.5 h-full bg-purple-400 animate-eq-3"></span>
                          <span className="w-0.5 h-1/2 bg-purple-400 animate-eq-1"></span>
                        </span>
                        Syncing with Host
                      </p>
                      <div className="flex items-center relative z-10">
                        <img src={partyNowPlaying.cover_url || '/placeholder.jpg'} alt="Now playing" className="w-16 h-16 rounded-xl object-cover shadow-[0_4px_15px_rgba(0,0,0,0.5)] mr-4" />
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-bold text-white truncate drop-shadow-md">{partyNowPlaying.track_name}</p>
                          <p className="text-sm text-zinc-400 truncate">{partyNowPlaying.artist_name}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Song Request with Live Search */}
                  <div className="relative">
                    <div className="flex gap-2 relative">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                      <input
                        type="text"
                        value={songRequest}
                        onChange={handleSearchChange}
                        onFocus={() => songRequest.trim() && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Search for a song to request..."
                        className="flex-1 py-4 pl-12 pr-4 bg-black/40 border border-white/10 rounded-2xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:bg-purple-900/10 transition-all shadow-inner"
                      />
                      {requestLoading && (
                        <div className="absolute right-4 top-4">
                          <span className="animate-spin inline-block w-5 h-5 border-2 border-zinc-500 border-t-purple-500 rounded-full"></span>
                        </div>
                      )}
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-2 p-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-64 overflow-y-auto">
                        {searchSuggestions.map((track, idx) => (
                          <button
                            key={`${track.id || track.track_name}-${idx}`}
                            className="w-full flex items-center p-2 rounded-xl hover:bg-white/10 transition-colors text-left group"
                            onClick={() => requestSong(track)}
                          >
                            <img src={track.cover_url || '/placeholder.jpg'} alt="" className="w-12 h-12 rounded-lg object-cover mr-3 shadow-md" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate font-medium group-hover:text-purple-300 transition-colors">{track.track_name}</p>
                              <p className="text-xs text-zinc-400 truncate">{track.artist_name}</p>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-3 py-1.5 rounded-full whitespace-nowrap ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              Add
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Party Queue */}
                  <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
                    <p className="text-[10px] tracking-widest uppercase text-zinc-500 font-bold mb-4 px-1">Shared Queue ({partyQueue.length})</p>
                    {partyQueue.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {partyQueue.map((track, idx) => (
                          <div
                            key={`${track.track_name}-${idx}`}
                            className="flex items-center p-2.5 bg-white/5 border border-transparent rounded-xl hover:bg-white/10 hover:border-white/10 transition-all group"
                          >
                            <img
                              src={track.cover_url || '/placeholder.jpg'}
                              alt="cover"
                              className="w-10 h-10 rounded-lg object-cover mr-3 shadow-sm"
                            />
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => playFromPartyQueue(track, idx)}
                            >
                              <p className="text-sm text-white truncate font-medium group-hover:text-gold-400 transition-colors">{track.track_name}</p>
                              <p className="text-[10px] text-zinc-500 truncate uppercase tracking-wider">{track.artist_name}</p>
                            </div>
                            <button
                              onClick={() => upvoteTrack(idx)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs transition-all shadow-inner ${
                                track.voted_by?.includes(currentUser?.username || "Guest") 
                                  ? "bg-purple-500 border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]" 
                                  : "bg-black/40 border-white/5 hover:bg-white/10 hover:border-white/20 text-zinc-400 hover:text-white"
                              }`}
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                              <span className="font-bold">{track.upvotes || 0}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-zinc-500 text-sm font-medium">No songs requested yet.</p>
                        <p className="text-zinc-600 text-xs mt-1">Search for a song above to add it!</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Live Chat & Controls */}
                <div className="md:col-span-5 flex flex-col h-[600px] md:h-auto">
                  <div className="flex-1 flex flex-col bg-black/40 border border-white/5 rounded-2xl overflow-hidden mb-4 relative shadow-inner">
                    <div className="p-3 bg-white/5 border-b border-white/5">
                      <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Live Chat
                      </p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex flex-col">
                      {partyMessages.length === 0 ? (
                        <div className="m-auto text-center">
                          <span className="text-3xl mb-2 block">💬</span>
                          <p className="text-xs text-zinc-500">Say hi to the party!</p>
                        </div>
                      ) : (
                        partyMessages.map((msg, idx) => {
                          const isMe = msg.username === currentUser?.username;
                          return (
                            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <span className="text-[9px] text-zinc-500 mb-0.5 px-1">{msg.username}</span>
                              <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${isMe ? 'bg-purple-600 text-white rounded-tr-sm' : 'bg-white/10 text-zinc-200 rounded-tl-sm'}`}>
                                {msg.text}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form onSubmit={sendChatMessage} className="p-3 bg-white/5 border-t border-white/5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Send a message..."
                          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim()}
                          className="bg-purple-600 text-white p-2 rounded-xl hover:bg-purple-500 disabled:opacity-50 transition-colors flex items-center justify-center"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Leave Party */}
                  <button
                    onClick={leaveParty}
                    className="w-full py-4 bg-red-500/10 text-red-400 text-sm font-bold tracking-widest uppercase rounded-2xl border border-red-500/20 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all"
                  >
                    Leave Room
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
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
                <img src="/pwa-192x192.png" alt="EchoMood" className="w-8 h-8 rounded-lg shadow-lg" />
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
        isGuest={!!partyCode && !isHost}
      />
    </div>
  );
}