import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Set up Axios interceptor to dynamically rewrite the API base URL in production
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
axios.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('http://127.0.0.1:5000')) {
    config.url = config.url.replace('http://127.0.0.1:5000', apiBaseUrl);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
