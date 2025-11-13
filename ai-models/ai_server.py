from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback
import time

# --- Performance Fix: Load Models ONCE on startup ---
# We import the modules and then create instances of our classes
# These (text_model, recommender) are now global variables for Flask
try:
    import text_analyzer
    import music_recommender
    
    print("Pre-loading all models...")
    
    # Create the instance of the text analyzer
    text_model = text_analyzer.ImprovedTextAnalyzer()
    
    # Create the instance of the recommender (it will manage its own token)
    recommender = music_recommender.SpotifyRecommender()
    
    print("✅ Models loaded successfully.")

except Exception as e:
    print(f"❌ CRITICAL: Failed to load models on startup: {e}")
    print(traceback.format_exc())
    text_model = None
    recommender = None
# --------------------------------------------------

app = Flask(__name__)
# Scope CORS to just the /api/* endpoints
CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- Health Check ---
@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check to see if the server is running."""
    return jsonify({
        "status": "ok",
        "message": "EchoMood AI server is running",
        "models_loaded": {
            "text_analyzer": text_model is not None,
            "recommender": recommender is not None
        }
    }), 200

# --- Text Analysis Endpoint ---
# Note: The frontend doesn't use this directly. The Node.js backend does.
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
        
        # Use the pre-loaded model instance
        mood = text_model.analyze_text_mood(text_to_analyze)
        
        print(f"✅ Detected mood: {mood}")
        
        return jsonify({"mood": mood}), 200
        
    except Exception as e:
        print(f"❌ Error in analyze_text: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": "Failed to analyze text", "details": str(e)}), 500

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
        limit = data.get('limit', 15) # Match the React hook's default
        
        print(f"🎵 Getting {limit} recommendations for mood: {mood}")
        
        # Use the pre-loaded recommender instance
        songs = recommender.get_recommendations(mood, limit=limit)
        
        if not songs:
            print(f"⚠️ No recommendations found for mood: {mood}")

        print(f"✅ Returning {len(songs)} recommendations.")
        return jsonify({"recommendations": songs, "mood": mood}), 200
        
    except Exception as e:
        print(f"❌ Error in recommend_music: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": "Failed to get recommendations", "details": str(e)}), 500

# --- Main Error Handlers ---
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

# --- Server Startup ---
if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 ECHOMOOD AI SERVER (v2.0 - Optimized)")
    print("="*60)
    if text_model and recommender:
        print("STATUS: All models loaded. Ready to serve.")
    else:
        print("STATUS: ⚠️ CRITICAL: One or more models failed to load.")
    print("="*60)
    print(f"📡 API running on: http://127.0.0.1:5000")
    print(f"🩺 Health Check: http://127.0.0.1:5000/health")
    print("="*60 + "\n")
    
    # Use 127.0.0.1. It's more secure and specific than 0.0.0.0
    app.run(port=5000, debug=True, host='127.0.0.1')