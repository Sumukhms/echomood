from flask import Flask, request, jsonify
from flask_cors import CORS
import importlib
import traceback
import time
from functools import wraps

# Import modules
import text_analyzer
import music_recommender

app = Flask(__name__)

# Enhanced CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Request logging middleware
@app.before_request
def log_request():
    request.start_time = time.time()
    print(f"\n{'='*60}")
    print(f"📨 {request.method} {request.path}")
    print(f"🔍 From: {request.remote_addr}")
    if request.is_json:
        print(f"📦 Payload: {request.get_json()}")

@app.after_request
def log_response(response):
    if hasattr(request, 'start_time'):
        elapsed = time.time() - request.start_time
        print(f"⏱️  Processing time: {elapsed:.3f}s")
    print(f"✅ Status: {response.status_code}")
    print('='*60)
    return response

# Rate limiting helper
request_history = {}

def rate_limit(max_requests=60, window=60):
    """Simple rate limiting decorator."""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            client_ip = request.remote_addr
            current_time = time.time()
            
            # Clean old requests
            if client_ip in request_history:
                request_history[client_ip] = [
                    req_time for req_time in request_history[client_ip]
                    if current_time - req_time < window
                ]
            else:
                request_history[client_ip] = []
            
            # Check rate limit
            if len(request_history[client_ip]) >= max_requests:
                return jsonify({
                    "error": "Rate limit exceeded",
                    "message": f"Maximum {max_requests} requests per {window} seconds"
                }), 429
            
            # Add current request
            request_history[client_ip].append(current_time)
            
            return f(*args, **kwargs)
        return wrapped
    return decorator

@app.route('/health', methods=['GET'])
def health_check():
    """Enhanced health check with system info."""
    return jsonify({
        "status": "ok",
        "message": "EchoMood AI server is running",
        "version": "2.0",
        "endpoints": {
            "analyze_text": "/analyze_text",
            "recommendations": "/recommendations",
            "batch_analyze": "/batch_analyze"
        },
        "timestamp": time.time()
    }), 200

@app.route('/analyze_text', methods=['POST'])
@rate_limit(max_requests=100, window=60)
def analyze_text():
    """Analyze text with enhanced validation and error handling."""
    try:
        # Reload module for latest code
        importlib.reload(text_analyzer)
        
        data = request.get_json()
        
        # Validation
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        if 'text' not in data:
            return jsonify({"error": "Missing 'text' field in request"}), 400
        
        text_to_analyze = data['text']
        
        # Check text length
        if not text_to_analyze.strip():
            return jsonify({"error": "Text cannot be empty"}), 400
        
        if len(text_to_analyze) > 5000:
            return jsonify({
                "error": "Text too long",
                "message": "Maximum 5000 characters allowed"
            }), 400
        
        # Analyze
        start_time = time.time()
        print(f"📝 Analyzing text: {text_to_analyze[:100]}...")
        
        mood = text_analyzer.analyze_text_mood(text_to_analyze)
        
        analysis_time = time.time() - start_time
        print(f"✅ Detected mood: {mood} ({analysis_time:.3f}s)")
        
        return jsonify({
            "mood": mood,
            "text_length": len(text_to_analyze),
            "processing_time": f"{analysis_time:.3f}s",
            "timestamp": time.time()
        }), 200
        
    except Exception as e:
        print(f"❌ Error in analyze_text: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to analyze text",
            "details": str(e),
            "type": type(e).__name__
        }), 500

@app.route('/recommendations', methods=['POST'])
@rate_limit(max_requests=50, window=60)
def recommend_music():
    """Get music recommendations with enhanced options."""
    try:
        # Reload module
        importlib.reload(music_recommender)

        data = request.get_json()
        
        # Validation
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        if 'mood' not in data:
            return jsonify({"error": "Missing 'mood' field in request"}), 400

        mood = data['mood'].lower()
        limit = data.get('limit', 10)  # Default 10 songs
        
        # Validate limit
        if not isinstance(limit, int) or limit < 1 or limit > 50:
            return jsonify({
                "error": "Invalid limit",
                "message": "Limit must be between 1 and 50"
            }), 400
        
        print(f"🎵 Getting {limit} recommendations for mood: {mood}")
        
        start_time = time.time()
        songs = music_recommender.get_recommendations(mood, limit=limit)
        recommendation_time = time.time() - start_time
        
        if not songs:
            print(f"⚠️ No recommendations found for mood: {mood}")
            return jsonify({
                "recommendations": [],
                "message": f"Could not find recommendations for mood: {mood}",
                "mood": mood
            }), 200

        print(f"✅ Returning {len(songs)} recommendations ({recommendation_time:.3f}s)")
        
        return jsonify({
            "recommendations": songs,
            "mood": mood,
            "count": len(songs),
            "processing_time": f"{recommendation_time:.3f}s",
            "timestamp": time.time()
        }), 200
        
    except Exception as e:
        print(f"❌ Error in recommend_music: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to get recommendations",
            "details": str(e),
            "type": type(e).__name__
        }), 500

