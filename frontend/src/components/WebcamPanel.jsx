import { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const videoConstraints = {
  facingMode: 'user'
};

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

export default function WebcamPanel({ userProfile, username, onAnalyzeComplete }) {
  const webcamRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('Position your face and scan your vibe.');

  const handleScan = async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      setStatusText('Camera frame unavailable. Please allow webcam access.');
      return;
    }

    try {
      setIsLoading(true);
      setStatusText('Analyzing facial mood...');

      const imageBlob = dataUrlToBlob(imageSrc);
      const formData = new FormData();
      formData.append('image', imageBlob, 'face-scan.jpg');
      formData.append('languages', (userProfile?.languages || ['Hindi']).join(','));
      if (username) {
        formData.append('username', username);
      }

      const response = await axios.post('http://127.0.0.1:5000/api/analyze/face', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setStatusText('Vibe detected from camera.');
      if (onAnalyzeComplete) {
        onAnalyzeComplete(response.data.detected_mood, response.data.tracks, response.data.explanation);
      }
    } catch (error) {
      console.error('Face analysis failed', error);
      setStatusText('Error communicating with AI Brain.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-6 md:p-8 border bg-white/5 backdrop-blur-md border-white/10 rounded-3xl shadow-2xl mt-8">
      <h3 className="mb-4 font-serif text-2xl tracking-wide text-white">Camera Resonance</h3>
      <p className="text-xs tracking-[0.15em] uppercase text-zinc-400 mb-4">Use your expression to drive recommendations</p>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          audio={false}
          videoConstraints={videoConstraints}
          className="w-full h-[260px] object-cover"
        />
      </div>

      <div className="flex items-center justify-between mt-4 gap-4">
        <p className="text-xs tracking-widest uppercase text-zinc-400">{statusText}</p>
        <button
          onClick={handleScan}
          disabled={isLoading}
          className="px-6 py-2 text-xs tracking-widest uppercase rounded-full transition-all bg-gold-500 text-black hover:bg-gold-400 disabled:opacity-60"
        >
          {isLoading ? 'Scanning...' : 'Scan Vibe'}
        </button>
      </div>
    </div>
  );
}
