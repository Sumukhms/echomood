import { useState } from 'react';

const LANGUAGES = ['Hindi', 'English', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Punjabi'];
const VIBES = ['Bollywood', 'Indie', 'Lo-Fi', 'EDM', 'Acoustic', 'Classical', 'Hip-Hop'];

export default function Onboarding({ onComplete }) {
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedVibes, setSelectedVibes] = useState([]);

  const toggleSelection = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleFinish = () => {
    // Ensure they picked at least one language
    if (selectedLanguages.length === 0) {
      alert("Please select at least one language!");
      return;
    }
    onComplete({ languages: selectedLanguages, vibes: selectedVibes });
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

      {/* Vibes Section */}
      <div className="w-full mb-12 text-left">
        <h3 className="text-gold-500 uppercase tracking-widest text-xs font-semibold mb-4">2. Baseline Vibes</h3>
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

      <button 
        onClick={handleFinish}
        className="w-full py-4 text-sm tracking-widest text-black transition-all duration-300 rounded-xl bg-gold-500 hover:bg-gold-400 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] uppercase font-semibold"
      >
        Enter Echomood
      </button>
    </div>
  );
}