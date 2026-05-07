import os
import uuid
import json
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import MongoManager
from music_recommender import RegionalMusicRecommender
from voice_analyzer import VoiceEmotionAnalyzer
from facial_analyzer import FacialEmotionAnalyzer

app = Flask(__name__)
CORS(app)

app.config["UPLOAD_FOLDER"] = "temp_uploads"
app.config["VAULT_FOLDER"] = "vault_audio"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(app.config["VAULT_FOLDER"], exist_ok=True)

print("Booting up AI Brain...")
recommender = RegionalMusicRecommender()
db_manager = MongoManager()
voice_analyzer = VoiceEmotionAnalyzer(device_id=None)
face_analyzer = FacialEmotionAnalyzer()
print("AI Brain fully online.")


def _parse_languages(form):
    """Parse languages from multipart form data — handles all encoding variants."""
    user_languages = form.getlist("languages")
    if len(user_languages) == 1:
        candidate = user_languages[0].strip()
        if candidate.startswith("["):
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, list):
                    user_languages = [str(l).strip() for l in parsed if str(l).strip()]
            except json.JSONDecodeError:
                user_languages = [l.strip() for l in candidate.split(",") if l.strip()]
        else:
            user_languages = [l.strip() for l in candidate.split(",") if l.strip()]
    elif len(user_languages) > 1:
        user_languages = [l.strip() for l in user_languages if l and l.strip()]
    return user_languages if user_languages else ["Hindi"]


# ── health ────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "success", "message": "The VIP Lounge is open."})


# ── auth ──────────────────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register_user():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required."}), 400
    registered = db_manager.register_user(username, password)
    if not registered:
        return jsonify({"success": False, "message": "Username already exists."}), 409
    return jsonify({"success": True, "user": {"username": username}})


@app.route("/api/auth/login", methods=["POST"])
def login_user():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required."}), 400
    user = db_manager.verify_user(username, password)
    if not user:
        return jsonify({"success": False, "message": "Invalid username or password."}), 401
    return jsonify({"success": True, "user": {"username": username}, "token": username})


# ── AI analysis ───────────────────────────────────────────────────────────────

@app.route("/api/analyze/voice", methods=["POST"])
def analyze_voice():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file found"}), 400

    audio_file = request.files["audio"]
    user_languages = _parse_languages(request.form)

    file_path = os.path.join(app.config["UPLOAD_FOLDER"], f"{uuid.uuid4().hex}.webm")
    audio_file.save(file_path)
    print(f"✅ Audio saved: {file_path}")

    try:
        detected_mood = voice_analyzer.analyze_file(file_path)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    if detected_mood == "blocked":
        return jsonify({"status": "success", "detected_mood": "CONTENT BLOCKED", "tracks": []})

    songs = recommender.get_recommendations(detected_mood, languages=user_languages, limit=6)
    return jsonify({"status": "success", "detected_mood": detected_mood, "tracks": songs})


@app.route("/api/analyze/text", methods=["POST"])
def analyze_text():
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()
    user_languages = payload.get("languages", ["Hindi"])

    if not text:
        return jsonify({"error": "No text provided"}), 400
    if not isinstance(user_languages, list):
        user_languages = ["Hindi"]
    user_languages = [str(l).strip() for l in user_languages if str(l).strip()] or ["Hindi"]

    detected_mood = voice_analyzer.analyze_text(text)
    if detected_mood == "blocked":
        return jsonify({"status": "success", "detected_mood": "CONTENT BLOCKED", "tracks": []})

    songs = recommender.get_recommendations(detected_mood, languages=user_languages, limit=6)
    return jsonify({"status": "success", "detected_mood": detected_mood, "tracks": songs})


