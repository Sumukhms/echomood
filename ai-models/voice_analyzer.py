import sounddevice as sd
import numpy as np
from transformers import pipeline
from scipy.io.wavfile import write as write_wav # NEW: Import library to save audio files


# --- NEW: Set the microphone ID here ---
sd.default.device = 2 

# --- 1. Load the Pre-trained Model ---
print("Loading Speech Emotion Recognition model...")
classifier = pipeline("audio-classification", model="superb/wav2vec2-base-superb-er")
print("Model loaded.")

# --- 2. Define Audio Recording Parameters ---
SAMPLE_RATE = 16000
DURATION = 4

def record_audio(duration, sample_rate):
    """Records audio from the default microphone for a given duration."""
    print(f"\nGet ready to speak in 3...")
    sd.sleep(1000)
    print("2...")
    sd.sleep(1000)
    print("1...")
    sd.sleep(1000)
    print(f"Recording for {duration} seconds...")
    
    audio_data = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1)
    sd.wait()
    
    print("Recording finished.")
    return np.squeeze(audio_data)

def analyze_voice_mood():
    """Records audio and analyzes the emotion."""
    audio_data = record_audio(DURATION, SAMPLE_RATE)
    
    # --- NEW: Save the recorded audio to a file for debugging ---
    print("Saving recording to 'recording.wav'...")
    write_wav("recording.wav", SAMPLE_RATE, audio_data)
    
    input_data = {
        "raw": audio_data,
        "sampling_rate": SAMPLE_RATE
    }
    
    predictions = classifier(input_data, top_k=5)
    
    print("\n--- Analysis Results ---")
    mood_map = {
        'ang': 'angry',
        'hap': 'happy',
        'sad': 'sad',
        'neu': 'neutral'
    }
    
    top_prediction = predictions[0]
    raw_label = top_prediction['label']
    score = top_prediction['score']
    mood = mood_map.get(raw_label, 'calm')
    
    print(f"Dominant Emotion: {mood.capitalize()} (Confidence: {score:.2f})")
    
    print("\nOther possibilities:")
    for p in predictions[1:]:
        mapped_label = mood_map.get(p['label'], 'calm')
        print(f"- {mapped_label.capitalize()}: {p['score']:.2f}")

# --- 3. Main Loop ---
if __name__ == "__main__":
    while True:
        analyze_voice_mood()
        again = input("\nAnalyze again? (y/n): ").lower()
        if again != 'y':
            break