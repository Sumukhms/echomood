import { useState, useRef } from "react";
import axios from "axios";

export default function VoiceInputPanel({ userProfile, username, onAnalyzeComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState("Press to speak your mind");

  // These references hold our recording data behind the scenes
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleRecordClick = async () => {
    if (!isRecording) {
      try {
        // 1. Ask the user for microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        // 2. Set up the recorder
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = []; // Clear old recordings

        // 3. Every time we get a chunk of audio, save it
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // 4. What happens when we hit "stop"
        mediaRecorder.onstop = async () => {
          setStatusText("Analyzing vocal resonance...");

          // Package the audio chunks into a single file (Blob)
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          // Create a form to send to Python
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          if (userProfile && userProfile.languages) {
            formData.append("languages", userProfile.languages.join(","));
          }
          if (username) {
            formData.append("username", username);
          }

          try {
            // Send it to our new Python endpoint!
            const response = await axios.post(
              "http://localhost:5000/api/analyze/voice",
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            );

            setStatusText("Vibe detected.");
            if (onAnalyzeComplete) {
              onAnalyzeComplete(
                response.data.detected_mood,
                response.data.tracks,
                response.data.explanation
              );
            }
          } catch (error) {
            console.error("Upload failed", error);
            setStatusText("Error communicating with AI Brain.");
          }
        };

        // Start recording!
        mediaRecorder.start();
        setIsRecording(true);
        setStatusText("Listening... Click again to stop.");
      } catch (err) {
        console.error("Mic access denied", err);
        setStatusText("Microphone access required.");
      }
    } else {
      // If we are already recording, clicking it again STOPS the recording
      setIsRecording(false);
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        // Turn off the microphone light in the browser tab
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-10 mt-8 border bg-white/5 backdrop-blur-md border-white/10 rounded-3xl shadow-2xl">
      <h3 className="mb-8 font-serif text-2xl tracking-widest text-white uppercase">
        Vocal Resonance
      </h3>

      <button
        onClick={handleRecordClick}
        className={`relative flex items-center justify-center w-24 h-24 mb-8 rounded-full transition-all duration-700 border
          ${
            isRecording
              ? "bg-gold-500 border-gold-400 shadow-[0_0_50px_rgba(212,175,55,0.6)] scale-110 animate-pulse"
              : "bg-zinc-900 border-white/20 hover:border-gold-500/50 hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]"
          }`}
      >
        <svg
          className={`w-8 h-8 transition-colors duration-700 ${isRecording ? "text-black" : "text-gold-500"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isRecording ? (
            // Stop Icon
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
            />
          ) : (
            // Mic Icon
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          )}
        </svg>
      </button>

      <p
        className={`text-xs tracking-[0.2em] uppercase transition-colors duration-500 ${isRecording ? "text-gold-400" : "text-zinc-400"}`}
      >
        {statusText}
      </p>
    </div>
  );
}
