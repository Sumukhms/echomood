import os
import shutil
import speech_recognition as sr
from pydub import AudioSegment


def _find_ffmpeg():
    """Find ffmpeg/ffprobe on PATH regardless of OS (no hardcoded .exe)."""
    ffmpeg = shutil.which("ffmpeg") or shutil.which("ffmpeg.exe")
    ffprobe = shutil.which("ffprobe") or shutil.which("ffprobe.exe")
    return ffmpeg, ffprobe


class VoiceEmotionAnalyzer:
    def __init__(self, device_id=None):
        print("Loading Semantic Voice Analyzer (Speech-to-Text)...")
        self.recognizer = sr.Recognizer()

        # Set ffmpeg paths dynamically — works on Windows, Mac, Linux
        ffmpeg_path, ffprobe_path = _find_ffmpeg()
        if ffmpeg_path:
            AudioSegment.converter = ffmpeg_path
        if ffprobe_path:
            AudioSegment.ffprobe = ffprobe_path

        self.mood_keywords = {
            "happy": ["happy", "good", "great", "awesome", "joy", "upbeat", "fun",
                      "cheerful", "amazing", "smile", "vibe", "fantastic"],
            "sad": ["sad", "down", "depressed", "cry", "hurt", "lonely", "tears",
                    "heartbreak", "upset", "emotional", "gloomy"],
            "angry": ["angry", "mad", "frustrated", "rage", "hate", "annoy", "pissed",
                      "furious", "heavy", "hard", "aggressive"],
            "energetic": ["energetic", "energy", "hype", "pump", "gym", "workout",
                          "fast", "intense", "excited", "up", "beast"],
            "calm": ["relax", "chill", "calm", "peace", "slow", "quiet", "lofi",
                     "mellow", "soothing", "zen"],
            "romantic": ["love", "romantic", "date", "crush", "heart", "sweet",
                         "couple", "beautiful", "affection"],
            "nostalgic": ["nostalgic", "memory", "old", "throwback", "classic",
                          "retro", "childhood", "past", "90s", "80s", "2000s"],
            "focused": ["focus", "study", "work", "concentrate", "deep", "coding",
                        "reading", "programming", "task"],
            "party": ["party", "club", "dance", "dj", "weekend", "lit", "crazy",
                      "celebration", "drinks"],
            "sleepy": ["sleep", "tired", "bed", "dream", "nap", "lullaby", "snooze",
                       "night"],
        }

        self.nsfw_blacklist = {"porn", "sex", "fuck", "shit", "bitch", "ass", "dick", "nude"}
        print("Semantic Analyzer Online.")

    # ── internal ──────────────────────────────────────────────────────────────

    def _analyze_transcription(self, transcription):
        words = set(transcription.lower().split())

        if words & self.nsfw_blacklist:
            print("🚨 SAFETY ALERT: Inappropriate content detected. Blocking request.")
            return "blocked"

        scores = {mood: 0 for mood in self.mood_keywords}
        for word in words:
            for mood, keywords in self.mood_keywords.items():
                if word in keywords:
                    scores[mood] += 1

        best_mood = max(scores, key=lambda m: scores[m])
        if scores[best_mood] > 0:
            print(f"[Voice] Detected: {best_mood.upper()} (score: {scores[best_mood]})")
            return best_mood

        print("[Voice] No strong keywords detected. Defaulting to CALM.")
        return "calm"

    # ── public ────────────────────────────────────────────────────────────────

    def analyze_text(self, text: str) -> str:
        text = (text or "").lower().strip()
        if not text:
            return "calm"
        print(f'[Voice] Text received: "{text}"')
        return self._analyze_transcription(text)

    def analyze_file(self, file_path: str) -> str:
        print(f"\n[Voice] Processing audio: {file_path}")
        wav_path = file_path.replace(".webm", ".wav")

        try:
            print("[Voice] Converting to WAV...")
            audio = AudioSegment.from_file(file_path)
            audio.export(wav_path, format="wav")

            with sr.AudioFile(wav_path) as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio_data = self.recognizer.record(source)

            try:
                print("[Voice] Transcribing...")
                transcription = self.recognizer.recognize_google(audio_data).lower()
                print(f'[Voice] Heard: "{transcription}"')
                return self._analyze_transcription(transcription)
            except sr.UnknownValueError:
                print("[Voice] Silence or unintelligible audio.")
                return "calm"
            except Exception as e:
                print(f"[Voice] API Error: {e}")
                return "calm"

        except Exception as e:
            print(f"[Voice] Error processing audio file: {e}")
            return "calm"

        finally:
            if os.path.exists(wav_path):
                os.remove(wav_path)