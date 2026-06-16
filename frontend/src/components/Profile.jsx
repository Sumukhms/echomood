import { useState } from 'react';
import axios from 'axios';

const LANGUAGES = ['Hindi', 'English', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Punjabi'];
const VIBES = ['Bollywood', 'Indie', 'Lo-Fi', 'EDM', 'Acoustic', 'Classical', 'Hip-Hop'];

export default function Profile({ username, userProfile, onProfileUpdate, onLogout }) {
  const [selectedLanguages, setSelectedLanguages] = useState(userProfile?.languages || []);
  const [selectedVibes, setSelectedVibes] = useState(userProfile?.vibes || []);
  const [isPublic, setIsPublic] = useState(userProfile?.is_public || false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

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
      <p className="text-zinc-400 font-light mb-10 text-sm">Account: <span className="text-gold-400 font-medium">{username}</span></p>

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
