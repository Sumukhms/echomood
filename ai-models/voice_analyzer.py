import sounddevice as sd
import numpy as np
from transformers import pipeline
from scipy.io.wavfile import write as write_wav
import librosa
import os
from datetime import datetime

class VoiceEmotionAnalyzer:
    def __init__(self, device_id=None, sample_rate=16000):
        self.sample_rate = sample_rate
        self.device_id = device_id
        
        if device_id is not None:
            sd.default.device = device_id
        
        # Load emotion recognition model
        print("Loading Speech Emotion Recognition model...")
        self.classifier = pipeline(
            "audio-classification", 
            model="superb/wav2vec2-base-superb-er"
        )
        print("Model loaded successfully!")
        
        # Emotion to mood mapping
        self.emotion_to_mood = {
            'ang': 'angry',
            'hap': 'happy',
            'sad': 'sad',
            'neu': 'calm',
            'exc': 'energetic',  # Excited
            'fru': 'angry',       # Frustrated
            'fea': 'calm',        # Fear -> recommend calming music
            'sur': 'energetic',   # Surprise
        }
        
        # Create recordings directory
        self.recordings_dir = "voice_recordings"
        os.makedirs(self.recordings_dir, exist_ok=True)
    
    def preprocess_audio(self, audio_data):
        """
        Preprocess audio: normalize, remove silence, enhance quality.
        """
        # Normalize audio
        audio_data = audio_data / np.max(np.abs(audio_data) + 1e-9)
        
        # Remove silence from beginning and end
        non_silent = librosa.effects.trim(audio_data, top_db=20)[0]
        
        return non_silent
    
    def extract_audio_features(self, audio_data):
        """
        Extract additional audio features for better emotion detection.
        """
        # Pitch/frequency features
        pitches, magnitudes = librosa.piptrack(y=audio_data, sr=self.sample_rate)
        pitch_mean = np.mean(pitches[pitches > 0]) if np.any(pitches > 0) else 0
        
        # Energy
        energy = np.sum(audio_data ** 2) / len(audio_data)
        
        # Zero crossing rate (indicates voice quality/emotion)
        zcr = np.mean(librosa.feature.zero_crossing_rate(audio_data))
        
        # Spectral features
        spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=audio_data, sr=self.sample_rate))
        
        return {
            'pitch_mean': pitch_mean,
            'energy': energy,
            'zero_crossing_rate': zcr,
            'spectral_centroid': spectral_centroid
        }
    
    def record_audio(self, duration, countdown=True):
        """Records audio with optional countdown."""
        if countdown:
            print(f"\nGet ready to speak in...")
            for i in range(3, 0, -1):
                print(f"{i}...")
                sd.sleep(1000)
        
        print(f"🎤 Recording for {duration} seconds...")
        print("Speak clearly and expressively!")
        
        audio_data = sd.rec(
            int(duration * self.sample_rate), 
            samplerate=self.sample_rate, 
            channels=1,
            dtype='float32'
        )
        sd.wait()
        
        print("✅ Recording finished.")
        return np.squeeze(audio_data)
    
    def save_recording(self, audio_data, emotion_label):
        """Save recording with timestamp and emotion label."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{self.recordings_dir}/recording_{emotion_label}_{timestamp}.wav"
        
        # Convert to int16 for wav file
        audio_int16 = (audio_data * 32767).astype(np.int16)
        write_wav(filename, self.sample_rate, audio_int16)
        
        return filename
    
    def analyze_voice_mood(self, duration=5, save_audio=True):
        """
        Records and analyzes voice emotion with enhanced processing.
        """
        # Record audio
        audio_data = self.record_audio(duration)
        
        # Preprocess
        print("Processing audio...")
        processed_audio = self.preprocess_audio(audio_data)
        
        # Check if audio has sufficient energy
        energy = np.mean(processed_audio ** 2)
        if energy < 0.001:
            print("⚠️ Warning: Audio level very low. Please speak louder.")
            return None
        
        # Extract features for additional context
        features = self.extract_audio_features(processed_audio)
        print(f"Audio features - Energy: {features['energy']:.4f}, "
              f"Pitch: {features['pitch_mean']:.1f} Hz")
        
        # Prepare input for model
        input_data = {
            "raw": processed_audio,
            "sampling_rate": self.sample_rate
        }
        
        # Get predictions
        print("Analyzing emotion...")
        predictions = self.classifier(input_data, top_k=5)
        
        # Get dominant emotion
        top_prediction = predictions[0]
        raw_label = top_prediction['label']
        confidence = top_prediction['score']
        
        # Map to mood
        mood = self.emotion_to_mood.get(raw_label, 'calm')
        
        # Save recording if requested
        if save_audio:
            filename = self.save_recording(audio_data, mood)
            print(f"💾 Recording saved: {filename}")
        
        # Display results
        print("\n" + "="*60)
        print("EMOTION ANALYSIS RESULTS")
        print("="*60)
        print(f"🎯 Detected Mood: {mood.upper()}")
        print(f"📊 Confidence: {confidence:.1%}")
        print(f"🔊 Audio Quality: {'Good' if energy > 0.01 else 'Low'}")
        print("\nTop 5 Emotion Probabilities:")
        print("-" * 60)
        
        for i, pred in enumerate(predictions, 1):
            emotion = pred['label']
            mapped_mood = self.emotion_to_mood.get(emotion, 'calm')
            score = pred['score']
            bar = '█' * int(score * 30)
            print(f"{i}. {mapped_mood.capitalize():12s} | {bar:30s} {score:.1%}")
        
        print("="*60 + "\n")
        
        return {
            'mood': mood,
            'confidence': confidence,
            'predictions': predictions,
            'features': features
        }
    
    def continuous_monitoring(self, duration=5, interval=1):
        """
        Continuously monitor emotion with intervals between recordings.
        """
        print("\n" + "="*60)
        print("CONTINUOUS EMOTION MONITORING")
        print("="*60)
        print("Press Ctrl+C to stop\n")
        
        mood_history = []
        
        try:
            while True:
                result = self.analyze_voice_mood(duration, save_audio=False)
                
                if result:
                    mood_history.append(result['mood'])
                    
                    # Show mood trend
                    if len(mood_history) >= 3:
                        from collections import Counter
                        recent_moods = mood_history[-5:]
                        common = Counter(recent_moods).most_common(2)
                        print(f"\n📈 Mood Trend: {common[0][0].capitalize()} "
                              f"({common[0][1]}/{len(recent_moods)} recent)")
                
                print(f"\nWaiting {interval} seconds before next recording...")
                print("Press Ctrl+C to stop\n")
                sd.sleep(interval * 1000)
                
        except KeyboardInterrupt:
            print("\n\n✅ Monitoring stopped.")
            if mood_history:
                from collections import Counter
                most_common = Counter(mood_history).most_common(1)[0]
                print(f"📊 Overall dominant mood: {most_common[0].upper()} "
                      f"({most_common[1]}/{len(mood_history)} times)")

def list_audio_devices():
    """List available audio input devices."""
    print("\n" + "="*60)
    print("AVAILABLE AUDIO DEVICES")
    print("="*60)
    devices = sd.query_devices()
    for i, device in enumerate(devices):
        if device['max_input_channels'] > 0:
            print(f"{i}: {device['name']} (Inputs: {device['max_input_channels']})")
    print("="*60 + "\n")

if __name__ == "__main__":
    import sys
    
    # List devices first
    list_audio_devices()
    
    # Get device ID from command line or use default
    device_id = int(sys.argv[1]) if len(sys.argv) > 1 else None
    
    if device_id is not None:
        print(f"Using device ID: {device_id}")
    else:
        print("Using default device")
    
    # Create analyzer
    analyzer = VoiceEmotionAnalyzer(device_id=device_id)
    
    # Main menu
    while True:
        print("\n" + "="*60)
        print("VOICE EMOTION ANALYZER - MENU")
        print("="*60)
        print("1. Single Analysis (5 seconds)")
        print("2. Quick Analysis (3 seconds)")
        print("3. Continuous Monitoring")
        print("4. List Audio Devices")
        print("5. Exit")
        print("="*60)
        
        choice = input("\nSelect option (1-5): ").strip()
        
        if choice == '1':
            analyzer.analyze_voice_mood(duration=5)
        elif choice == '2':
            analyzer.analyze_voice_mood(duration=3)
        elif choice == '3':
            analyzer.continuous_monitoring(duration=4, interval=2)
        elif choice == '4':
            list_audio_devices()
        elif choice == '5':
            print("\n👋 Goodbye!")
            break
        else:
            print("❌ Invalid option. Please try again.")