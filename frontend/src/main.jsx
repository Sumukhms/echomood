import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Set up Axios interceptor to dynamically rewrite the API base URL in production
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://sumukh25-echomood-api.hf.space';
axios.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('https://sumukh25-echomood-api.hf.space')) {
    config.url = config.url.replace('https://sumukh25-echomood-api.hf.space', apiBaseUrl);
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

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('SW registered: ', registration);
    }).catch((registrationError) => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
