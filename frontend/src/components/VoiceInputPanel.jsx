import { useState, useRef } from 'react';
import { FaMicrophone, FaStop, FaTrash } from 'react-icons/fa';

export default function VoiceInputPanel({ getRecommendations, isLoading }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioBlob || isLoading) return;

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    getRecommendations('detect-voice', formData);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">Record Your Voice</h3>
      <p className="text-sm opacity-80 mb-6">
        Speak for 5-10 seconds to let us detect your emotional tone.
      </p>

      <div className="flex flex-col items-center gap-6">
        {/* Recording Controls */}
        {!audioBlob && (
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl transition-all ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-700'
              } disabled:bg-gray-500 disabled:cursor-not-allowed shadow-xl`}
            >
              {isRecording ? <FaStop /> : <FaMicrophone />}
            </button>
            
            {isRecording && (
              <div className="text-center">
                <div className="text-3xl font-mono">{formatTime(recordingTime)}</div>
                <div className="text-sm opacity-80 mt-2">Recording...</div>
              </div>
            )}
            
            {!isRecording && (
              <p className="text-center opacity-80">
                Click the microphone to start recording
              </p>
            )}
          </div>
        )}

        {/* Recorded Audio Preview */}
        {audioBlob && !isRecording && (
          <div className="w-full bg-gray-800 bg-opacity-70 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-lg font-semibold">Recording Complete!</p>
                <p className="text-sm opacity-80">Duration: {formatTime(recordingTime)}</p>
              </div>
              <button
                type="button"
                onClick={clearRecording}
                className="p-3 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                title="Delete recording"
              >
                <FaTrash />
              </button>
            </div>

            <audio
              controls
              src={URL.createObjectURL(audioBlob)}
              className="w-full mb-4"
            />

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full p-4 text-lg font-bold bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              <FaMicrophone />
              {isLoading ? 'Analyzing...' : 'Analyze Voice & Get Music'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}