import { createContext, useState, useContext, useMemo } from 'react';

// Mood color configurations
const moodStyles = {
  default: 'from-gray-700 to-gray-900 border-gray-500',
  happy: 'from-happy-light to-happy-dark border-happy-border',
  sad: 'from-sad-light to-sad-dark border-sad-border',
  angry: 'from-angry-light to-angry-dark border-angry-border',
  calm: 'from-calm-light to-calm-dark border-calm-border',
  energetic: 'from-energetic-light to-energetic-dark border-energetic-border',
};

const MoodContext = createContext();

export const MoodProvider = ({ children }) => {
  const [currentMood, setCurrentMood] = useState('default'); // e.g., 'happy', 'sad'

  // useMemo ensures this object only recalculates when currentMood changes
  const value = useMemo(() => {
    const uiColors = moodStyles[currentMood] || moodStyles.default;
    return {
      currentMood,
      setCurrentMood,
      uiColors,
      borderColor: uiColors.split(' ')[2], // e.g., "border-happy-border"
    };
  }, [currentMood]);

  return (
    <MoodContext.Provider value={value}>
      {children}
    </MoodContext.Provider>
  );
};

// This is the custom hook components will use to access the context
export const useMood = () => useContext(MoodContext);