import librosa
import numpy as np
import os
import traceback

def analyze_audio_mood(file_path):
    """
    Analyzes an audio file to extract tempo (BPM) and RMS energy,
    returning a list of mapped mood tags.
    """
    if not os.path.exists(file_path):
        print(f"[AudioTagger] File not found: {file_path}")
        return ["calm"]

    try:
        # Load audio (downsample to 22050Hz, mono, load first 30 seconds for speed)
        y, sr = librosa.load(file_path, sr=22050, mono=True, duration=30)
        
        if len(y) == 0:
            print("[AudioTagger] Empty audio file.")
            return ["calm"]

        # 1. Compute Tempo (BPM)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        tempo, _ = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
        
        # In librosa, tempo can be a numpy array or a scalar
        if isinstance(tempo, (np.ndarray, list)):
            bpm = float(tempo[0]) if len(tempo) > 0 else 120.0
        else:
            bpm = float(tempo)
            
        # Handle cases where beat tracking returns 0 or negative
        if bpm <= 0:
            bpm = 120.0

        # 2. Compute RMS Energy (loudness/energy)
        rms = librosa.feature.rms(y=y)
        mean_rms = float(np.mean(rms))

        print(f"[AudioTagger] Analysis complete for {os.path.basename(file_path)}:")
        print(f"  - Tempo: {bpm:.2f} BPM")
        print(f"  - Energy (RMS): {mean_rms:.4f}")

        # 3. Map to standard EchoMood tags
        # Thresholds:
        # - High energy: mean_rms > 0.075
        # - High tempo: bpm > 115
        tags = []
        if mean_rms > 0.075:
            if bpm > 115:
                tags.extend(["energetic", "happy"])
            else:
                tags.extend(["focused", "energetic"])
        else:
            if bpm > 110:
                tags.extend(["happy", "calm"])
            else:
                tags.extend(["calm", "sad"])

        # Deduplicate and return tags
        return list(set(tags))

    except Exception as e:
        print(f"[AudioTagger] Error during analysis: {e}")
        traceback.print_exc()
        # Fallback to calm
        return ["calm"]
