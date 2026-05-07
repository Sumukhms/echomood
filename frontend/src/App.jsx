import { useState, useCallback } from "react";
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

// Normalise so GlobalPlayer always reads .file_url
function normaliseTrack(t) {
  return { ...t, file_url: t.file_url || t.preview_url || "" };
}

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
  const [activeTab, setActiveTab] = useState("home");
  const [aiInputMode, setAiInputMode] = useState("voice");
  const [userProfile, setUserProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Queue never resets on tab change
  const [queue, setQueue] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const playTrack = useCallback((trackList, startIndex) => {
    if (!Array.isArray(trackList) || trackList.length === 0) return;
    const safeIndex = Math.max(0, Math.min(startIndex, trackList.length - 1));
    setQueue(trackList.map(normaliseTrack));
    setCurrentTrackIndex(safeIndex);
  }, []);

  const playNext = useCallback(() => {
    setCurrentTrackIndex((prev) =>
      prev < queue.length - 1 ? prev + 1 : prev
    );
  }, [queue.length]);

  const playPrevious = useCallback(() => {
    setCurrentTrackIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Single universal handler used by ALL panels
  // signature: handlePlay(clickedTrack, fullTrackList)
  const handlePlay = useCallback(
    (clickedTrack, trackList) => {
      const list = Array.isArray(trackList) ? trackList : [clickedTrack];
      const needle = clickedTrack.file_url || clickedTrack.preview_url;
      const idx = list.findIndex(
        (t) => (t.file_url || t.preview_url) === needle
      );
      playTrack(list, idx >= 0 ? idx : 0);
    },
    [playTrack]
  );

  const handleOnboardingComplete = (preferences) => {
    setUserProfile(preferences);
    setSystemActive(true);
    setActiveTab("ai-dj");
  };

  const handleMoodDetected = (mood, tracks) => {
    setDetectedMood(mood);
    setRecommendedTracks(tracks);
  };

  if (!currentUser) return <AuthScreen setAuth={setCurrentUser} />;

  const isDashboard = systemActive === true;

  // ── AI DJ panel ─────────────────────────────────────────────────────────────
  const renderAiDjPanel = () => {
    if (recommendedTracks.length === 0) {
      return (
        <div className="w-full max-w-2xl mx-auto text-center">
          {userProfile?.languages?.length > 0 && (
            <p className="text-gold-400 text-sm mb-6">
              Calibrated for: {userProfile.languages.join(", ")}
            </p>
          )}
          <div className="inline-flex p-1 border rounded-full bg-white/5 border-white/10 mb-5">
            {[
              { id: "voice", label: "Voice Mode" },
              { id: "text", label: "Text Mode" },
              { id: "camera", label: "Camera Mode" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setAiInputMode(id)}
                className={`px-5 py-2 text-xs tracking-widest uppercase rounded-full transition-all ${
                  aiInputMode === id
                    ? "bg-gold-500 text-black"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {aiInputMode === "voice" && (
            <VoiceInputPanel
              userProfile={userProfile}
              onAnalyzeComplete={handleMoodDetected}
            />
          )}
          {aiInputMode === "text" && (
            <TextInputPanel
              userProfile={userProfile}
              onAnalyzeComplete={handleMoodDetected}
            />
          )}
          {aiInputMode === "camera" && (
            <WebcamPanel
              userProfile={userProfile}
              onAnalyzeComplete={handleMoodDetected}
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
            onClick={() => {
              setDetectedMood(null);
              setRecommendedTracks([]);
            }}
            className="px-6 py-2 text-xs tracking-widest text-white border rounded-full border-white/20 hover:bg-white/10 transition-colors"
          >
            NEW SCAN
          </button>
        </div>

        {recommendedTracks.length === 0 ? (
          <EmptyState
            message="No tracks returned for this mood."
            hint="Try scanning again or switch languages in onboarding."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedTracks.map((track, index) => (
              <SongCard
                key={`${track.preview_url || track.file_url}-${index}`}
                track={track}
                username={currentUser.username}
                onPlay={handlePlay}
                recommendedTracks={recommendedTracks}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen font-sans text-zinc-200 bg-zinc-950 overflow-x-hidden pb-28">
      {/* Ambient background */}
      <div
        className="fixed inset-0 z-0 bg-center bg-cover opacity-40 mix-blend-luminosity"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2560&auto=format&fit=crop")',
          backgroundColor: "#09090b",
        }}
      />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(9,9,11,1)_100%)]" />

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
          />
        )}

        <main className="flex flex-col items-center flex-1 min-w-0 p-6 py-16">
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
            <Onboarding onComplete={handleOnboardingComplete} />
          )}

          {/* Dashboard */}
          {isDashboard && (
            <div className="w-full max-w-6xl">
              {/* Tab bar */}
              <div className="w-full mb-8 border border-white/10 bg-black/30 backdrop-blur-xl rounded-2xl">
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
                      { id: "ai-dj", label: "AI DJ" },
                      { id: "vault", label: "Personal Vault" },
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
                <Home currentUser={currentUser} onPlayTrack={handlePlay} />
              </div>

              <div className={activeTab === "ai-dj" ? "block" : "hidden"}>
                {renderAiDjPanel()}
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
            </div>
          )}
        </main>
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