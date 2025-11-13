import axios from 'axios';

// The URL of your Node.js backend
const API_URL = 'http://localhost:8888/api/mood';

export const api = axios.create({
  baseURL: API_URL,
});

// You can add interceptors here for handling errors or auth tokens
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Pass a more useful error object to the component
    if (error.response) {
      return Promise.reject(error.response.data);
    } else if (error.request) {
      return Promise.reject({ error: "Network error. Is the server running?" });
    } else {
      return Promise.reject({ error: error.message });
    }
  }
);