# 🎵 EchoMood

EchoMood is an advanced, AI-powered music streaming and discovery platform. It goes beyond simple playlists by utilizing semantic multi-modal analysis (Voice, Text, and Facial emotion) to actively curate the perfect listening experience for your current mood. 

Built with a stunning, mobile-first glassmorphism design, EchoMood rivals premium streaming platforms by offering deeply interactive features like collaborative party queues, DJ crossfading, and a professional audio equalizer.

---

## ✨ Premium Features

*   **Intelligent Audio Engine:** 
    *   **5-Band EQ:** A built-in, fully interactive equalizer with presets (Bass Boost, Acoustic, Vocal, Flat).
    *   **Mood Mixer:** Seamless, gapless crossfading between tracks to keep the vibe uninterrupted.
*   **The AI DJ:** 
    *   **Multi-Modal Detection:** Analyzes your mood via WebCam (Facial Expression), Microphone (Semantic Voice Tone), or Text input.
    *   **Generative AI Voice:** A completely custom AI DJ that speaks to you, introduces tracks, and curates dynamic "Smart Radio" sessions.
*   **Social & Collaborative:** 
    *   **Party Mode:** Host live, synchronized listening sessions. Guests can join via a unique code, add songs to a collaborative queue, and upvote their favorite tracks.
    *   **Deep-Link Sharing:** Share native links to custom tracks or playlists directly to mobile apps like WhatsApp and Instagram using native OS sharing protocols.
*   **EchoWrapped:** 
    *   An interactive, highly animated "Year in Review" slideshow that highlights your top moods, listening minutes, and favorite tracks. (Unlocks automatically during Wrap season!).
*   **PWA Ready:** 
    *   Fully installable as a Progressive Web App (PWA) on iOS and Android for a seamless native app experience.

## 🛠️ Tech Stack

EchoMood was built from the ground up for speed, aesthetics, and scalable AI integration.

| Category      | Technology |
|---------------|------------|
| **Frontend** | React, Vite, Tailwind CSS, Web Audio API |
| **Backend** | Python (Flask), Werkzeug |
| **Database** | MongoDB (with PyMongo) |
| **AI / Audio** | TensorFlow, Keras, OpenCV, librosa, SpeechRecognition, gTTS |

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18+)
*   Python 3.10+

### Local Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/spatikavarshini/echomood.git
    cd echomood
    ```

2.  **Setup the AI Backend:**
    ```bash
    cd ai-models
    python -m venv venv
    
    # On Windows:
    venv\Scripts\activate
    # On Mac/Linux:
    # source venv/bin/activate
    
    pip install -r requirements.txt
    python ai_server.py
    ```
    *The backend runs on `http://127.0.0.1:5000`.*

3.  **Setup the React Frontend (in a new terminal):**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    *The frontend runs on `http://localhost:5173`.*

---

*Designed and developed as a next-generation auditory experience.*