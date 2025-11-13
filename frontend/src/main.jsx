import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { MoodProvider } from './context/MoodContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MoodProvider>
      <App />
    </MoodProvider>
  </StrictMode>,
)