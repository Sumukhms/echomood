import os
import speech_recognition as sr
from pydub import AudioSegment

class VoiceEmotionAnalyzer:
    # We keep device_id here just so ai_server.py doesn't crash when it tries to pass it!
    def __init__(self, device_id=None):
        print("Loading Semantic Voice Analyzer (Speech-to-Text)...")
        self.recognizer = sr.Recognizer()
        
        # The Semantic Dictionary: Map words to your 5 core moods
        # The Semantic Dictionary: Map words to 10 distinct moods/vibes
        self.mood_keywords = {
            'happy': ['happy', 'good', 'great', 'awesome', 'joy', 'upbeat', 'fun', 'cheerful', 'amazing', 'smile', 'vibe', 'fantastic'],
            'sad': ['sad', 'down', 'depressed', 'cry', 'hurt', 'lonely', 'tears', 'heartbreak', 'upset', 'emotional', 'gloomy'],
            'angry': ['angry', 'mad', 'frustrated', 'rage', 'hate', 'annoy', 'pissed', 'furious', 'heavy', 'hard', 'aggressive'],
            'energetic': ['energetic', 'energy', 'hype', 'pump', 'gym', 'workout', 'fast', 'intense', 'excited', 'up', 'beast'],
            'calm': ['relax', 'chill', 'calm', 'peace', 'slow', 'quiet', 'lofi', 'mellow', 'soothing', 'zen'],
            
            # --- NEW VIBES ---
            'romantic': ['love', 'romantic', 'date', 'crush', 'heart', 'sweet', 'couple', 'beautiful', 'affection'],
            'nostalgic': ['nostalgic', 'memory', 'old', 'throwback', 'classic', 'retro', 'childhood', 'past', '90s', '80s', '2000s'],
            'focused': ['focus', 'study', 'work', 'concentrate', 'deep', 'coding', 'reading', 'programming', 'task'],
            'party': ['party', 'club', 'dance', 'dj', 'weekend', 'lit', 'crazy', 'celebration', 'drinks'],
            'sleepy': ['sleep', 'tired', 'bed', 'dream', 'nap', 'lullaby', 'snooze', 'night']
        }
        print("Semantic Analyzer Online.")

    def analyze_file(self, file_path):
        """
        Converts the React .webm to audio, transcribes it, and maps it to a mood.
        """
        print(f"\n📂 Processing frontend audio: {file_path}")
        wav_path = file_path.replace(".webm", ".wav")
        
        try:
            # 1. Convert WebM to standard WAV format so the Recognizer can read it
            print("🔄 Converting WebM to WAV format...")
            audio = AudioSegment.from_file(file_path)
            audio.export(wav_path, format="wav")
            
            # 2. Extract the audio data
            with sr.AudioFile(wav_path) as source:
                # Adjust for ambient noise just in case your mic has static
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio_data = self.recognizer.record(source)
                
            try:
                # 3. Transcribe the audio to text using Google's free API
                print("🧠 Transcribing audio to text...")
                transcription = self.recognizer.recognize_google(audio_data).lower()
                print(f"📝 You said: \"{transcription}\"")
                
                # --- NEW SAFETY FILTER ---
                nsfw_blacklist = ['porn', 'sex', 'fuck', 'shit', 'bitch', 'ass', 'dick', 'nude']
                words = transcription.split()
                
                if any(bad_word in words for bad_word in nsfw_blacklist):
                    print("🚨 SAFETY ALERT: Inappropriate content detected. Blocking request.")
                    return 'blocked'
                # -------------------------
                
                # 4. Keyword Scoring Engine
                detected_mood = 'calm' # Default fallback
                highest_score = 0
                scores = {mood: 0 for mood in self.mood_keywords}
                
                words = transcription.split()
                
                for word in words:
                    for mood, keywords in self.mood_keywords.items():
                        if word in keywords:
                            scores[mood] += 1
                
                # Find the mood with the most keyword hits
                for mood, score in scores.items():
                    if score > highest_score:
                        highest_score = score
                        detected_mood = mood
                        
                if highest_score > 0:
                    print(f"🎯 Command Detected: {detected_mood.upper()} (Keyword Score: {highest_score})")
                else:
                    print("⚠️ No strong keywords detected. Defaulting to CALM.")
                    
                return detected_mood
                
            except sr.UnknownValueError:
                print("⚠️ Could not understand the audio (too quiet/muffled). Defaulting to CALM.")
                return 'calm'
            except sr.RequestError as e:
                print(f"❌ Speech Recognition API error: {e}")
                return 'calm'
                
        except Exception as e:
            print(f"❌ Error processing file: {e}")
            return 'calm'
            
        finally:
            # Clean up the temporary WAV file so your hard drive doesn't fill up
            if os.path.exists(wav_path):
                os.remove(wav_path)