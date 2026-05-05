import os
import random
import uuid
import json
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import MongoManager

# Import your AI modules
from music_recommender import RegionalMusicRecommender
from voice_analyzer import VoiceEmotionAnalyzer
from facial_analyzer import FacialEmotionAnalyzer

app = Flask(__name__)
# Allow React to communicate with this server
CORS(app) 

# --- FOLDER SETUP ---
# For temporary voice recordings from the microphone
app.config['UPLOAD_FOLDER'] = 'temp_uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# For permanent storage of the user's personal mp3 files
app.config['VAULT_FOLDER'] = 'vault_audio'
os.makedirs(app.config['VAULT_FOLDER'], exist_ok=True)

print("Booting up AI Brain. This may take a moment...")
# Initialize the models ONCE at startup so requests are lightning fast
recommender = RegionalMusicRecommender()
db_manager = MongoManager()
voice_analyzer = VoiceEmotionAnalyzer(device_id=None) 
face_analyzer = FacialEmotionAnalyzer()
print("AI Brain fully online.")

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "success", "message": "The VIP Lounge is open."})

# ==========================================
# 0. AUTHENTICATION ROUTES
# ==========================================
@app.route('/api/auth/register', methods=['POST'])
def register_user():
    payload = request.get_json(silent=True) or {}
    username = (payload.get('username') or '').strip()
    password = payload.get('password') or ''

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required."}), 400

    registered = db_manager.register_user(username, password)
    if not registered:
        return jsonify({"success": False, "message": "Username already exists or invalid credentials."}), 409

    return jsonify({"success": True, "user": {"username": username}})

@app.route('/api/auth/login', methods=['POST'])
def login_user():
    payload = request.get_json(silent=True) or {}
    username = (payload.get('username') or '').strip()
    password = payload.get('password') or ''

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required."}), 400

    user = db_manager.verify_user(username, password)
    if not user:
        return jsonify({"success": False, "message": "Invalid username or password."}), 401

    return jsonify({"success": True, "user": {"username": username}, "token": username})

# ==========================================
# 1. THE AI VOICE & YOUTUBE PIPELINE
# ==========================================
@app.route('/api/analyze/voice', methods=['POST'])
def analyze_voice():
    print("🎤 Receiving voice data from frontend...")
    
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file found"}), 400
        
    audio_file = request.files['audio']
    
    # Catch language preferences from React:
    # - repeated form fields: languages=Hindi&languages=Tamil
    # - JSON array string: ["Hindi","Tamil"]
    # - comma-separated string: Hindi,Tamil
    user_languages = request.form.getlist('languages')
    if len(user_languages) == 1:
        candidate = user_languages[0].strip()
        if candidate.startswith('['):
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, list):
                    user_languages = [str(l).strip() for l in parsed if str(l).strip()]
            except json.JSONDecodeError:
                user_languages = [l.strip() for l in candidate.split(',') if l.strip()]
        else:
            user_languages = [l.strip() for l in candidate.split(',') if l.strip()]
    elif len(user_languages) > 1:
        user_languages = [l.strip() for l in user_languages if l and l.strip()]
    if not user_languages:
        user_languages = ['Hindi']

    # Save the file temporarily
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], 'recording.webm')
    audio_file.save(file_path)
    print(f"✅ Audio saved to {file_path}")
    
    # STEP 1: Analyze the Audio using our semantic method
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

    # STEP 2: Fetch the Music from YouTube based on the mood and ALL preferred languages
    print(f"🎵 Fetching {detected_mood} soundscapes in {', '.join(user_languages)}...")
    songs = recommender.get_recommendations(detected_mood, languages=user_languages, limit=6)
    
    # Clean up the temp recording
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Send the final payload back to React
    return jsonify({
        "status": "success",
        "detected_mood": detected_mood,
        "tracks": songs
    })

@app.route('/api/analyze/text', methods=['POST'])
def analyze_text():
    payload = request.get_json(silent=True) or {}
    text = (payload.get('text') or '').strip()
    user_languages = payload.get('languages', ['Hindi'])

    if not text:
        return jsonify({"error": "No text provided"}), 400

    if not isinstance(user_languages, list):
        user_languages = ['Hindi']
    user_languages = [str(lang).strip() for lang in user_languages if str(lang).strip()]
    if not user_languages:
        user_languages = ['Hindi']

    detected_mood = voice_analyzer.analyze_text(text)

    if detected_mood == 'blocked':
        return jsonify({
            "status": "success",
            "detected_mood": "CONTENT BLOCKED",
            "tracks": []
        })

    print(f"🎵 Fetching {detected_mood} soundscapes in {', '.join(user_languages)}...")
    songs = recommender.get_recommendations(detected_mood, languages=user_languages, limit=6)

    return jsonify({
        "status": "success",
        "detected_mood": detected_mood,
        "tracks": songs
    })

