// frontend/src/components/FaceInputPanel.jsx
import { useState, useRef, useEffect } from 'react';
import { FaCamera, FaVideo, FaStop } from 'react-icons/fa';

export default function FaceInputPanel({ getRecommendations, isLoading }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // --- THIS EFFECT IS NEW/MODIFIED ---
  // It handles starting and stopping the camera stream
  useEffect(() => {
    // This function runs when cameraActive becomes true
    const enableStream = async () => {
      if (cameraActive) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 640, height: 480 }
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          alert('Could not access camera. Please grant permission and ensure camera is available.');
          setCameraActive(false); // Reset on error
        }
      }
    };

    enableStream();

    // Cleanup function: This runs when component unmounts OR cameraActive becomes false
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraActive]); // Dependency array: re-run when cameraActive changes

  // --- THIS FUNCTION IS MODIFIED ---
  // startCamera now just changes the state, the useEffect handles the logic
  const startCamera = () => {
    setCapturedImage(null); // Ensure we're not showing an old image
    setCameraActive(true);
  };

  const stopCamera = () => {
    setCameraActive(false);
  };

  const capturePhoto = () => {
    // Start countdown
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          takePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const takePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas && video) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        setCapturedImage(blob);
        stopCamera(); // Turn off camera after taking photo
      }, 'image/jpeg', 0.95);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera(); // Re-enable the camera
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!capturedImage || isLoading) return;

    const formData = new FormData();
    formData.append('image', capturedImage, 'face.jpg');

    getRecommendations('detect-face', formData);
  };

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">Capture Your Expression</h3>
      <p className="text-sm opacity-80 mb-6">
        Look at the camera and let us analyze your facial expression.
      </p>

      <div className="flex flex-col items-center gap-6">
        {/* Camera View */}
        {!capturedImage && (
          <div className="relative w-full max-w-2xl bg-gray-900 rounded-lg overflow-hidden">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto transform scale-x-[-1]"
                />
                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-9xl font-bold animate-pulse">{countdown}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-video flex items-center justify-center bg-gray-800">
                <FaVideo className="text-6xl text-gray-600" />
              </div>
            )}
          </div>
        )}

        {/* Captured Image Preview */}
        {capturedImage && (
          <div className="w-full max-w-2xl bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={URL.createObjectURL(capturedImage)}
              alt="Captured face"
              className="w-full h-auto transform scale-x-[-1]"
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-4 flex-wrap justify-center">
          {!capturedImage && !cameraActive && (
            <button
              onClick={startCamera}
              disabled={isLoading}
              className="px-8 py-4 text-lg font-bold bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-3 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              <FaVideo />
              Start Camera
            </button>
          )}

          {cameraActive && !capturedImage && (
            <>
              <button
                onClick={capturePhoto}
                disabled={countdown !== null}
                className="px-8 py-4 text-lg font-bold bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-3 disabled:bg-gray-500"
              >
                <FaCamera />
                Capture Photo
              </button>
              <button
                onClick={stopCamera}
                className="px-8 py-4 text-lg font-bold bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-3"
              >
                <FaStop />
                Stop Camera
              </button>
            </>
          )}

          {capturedImage && (
            <>
              <button
                onClick={retakePhoto}
                disabled={isLoading}
                className="px-8 py-4 text-lg font-bold bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-3 disabled:bg-gray-500"
              >
                <FaCamera />
                Retake
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-8 py-4 text-lg font-bold bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-3 disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                <FaCamera />
                {isLoading ? 'Analyzing...' : 'Analyze Face & Get Music'}
              </button>
            </>
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}