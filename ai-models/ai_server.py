from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import random

# Import your AI modules
from music_recommender import RegionalMusicRecommender
from voice_analyzer import VoiceEmotionAnalyzer

app = Flask(__name__)
CORS(app) 

os.makedirs('temp_uploads', exist_ok=True)

print("Booting up AI Brain. This may take a moment...")
# Initialize the models ONCE at startup so requests are lightning fast
recommender = RegionalMusicRecommender()
voice_analyzer = VoiceEmotionAnalyzer(device_id=None) 
print("AI Brain fully online.")

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "success", "message": "The VIP Lounge is open."})

@app.route('/api/analyze/voice', methods=['POST'])
def analyze_voice():
    print("🎤 Receiving voice data from frontend...")
    
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file found"}), 400
        
    audio_file = request.files['audio']
    languages_str = request.form.get('languages', 'Hindi')
    user_languages = [l.strip() for l in languages_str.split(',') if l.strip()]

    file_path = os.path.join('temp_uploads', 'recording.webm')
    audio_file.save(file_path)
    print(f"✅ Audio saved to {file_path}")
    
    # STEP 1: Analyze the Audio using our new method
    detected_mood = voice_analyzer.analyze_file(file_path)

    # Handle the safety block from the analyzer
    if detected_mood == 'blocked':
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({
            "status": "success",
            "detected_mood": "CONTENT BLOCKED",
            "tracks": []
        })

    # STEP 2: Fetch the Music from YouTube based on the mood and preferred languages
    print(f"🎵 Fetching {detected_mood} soundscapes in {', '.join(user_languages)}...")
    songs = recommender.get_recommendations(detected_mood, languages=user_languages, limit=6)
    
    # Send the final payload back to React
    return jsonify({
        "status": "success",
        "detected_mood": detected_mood,
        "tracks": songs
    })

if __name__ == '__main__':
    print("Starting VIP AI Server on port 5000...")
    app.run(port=5000, debug=True)