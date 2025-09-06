# 🚀 EchoMood

An AI-powered music recommendation system that generates personalized playlists based on your real-time mood, detected via facial expression, text, or voice.

***

## ✨ Core Features

-   **Multi-Modal Mood Detection:** Analyzes user input from three different sources:
    -   📸 **Facial Emotion Recognition (FER):** Detects mood from a live webcam feed.
    -   ✍️ **Text Sentiment Analysis:** Infers emotion from user-written text.
    -   🎤 **Voice Emotion Recognition (SER):** Determines emotional tone from microphone input.
-   **Real-Time Playlist Generation:** Connects with the Spotify API to curate a unique playlist that either matches or aims to improve the user's detected emotional state.
-   **Adaptive Recommendations:** (Future goal) Learns from user feedback (likes/skips) to fine-tune future suggestions.
-   **Mood-Themed UI:** (Future goal) The user interface dynamically changes its color scheme and aesthetic to reflect the current mood.

## 🛠️ Tech Stack

| Category      | Technology                                                              |
|---------------|-------------------------------------------------------------------------|
| **Frontend** | React, Vite, Tailwind CSS                                               |
| **Backend** | Node.js, Express.js                                                     |
| **Database** | MongoDB (with Mongoose), MongoDB Atlas                                  |
| **AI / ML** | Python (Flask/FastAPI), TensorFlow/Keras, Hugging Face, OpenCV, Librosa |
| **Deployment**| Vercel (Frontend), Render (Backend), MongoDB Atlas (Database)           |


## ⚙️ Getting Started

### Prerequisites

-   Node.js & npm
-   Python & pip
-   A Spotify Developer account for API keys.

### Local Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/EchoMood.git](https://github.com/YOUR_USERNAME/EchoMood.git)
    cd EchoMood
    ```

2.  **Setup Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

3.  **Setup Backend:**
    ```bash
    cd ../backend
    npm install
    # Create a .env file and add your API keys (e.g., SPOTIFY_CLIENT_ID, MONGO_URI)
    npm start
    ```