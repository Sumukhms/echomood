import { useState, useEffect } from 'react';
import axios from 'axios';

const LANGUAGES = [
  'Hindi', 'English', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Punjabi', 
  'Spanish', 'French', 'Japanese', 'Korean', 'German', 'Italian',
  'Arabic', 'Portuguese', 'Bengali', 'Marathi', 'Gujarati', 'Urdu'
];
const VIBES = [
  'Bollywood', 'Indie', 'Lo-Fi', 'EDM', 'Acoustic', 'Classical', 'Hip-Hop',
  'Romantic', 'Sad', 'Energetic', 'Old Classics', 'Devotional', 'Party', 'Focus',
  'Pop', 'Rock', 'Jazz', 'Metal', 'Folk', 'Ambient', 'R&B', 'Soul',
  'Reggaeton', 'K-Pop', 'Anime', 'Workout', 'Sleep', 'Study', 'Road Trip'
];

export default function Profile({ username, userProfile, onProfileUpdate, onLogout }) {
  const [selectedLanguages, setSelectedLanguages] = useState(userProfile?.languages || []);
  const [selectedVibes, setSelectedVibes] = useState(userProfile?.vibes || []);
  const [isPublic, setIsPublic] = useState(userProfile?.is_public || false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Vibe Persona states
  const [moodHistory, setMoodHistory] = useState([]);
  const [personaTag, setPersonaTag] = useState("Silent Melophile");
  const [personaDescription, setPersonaDescription] = useState("You are just beginning your auditory journey. Tune in to start generating your vibe persona!");

  // Speech synthesis states
  const [voices, setVoices] = useState([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState(() => {
    return localStorage.getItem(`echomood_voice_${username}`) || '';
  });
  const [pitch, setPitch] = useState(() => {
    return parseFloat(localStorage.getItem(`echomood_pitch_${username}`) || '1.0');
  });
  const [rate, setRate] = useState(() => {
    return parseFloat(localStorage.getItem(`echomood_rate_${username}`) || '1.0');
  });

  const calculatePersona = (history, vibes) => {
    const allTags = [...vibes.map(v => v.toLowerCase())];
    history.forEach(h => {
      if (h.mood) allTags.push(h.mood.toLowerCase());
    });

    if (allTags.length === 0) {
      setPersonaTag("Silent Melophile");
      setPersonaDescription("You are just beginning your auditory journey. Tune in to start generating your vibe persona!");
      return;
    }

    const counts = {};
    allTags.forEach(t => counts[t] = (counts[t] || 0) + 1);

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topVibe = sorted[0][0];

    const personaMap = {
      happy: { tag: "Vibrant Optimist", desc: "You radiate joyful energy and seek upbeat, sunny tempos." },
      sad: { tag: "Melancholic Poet", desc: "You appreciate depth, beauty, and emotional honesty in slower frequencies." },
      calm: { tag: "Zen Guru", desc: "You seek focus, peace, and ambient soundscapes to anchor your mind." },
      energetic: { tag: "Pulse Chaser", desc: "You crave high tempo EDM, gym beats, and intense sonic drives." },
      focused: { tag: "Deep Locked-In Scholar", desc: "You love study mixes, synthwave, or classical that optimize your flow." },
      romantic: { tag: "Soulful Lover", desc: "You gravitate toward intimate vocals, warm acoustic strings, and love ballads." },
      nostalgic: { tag: "Vintage Dreamer", desc: "You frequently revisit golden oldies and retro hits that echo the past." },
      "lo-fi": { tag: "Chill Beatmaker", desc: "You are the ultimate lo-fi listener, enjoying cozy instrumentals and coffee shop vibes." },
      edm: { tag: "Rave Renegade", desc: "Electronic bass lines and synth drops are the heartbeat of your playlist." },
      bollywood: { tag: "Desi Cinephile", desc: "You are deeply connected to the grand melodies and drama of Bollywood hits." },
      indie: { tag: "Aesthetic Wanderer", desc: "You search for organic sounds, local bands, and raw storytelling." }
    };

    const match = personaMap[topVibe] || { tag: "Evolving Explorer", desc: "You enjoy a diverse cocktail of moods and sound waves." };
    setPersonaTag(match.tag);
    setPersonaDescription(match.desc);
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:5000/api/mood/history?username=${username}`);
        if (res.data?.success && res.data.history) {
          setMoodHistory(res.data.history);
          calculatePersona(res.data.history, selectedVibes);
        } else {
          calculatePersona([], selectedVibes);
        }
      } catch (err) {
        console.error("Failed to fetch history in Profile", err);
        calculatePersona([], selectedVibes);
      }
    };
    fetchHistory();
  }, [username, selectedVibes]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const toggleSelection = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSave = async () => {
    if (selectedLanguages.length === 0) {
      setSaveMessage("Please select at least one language!");
      return;
    }
    
    setIsSaving(true);
    setSaveMessage('');
    try {
      const preferences = { languages: selectedLanguages, vibes: selectedVibes };
      await axios.post("http://127.0.0.1:5000/api/profile", {
        username,
        preferences,
        is_public: isPublic
      });
      onProfileUpdate({...preferences, is_public: isPublic});
      setSaveMessage("Profile saved successfully!");
      setTimeout(() => setSaveMessage(''), 3000);
    } catch {
      setSaveMessage("Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start w-full max-w-3xl p-10 mx-auto border backdrop-blur-xl bg-white/5 border-white/10 rounded-3xl animate-fade-in mt-4">
      <h2 className="text-3xl font-serif text-white mb-2">Your Profile</h2>
      <p className="text-zinc-400 font-light mb-8 text-sm">Account: <span className="text-gold-400 font-medium">{username}</span></p>

      {/* Vibe Persona Card */}
      <div className="w-full mb-10 p-6 border rounded-2xl border-gold-500/20 bg-gradient-to-br from-gold-500/10 to-zinc-950/40 text-left">
        <div className="flex items-center gap-3.5 mb-3">
          <span className="text-3xl">🔮</span>
          <div>
            <p className="text-[10px] tracking-widest uppercase text-gold-400 font-bold">Your Vibe Persona</p>
            <h4 className="text-2xl font-serif text-white font-bold">{personaTag}</h4>
          </div>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{personaDescription}</p>
      </div>

      {/* Listening Stats */}
      <div className="w-full mb-10 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-white/10 bg-white/5 text-center">
          <p className="text-2xl font-serif text-gold-400 font-bold">{moodHistory.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mt-1">Total Check-ins</p>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-white/5 text-center">
          <p className="text-2xl font-serif text-gold-400 font-bold">
            {moodHistory.length > 0 
              ? (() => {
                  const hours = moodHistory.map(h => new Date(h.timestamp).getHours());
                  const avg = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
                  return avg < 12 ? `${avg || 12} AM` : `${avg - 12 || 12} PM`;
                })()
              : '--'}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mt-1">Peak Vibe Hour</p>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-white/5 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-serif text-gold-400 font-bold">🔥 {Math.min(moodHistory.length, 7)}</p>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 mt-1">Day Streak</p>
        </div>
      </div>

      {/* Languages Section */}
      <div className="w-full mb-10 text-left">
        <h3 className="text-gold-500 uppercase tracking-widest text-xs font-semibold mb-4">Edit Languages</h3>
        <div className="flex flex-wrap gap-3">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              onClick={() => toggleSelection(lang, selectedLanguages, setSelectedLanguages)}
              className={`px-5 py-2 rounded-full text-sm transition-all duration-300 border ${
                selectedLanguages.includes(lang) 
                  ? 'bg-gold-500 border-gold-500 text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                  : 'bg-transparent border-white/20 text-zinc-300 hover:border-white/50'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Vibes Section */}
      <div className="w-full mb-12 text-left">
        <h3 className="text-gold-500 uppercase tracking-widest text-xs font-semibold mb-4">Edit Baseline Vibes</h3>
        <div className="flex flex-wrap gap-3">
          {VIBES.map(vibe => (
            <button
              key={vibe}
              onClick={() => toggleSelection(vibe, selectedVibes, setSelectedVibes)}
              className={`px-5 py-2 rounded-full text-sm transition-all duration-300 border ${
                selectedVibes.includes(vibe) 
                  ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
                  : 'bg-transparent border-white/20 text-zinc-300 hover:border-white/50'
              }`}
            >
              {vibe}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy Section */}
      <div className="w-full mb-12 text-left">
        <h3 className="text-gold-500 uppercase tracking-widest text-xs font-semibold mb-4">Privacy & Community</h3>
        <div className="flex items-center justify-between p-4 border rounded-xl border-white/10 bg-black/20">
          <div>
            <p className="text-white font-medium mb-1">Make My Profile Public</p>
            <p className="text-xs text-zinc-400">Allow other users in the Community tab to see your Liked Songs and Custom Playlists.</p>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isPublic ? 'bg-gold-500' : 'bg-zinc-700'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>

      {/* AI DJ Voice Settings Section */}
      <div className="w-full mb-12 text-left">
        <h3 className="text-gold-500 uppercase tracking-widest text-xs font-semibold mb-4">AI DJ Voice Settings</h3>
        <div className="p-6 border rounded-2xl border-white/10 bg-black/20 space-y-6">
          <div>
            <label className="block text-sm text-white font-medium mb-2">Select DJ Voice Accent</label>
            <select
              value={selectedVoiceUri}
              onChange={(e) => {
                setSelectedVoiceUri(e.target.value);
                localStorage.setItem(`echomood_voice_${username}`, e.target.value);
              }}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold-500/50"
            >
              <option value="">System Default Voice</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white font-medium">Voice Pitch</span>
                <span className="text-gold-400 font-mono">{pitch.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={pitch}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setPitch(val);
                  localStorage.setItem(`echomood_pitch_${username}`, val.toString());
                }}
                className="w-full accent-gold-500 bg-zinc-800"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white font-medium">Voice Speed</span>
                <span className="text-gold-400 font-mono">{rate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={rate}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setRate(val);
                  localStorage.setItem(`echomood_rate_${username}`, val.toString());
                }}
                className="w-full accent-gold-500 bg-zinc-800"
              />
            </div>
          </div>

          <button
            onClick={() => {
              if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(`Hello ${username}! This is a test of your customized AI DJ voice. How does it sound?`);
                const voice = voices.find(v => v.voiceURI === selectedVoiceUri);
                if (voice) utterance.voice = voice;
                utterance.pitch = pitch;
                utterance.rate = rate;
                window.speechSynthesis.speak(utterance);
              }
            }}
            className="px-4 py-2 border border-gold-500/20 text-gold-400 text-xs uppercase tracking-widest font-semibold rounded-full hover:bg-gold-500/10 transition-colors w-fit flex items-center gap-2"
          >
            🔊 Test Voice Accent
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="mb-4 text-sm text-center text-gold-400">{saveMessage}</div>
      )}

      <button 
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-4 text-sm tracking-widest text-black transition-all duration-300 rounded-xl bg-gold-500 hover:bg-gold-400 disabled:opacity-70 uppercase font-semibold mb-4"
      >
        {isSaving ? "Saving..." : "Save Preferences"}
      </button>

      <button
        onClick={onLogout}
        className="w-full py-4 text-sm tracking-widest text-red-400 transition-all duration-300 rounded-xl border border-red-500/30 hover:bg-red-500/10 uppercase font-semibold md:hidden"
      >
        Logout
      </button>
    </div>
  );
}
