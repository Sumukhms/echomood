import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import LiveLyrics from "./LiveLyrics";

function formatTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function isYouTube(url) {
  return (
    typeof url === "string" &&
    (url.includes("youtube.com") || url.includes("youtu.be") || url.includes("youtube.com/embed/"))
  );
}

export default function GlobalPlayer({
  queue,
  currentTrackIndex,
  playNext,
  playPrevious,
  username,
  isShuffle,
  setIsShuffle,
  repeatMode,
  setRepeatMode,
  playTrackAtIndex,
  removeFromQueue
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [resolvedUrl, setResolvedUrl] = useState("");
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);


  const [is8DEnabled, setIs8DEnabled] = useState(false);
  const lyricColorRef = useRef("#d4af37");

  // New features state
  const [isLiked, setIsLiked] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sleep Timer state
  // Sleep Timer state
  const [sleepTimer, setSleepTimer] = useState(null); // in minutes
  const [showSleepMenu, setShowSleepMenu] = useState(false);

  // Queue state
  const [showQueue, setShowQueue] = useState(false);

  // EQ state
  const [showEQ, setShowEQ] = useState(false);
  const [eqBands, setEqBands] = useState({ 60: 0, 230: 0, 910: 0, 3600: 0, 14000: 0 });



  const currentTrack = queue[currentTrackIndex] ?? null;

  const handleLyricChange = useCallback((lineText) => {
    if (!lineText) return;
    const text = lineText.toLowerCase();
    let newColor = "#d4af37"; // gold
    if (text.match(/\b(love|happy|smile|sun|bright|baby|yeah|beautiful|shine)\b/)) {
      newColor = "#ec4899"; // pink
    } else if (text.match(/\b(cry|sad|tear|alone|dark|broken|pain|hurt|die)\b/)) {
      newColor = "#3b82f6"; // blue
    } else if (text.match(/\b(jump|dance|fire|beat|party|go|loud|wild)\b/)) {
      newColor = "#22c55e"; // neon green
    }
    lyricColorRef.current = newColor;
  }, []);


  const trackUrl = currentTrack?.file_url || currentTrack?.preview_url || "";
  const isExternal = isYouTube(resolvedUrl);

  const ytPlayerRef = useRef(null);

  // Web Audio API refs for Equalizer and Spatializer
  const audioCtxRef = useRef(null);
  const trackNodeRef = useRef(null);
  const biquadFilterRef = useRef(null);
  const stereoPannerRef = useRef(null);
  const analyserRef = useRef(null);

  // Fetch likes and playlists on mount or track change
  useEffect(() => {
    if (!username || !currentTrack) return;
    const fetchMeta = async () => {
      try {
        const [favRes, plRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/favorites/all?username=${username}&_t=${Date.now()}`),
          axios.get(`http://localhost:5000/api/playlists/all?username=${username}&_t=${Date.now()}`)
        ]);
        if (plRes.data) setPlaylists(plRes.data);
        if (favRes.data?.success) {
          const trackUrl = currentTrack.file_url || currentTrack.preview_url;
          const liked = favRes.data.favorites.some(t => (t.file_url || t.preview_url) === trackUrl);
          setIsLiked(liked);
        }
      } catch (err) {
        console.error("Failed to fetch meta", err);
      }
    };
    fetchMeta();
  }, [username, currentTrack]);

  const fetchPlaylists = async () => {
    if (!username) return;
    try {
      const plRes = await axios.get(`http://localhost:5000/api/playlists/all?username=${username}&_t=${Date.now()}`);
      if (plRes.data) setPlaylists(plRes.data);
    } catch (err) {
      console.error("Failed to fetch playlists for player", err);
    }
  };

  useEffect(() => {
    fetchPlaylists();
    window.addEventListener('libraryUpdate', fetchPlaylists);
    return () => window.removeEventListener('libraryUpdate', fetchPlaylists);
  }, [username]);

  // Sleep Timer Effect
  useEffect(() => {
    if (sleepTimer === null) return;
    if (sleepTimer <= 0) {
      setIsPlaying(false);
      setSleepTimer(null);
      return;
    }
    const interval = setInterval(() => {
      setSleepTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000 * 60); // Decrement every minute
    return () => clearInterval(interval);
  }, [sleepTimer]);

  const toggleLike = async () => {
    if (!username || !currentTrack) return;
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    try {
      if (newLiked) {
        await axios.post("http://localhost:5000/api/favorites/add", { username, track: currentTrack });
      } else {
        await axios.post("http://localhost:5000/api/favorites/remove", { username, file_url: currentTrack.file_url || currentTrack.preview_url });
      }
      window.dispatchEvent(new Event('libraryUpdate'));
    } catch (err) {
      console.error("Failed to toggle like", err);
      setIsLiked(!newLiked); // Revert on failure
    }
  };

  const addToPlaylist = async (playlistId) => {
    if (!currentTrack) return;
    try {
      await axios.post("http://localhost:5000/api/playlists/add_track", {
        playlist_id: playlistId,
        track: currentTrack
      });
      setShowPlaylistMenu(false);
      window.dispatchEvent(new Event('libraryUpdate'));
    } catch (err) {
      console.error("Failed to add to playlist", err);
    }
  };

  // Poll YouTube time (simulated +1 second)
  useEffect(() => {
    let interval;
    if (isExternal && isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (duration && prev >= duration) return prev;
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isExternal, isPlaying, duration]);

  // Smart Transitions: Auto Volume Fade Out / Fade In
  useEffect(() => {
    if (!isPlaying || !duration || isMuted) return;
    
    const FADE_DURATION = 3;
    let fadeMultiplier = 1;

    // Fade IN at the beginning
    if (currentTime < FADE_DURATION) {
      fadeMultiplier = Math.min(1, currentTime / FADE_DURATION);
    }
    // Fade OUT at the end
    else if (duration - currentTime < FADE_DURATION) {
      fadeMultiplier = Math.max(0, (duration - currentTime) / FADE_DURATION);
    }

    const actualVolume = volume * fadeMultiplier;

    if (isExternal && ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(actualVolume * 100);
    } else if (audioRef.current) {
      audioRef.current.volume = actualVolume;
    }
  }, [currentTime, duration, volume, isMuted, isPlaying, isExternal]);



  // YouTube IFrame API Integration
  useEffect(() => {
    if (!isExternal || !resolvedUrl) return;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      
      const videoIdMatch = resolvedUrl.match(/watch\?v=([^&]+)/) || resolvedUrl.match(/embed\/([^?]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;

      if (videoId && !ytPlayerRef.current) {
        ytPlayerRef.current = new window.YT.Player('yt-player-container', {
          height: '10',
          width: '10',
          videoId: videoId,
          playerVars: { autoplay: 1, controls: 0, playsinline: 1, origin: window.location.origin, enablejsapi: 1 },
          events: {
            onReady: (event) => {
              event.target.setVolume(isMuted ? 0 : volume * 100);
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setDuration(event.target.getDuration());
                try {
                  // Handle gapless crossfade simulation for YouTube
                  if (event.target.getDuration() > 10 && event.target.getDuration() - event.target.getCurrentTime() < 2 && queue.length > 1) {
                    playNext();
                  }
                } catch { }
              } else if (event.data === window.YT.PlayerState.ENDED) {
                if (repeatMode === 2) {
                  event.target.seekTo(0);
                  event.target.playVideo();
                } else {
                  setIsPlaying(false);
                  playNext();
                }
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              }
            }
          }
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExternal, resolvedUrl]);

  // Check if it's an iTunes 30s preview
  const isItunesPreview = (url) => {
    return typeof url === "string" && (url.includes("apple.com") || url.includes("mzstatic.com"));
  };

  const [prevTrackUrl, setPrevTrackUrl] = useState(null);
  if (trackUrl !== prevTrackUrl) {
    setPrevTrackUrl(trackUrl);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(false);
    setIsPlaying(false);
    setResolvedUrl("");
    setIsLoadingYoutube(false);
  }

  // When track changes: resolve full song link from YouTube if it's an iTunes preview
  useEffect(() => {

    if (!trackUrl) return;

    if (isItunesPreview(trackUrl) && currentTrack?.track_name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoadingYoutube(true);
      const query = `${currentTrack.track_name} ${currentTrack.artist_name}`;
      
      axios.get("http://localhost:5000/api/music/youtube_url", { params: { q: query } })
        .then(res => {
          if (res.data?.youtube_url) {
            setResolvedUrl(res.data.youtube_url);
          } else {
            // Fallback
            setResolvedUrl(trackUrl);
          }
        })
        .catch(() => {
          // Fallback
          setResolvedUrl(trackUrl);
        })
        .finally(() => {
          setIsLoadingYoutube(false);
          setIsPlaying(true);
        });
    } else {
      setResolvedUrl(trackUrl);
      setIsPlaying(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackUrl, currentTrackIndex]);

  // Pause local audio when switching to external/YouTube
  useEffect(() => {
    if (isExternal) {
      audioRef.current?.pause();
    }
  }, [isExternal]);

  // Handle play/pause sync for HTML5 audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || isExternal || !resolvedUrl) return;
    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name !== "AbortError") {
            setIsPlaying(false);
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, isExternal, resolvedUrl]);

  // Handle volume settings for local and YouTube audio with Fade In/Out
  useEffect(() => {
    let targetVol = volume;
    
    // Apply soft fade-in/out envelopes
    if (isPlaying && duration > 5) {
      if (currentTime <= 3) {
        targetVol = volume * (currentTime / 3);
      } else if (duration - currentTime <= 3) {
        targetVol = volume * (Math.max(0, duration - currentTime) / 3);
      }
    }
    
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : targetVol;
    }
    if (isExternal && ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(isMuted ? 0 : targetVol * 100);
    }
  }, [volume, isMuted, resolvedUrl, isExternal, currentTime, duration, isPlaying]);

  // Setup Web Audio API Equalizer & Analyser
  useEffect(() => {
    if (!audioRef.current) return;
    
    // Create AudioContext only once on first play
    if (isPlaying && !audioCtxRef.current) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      
      try {
        trackNodeRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
        
        // 5-band EQ
        const bands = [60, 230, 910, 3600, 14000];
        const filters = bands.map(freq => {
          const filter = audioCtxRef.current.createBiquadFilter();
          filter.type = freq === 60 ? "lowshelf" : freq === 14000 ? "highshelf" : "peaking";
          filter.frequency.value = freq;
          filter.Q.value = 1;
          filter.gain.value = eqBands[freq] || 0;
          return filter;
        });
        
        biquadFilterRef.current = filters; // Array of filters
        
        stereoPannerRef.current = audioCtxRef.current.createStereoPanner();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        // Connect chain: source -> eq0 -> eq1 -> eq2 -> eq3 -> eq4 -> panner -> analyser -> destination
        trackNodeRef.current.connect(filters[0]);
        for (let i = 0; i < filters.length - 1; i++) {
          filters[i].connect(filters[i+1]);
        }
        filters[filters.length - 1].connect(stereoPannerRef.current);
        stereoPannerRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
      } catch (e) {
        console.warn("Audio routing already connected or failed:", e);
      }
    }
    
    if (isPlaying && audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, [isPlaying]);

  // Update EQ when state changes
  useEffect(() => {
    if (!biquadFilterRef.current || !Array.isArray(biquadFilterRef.current)) return;
    const bands = [60, 230, 910, 3600, 14000];
    bands.forEach((freq, index) => {
      const filter = biquadFilterRef.current[index];
      if (filter) {
        filter.gain.value = eqBands[freq] || 0;
      }
    });
  }, [eqBands]);

  // Handle EQ preset
  const setEqPreset = (preset) => {
    switch(preset) {
      case 'bass': setEqBands({ 60: 6, 230: 4, 910: 0, 3600: -2, 14000: -2 }); break;
      case 'vocal': setEqBands({ 60: -2, 230: 0, 910: 4, 3600: 5, 14000: 2 }); break;
      case 'acoustic': setEqBands({ 60: 2, 230: 2, 910: 0, 3600: 3, 14000: 4 }); break;
      case 'flat': setEqBands({ 60: 0, 230: 0, 910: 0, 3600: 0, 14000: 0 }); break;
    }
  };

  // Apply mood-based EQ settings
  useEffect(() => {
    if (!biquadFilterRef.current || !currentTrack) return;
    
    const mood = (currentTrack.mood || "calm").toLowerCase();
    
    // Reset defaults
    switch (mood) {
      case "energetic":
      case "party":
        setEqBands({ 60: 8, 230: 4, 910: 0, 3600: 2, 14000: 2 });
        break;
      case "calm":
      case "sleepy":
        setEqBands({ 60: -2, 230: -1, 910: 0, 3600: -4, 14000: -6 });
        break;
      case "focused":
      case "lo-fi":
        setEqBands({ 60: 0, 230: 2, 910: -6, 3600: 2, 14000: 0 });
        break;
      case "happy":
        setEqBands({ 60: 2, 230: 2, 910: 2, 3600: 6, 14000: 6 });
        break;
      default:
        setEqPreset('flat');
        break;
    }
  }, [currentTrack]);

  // Canvas Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const ctx = canvas.getContext('2d');
    let time = 0;

    const draw = () => {
      time += isPlaying ? 0.05 : 0.005; 
      
      // 8D Audio panning
      if (stereoPannerRef.current) {
        if (is8DEnabled) {
          // 8 second cycle
          stereoPannerRef.current.pan.value = Math.sin(Date.now() / 1273);
        } else {
          stereoPannerRef.current.pan.value = 0;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let dataArray = null;
      if (analyserRef.current && isPlaying) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
      }
      
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = lyricColorRef.current;
        ctx.globalAlpha = isPlaying ? 0.15 + (i * 0.1) : 0.05;
        
        for (let x = 0; x <= canvas.width; x += 5) {
          // Map x coordinate to frequency bin index
          const bin = Math.min(127, Math.floor((x / canvas.width) * 128));
          const freqVal = dataArray ? dataArray[bin] : 0;
          
          // Amplification logic based on frequency value
          const yOffset = (freqVal / 255) * (40 + i * 20);
          const y = canvas.height / 2 + Math.sin(x * 0.02 + time + i) * (5 + yOffset);
          
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, is8DEnabled]);

  const togglePlayback = useCallback(() => {
    if (!resolvedUrl) return;
    
    if (isExternal && ytPlayerRef.current) {
      if (isPlaying) ytPlayerRef.current.pauseVideo();
      else ytPlayerRef.current.playVideo();
    }
    
    setIsPlaying(prev => !prev);
  }, [resolvedUrl, isExternal, isPlaying]);

  // Global Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlayback();
          break;
        case "ArrowLeft":
          e.preventDefault();
          setCurrentTime((prev) => {
            const next = Math.max(0, prev - 10);
            if (isExternal && ytPlayerRef.current?.seekTo) {
              ytPlayerRef.current.seekTo(next, true);
            } else if (audioRef.current) {
              audioRef.current.currentTime = next;
            }
            return next;
          });
          break;
        case "ArrowRight":
          e.preventDefault();
          setCurrentTime((prev) => {
            const next = Math.min(duration || 0, prev + 10);
            if (isExternal && ytPlayerRef.current?.seekTo) {
              ytPlayerRef.current.seekTo(next, true);
            } else if (audioRef.current) {
              audioRef.current.currentTime = next;
            }
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.min(1.0, prev + 0.1);
            setIsMuted(false);
            if (audioRef.current) audioRef.current.volume = next;
            if (isExternal && ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(next * 100);
            return next;
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.max(0.0, prev - 0.1);
            if (audioRef.current) audioRef.current.volume = next;
            if (isExternal && ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(next * 100);
            return next;
          });
          break;
        case "KeyM":
          setIsMuted((prev) => {
            const next = !prev;
            if (audioRef.current) audioRef.current.volume = next ? 0 : volume;
            if (isExternal && ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(next ? 0 : volume * 100);
            return next;
          });
          break;
        case "KeyN":
          e.preventDefault();
          playNext();
          break;
        case "KeyP":
          e.preventDefault();
          playPrevious();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePlayback, duration, isExternal, playNext, playPrevious, volume]);

  const handleSeek = (e) => {
    const next = Number(e.target.value);
    setCurrentTime(next);
    
    if (isExternal && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(next, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = next;
    }
  };

  if (!queue.length) return null;

  const canSkipBack = currentTrackIndex > 0;
  // Always allow skipping forward to trigger Smart Radio infinite music!
  const canSkipForward = true;

  const togglePlaylistMenu = (e) => {
    e.stopPropagation();
    setShowPlaylistMenu(!showPlaylistMenu);
  };



  return (
    <div className={`fixed z-50 transition-all duration-500 ease-in-out ${isFullScreen ? 'inset-0 bg-black/95 backdrop-blur-3xl' : 'bottom-16 md:bottom-0 left-0 right-0 border-t border-white/10 bg-black/85 backdrop-blur-2xl'}`}>
      {/* Background Canvas Visualizer */}
      <canvas 
        ref={canvasRef} 
        className={`absolute inset-0 w-full h-full pointer-events-none mix-blend-screen z-[-1] transition-opacity duration-1000 ${isFullScreen ? 'opacity-80' : 'opacity-40'}`}
      />

      {isFullScreen && currentTrack?.cover_url && (
        <div 
          className="absolute inset-0 z-[-2] opacity-30 blur-3xl scale-110 bg-center bg-cover transition-all duration-1000"
          style={{ backgroundImage: `url(${currentTrack.cover_url})` }}
        />
      )}

      {/* Full Screen Dismiss Button */}
      {isFullScreen && (
        <button onClick={() => setIsFullScreen(false)} className="absolute top-6 left-6 text-white/50 hover:text-white p-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
      )}

      {/* Lyrics Drawer (Only visible when not fullscreen, or overlaid in fullscreen) */}
      <div 
        className={`absolute bottom-full left-0 right-0 bg-black/90 backdrop-blur-3xl border-t border-white/10 transition-all duration-500 overflow-hidden ${
          showLyrics && !isFullScreen ? "max-h-[60vh] opacity-100" : "max-h-0 opacity-0 border-t-transparent"
        }`}
      >
        {showLyrics && !isFullScreen && currentTrack && (
          <div className="max-w-5xl mx-auto py-2 h-[60vh]">
            <LiveLyrics track={currentTrack} currentTime={currentTime} onLineChange={handleLyricChange} />
          </div>
        )}
      </div>

      {/* EQ Drawer */}
      <div 
        className={`absolute bottom-full left-0 right-0 bg-black/95 backdrop-blur-3xl border-t border-white/10 transition-all duration-500 overflow-hidden ${
          showEQ ? "max-h-[40vh] opacity-100" : "max-h-0 opacity-0 border-t-transparent"
        }`}
      >
        <div className="max-w-xl mx-auto py-6 px-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-medium text-sm uppercase tracking-widest">Equalizer</h3>
            <div className="flex gap-2">
              {['flat', 'bass', 'vocal', 'acoustic'].map(p => (
                <button key={p} onClick={() => setEqPreset(p)} className="text-[10px] text-zinc-400 hover:text-white uppercase px-2 py-1 border border-zinc-700 rounded">{p}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-between gap-4">
            {[60, 230, 910, 3600, 14000].map(freq => (
              <div key={freq} className="flex flex-col items-center gap-2">
                <input 
                  type="range" min="-12" max="12" value={eqBands[freq] || 0}
                  onChange={(e) => setEqBands(prev => ({...prev, [freq]: Number(e.target.value)}))}
                  className="h-24 w-1 accent-gold-500 appearance-none bg-zinc-800 rounded-full vertical-range"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
                <span className="text-[9px] text-zinc-500">{freq > 1000 ? `${freq/1000}k` : freq}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden audio element — only used for local mp3 tracks */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        src={!isExternal && resolvedUrl ? resolvedUrl : undefined}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => {
          const newTime = e.currentTarget.currentTime || 0;
          setCurrentTime(newTime);
          const dur = e.currentTarget.duration;
          if (dur > 10 && dur - newTime < 2) {
            // Gapless playback simulation
            if (currentTrackIndex < queue.length - 1 || repeatMode !== 0 || isEndlessSession) {
              const evt = new Event('ended');
              e.currentTarget.dispatchEvent(evt);
              e.currentTarget.pause();
            }
          }
        }}
        onEnded={() => {
          if (repeatMode === 2) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log(e));
          } else {
            setIsPlaying(false);
            playNext();
          }
        }}
        onError={() => setAudioError(true)}
      />

      {/* Hidden YouTube background player using raw IFrame API */}
      {isExternal && (
        <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '10px', height: '10px', overflow: 'hidden' }}>
          <div id="yt-player-container"></div>
        </div>
      )}

      <div className={`mx-auto px-4 ${isFullScreen ? 'max-w-4xl h-full flex flex-col justify-center py-20' : 'max-w-6xl py-3'}`}>
        {isFullScreen ? (
          /* FULLSCREEN PLAYER (Mobile and Desktop) */
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-xl mx-auto h-full">
            {/* Artwork */}
            {currentTrack && (
              <img 
                src={currentTrack.cover_url || '/placeholder.jpg'} 
                className={`w-64 h-64 sm:w-80 sm:h-80 object-cover rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-6 transition-all duration-300 ${showLyrics ? 'hidden md:block' : 'block'}`}
                alt="cover"
              />
            )}

            {/* Live Lyrics in Full Screen */}
            {showLyrics && currentTrack && (
              <div className="w-full h-[40vh] overflow-hidden mb-6 relative z-10 bg-black/20 rounded-2xl p-4 border border-white/5">
                <LiveLyrics track={currentTrack} currentTime={currentTime} onLineChange={handleLyricChange} />
              </div>
            )}

            {/* Track metadata */}
            {currentTrack && (
              <div className="w-full flex items-center justify-between mb-6">
                <div className="min-w-0 text-left">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white truncate">{currentTrack.track_name}</h2>
                  <p className="text-sm sm:text-base text-zinc-400 truncate mt-1">{currentTrack.artist_name}</p>
                </div>
                <button 
                  onClick={toggleLike}
                  className={`text-2xl hover:scale-110 transition-transform ${isLiked ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
                >
                  {isLiked ? '❤️' : '🤍'}
                </button>
              </div>
            )}

            {/* Scrubber Timeline */}
            <div className="w-full flex items-center gap-3 mb-6">
              <span className="text-xs text-zinc-400 w-10 text-right">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={1}
                value={Math.min(currentTime, duration || 0)}
                onChange={handleSeek}
                disabled={!currentTrack || (audioError && !isExternal)}
                className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gold-500"
              />
              <span className="text-xs text-zinc-400 w-10">{formatTime(duration)}</span>
            </div>

            {/* Primary Controls Row */}
            <div className="w-full flex items-center justify-between mb-8 px-4">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-2 rounded-full transition-colors ${isShuffle ? "text-gold-400" : "text-zinc-500 hover:text-white"}`}
                title="Shuffle"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              </button>

              <button
                onClick={playPrevious}
                disabled={!canSkipBack}
                className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
              </button>

              <button
                onClick={togglePlayback}
                disabled={!currentTrack || isLoadingYoutube || (!isExternal && audioError)}
                className="w-16 h-16 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 transition-all shadow-lg"
              >
                {isPlaying ? (
                  <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>

              <button
                onClick={playNext}
                disabled={!canSkipForward}
                className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
              </button>

              <button
                onClick={() => setRepeatMode((prev) => (prev + 1) % 3)}
                className={`p-2 rounded-full transition-colors ${repeatMode > 0 ? "text-gold-400" : "text-zinc-500 hover:text-white"}`}
                title={repeatMode === 2 ? "Repeat One" : repeatMode === 1 ? "Repeat All" : "Repeat Off"}
              >
                {repeatMode === 2 ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /><text x="12" y="16" fontSize="8" fill="currentColor" textAnchor="middle" stroke="none">1</text></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                )}
              </button>
            </div>

            {/* Extra Options Row */}
            <div className="w-full flex items-center justify-around border-t border-white/10 pt-6">
              {/* Add to Playlist */}
              <div className="relative">
                <button 
                  onClick={togglePlaylistMenu}
                  className="w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors"
                  title="Add to Playlist"
                >
                  +
                </button>
                {showPlaylistMenu && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
                    <p className="px-3 py-1 text-[10px] uppercase tracking-widest text-zinc-500">Add to Playlist</p>
                    {playlists.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-zinc-500 italic">No playlists found</p>
                    ) : (
                      playlists.map(pl => (
                        <button 
                          key={pl._id}
                          onClick={() => addToPlaylist(pl._id)}
                          className="w-full text-left px-4 py-2 text-xs text-white hover:bg-gold-500 hover:text-black transition-colors truncate"
                        >
                          {pl.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Native OS Share Link */}
              <button
                onClick={async () => {
                  const shareUrl = `${window.location.origin}/?play=${encodeURIComponent(currentTrack.track_name)}`;
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: `Listen to ${currentTrack.track_name}`,
                        text: `I'm listening to ${currentTrack.track_name} on EchoMood!`,
                        url: shareUrl
                      });
                    } catch (e) {}
                  } else {
                    navigator.clipboard.writeText(shareUrl);
                    alert("Song link copied to clipboard!");
                  }
                }}
                className="p-2 rounded-full transition-all text-zinc-400 hover:text-white hover:bg-white/10"
                title="Copy Song Link"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>



              {/* EQ Toggle */}
              <button
                onClick={() => setShowEQ(!showEQ)}
                className={`p-2 rounded-full transition-all ${
                  showEQ ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]" : "text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
                title="Equalizer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 22v-6M4 8V2M12 22v-9M12 5V2M20 22v-12M20 6V2M1 14h6M9 11h6M17 8h6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Lyrics Toggle */}
              <button
                onClick={() => setShowLyrics(!showLyrics)}
                className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full transition-all ${
                  showLyrics ? "bg-gold-500 text-black font-semibold" : "border border-zinc-700 text-zinc-400 hover:text-white"
                }`}
              >
                Lyrics
              </button>

              {/* Sleep Timer */}
              <div className="relative">
                <button
                  onClick={() => setShowSleepMenu(!showSleepMenu)}
                  className={`text-2xl p-1 rounded-full transition-colors ${sleepTimer !== null ? 'text-gold-400' : 'text-zinc-500 hover:text-white'}`}
                  title={sleepTimer !== null ? `Sleep in ${sleepTimer}m` : "Sleep Timer"}
                >
                  🌙
                  {sleepTimer !== null && <span className="absolute -top-1 -right-2 text-[9px] bg-gold-500 text-black px-1 rounded-full font-bold">{sleepTimer}m</span>}
                </button>
                {showSleepMenu && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-fade-in flex flex-col">
                    <p className="px-3 py-1 text-[10px] uppercase tracking-widest text-zinc-500">Sleep Timer</p>
                    {[15, 30, 60].map(mins => (
                      <button 
                        key={mins}
                        onClick={() => { setSleepTimer(mins); setShowSleepMenu(false); }}
                        className="text-left px-4 py-2 text-xs text-white hover:bg-gold-500 hover:text-black transition-colors"
                      >
                        {mins} Min
                      </button>
                    ))}
                    {sleepTimer !== null && (
                      <button 
                        onClick={() => { setSleepTimer(null); setShowSleepMenu(false); }}
                        className="text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500 hover:text-black transition-colors border-t border-white/10 mt-1"
                      >
                        Off
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* COLLAPSED / BAR PLAYER */
          <>
            {/* 1. MOBILE MINI PLAYER (flex row under md width, hidden on md+) */}
            <div className="flex md:hidden items-center justify-between w-full relative">
              {/* Progress Line at top edge */}
              <div className="absolute -top-[14px] left-0 right-0 h-0.5 bg-zinc-800">
                <div 
                  className="h-full bg-gold-500 transition-all duration-300" 
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              {/* Artwork & Info (Clicks to expand) */}
              <div 
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer pr-4"
                onClick={() => setIsFullScreen(true)}
              >
                <img 
                  src={currentTrack?.cover_url || '/placeholder.jpg'} 
                  alt="cover" 
                  className="w-10 h-10 rounded object-cover shadow-sm bg-zinc-900 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs text-white font-medium truncate">{currentTrack ? currentTrack.track_name : "No track playing"}</p>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{currentTrack?.artist_name}</p>
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex items-center gap-3 shrink-0">
                <button 
                  onClick={toggleLike}
                  className={`text-lg p-1 transition-transform ${isLiked ? 'text-red-500' : 'text-zinc-500'}`}
                >
                  {isLiked ? '❤️' : '🤍'}
                </button>
                <button
                  onClick={togglePlayback}
                  disabled={!currentTrack || isLoadingYoutube || (!isExternal && audioError)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-all"
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                  ) : (
                    <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                <button
                  onClick={playNext}
                  disabled={!canSkipForward}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                </button>
              </div>
            </div>

            {/* 2. DESKTOP WIDE PLAYER BAR (hidden on mobile, flex on md+) */}
            <div className="hidden md:flex items-center justify-between w-full gap-4">
              {/* Left Column: Cover art, Title, Artist, Like */}
              <div className="flex items-center gap-3 w-64 min-w-0">
                <img 
                  src={currentTrack?.cover_url || '/placeholder.jpg'} 
                  alt="cover" 
                  className="w-12 h-12 rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                  onClick={() => setIsFullScreen(true)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] tracking-[0.2em] uppercase text-zinc-500 mb-0.5">Now Playing</p>
                  {currentTrack ? (
                    <>
                      <p className="text-sm text-white truncate font-medium">{currentTrack.track_name}</p>
                      <p className="text-xs text-zinc-400 truncate">{currentTrack.artist_name}</p>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500">No track playing</p>
                  )}
                </div>
                <button 
                  onClick={toggleLike}
                  className={`text-lg shrink-0 ml-2 transition-transform hover:scale-110 ${isLiked ? 'text-red-500' : 'text-zinc-500 hover:text-white'}`}
                  title={isLiked ? "Unlike" : "Like"}
                >
                  {isLiked ? '❤️' : '🤍'}
                </button>
              </div>

              {/* Center Column: Playback controls + Scrubber slider */}
              <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
                {/* Control buttons */}
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => setIsShuffle(!isShuffle)}
                    className={`p-1 rounded-full transition-colors ${isShuffle ? "text-gold-400" : "text-zinc-500 hover:text-white"}`}
                    title="Shuffle"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  </button>

                  <button
                    onClick={playPrevious}
                    disabled={!canSkipBack}
                    className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                  </button>

                  <button
                    onClick={togglePlayback}
                    disabled={!currentTrack || isLoadingYoutube || (!isExternal && audioError)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 transition-all"
                  >
                    {isPlaying ? (
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    ) : (
                      <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </button>

                  <button
                    onClick={playNext}
                    disabled={!canSkipForward}
                    className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                  </button>

                  <button
                    onClick={() => setRepeatMode((prev) => (prev + 1) % 3)}
                    className={`p-1 rounded-full transition-colors ${repeatMode > 0 ? "text-gold-400" : "text-zinc-500 hover:text-white"}`}
                    title={repeatMode === 2 ? "Repeat One" : repeatMode === 1 ? "Repeat All" : "Repeat Off"}
                  >
                    {repeatMode === 2 ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /><text x="12" y="16" fontSize="8" fill="currentColor" textAnchor="middle" stroke="none">1</text></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    )}
                  </button>
                </div>

                {/* Scrubber slider */}
                <div className="w-full flex items-center gap-3">
                  <span className="text-[10px] text-zinc-500 w-8 text-right shrink-0">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={1}
                    value={Math.min(currentTime, duration || 0)}
                    onChange={handleSeek}
                    disabled={!currentTrack || (audioError && !isExternal)}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gold-500"
                  />
                  <span className="text-[10px] text-zinc-500 w-8 shrink-0">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right Column: Playlist, Lyrics, Sleep, Volume, Fullscreen */}
              <div className="flex items-center gap-3 w-64 justify-end shrink-0">
                {/* Playlist add */}
                <div className="relative">
                  <button 
                    onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
                    className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors"
                    title="Add to Playlist"
                  >
                    +
                  </button>
                  {showPlaylistMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
                      <p className="px-3 py-1 text-[10px] uppercase tracking-widest text-zinc-500">Add to Playlist</p>
                      {playlists.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-zinc-500 italic">No playlists found</p>
                      ) : (
                        playlists.map(pl => (
                          <button 
                            key={pl._id}
                            onClick={() => addToPlaylist(pl._id)}
                            className="w-full text-left px-4 py-2 text-xs text-white hover:bg-gold-500 hover:text-black transition-colors truncate"
                          >
                            {pl.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Lyrics toggle */}
                <button
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-all ${
                    showLyrics ? "bg-gold-500 text-black font-semibold" : "border border-zinc-700 text-zinc-400 hover:text-white"
                  }`}
                >
                  Lyrics
                </button>

                {/* Sleep Timer */}
                <div className="relative">
                  <button
                    onClick={() => setShowSleepMenu(!showSleepMenu)}
                    className={`text-lg p-1 rounded-full transition-colors ${sleepTimer !== null ? 'text-gold-400' : 'text-zinc-500'}`}
                    title={sleepTimer !== null ? `Sleep in ${sleepTimer}m` : "Sleep Timer"}
                  >
                    🌙
                    {sleepTimer !== null && <span className="absolute -top-1 -right-2 text-[9px] bg-gold-500 text-black px-1 rounded-full font-bold">{sleepTimer}m</span>}
                  </button>
                  {showSleepMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-fade-in flex flex-col">
                      <p className="px-3 py-1 text-[10px] uppercase tracking-widest text-zinc-500">Sleep Timer</p>
                      {[15, 30, 60].map(mins => (
                        <button 
                          key={mins}
                          onClick={() => { setSleepTimer(mins); setShowSleepMenu(false); }}
                          className="text-left px-4 py-2 text-xs text-white hover:bg-gold-500 hover:text-black transition-colors"
                        >
                          {mins} Minutes
                        </button>
                      ))}
                      {sleepTimer !== null && (
                        <button 
                          onClick={() => { setSleepTimer(null); setShowSleepMenu(false); }}
                          className="text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500 hover:text-black transition-colors border-t border-white/10 mt-1"
                        >
                          Turn Off
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-2 w-24">
                  <span className="text-[10px] text-zinc-500">{isMuted || volume === 0 ? "🔇" : "🔈"}</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setIsMuted(false);
                      setVolume(parseFloat(e.target.value));
                      if (ytPlayerRef.current && isExternal) ytPlayerRef.current.setVolume(e.target.value * 100);
                      if (audioRef.current) audioRef.current.volume = e.target.value;
                    }}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gold-500"
                  />
                </div>

                {/* Fullscreen Expand */}
                <button onClick={() => setIsFullScreen(true)} className="text-zinc-500 hover:text-white p-1" title="Full Screen">
                  ⛶
                </button>
              </div>
            </div>
          </>
        )}
      </div>
        {/* Up Next Queue Panel */}
      {showQueue && (
        <div className="absolute bottom-24 right-4 md:right-8 w-80 max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto bg-zinc-950/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in custom-scrollbar">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
            <h3 className="text-white font-bold text-lg font-serif">Up Next</h3>
            <button onClick={() => setShowQueue(false)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
          <div className="flex flex-col gap-2">
            {queue.map((track, idx) => {
              const isActive = idx === currentTrackIndex;
              return (
                <div 
                  key={idx}
                  onClick={() => playTrackAtIndex && playTrackAtIndex(idx)}
                  className={`flex items-center justify-between p-2 rounded-xl group transition-colors cursor-pointer ${
                    isActive ? 'bg-gold-500/10 border border-gold-500/30' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0">
                      <img src={track.cover_url || '/covers/calm.png'} className="w-full h-full object-cover" />
                      {isActive && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="flex gap-0.5 items-end h-3">
                            <div className="w-0.5 bg-gold-400 h-1 animate-[bounce_1s_infinite]"></div>
                            <div className="w-0.5 bg-gold-400 h-3 animate-[bounce_1s_infinite_0.2s]"></div>
                            <div className="w-0.5 bg-gold-400 h-2 animate-[bounce_1s_infinite_0.4s]"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${isActive ? 'text-gold-400' : 'text-white'}`}>
                        {track.track_name}
                      </p>
                      <p className="truncate text-xs text-zinc-400">{track.artist_name}</p>
                    </div>
                  </div>
                  
                  {!isActive && removeFromQueue && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFromQueue(idx); }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-400 transition-all shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EQ Panel */}
      {showEQ && (
        <div className="absolute bottom-24 right-4 md:right-32 w-80 max-w-[calc(100vw-2rem)] bg-zinc-950/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl p-6 z-50 animate-fade-in">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-white/10">
            <h3 className="text-white font-bold text-lg font-serif">Equalizer</h3>
            <button onClick={() => setShowEQ(false)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
          
          <div className="flex justify-between mb-8 gap-2">
            <button onClick={() => setEqPreset('flat')} className="px-3 py-1 rounded-full border border-white/10 text-xs hover:bg-white/10 transition-colors">Flat</button>
            <button onClick={() => setEqPreset('bass')} className="px-3 py-1 rounded-full border border-white/10 text-xs hover:bg-white/10 transition-colors">Bass</button>
            <button onClick={() => setEqPreset('vocal')} className="px-3 py-1 rounded-full border border-white/10 text-xs hover:bg-white/10 transition-colors">Vocal</button>
            <button onClick={() => setEqPreset('acoustic')} className="px-3 py-1 rounded-full border border-white/10 text-xs hover:bg-white/10 transition-colors">Acoustic</button>
          </div>

          <div className="flex justify-between h-40">
            {[60, 230, 910, 3600, 14000].map(freq => (
              <div key={freq} className="flex flex-col items-center gap-3">
                <div className="relative h-full flex items-center w-6">
                  <div className="absolute inset-0 w-1 bg-white/5 mx-auto rounded-full"></div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={eqBands[freq] || 0}
                    onChange={(e) => setEqBands(prev => ({...prev, [freq]: parseFloat(e.target.value)}))}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-1 bg-transparent appearance-none cursor-pointer -rotate-90 origin-center [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 font-medium">
                  {freq >= 1000 ? `${(freq/1000).toFixed(1)}k` : freq}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}