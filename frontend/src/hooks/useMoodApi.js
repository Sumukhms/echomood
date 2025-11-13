import { useState } from 'react';
import { useMood } from '../context/MoodContext';
import { api } from '../services/api';

export const useMoodApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const { setCurrentMood } = useMood();

  const getRecommendations = async (endpoint, payload) => {
    setIsLoading(true);
    setError(null);
    setRecommendations([]);
    setCurrentMood('default'); // Reset mood on new request

    try {
      const data = await api.post(endpoint, payload);
      
      if (data.recommendations && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
      } else {
        setError(`Mood detected: ${data.detectedMood}. No song recommendations found.`);
      }
      
      setCurrentMood(data.detectedMood);

    } catch (err) {
      console.error(err);
      setError(err.error || 'An unknown error occurred.');
      setCurrentMood('default');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    recommendations,
    getRecommendations,
  };
};