@app.route('/api/analyze/face', methods=['POST'])
def analyze_face():
    if 'image' not in request.files:
        return jsonify({"error": "No image file found"}), 400

    image_file = request.files['image']
    user_languages = request.form.getlist('languages')
    if len(user_languages) == 1:
        candidate = user_languages[0].strip()
        if candidate.startswith('['):
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, list):
                    user_languages = [str(l).strip() for l in parsed if str(l).strip()]
            except json.JSONDecodeError:
                user_languages = [l.strip() for l in candidate.split(',') if l.strip()]
        else:
            user_languages = [l.strip() for l in candidate.split(',') if l.strip()]
    elif len(user_languages) > 1:
        user_languages = [l.strip() for l in user_languages if l and l.strip()]
    if not user_languages:
        user_languages = ['Hindi']

    nparr = np.frombuffer(image_file.read(), np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return jsonify({"error": "Invalid image data"}), 400

    result = face_analyzer.analyze_frame(frame)
    detected_mood = result.get('mood', 'calm') if isinstance(result, dict) else 'calm'

    print(f"🎵 Fetching {detected_mood} soundscapes in {', '.join(user_languages)}...")
    songs = recommender.get_recommendations(detected_mood, languages=user_languages, limit=6)

    return jsonify({
        "status": "success",
        "detected_mood": detected_mood,
        "tracks": songs
    })

@app.route('/api/vault/save_track', methods=['POST'])
def save_api_track_to_vault():
    payload = request.get_json(silent=True) or {}
    username = (payload.get('username') or '').strip()
    track_name = (payload.get('track_name') or '').strip()
    artist_name = (payload.get('artist_name') or '').strip()
    preview_url = (payload.get('preview_url') or '').strip()
    mood = (payload.get('mood') or 'calm').strip()

    if not username:
        return jsonify({"error": "Username is required."}), 400
    if not track_name or not artist_name or not preview_url:
        return jsonify({"error": "Missing required track fields"}), 400

    db_manager.save_api_track(username, track_name, artist_name, preview_url, mood)

    return jsonify({
        "success": True,
        "message": "Track saved to vault"
    })

# ==========================================
# 2. THE PERSONAL VAULT (MONGODB) PIPELINE
# ==========================================
@app.route('/api/vault/upload', methods=['POST'])
def upload_to_vault():
    print("📥 Receiving new track for the Vault...")
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
        
    audio_file = request.files['audio']
    track_name = request.form.get('track_name', 'Unknown Track')
    artist_name = request.form.get('artist_name', 'Unknown Artist')
    moods = request.form.get('moods', 'calm')
    username = (request.form.get('username') or '').strip()

    if not username:
        return jsonify({'error': 'Username is required.'}), 400
    
    # 1. Save the file with a unique ID so files with the same name don't overwrite each other
    ext = audio_file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(app.config['VAULT_FOLDER'], unique_filename)
    audio_file.save(filepath)
    
    # 2. Generate the URL that React will use to stream the song
    file_url = f"http://127.0.0.1:5000/api/vault/stream/{unique_filename}"
    
    # 3. Save all this data into MongoDB!
    mood_list = [m.strip().lower() for m in moods.split(',')]
    db_manager.add_personal_track(username, track_name, artist_name, file_url, mood_list)
    
    print(f"✅ Vault secured: {track_name} by {artist_name}")
    return jsonify({
        'success': True, 
        'message': 'Track secured in Vault!', 
        'url': file_url
    })

@app.route('/api/vault/stream/<filename>')
def stream_vault_audio(filename):
    """This route allows React to actually play the .mp3 files stored on your server"""
    return send_from_directory(app.config['VAULT_FOLDER'], filename)

@app.route('/api/vault/tracks', methods=['GET'])
def get_vault_tracks():
    """Returns all vault tracks for the requested user."""
    username = (request.args.get('username') or '').strip()
    if not username:
        return jsonify({'error': 'Username is required.'}), 400

    tracks = db_manager.get_user_tracks(username)
    return jsonify({
        'success': True,
        'tracks': tracks
    })

# ==========================================
# 3. THE GLOBAL LIBRARY PIPELINE
# ==========================================
@app.route('/api/library/home', methods=['GET'])
def get_library_home():
    """Returns the global library grouped by categories for the home screen."""
    grouped_library = db_manager.get_grouped_library()
    return jsonify({
        'success': True,
        'library': grouped_library
    })

@app.route('/api/library/search', methods=['GET'])
def search_library():
    """Search the global library for tracks by name, artist, mood, or category."""
    query = (request.args.get('q') or '').strip()
    if not query:
        return jsonify({
            'success': True,
            'results': []
        })
    
    results = db_manager.search_library(query)
    return jsonify({
        'success': True,
        'results': results,
        'query': query
    })

if __name__ == '__main__':
    print("Starting VIP AI Server on port 5000...")
    app.run(port=5000, debug=True)