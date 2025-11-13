import { useState } from 'react';
import { useMood } from '../context/MoodContext';
import axios from 'axios';

const API_URL = 'http://localhost:8888/api/mood';

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
      // Determine if payload is FormData or regular object
      const isFormData = payload instanceof FormData;
      
      const config = {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
        timeout: 30000 // 30 second timeout for file uploads
      };

      const response = await axios.post(
        `${API_URL}/${endpoint}`,
        payload,
        config
      );
      
      const data = response.data;
      
      if (data.recommendations && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
      } else {
        setError(`Mood detected: ${data.detectedMood}. No song recommendations found.`);
      }
      
      setCurrentMood(data.detectedMood);

    } catch (err) {
      console.error('API Error:', err);
      
      let errorMessage = 'An unknown error occurred.';
      
      if (err.response) {
        // Server responded with error
        errorMessage = err.response.data?.error || err.response.data?.message || errorMessage;
      } else if (err.request) {
        // Request made but no response
        errorMessage = 'Network error. Is the server running?';
      } else {
        // Error setting up request
        errorMessage = err.message;
      }
      
      setError(errorMessage);
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