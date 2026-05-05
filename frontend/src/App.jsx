import { useState } from "react";
import VoiceInputPanel from "./components/VoiceInputPanel";
import TextInputPanel from "./components/TextInputPanel";
import WebcamPanel from "./components/WebcamPanel";
import SongCard from "./components/SongCard";
import Onboarding from "./components/Onboarding";
import VaultUpload from "./components/VaultUpload";
import VaultGallery from "./components/VaultGallery";
import GlobalPlayer from "./components/GlobalPlayer";
import AuthScreen from "./components/AuthScreen";
import Home from "./components/Home";
import Sidebar from "./components/Sidebar";

function App() {
  const [systemActive, setSystemActive] = useState(false);
  const [detectedMood, setDetectedMood] = useState(null);
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [aiInputMode, setAiInputMode] = useState("voice");
  const [queue, setQueue] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [activePlaylist, setActivePlaylist] = useState(null);

  // NEW: Store user profile data
  const [userProfile, setUserProfile] = useState(null);

  const handleOnboardingComplete = (preferences) => {
    setUserProfile(preferences);
    setSystemActive(true); // Jump straight to the mic after onboarding!
    setActiveTab("ai-dj");
    setAiInputMode("voice");
  };

  const handleMoodDetected = (mood, tracks) => {
    setDetectedMood(mood);
    setRecommendedTracks(tracks);
  };

  const resetSystem = () => {
    setDetectedMood(null);
    setRecommendedTracks([]);
  };

  if (!currentUser) {
    return <AuthScreen setAuth={setCurrentUser} />;
  }

  const playTrack = (trackList, startIndex) => {
    if (!Array.isArray(trackList) || trackList.length === 0) return;
    const safeStartIndex = Math.max(
      0,
      Math.min(startIndex, trackList.length - 1),
    );
    setQueue(trackList);
    setCurrentTrackIndex(safeStartIndex);
  };

  const playNext = () => {
    setCurrentTrackIndex((prevIndex) => {
      if (queue.length === 0) return 0;
      return Math.min(prevIndex + 1, queue.length - 1);
    });
  };

  const playPrevious = () => {
    setCurrentTrackIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const isDashboardActive = systemActive === true;

  const renderAiDjPanel = () => {
    if (recommendedTracks.length === 0) {
      return (
        <div className="w-full max-w-2xl mx-auto text-center">
          <p className="text-gold-400 text-sm mb-6">
            Calibrated for: {userProfile.languages.join(", ")}
          </p>
          <div className="inline-flex p-1 border rounded-full bg-white/5 border-white/10 mb-5">
            <button
              onClick={() => setAiInputMode("voice")}
              className={`px-5 py-2 text-xs tracking-widest uppercase rounded-full transition-all ${
                aiInputMode === "voice"
                  ? "bg-gold-500 text-black"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              Voice Mode
            </button>
            <button
              onClick={() => setAiInputMode("text")}
              className={`px-5 py-2 text-xs tracking-widest uppercase rounded-full transition-all ${
                aiInputMode === "text"
                  ? "bg-gold-500 text-black"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              Text Mode
            </button>
            <button
              onClick={() => setAiInputMode("camera")}
              className={`px-5 py-2 text-xs tracking-widest uppercase rounded-full transition-all ${
                aiInputMode === "camera"
                  ? "bg-gold-500 text-black"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              Camera Mode
            </button>
          </div>
          {aiInputMode === "voice" ? (
            <VoiceInputPanel
              userProfile={userProfile}
              onAnalyzeComplete={(mood, tracks) =>
                handleMoodDetected(mood, tracks)
              }
            />
          ) : aiInputMode === "text" ? (
            <TextInputPanel
              userProfile={userProfile}
              onAnalyzeComplete={(mood, tracks) =>
                handleMoodDetected(mood, tracks)
              }
            />
          ) : (
            <WebcamPanel
              userProfile={userProfile}
              onAnalyzeComplete={(mood, tracks) =>
                handleMoodDetected(mood, tracks)
              }
            />
          )}
        </div>
      );
    }

    return (
      <div className="w-full animate-fade-in">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div>
            <p className="text-xs tracking-widest text-zinc-500 uppercase mb-1">
              Detected Frequency
            </p>
            <h3 className="font-serif text-3xl text-gold-400 uppercase tracking-wider">
              {detectedMood}
            </h3>
          </div>
          <button
            onClick={resetSystem}
            className="px-6 py-2 text-xs tracking-widest text-white border rounded-full border-white/20 hover:bg-white/10"
          >
            NEW SCAN
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendedTracks.map((track, index) => (
            <SongCard
              key={index}
              track={track}
              username={currentUser.username}
              onPlay={(clickedTrack, fullTrackList) => {
                const selectedIndex = fullTrackList.findIndex(
                  (listTrack) =>
                    listTrack.preview_url === clickedTrack.preview_url,
                );
                playTrack(
                  fullTrackList,
                  selectedIndex >= 0 ? selectedIndex : 0,
                );
              }}
              recommendedTracks={recommendedTracks}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderVaultPanel = () => (
    <div className="w-full">
      <div className="flex justify-center mb-8">
        <VaultUpload username={currentUser.username} />
      </div>
      <div className="w-full max-w-5xl mx-auto mb-8">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>
      <VaultGallery
        username={currentUser.username}
        onPlayTrack={(clickedTrack, fullLocalTracks) => {
          const selectedIndex = fullLocalTracks.findIndex(
            (listTrack) => listTrack.file_url === clickedTrack.file_url,
          );
          playTrack(fullLocalTracks, selectedIndex >= 0 ? selectedIndex : 0);
        }}
      />
    </div>
  );

  const renderHomePanel = () => (
    <Home
      currentUser={currentUser}
      onPlayTrack={(clickedTrack, fullTrackList) => {
        const selectedIndex = fullTrackList.findIndex(
          (listTrack) => listTrack.preview_url === clickedTrack.preview_url,
        );
        playTrack(fullTrackList, selectedIndex >= 0 ? selectedIndex : 0);
      }}
    />
  );

  return (
    <div className="relative min-h-screen font-sans text-zinc-200 bg-zinc-950 overflow-x-hidden pb-28">
      {/* Background stays the same... */}
      <div
        className="fixed inset-0 z-0 bg-center bg-cover opacity-40 mix-blend-luminosity"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2560&auto=format&fit=crop")',
          backgroundColor: "#09090b",
        }}
      />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(9,9,11,1)_100%)]" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 py-20">
        {/* Header */}
        <div
          className={`text-center transition-all duration-1000 ${recommendedTracks.length > 0 ? "mb-12" : "mb-0"}`}
        >
          <h2 className="text-gold-500 uppercase tracking-[0.3em] text-xs font-semibold mb-3">
            Premium Auditory Experience
          </h2>
          <h1 className="mb-4 font-serif text-5xl font-medium tracking-wide text-white italic md:text-6xl">
            Echomood
          </h1>
        </div>

        {/* State 1: The Welcome / Start Button */}
        {!systemActive && !userProfile && (
          <div className="w-full max-w-2xl p-12 text-center border backdrop-blur-xl bg-white/5 border-white/10 rounded-3xl animate-fade-in">
            <p className="max-w-md mx-auto mb-10 text-sm font-light leading-relaxed text-zinc-400">
              Discover curated soundscapes tailored to your exact emotional
              frequency.
            </p>
            <button
              onClick={() => setSystemActive("onboarding")} // Change state to onboarding
              className="px-8 py-3 text-sm tracking-widest text-black transition-all rounded-full bg-gold-500 hover:bg-gold-400"
            >
              INITIALIZE SYSTEM
            </button>
          </div>
        )}

        {/* State 2: Onboarding Screen */}
        {systemActive === "onboarding" && (
          <Onboarding onComplete={handleOnboardingComplete} />
        )}

        {/* State 3: Main Dashboard */}
        {isDashboardActive && (
          <div className="w-full max-w-6xl mt-10 animate-fade-in">
            <div className="w-full mb-8 border border-white/10 bg-black/30 backdrop-blur-xl rounded-2xl">
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] tracking-[0.25em] uppercase text-zinc-500">
                    Dashboard
                  </p>
                  <h3 className="text-lg font-serif text-white">
                    Your Listening Command Center
                  </h3>
                </div>
                <div className="inline-flex p-1 border rounded-full bg-white/5 border-white/10">
                  <button
                    onClick={() => setActiveTab("home")}
                    className={`px-6 py-2 text-xs tracking-widest uppercase rounded-full transition-all ${
                      activeTab === "home"
                        ? "bg-gold-500 text-black"
                        : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    Home
                  </button>
                  <button
                    onClick={() => setActiveTab("ai-dj")}
                    className={`px-6 py-2 text-xs tracking-widest uppercase rounded-full transition-all ${
                      activeTab === "ai-dj"
                        ? "bg-gold-500 text-black"
                        : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    AI DJ
                  </button>
                  <button
                    onClick={() => setActiveTab("vault")}
                    className={`px-6 py-2 text-xs tracking-widest uppercase rounded-full transition-all ${
                      activeTab === "vault"
                        ? "bg-gold-500 text-black"
                        : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    Personal Vault
                  </button>
                </div>
              </div>
            </div>

            {activeTab === "home"
              ? renderHomePanel()
              : activeTab === "ai-dj"
                ? renderAiDjPanel()
                : renderVaultPanel()}
          </div>
        )}
      </div>
      <GlobalPlayer
        queue={queue}
        currentTrackIndex={currentTrackIndex}
        playNext={playNext}
        playPrevious={playPrevious}
      />
    </div>
  );
}

export default App;