@app.route('/batch_analyze', methods=['POST'])
@rate_limit(max_requests=20, window=60)
def batch_analyze():
    """
    Analyze multiple texts and get recommendations for each.
    """
    try:
        importlib.reload(text_analyzer)
        importlib.reload(music_recommender)
        
        data = request.get_json()
        
        if not data or 'texts' not in data:
            return jsonify({"error": "Missing 'texts' array in request"}), 400
        
        texts = data['texts']
        
        if not isinstance(texts, list):
            return jsonify({"error": "'texts' must be an array"}), 400
        
        if len(texts) > 10:
            return jsonify({
                "error": "Too many texts",
                "message": "Maximum 10 texts per batch"
            }), 400
        
        results = []
        start_time = time.time()
        
        for i, text in enumerate(texts):
            try:
                if not text or not text.strip():
                    results.append({
                        "index": i,
                        "error": "Empty text",
                        "mood": None,
                        "recommendations": []
                    })
                    continue
                
                # Analyze mood
                mood = text_analyzer.analyze_text_mood(text)
                
                # Get recommendations
                songs = music_recommender.get_recommendations(mood, limit=5)
                
                results.append({
                    "index": i,
                    "text": text[:100] + "..." if len(text) > 100 else text,
                    "mood": mood,
                    "recommendations": songs[:3],  # Top 3 for batch
                    "success": True
                })
                
            except Exception as e:
                results.append({
                    "index": i,
                    "error": str(e),
                    "mood": None,
                    "recommendations": []
                })
        
        processing_time = time.time() - start_time
        
        return jsonify({
            "results": results,
            "total_processed": len(texts),
            "processing_time": f"{processing_time:.3f}s",
            "timestamp": time.time()
        }), 200
        
    except Exception as e:
        print(f"❌ Error in batch_analyze: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to process batch",
            "details": str(e)
        }), 500

@app.route('/available_moods', methods=['GET'])
def get_available_moods():
    """Return list of supported moods."""
    try:
        importlib.reload(music_recommender)
        moods = list(music_recommender.mood_to_audio_features.keys())
        
        return jsonify({
            "moods": moods,
            "count": len(moods),
            "timestamp": time.time()
        }), 200
    except Exception as e:
        return jsonify({
            "error": "Failed to get moods",
            "details": str(e)
        }), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "error": "Endpoint not found",
        "message": "The requested endpoint does not exist",
        "available_endpoints": [
            "/health",
            "/analyze_text",
            "/recommendations",
            "/batch_analyze",
            "/available_moods"
        ]
    }), 404

@app.errorhandler(429)
def rate_limit_exceeded(e):
    return jsonify({
        "error": "Rate limit exceeded",
        "message": "Too many requests. Please slow down."
    }), 429

@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        "error": "Internal server error",
        "message": "An unexpected error occurred"
    }), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 ECHOMOOD AI SERVER v2.0")
    print("="*60)
    print("📡 Health Check:      http://localhost:5000/health")
    print("📝 Text Analysis:     POST http://localhost:5000/analyze_text")
    print("🎵 Recommendations:   POST http://localhost:5000/recommendations")
    print("📦 Batch Analysis:    POST http://localhost:5000/batch_analyze")
    print("🎭 Available Moods:   GET  http://localhost:5000/available_moods")
    print("="*60)
    print("⚙️  Features:")
    print("   - Rate limiting enabled")
    print("   - Request logging enabled")
    print("   - Enhanced error handling")
    print("   - Module hot-reloading")
    print("="*60 + "\n")
    
    app.run(port=5000, debug=True, host='0.0.0.0')