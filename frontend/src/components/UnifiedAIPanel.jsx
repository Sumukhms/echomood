import { useState, useRef } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const byteString = atob(base64);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const intArray = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i += 1) {
    intArray[i] = byteString.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type: mime });
}

export default function UnifiedAIPanel({ userProfile, username, onAnalyzeComplete }) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('Type, speak, or show your mood to the AI.');
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const webcamRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleSubmitText = async () => {
    const cleanText = text.trim();
    if (!cleanText) {
      setStatusText('Please enter a mood prompt before analyzing.');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusText('Analyzing text resonance...');

      const response = await axios.post('http://127.0.0.1:5000/api/analyze/text', {
        text: cleanText,
        languages: userProfile?.languages || ['Hindi'],
        username: username
      });

      setStatusText('Vibe detected.');
      if (onAnalyzeComplete) {
        onAnalyzeComplete(response.data.detected_mood, response.data.tracks, response.data.explanation);
      }
    } catch (error) {
      console.error('Text analysis failed', error);
      setStatusText('Error communicating with AI Brain.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordClick = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          setIsSubmitting(true);
          setStatusText("Analyzing vocal resonance...");

          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          if (userProfile?.languages) formData.append("languages", userProfile.languages.join(","));
          if (username) formData.append("username", username);

          try {
            const response = await axios.post("http://127.0.0.1:5000/api/analyze/voice", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            setStatusText("Vibe detected.");
            if (onAnalyzeComplete) {
              onAnalyzeComplete(response.data.detected_mood, response.data.tracks, response.data.explanation);
            }
          } catch (error) {
            console.error("Upload failed", error);
            setStatusText("Error communicating with AI Brain.");
          } finally {
            setIsSubmitting(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setStatusText("Listening... Click the mic again to stop.");
      } catch (err) {
        console.error("Mic access denied", err);
        setStatusText("Microphone access required.");
      }
    } else {
      setIsRecording(false);
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const handleScanFace = async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      setStatusText('Camera frame unavailable. Please wait or allow webcam access.');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusText('Analyzing facial mood...');

      const imageBlob = dataUrlToBlob(imageSrc);
      const formData = new FormData();
      formData.append('image', imageBlob, 'face-scan.jpg');
      formData.append('languages', (userProfile?.languages || ['Hindi']).join(','));
      if (username) formData.append('username', username);

      const response = await axios.post('http://127.0.0.1:5000/api/analyze/face', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setStatusText('Vibe detected from camera.');
      setIsCameraActive(false);
      if (onAnalyzeComplete) {
        onAnalyzeComplete(response.data.detected_mood, response.data.tracks, response.data.explanation);
      }
    } catch (error) {
      console.error('Face analysis failed', error);
      setStatusText('Error communicating with AI Brain.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 md:p-8 border bg-white/5 backdrop-blur-md border-white/10 rounded-3xl shadow-2xl mt-8 transition-all">
      <h3 className="mb-2 font-serif text-3xl tracking-wide text-white">AI DJ Command Center</h3>
      <p className="text-xs tracking-[0.15em] uppercase text-gold-400 mb-6">Describe, speak, or show your vibe</p>

      {/* Main Input Area */}
      <div className="relative flex items-center bg-black/40 border border-white/15 rounded-2xl focus-within:ring-2 focus-within:ring-gold-500/60 focus-within:border-gold-500/30 transition-all p-2">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder="Example: I need calm focus for deep work, maybe some nostalgic indie."
          className="flex-1 w-full bg-transparent p-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none resize-none"
        />
        
        {/* Actions inside the input box */}
        <div className="flex flex-col gap-2 ml-2 pr-2 justify-center">
          <button
            onClick={handleSubmitText}
            disabled={isSubmitting || !text.trim()}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-gold-500 text-black hover:bg-gold-400 disabled:opacity-50 transition-all shadow-md text-xl"
            title="Send Text"
          >
            ➤
          </button>
          <button
            onClick={handleRecordClick}
            disabled={isSubmitting || isCameraActive}
            className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all text-xl ${isRecording ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50'}`}
            title="Voice Input"
          >
            🎤
          </button>
          <button
            onClick={() => setIsCameraActive(!isCameraActive)}
            disabled={isSubmitting || isRecording}
            className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all text-xl ${isCameraActive ? 'bg-gold-500/20 border-gold-500 text-gold-500' : 'bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50'}`}
            title="Camera Input"
          >
            📷
          </button>
        </div>
      </div>

      {/* Conditional Camera View */}
      {isCameraActive && (
        <div className="mt-6 animate-fade-in overflow-hidden rounded-2xl border border-gold-500/30 bg-black">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            audio={false}
            videoConstraints={{ facingMode: 'user' }}
            className="w-full h-[300px] object-cover"
          />
          <div className="p-4 flex justify-between items-center bg-zinc-900 border-t border-white/10">
            <span className="text-xs text-zinc-400">Position your face clearly</span>
            <button
              onClick={handleScanFace}
              disabled={isSubmitting}
              className="px-6 py-2 text-xs font-bold tracking-widest uppercase rounded-full bg-gold-500 text-black hover:bg-gold-400"
            >
              Take Snapshot & Analyze
            </button>
          </div>
        </div>
      )}

      {/* Status Footer */}
      <div className="flex items-center justify-between mt-6">
        <p className={`text-xs tracking-widest uppercase font-medium ${isRecording ? 'text-red-400 animate-pulse' : 'text-zinc-400'}`}>{statusText}</p>
        {isSubmitting && <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />}
      </div>
    </div>
  );
}
