import { useState } from 'react';
import { useMood } from './context/MoodContext';
import { useMoodApi } from './hooks/useMoodApi';

// Import icons
import { FaFileAlt, FaMicrophone, FaVideo } from 'react-icons/fa';

// Import Components
import Header from './components/Header';
import TabButton from './components/TabButton';
import TextInputPanel from './components/TextInputPanel';
import SongCard from './components/SongCard';
import LoadingSpinner from './components/LoadingSpinner';
// (We will create these panels in the next steps)
// import VoiceInputPanel from './components/VoiceInputPanel';
// import FaceInputPanel from './components/FaceInputPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState('text'); // 'text', 'voice', 'face'
  const { uiColors } = useMood();
  
  // Get all API state and functions from our custom hook
  const { isLoading, error, recommendations, getRecommendations } = useMoodApi();

  return (
    <div className={`min-h-screen p-4 sm:p-8 text-white transition-all duration-1000 bg-gradient-to-br ${uiColors}`}>
      <div className="max-w-4xl mx-auto">
        
        <Header />

        {/* --- Tab Navigation --- */}
        <nav className="flex bg-black bg-opacity-30">
          <TabButton
            icon={<FaFileAlt />}
            label="Text"
            isActive={activeTab === 'text'}
            onClick={() => setActiveTab('text')}
          />
          <TabButton
            icon={<FaMicrophone />}
            label="Voice"
            isActive={activeTab === 'voice'}
            onClick={() => alert("Voice panel coming soon!")} // Placeholder
          />
          <TabButton
            icon={<FaVideo />}
            label="Face"
             // --- THIS IS THE FIX ---
            isActive={activeTab === 'face'}
            // --- END OF FIX ---
            onClick={() => alert("Face panel coming soon!")} // Placeholder
          />
        </nav>

        {/* --- Main Content Area --- */}
        <main className="p-6 sm:p-10 bg-black bg-opacity-20 backdrop-blur-sm rounded-b-xl shadow-2xl min-h-[20rem]">
          {activeTab === 'text' && (
            <TextInputPanel 
              getRecommendations={getRecommendations} 
              isLoading={isLoading} 
            />
          )}
          
          {/* Placeholders for other panels */}
          {activeTab === 'voice' && <p>Voice panel will go here.</p>}
          {activeTab === 'face' && <p>Face panel will go here.</p>}
        </main>

        {/* --- Results Section --- */}
        <div className="mt-12">
          {isLoading && <LoadingSpinner />}
          {error && (
            <div className="p-4 bg-red-800 bg-opacity-70 border border-red-600 rounded-lg text-center">
              <h3 className="font-bold text-lg">{error}</h3>
            </div>
          )}
          
          {!isLoading && recommendations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((song) => (
                <SongCard key={song.external_url} song={song} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}