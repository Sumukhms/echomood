from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback
import time
import os
import numpy as np
from werkzeug.utils import secure_filename
import cv2
from scipy.io import wavfile
import librosa

# --- Performance Fix: Load Models ONCE on startup ---
try:
    import text_analyzer
    import music_recommender
    import facial_analyzer
    import voice_analyzer
    
    print("Pre-loading all models...")
    
    # Create instances
    text_model = text_analyzer.ImprovedTextAnalyzer()
    recommender = music_recommender.SpotifyRecommender()
    face_analyzer = facial_analyzer.FacialEmotionAnalyzer()
    voice_model = voice_analyzer.VoiceEmotionAnalyzer()
    
    print("✅ Models loaded successfully.")

except Exception as e:
    print(f"❌ CRITICAL: Failed to load models on startup: {e}")
    print(traceback.format_exc())
    text_model = None
    recommender = None
    face_analyzer = None
    voice_model = None
# --------------------------------------------------

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configure upload folder
UPLOAD_FOLDER = 'temp_uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

ALLOWED_AUDIO = {'wav', 'mp3', 'webm', 'ogg', 'm4a'}
ALLOWED_IMAGE = {'png', 'jpg', 'jpeg'}

def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def cleanup_file(filepath):
    """Remove temporary file after processing"""
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
            print(f"🗑️ Cleaned up: {filepath}")
    except Exception as e:
        print(f"⚠️ Could not delete {filepath}: {e}")

# --- Health Check ---
@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check to see if the server is running."""
    return jsonify({
        "status": "ok",
        "message": "EchoMood AI server is running",
        "models_loaded": {
            "text_analyzer": text_model is not None,
            "recommender": recommender is not None,
            "face_analyzer": face_analyzer is not None,
            "voice_analyzer": voice_model is not None
        }
    }), 200

# --- Text Analysis Endpoint ---
@app.route('/api/analyze_text', methods=['POST'])
def analyze_text():
    if not text_model:
        return jsonify({"error": "Text analyzer model is not loaded"}), 500
        
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "Missing 'text' field"}), 400
        
        text_to_analyze = data['text']
        if not text_to_analyze.strip():
            return jsonify({"error": "Text cannot be empty"}), 400
        
        print(f"📝 Analyzing text: {text_to_analyze[:100]}...")
        
        mood = text_model.analyze_text_mood(text_to_analyze)
        
        print(f"✅ Detected mood: {mood}")
        
        return jsonify({"mood": mood}), 200
        
    except Exception as e:
        print(f"❌ Error in analyze_text: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": "Failed to analyze text", "details": str(e)}), 500

# --- Face Analysis Endpoint ---
@app.route('/api/analyze_face', methods=['POST'])
def analyze_face():
    if not face_analyzer:
        return jsonify({"error": "Face analyzer model is not loaded"}), 500
    
    filepath = None
    try:
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        if not allowed_file(file.filename, ALLOWED_IMAGE):
            return jsonify({"error": "Invalid image format. Use PNG, JPG, or JPEG"}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"{int(time.time())}_{filename}")
        file.save(filepath)
        
        print(f"📸 Analyzing face from image: {filename}")
        
        # Read image
        frame = cv2.imread(filepath)
        if frame is None:
            return jsonify({"error": "Could not read image file"}), 400
        
        # Analyze the frame
        result = face_analyzer.analyze_frame(frame)
        
        if result['success']:
            mood = result['mood']
            confidence = result['confidence']
            print(f"✅ Detected mood: {mood} (confidence: {confidence:.2f})")
            return jsonify({
                "mood": mood,
                "confidence": float(confidence),
                "emotion": result['emotion']
            }), 200
        else:
            return jsonify({"error": "No face detected in the image"}), 400
        
    except Exception as e:
        print(f"❌ Error in analyze_face: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": "Failed to analyze face", "details": str(e)}), 500
    finally:
        if filepath:
            cleanup_file(filepath)

# --- Voice Analysis Endpoint ---
@app.route('/api/analyze_voice', methods=['POST'])
def analyze_voice():
    if not voice_model:
        return jsonify({"error": "Voice analyzer model is not loaded"}), 500
    
    filepath = None
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        file = request.files['audio']
        if file.filename == '':
            return jsonify({"error": "No audio file selected"}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"{int(time.time())}_{filename}")
        file.save(filepath)
        
        print(f"🎤 Analyzing voice from audio: {filename}")
        
        # Load and process audio
        # Convert to 16kHz mono if needed
        audio_data, sample_rate = librosa.load(filepath, sr=16000, mono=True)
        
        if len(audio_data) < 16000:  # Less than 1 second
            return jsonify({"error": "Audio too short. Please record at least 1 second"}), 400
        
        # Prepare input for model
        input_data = {
            "raw": audio_data,
            "sampling_rate": sample_rate
        }
        
        # Get predictions
        predictions = voice_model.classifier(input_data, top_k=5)
        
        # Get top emotion and map to mood
        top_prediction = predictions[0]
        raw_label = top_prediction['label']
        confidence = top_prediction['score']
        
        mood = voice_model.emotion_to_mood.get(raw_label, 'calm')
        
        print(f"✅ Detected mood: {mood} (confidence: {confidence:.2f})")
        
        return jsonify({
            "mood": mood,
            "confidence": float(confidence),
            "emotion": raw_label,
            "all_predictions": [
                {"emotion": p['label'], "score": float(p['score'])}
                for p in predictions
            ]
        }), 200
        
    except Exception as e:
        print(f"❌ Error in analyze_voice: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": "Failed to analyze voice", "details": str(e)}), 500
    finally:
        if filepath:
            cleanup_file(filepath)

# --- Music Recommendation Endpoint ---
@app.route('/api/recommendations', methods=['POST'])
def recommend_music():
    if not recommender:
        return jsonify({"error": "Recommender model is not loaded"}), 500

    try:
        data = request.get_json()
        if not data or 'mood' not in data:
            return jsonify({"error": "Missing 'mood' field"}), 400

        mood = data['mood'].lower()
        limit = data.get('limit', 15)
        
        print(f"🎵 Getting {limit} recommendations for mood: {mood}")
        
        songs = recommender.get_recommendations(mood, limit=limit)
        
        if not songs:
            print(f"⚠️ No recommendations found for mood: {mood}")

        print(f"✅ Returning {len(songs)} recommendations.")
        return jsonify({"recommendations": songs, "mood": mood}), 200
        
    except Exception as e:
        print(f"❌ Error in recommend_music: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": "Failed to get recommendations", "details": str(e)}), 500

# --- Error Handlers ---
@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "error": "Endpoint not found",
        "message": f"The requested URL {request.path} does not exist."
    }), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        "error": "Internal server error",
        "message": "An unexpected error occurred. Check the server logs."
    }), 500

@app.errorhandler(413)
def request_entity_too_large(e):
    return jsonify({
        "error": "File too large",
        "message": "The uploaded file exceeds the maximum size limit (16MB)."
    }), 413

# --- Server Startup ---
if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 ECHOMOOD AI SERVER (v3.0 - Full Stack)")
    print("="*60)
    if text_model and recommender and face_analyzer and voice_model:
        print("STATUS: All models loaded. Ready to serve.")
    else:
        print("STATUS: ⚠️ CRITICAL: One or more models failed to load.")
    print("="*60)
    print(f"📡 API running on: http://127.0.0.1:5000")
    print(f"🩺 Health Check: http://127.0.0.1:5000/health")
    print("="*60 + "\n")
    
    app.run(port=5000, debug=True, host='127.0.0.1')