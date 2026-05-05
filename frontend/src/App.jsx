import { useState } from 'react';
import VoiceInputPanel from './components/VoiceInputPanel';
import SongCard from './components/SongCard';
import Onboarding from './components/Onboarding'; // <-- IMPORT THE NEW COMPONENT

function App() {
  const [systemActive, setSystemActive] = useState(false);
  const [detectedMood, setDetectedMood] = useState(null);
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  
  // NEW: Store user profile data
  const [userProfile, setUserProfile] = useState(null);

  const handleOnboardingComplete = (preferences) => {
    setUserProfile(preferences);
    setSystemActive(true); // Jump straight to the mic after onboarding!
  };

  const handleMoodDetected = (mood, tracks) => {
    setDetectedMood(mood);
    setRecommendedTracks(tracks);
  };

  const resetSystem = () => {
    setDetectedMood(null);
    setRecommendedTracks([]);
  };

  return (
    <div className="relative min-h-screen font-sans text-zinc-200 bg-zinc-950 overflow-x-hidden">
      
      {/* Background stays the same... */}
      <div 
        className="fixed inset-0 z-0 bg-center bg-cover opacity-40 mix-blend-luminosity"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2560&auto=format&fit=crop")', backgroundColor: '#09090b' }}
      />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(9,9,11,1)_100%)]" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 py-20">
        
        {/* Header */}
        <div className={`text-center transition-all duration-1000 ${recommendedTracks.length > 0 ? 'mb-12' : 'mb-0'}`}>
          <h2 className="text-gold-500 uppercase tracking-[0.3em] text-xs font-semibold mb-3">Premium Auditory Experience</h2>
          <h1 className="mb-4 font-serif text-5xl font-medium tracking-wide text-white italic md:text-6xl">Echomood</h1>
        </div>
        
        {/* State 1: The Welcome / Start Button */}
        {!systemActive && !userProfile && (
          <div className="w-full max-w-2xl p-12 text-center border backdrop-blur-xl bg-white/5 border-white/10 rounded-3xl animate-fade-in">
            <p className="max-w-md mx-auto mb-10 text-sm font-light leading-relaxed text-zinc-400">
              Discover curated soundscapes tailored to your exact emotional frequency.
            </p>
            <button 
              onClick={() => setSystemActive('onboarding')} // Change state to onboarding
              className="px-8 py-3 text-sm tracking-widest text-black transition-all rounded-full bg-gold-500 hover:bg-gold-400"
            >
              INITIALIZE SYSTEM
            </button>
          </div>
        )}

        {/* State 2: Onboarding Screen */}
        {systemActive === 'onboarding' && (
           <Onboarding onComplete={handleOnboardingComplete} />
        )}

        {/* State 3: Voice Panel (Now passes userProfile to the component!) */}
        {systemActive === true && recommendedTracks.length === 0 && (
          <div className="w-full max-w-2xl animate-fade-in mt-12 text-center">
             <p className="text-gold-400 text-sm mb-6">
               Calibrated for: {userProfile.languages.join(', ')}
             </p>
             <VoiceInputPanel 
                userProfile={userProfile} // <-- We will send this to Python next!
                onAnalyzeComplete={(mood, tracks) => handleMoodDetected(mood, tracks)} 
             />
          </div>
        )}

        {/* State 4: Results Grid remains exactly the same... */}
        {recommendedTracks.length > 0 && (
            // ... your existing results grid code here ...
            <div className="w-full max-w-6xl animate-fade-in">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <div>
                  <p className="text-xs tracking-widest text-zinc-500 uppercase mb-1">Detected Frequency</p>
                  <h3 className="font-serif text-3xl text-gold-400 uppercase tracking-wider">{detectedMood}</h3>
                </div>
                <button onClick={resetSystem} className="px-6 py-2 text-xs tracking-widest text-white border rounded-full border-white/20 hover:bg-white/10">NEW SCAN</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedTracks.map((track, index) => (
                  <SongCard key={index} track={track} />
                ))}
              </div>
            </div>
        )}
      </div>
    </div>
  )
}

export default App;