@app.route("/api/analyze/face", methods=["POST"])
def analyze_face():
    if "image" not in request.files:
        return jsonify({"error": "No image file found"}), 400

    image_file = request.files["image"]
    user_languages = _parse_languages(request.form)

    nparr = np.frombuffer(image_file.read(), np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return jsonify({"error": "Invalid image data — could not decode frame"}), 400

    result = face_analyzer.analyze_frame(frame)
    if not result.get("success"):
        # Fallback: no face detected
        detected_mood = "calm"
    else:
        detected_mood = result.get("mood", "calm")

    songs = recommender.get_recommendations(detected_mood, languages=user_languages, limit=6)
    return jsonify({"status": "success", "detected_mood": detected_mood, "tracks": songs})


# ── vault ─────────────────────────────────────────────────────────────────────

@app.route("/api/vault/save_track", methods=["POST"])
def save_api_track_to_vault():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    track_name = (payload.get("track_name") or "").strip()
    artist_name = (payload.get("artist_name") or "").strip()
    preview_url = (payload.get("preview_url") or "").strip()
    mood = (payload.get("mood") or "calm").strip()

    if not username:
        return jsonify({"error": "Username is required."}), 400
    if not track_name or not artist_name or not preview_url:
        return jsonify({"error": "Missing required track fields."}), 400

    db_manager.save_api_track(username, track_name, artist_name, preview_url, mood)
    return jsonify({"success": True, "message": "Track saved to vault"})


@app.route("/api/vault/upload", methods=["POST"])
def upload_to_vault():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    track_name = (request.form.get("track_name") or "Unknown Track").strip()
    artist_name = (request.form.get("artist_name") or "Unknown Artist").strip()
    moods = (request.form.get("moods") or "calm").strip()
    username = (request.form.get("username") or "").strip()

    if not username:
        return jsonify({"error": "Username is required."}), 400

    ext = audio_file.filename.rsplit(".", 1)[-1] if "." in audio_file.filename else "mp3"
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(app.config["VAULT_FOLDER"], unique_filename)
    audio_file.save(filepath)

    file_url = f"http://127.0.0.1:5000/api/vault/stream/{unique_filename}"
    mood_list = [m.strip().lower() for m in moods.split(",") if m.strip()]
    db_manager.add_personal_track(username, track_name, artist_name, file_url, mood_list)

    return jsonify({"success": True, "message": "Track secured in Vault!", "url": file_url})


@app.route("/api/vault/stream/<filename>")
def stream_vault_audio(filename):
    return send_from_directory(app.config["VAULT_FOLDER"], filename)


@app.route("/api/vault/tracks", methods=["GET"])
def get_vault_tracks():
    username = (request.args.get("username") or "").strip()
    if not username:
        return jsonify({"error": "Username is required."}), 400
    tracks = db_manager.get_user_tracks(username)
    return jsonify({"success": True, "tracks": tracks})


# ── global library ────────────────────────────────────────────────────────────

@app.route("/api/library/home", methods=["GET"])
def get_library_home():
    return jsonify({"success": True, "library": db_manager.get_grouped_library()})


@app.route("/api/library/search", methods=["GET"])
def search_library():
    query = (request.args.get("q") or "").strip()
    if not query:
        return jsonify({"success": True, "results": []})
    results = db_manager.search_library(query)
    return jsonify({"success": True, "results": results, "query": query})


# ── playlists ─────────────────────────────────────────────────────────────────

@app.route("/api/playlists/create", methods=["POST"])
def create_user_playlist():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    name = (data.get("name") or "New Playlist").strip()
    if not username:
        return jsonify({"success": False, "message": "Username required"}), 400
    playlist_id = db_manager.create_playlist(username, name)
    return jsonify({"success": True, "playlist_id": str(playlist_id)})


@app.route("/api/playlists/add_track", methods=["POST"])
def add_to_playlist():
    data = request.get_json(silent=True) or {}
    playlist_id = data.get("playlist_id")
    track_data = data.get("track")
    if not playlist_id or not track_data:
        return jsonify({"success": False, "message": "playlist_id and track are required"}), 400
    db_manager.add_track_to_playlist(playlist_id, track_data)
    return jsonify({"success": True, "message": "Added to playlist"})


@app.route("/api/playlists/all", methods=["GET"])
def fetch_playlists():
    username = (request.args.get("username") or "").strip()
    if not username:
        return jsonify([])
    return jsonify(db_manager.get_user_playlists(username))


if __name__ == "__main__":
    print("Starting VIP AI Server on port 5000...")
    app.run(port=5000, debug=True)