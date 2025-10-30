from flask import Flask, request, jsonify
import importlib  # <-- 1. Import the library

# Import your modules
import text_analyzer
import music_recommender

app = Flask(__name__)

@app.route('/analyze_text', methods=['POST'])
def analyze_text():
    # --- 2. Force a reload of the modules to bypass caching ---
    importlib.reload(text_analyzer)
    
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400
    
    text_to_analyze = data['text']
    mood = text_analyzer.analyze_text_mood(text_to_analyze)
    
    return jsonify({"mood": mood})

@app.route('/recommendations', methods=['POST'])
def recommend_music():
    # --- 2. Force a reload of the modules to bypass caching ---
    importlib.reload(music_recommender)

    data = request.get_json()
    if not data or 'mood' not in data:
        return jsonify({"error": "No mood provided"}), 400

    mood = data['mood']
    songs = music_recommender.get_recommendations(mood)

    return jsonify({"recommendations": songs})

if __name__ == '__main__':
    app.run(port=5000, debug=True)