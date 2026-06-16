import { useState } from 'react';
import axios from 'axios';

const LANGUAGES = [
  'Hindi', 'English', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Punjabi', 
  'Spanish', 'French', 'Japanese', 'Korean', 'German', 'Italian'
];

export default function Onboarding({ onComplete, username }) {
  const [selectedLanguages, setSelectedLanguages] = useState([]);

  const [isSaving, setIsSaving] = useState(false);

  const toggleSelection = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleFinish = async () => {
    // Ensure they picked at least one language
    if (selectedLanguages.length === 0) {
      alert("Please select at least one language!");
      return;
    }
    
    setIsSaving(true);
    try {
      const preferences = { languages: selectedLanguages };
      if (username) {
        await axios.post("http://127.0.0.1:5000/api/profile", {
          username,
          preferences
        });
      }
      onComplete(preferences);
    } catch (err) {
      console.error("Failed to save onboarding preferences", err);
      // still proceed so they aren't stuck
      onComplete({ languages: selectedLanguages });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl p-10 mx-auto border backdrop-blur-xl bg-white/5 border-white/10 rounded-3xl animate-fade-in mt-12">
      <h2 className="text-3xl font-serif text-white mb-2">Design Your Frequency</h2>
      <p className="text-zinc-400 font-light mb-10 text-sm">Select your preferences to calibrate the AI.</p>

      {/* Languages Section */}
      <div className="w-full mb-10 text-left">
        <h3 className="text-gold-500 uppercase tracking-widest text-xs font-semibold mb-4">1. Select Languages</h3>
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

      <button 
        onClick={handleFinish}
        disabled={isSaving}
        className="w-full py-4 text-sm tracking-widest text-black transition-all duration-300 rounded-xl bg-gold-500 hover:bg-gold-400 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-70 uppercase font-semibold"
      >
        {isSaving ? "Initializing..." : "Enter Echomood"}
      </button>
    </div>
  );
}