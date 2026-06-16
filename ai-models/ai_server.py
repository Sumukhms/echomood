import os
import uuid
import json
import cv2
import numpy as np
import time
import requests
import concurrent.futures
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import MongoManager
from music_recommender import RegionalMusicRecommender
from voice_analyzer import VoiceEmotionAnalyzer
from facial_analyzer import FacialEmotionAnalyzer
from text_analyzer import ImprovedTextAnalyzer

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
text_analyzer = ImprovedTextAnalyzer()
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


@app.route("/api/auth/reset_password", methods=["POST"])
def reset_password():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    new_password = payload.get("password") or ""
    if not username or not new_password:
        return jsonify({"success": False, "message": "Username and new password are required."}), 400
    success = db_manager.reset_password(username, new_password)
    if not success:
        return jsonify({"success": False, "message": "Username not found or update failed."}), 404
    return jsonify({"success": True, "message": "Password successfully reset."})

# ── profile ───────────────────────────────────────────────────────────────────

@app.route("/api/profile", methods=["GET"])
def get_profile():
    username = (request.args.get("username") or "").strip()
    if not username:
        return jsonify({"success": False, "message": "Username required"}), 400
    profile_data = db_manager.get_user_profile(username)
    return jsonify({"success": True, "preferences": profile_data["preferences"], "is_public": profile_data["is_public"]})

@app.route("/api/profile", methods=["POST"])
def update_profile():
    global HOME_CACHE
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    preferences = payload.get("preferences", {"languages": []})
    is_public = payload.get("is_public", None)
    if not username:
        return jsonify({"success": False, "message": "Username required"}), 400
    db_manager.update_user_profile(username, preferences, is_public)
    
    # Invalidate cached library for this user
    if username in HOME_CACHE:
        del HOME_CACHE[username]
        
    return jsonify({"success": True})


# ── community ─────────────────────────────────────────────────────────────────

@app.route("/api/community/users", methods=["GET"])
def get_community_users():
    users = db_manager.get_public_users()
    return jsonify({"success": True, "users": users})

@app.route("/api/community/user/<username>", methods=["GET"])
def get_community_user_profile(username):
    profile = db_manager.get_public_user_profile(username)
    if not profile:
        return jsonify({"success": False, "message": "User not found or not public"}), 404
    return jsonify({"success": True, "profile": profile})

# ── semantic voice & text analysis ───────────────────────────────────────────────────────────────

def generate_ai_explanation(mood):
    explanations = {
        "happy": "I detected a lot of positive energy! I've curated some upbeat and vibrant tracks to keep your spirits high.",
        "sad": "I sense a heavier frequency. I've queued up some emotional and reflective tracks to help you process and find comfort.",
        "angry": "I'm picking up on some intense energy. Here are some heavy, powerful tracks to help you release that tension.",
        "calm": "Your frequency feels very balanced and peaceful. I've selected some lo-fi and acoustic sounds to maintain your zen.",
        "energetic": "You've got amazing momentum! Here are some high-BPM hits to keep that adrenaline pumping.",
        "romantic": "I detect a warm, affectionate vibe. I've curated some smooth, soulful melodies for you.",
        "nostalgic": "I sense you're feeling reflective. I've pulled some classic hits and acoustic covers to match that nostalgic aura.",
        "focused": "I see you're locked in. I've prepared a mix of instrumental and ambient tracks to keep you in the zone.",
        "party": "The vibe is electric! I've loaded up the global top hits to get the party started.",
        "sleepy": "Your energy is winding down. I've queued some ambient and gentle tracks to help you drift off."
    }
    return explanations.get(mood.lower(), f"I've curated these tracks to perfectly match your {mood} frequency.")

@app.route("/api/analyze/voice", methods=["POST"])
def analyze_voice():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file found"}), 400

    audio_file = request.files["audio"]
    user_languages = _parse_languages(request.form)

    file_path = os.path.join(app.config["UPLOAD_FOLDER"], f"{uuid.uuid4().hex}.webm")
    audio_file.save(file_path)
    print("Audio saved securely.")

    try:
        detected_mood = voice_analyzer.analyze_file(file_path)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    username = (request.form.get("username") or "").strip()
    skipped_tracks = db_manager.get_user_skips(username) if username else []

    if username and detected_mood != "blocked":
        db_manager.log_mood_history(username, detected_mood, "voice")

    if detected_mood == "blocked":
        return jsonify({"status": "success", "detected_mood": "CONTENT BLOCKED", "tracks": []})

    songs = recommender.get_recommendations(detected_mood, languages=user_languages, limit=6, skipped_tracks=skipped_tracks)
    explanation = generate_ai_explanation(detected_mood)
    return jsonify({"status": "success", "detected_mood": detected_mood, "explanation": explanation, "tracks": songs})


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

    username = (payload.get("username") or "").strip()
    skipped_tracks = db_manager.get_user_skips(username) if username else []

    detected_mood = voice_analyzer.analyze_text(text)
    if username and detected_mood != "blocked":
        db_manager.log_mood_history(username, detected_mood, "text")

    if detected_mood == "blocked":
        return jsonify({"status": "success", "detected_mood": "CONTENT BLOCKED", "tracks": []})

    songs = recommender.get_recommendations(detected_mood, languages=user_languages, limit=6, skipped_tracks=skipped_tracks)
    explanation = generate_ai_explanation(detected_mood)
    return jsonify({"status": "success", "detected_mood": detected_mood, "explanation": explanation, "tracks": songs})


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

    username = (request.form.get("username") or "").strip()
    skipped_tracks = db_manager.get_user_skips(username) if username else []

    result = face_analyzer.analyze_frame(frame)
    if not result.get("success"):
        # Fallback: no face detected
        detected_mood = "calm"
    else:
        detected_mood = result.get("mood", "calm")

    if username:
        db_manager.log_mood_history(username, detected_mood, "face")

    songs = recommender.get_recommendations(detected_mood, languages=user_languages, limit=6, skipped_tracks=skipped_tracks)
    explanation = generate_ai_explanation(detected_mood)
    return jsonify({"status": "success", "detected_mood": detected_mood, "explanation": explanation, "tracks": songs})

# ── feedback ──────────────────────────────────────────────────────────────────

@app.route("/api/feedback", methods=["POST"])
def record_feedback():
    payload = request.get_json(silent=True) or {}
    username = payload.get("username")
    track_name = payload.get("track_name")
    artist_name = payload.get("artist_name")
    mood = payload.get("mood")
    action = payload.get("action")

    if not username or not track_name or not action:
        return jsonify({"success": False, "error": "Missing fields"}), 400

    db_manager.record_feedback(username, track_name, artist_name, mood, action)
    return jsonify({"success": True})


@app.route("/api/mood/history", methods=["GET"])
def get_mood_history_route():
    username = request.args.get("username", "").strip()
    if not username:
        return jsonify({"error": "username parameter is required"}), 400
    history = db_manager.get_mood_history(username)
    return jsonify({"success": True, "history": history})


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

HOME_CACHE = {}  # key: username/cache_key, value: {"library": library_data, "timestamp": timestamp}

def get_language_hits_query(lang):
    lang_lower = lang.lower()
    if lang_lower == "english":
        return "Global Top Hits", "top pop hits"
    elif lang_lower == "hindi":
        return "Bollywood Top 50", "bollywood top romantic"
    else:
        return f"{lang} Top Hits", f"{lang} top hits pop"

def get_category_query(lang, vibe):
    lang_lower = lang.lower()
    vibe_lower = vibe.lower()
    
    if vibe_lower == "bollywood":
        if lang_lower == "hindi":
            return "Bollywood Hits", "bollywood hits"
        elif lang_lower in ["english", "global"]:
            return "Bollywood Top Hits", "bollywood top hits"
        else:
            return f"{lang} Cinema Hits", f"{lang} movie songs soundtrack"
    elif vibe_lower == "lo-fi":
        if lang_lower == "hindi":
            return "Hindi Lo-Fi", "bollywood lofi chill beats"
        return f"{lang} Lo-Fi", f"{lang} lofi beats chill"
    elif vibe_lower == "edm":
        if lang_lower == "hindi":
            return "Hindi EDM", "bollywood remix dj party"
        return f"{lang} EDM", f"{lang} edm electronic dance"
    elif vibe_lower == "acoustic":
        if lang_lower == "hindi":
            return "Hindi Acoustic", "bollywood unplugged acoustic"
        return f"{lang} Acoustic", f"{lang} acoustic cover unplugged"
    elif vibe_lower == "classical":
        if lang_lower == "hindi":
            return "Indian Classical", "indian classical instrumental sitar"
        return f"{lang} Classical", f"{lang} classical instrumental"
    elif vibe_lower == "hip-hop":
        if lang_lower == "hindi":
            return "Desi Hip-Hop", "desi hip hop rap punjabi"
        return f"{lang} Hip-Hop", f"{lang} hip hop rap"
    elif vibe_lower == "indie":
        if lang_lower == "hindi":
            return "Hindi Indie", "hindi indie pop folk"
        return f"{lang} Indie", f"{lang} indie pop folk"
    elif vibe_lower == "devotional":
        if lang_lower == "hindi":
            return "Morning Devotionals", "hindi bhajan aarti devotional"
        return f"{lang} Spiritual", f"{lang} spiritual worship"
    elif vibe_lower == "romantic":
        if lang_lower == "hindi":
            return "Hindi Romance", "bollywood romantic love hits"
        return f"{lang} Romance", f"{lang} romantic love hits"
    elif vibe_lower == "sad":
        if lang_lower == "hindi":
            return "Heartbreak Hits (Hindi)", "bollywood sad emotional heartbreak"
        return f"{lang} Heartbreak", f"{lang} sad emotional heartbreak"
    elif vibe_lower == "energetic":
        if lang_lower == "hindi":
            return "Desi Workout", "bollywood workout energetic gym"
        return f"{lang} Workout", f"{lang} workout energetic gym"
    elif vibe_lower == "old classics":
        if lang_lower == "hindi":
            return "Golden Era Bollywood", "bollywood old hits kishore lata"
        return f"{lang} Classics", f"{lang} old classic hits"
    elif vibe_lower == "party":
        if lang_lower == "hindi":
            return "Desi Party Anthems", "bollywood dance party hits"
        return f"{lang} Party", f"{lang} dance party hits"
    elif vibe_lower == "focus":
        if lang_lower == "hindi":
            return "Indian Study Focus", "indian classical instrumental focus"
        return f"{lang} Focus", f"{lang} study focus instrumental"
    else:
        return f"{lang} {vibe}", f"{lang} {vibe}"

def fetch_itunes_category(query, limit=20, country="US"):
    tracks = []
    for attempt in range(3):
        try:
            url = f"https://itunes.apple.com/search?term={requests.utils.quote(query)}&limit={limit}&media=music&country={country}"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            for track in data.get("results", []):
                track_name = track.get("trackName")
                artist_name = track.get("artistName", "Unknown")
                preview_url = track.get("previewUrl")
                cover_url = track.get("artworkUrl100", "")
                if cover_url:
                    cover_url = cover_url.replace("100x100bb", "600x600bb")
                if preview_url and track_name:
                    tracks.append({
                        "track_name": track_name,
                        "artist_name": artist_name,
                        "preview_url": preview_url,
                        "file_url": preview_url,
                        "cover_url": cover_url,
                        "is_external": False,
                        "source": "iTunes"
                    })
            break # Success, exit retry loop
        except Exception as e:
            print(f"Attempt {attempt+1} - Error fetching {query} from iTunes: {e}")
            time.sleep(1)
    return tracks

def fetch_jiosaavn_category(query, limit=10):
    tracks = []
    for attempt in range(3):
        try:
            search_url = f"https://www.jiosaavn.com/api.php?__call=search.getResults&q={requests.utils.quote(query)}&n={limit}&p=1&_format=json&_marker=0&ctx=web6dot0"
            search_res = requests.get(search_url, timeout=5)
            search_res.raise_for_status()
            search_data = search_res.json()
            
            results = search_data.get("results", [])
            if not results:
                return []
                
            pids = ",".join([item["id"] for item in results if "id" in item])
            details_url = f"https://www.jiosaavn.com/api.php?__call=song.getDetails&pids={pids}&_format=json&_marker=0&ctx=web6dot0"
            details_res = requests.get(details_url, timeout=5)
            details_res.raise_for_status()
            details_data = details_res.json()
            
            for song in details_data.get("songs", []):
                title = song.get("title", "").replace("&quot;", '"')
                artist = song.get("more_info", {}).get("singers", song.get("subtitle", "Unknown")).replace("&quot;", '"')
                vlink = song.get("vlink")
                image = song.get("image", "").replace("150x150", "500x500").replace("50x50", "500x500")
                
                if vlink and title:
                    tracks.append({
                        "track_name": title,
                        "artist_name": artist,
                        "preview_url": vlink,
                        "file_url": vlink,
                        "cover_url": image,
                        "is_external": False,
                        "source": "JioSaavn"
                    })
            break # Success, exit retry loop
        except Exception as e:
            print(f"Attempt {attempt+1} - Error fetching {query} from JioSaavn: {e}")
            time.sleep(1)
    return tracks

@app.route("/api/library/home", methods=["GET"])
def get_library_home():
    global HOME_CACHE
    username = (request.args.get("username") or "").strip()
    cache_key = username if username else "__guest__"
    
    now = time.time()
    # Check cache expiration (1 hour)
    if cache_key in HOME_CACHE and (now - HOME_CACHE[cache_key]["timestamp"]) < 3600:
        return jsonify({"success": True, "library": HOME_CACHE[cache_key]["library"]})
        
    # Cache miss or expired: fetch user profile
    languages = []
    vibes = []
    if username:
        profile = db_manager.get_user_profile(username)
        languages = profile.get("languages") or []
        vibes = profile.get("vibes") or []
        
    if not languages:
        languages = ["English", "Hindi"]
    
    # If the user has selected vibes, prioritize them.
    # To keep layouts rich, if they have selected fewer than 5 vibes, top it up with a few popular default vibes.
    # If they have selected 5 or more vibes, ONLY use their chosen vibes for true personalization.
    if vibes:
        base_vibes = {v.strip() for v in vibes if v.strip()}
        if len(base_vibes) < 5:
            extended_vibes = ["Devotional", "Romantic", "Sad", "Energetic", "Old Classics", "Lo-Fi", "Acoustic", "Bollywood", "EDM", "Indie", "Party", "Focus"]
            for ev in extended_vibes:
                if len(base_vibes) >= 6:
                    break
                base_vibes.add(ev)
        vibes = list(base_vibes)
    else:
        vibes = ["Bollywood", "Indie", "Lo-Fi", "EDM", "Acoustic", "Romantic", "Sad", "Energetic"]
        
    # Generate unique category queries crossing languages and vibes
    categories = {}
    
    import random
    
    # 0. Spotify-like Curated Mixes
    mix_lang = random.choice(languages) if languages else "English"
    mix_vibes = " ".join(random.sample(vibes, min(2, len(vibes)))) if vibes else "hits"
    categories[f"Your Daily Mix"] = f"{mix_lang} {mix_vibes} hits"
    
    top_artists = {
        "English": ["The Weeknd", "Taylor Swift", "Drake", "Billie Eilish"],
        "Hindi": ["Arijit Singh", "Shreya Ghoshal", "A.R. Rahman", "Pritam"],
        "Spanish": ["Bad Bunny", "Rosalia", "J Balvin", "Shakira"],
        "Kannada": ["Sonu Nigam", "Rajesh Krishnan", "Armaan Malik"],
        "Tamil": ["Anirudh Ravichander", "Sid Sriram", "D. Imman"],
        "Telugu": ["S. P. Balasubrahmanyam", "Sid Sriram", "Thaman S"],
        "Malayalam": ["K. J. Yesudas", "Vineeth Sreenivasan"],
        "Punjabi": ["Diljit Dosanjh", "AP Dhillon", "Sidhu Moose Wala"],
        "Korean": ["BTS", "BLACKPINK", "IU"],
        "Japanese": ["YOASOBI", "Kenshi Yonezu", "LiSA"]
    }
    
    for lang in languages[:2]: # Max 2 artist mixes
        if lang in top_artists:
            artist = random.choice(top_artists[lang])
            categories[f"This Is {artist}"] = f"{artist} best hits"

    # Decade Throwbacks
    if "Hindi" in languages:
        categories["Decade Throwbacks"] = "bollywood 2010s hits nostalgic"
    else:
        categories["Decade Throwbacks"] = "2010s pop hits nostalgic"
    
    # 1. Pure language hits
    for lang in languages:
        name, query = get_language_hits_query(lang)
        categories[name] = query
        
    # 2. Language + Vibe combinations
    for lang in languages:
        for vibe in vibes:
            name, query = get_category_query(lang, vibe)
            categories[name] = query
            
    unique_categories = {}
    
    # 3. Trending & Top 30 (Always prioritized)
    for lang in languages:
        lang_name = lang.capitalize()
        unique_categories[f"Trending {lang_name}"] = f"trending {lang.lower()} hits"
        unique_categories[f"{lang_name} Top 30"] = f"{lang.lower()} top 30 songs"
    
    if "English" in languages and "Global Viral 50" not in unique_categories:
        unique_categories["Global Viral 50"] = "global viral 50 hits"
        
    # Filter unique category names and randomly sample to fill the rest up to 16
    unique_categories_list = list(categories.items())
    import random
    random.shuffle(unique_categories_list)
    
    for name, query in unique_categories_list:
        if len(unique_categories) >= 16:
            break
        if name not in unique_categories:
            unique_categories[name] = query
        
    # If fewer than 10 categories, fill with default shelves matching the user's selected languages
    language_defaults = {
        "English": [
            ("Global Top Hits", "top pop hits"),
            ("Lo-Fi & Chill", "lofi beats relaxing"),
            ("Workout Mix", "workout gym energetic"),
            ("Acoustic Covers", "acoustic cover hits"),
            ("Rock Classics", "classic rock hits"),
            ("Jazz Essentials", "jazz lounge instrumental")
        ],
        "Hindi": [
            ("Bollywood Top 50", "bollywood top romantic"),
            ("Desi Party", "bollywood dance hits"),
            ("Heartbreak Hits", "bollywood sad songs"),
            ("Morning Devotional", "hindi bhajan devotional"),
            ("Hindi Lo-Fi", "bollywood lofi chill beats"),
            ("Hindi Indie", "hindi indie pop folk")
        ],
        "Spanish": [
            ("Latino Hits", "latino pop reggaeton hits"),
            ("Vibras Urbanas", "latin trap urbano hits"),
            ("Acústico Latino", "latin acoustic pop")
        ],
        "Kannada": [
            ("Kannada Hits", "kannada top songs hits"),
            ("Sandalwood Romance", "kannada romantic love songs")
        ],
        "Tamil": [
            ("Tamil Top Hits", "tamil top songs hits"),
            ("Kollywood Romance", "tamil romantic love songs")
        ],
        "Telugu": [
            ("Telugu Top Hits", "telugu top songs hits"),
            ("Tollywood Romance", "telugu romantic love love hits")
        ],
        "Malayalam": [
            ("Malayalam Hits", "malayalam top songs hits"),
            ("Mollywood Romance", "malayalam romantic love songs")
        ],
        "Punjabi": [
            ("Punjabi Hits", "punjabi top dance bhangra hits"),
            ("Punjabi Romantic", "punjabi romantic sad love songs")
        ]
    }

    default_fallbacks = []
    for lang in languages:
        if lang in language_defaults:
            default_fallbacks.extend(language_defaults[lang])

    # Fallback to standard pop hits if no language fallbacks match
    if not default_fallbacks:
        default_fallbacks = [
            ("Global Top Hits", "top pop hits"),
            ("Lo-Fi & Chill", "lofi beats relaxing"),
            ("Workout Mix", "workout gym energetic")
        ]
    
    for name, query in default_fallbacks:
        if len(unique_categories) >= 10:
            break
        if name not in unique_categories:
            unique_categories[name] = query
            
    # Fetch track data from APIs in parallel
    library = {}
    
    def fetch_category(title, query):
        indian_langs = ['hindi', 'kannada', 'tamil', 'telugu', 'malayalam', 'punjabi', 'bengali', 'marathi', 'gujarati', 'urdu', 'bollywood', 'desi']
        country_code = "IN" if any(lang in title.lower() or lang in query.lower() for lang in indian_langs) else "US"
        
        # Merge iTunes + JioSaavn tracks
        itunes_tracks = fetch_itunes_category(query, limit=30, country=country_code)
        
        # If it's Indian music, fetch from JioSaavn as well to enrich the library
        saavn_tracks = fetch_jiosaavn_category(query, limit=20) if country_code == "IN" else []
            
        merged_tracks = itunes_tracks + saavn_tracks
        random.shuffle(merged_tracks)
        
        # Deduplicate by track name and limit repeated images
        seen = set()
        image_counts = {}
        deduped = []
        for t in merged_tracks:
            t_name = t["track_name"].lower()
            t_img = t.get("cover_url", "")
            img_count = image_counts.get(t_img, 0)
            
            if t_name not in seen and img_count < 2:
                seen.add(t_name)
                if t_img:
                    image_counts[t_img] = img_count + 1
                deduped.append(t)
                
        return title, deduped

    # Run fetches concurrently to speed up the dashboard loading
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_title = {executor.submit(fetch_category, title, query): title for title, query in unique_categories.items()}
        for future in concurrent.futures.as_completed(future_to_title):
            title = future_to_title[future]
            try:
                result_title, deduped_tracks = future.result()
                library[result_title] = deduped_tracks
            except Exception as exc:
                print(f"Category {title} generated an exception: {exc}")
                library[title] = []
        
    # Cache result
    HOME_CACHE[cache_key] = {
        "library": library,
        "timestamp": now
    }
    
    return jsonify({"success": True, "library": library})


@app.route("/api/library/search", methods=["GET"])
def search_library():
    query = (request.args.get("q") or "").strip()
    if not query:
        return jsonify({"success": True, "results": []})
    indian_langs = ['hindi', 'kannada', 'tamil', 'telugu', 'malayalam', 'punjabi', 'bengali', 'marathi', 'gujarati', 'urdu', 'bollywood', 'desi']
    country_code = "IN" if any(lang in query.lower() for lang in indian_langs) else "US"
    results = fetch_itunes_category(query, limit=50, country=country_code)
    return jsonify({"success": True, "results": results, "query": query})


# ── youtube search ────────────────────────────────────────────────────────────

@app.route("/api/music/youtube_url", methods=["GET"])
def get_youtube_url():
    query = (request.args.get("q") or "").strip()
    if not query:
        return jsonify({"success": False, "error": "Query required"}), 400
        
    # Check for official YouTube API Key in environment
    api_key = os.getenv("YOUTUBE_API_KEY")
    if api_key:
        try:
            import urllib.parse
            # Clean and encode query
            strict_query = query + " official audio"
            encoded_query = urllib.parse.quote(strict_query)
            url = f"https://www.googleapis.com/youtube/v3/search?part=id&q={encoded_query}&type=video&maxResults=1&key={api_key}"
            
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                items = data.get("items", [])
                if items:
                    video_id = items[0].get("id", {}).get("videoId")
                    if video_id:
                        watch_url = f"https://www.youtube.com/watch?v={video_id}"
                        return jsonify({"success": True, "youtube_url": watch_url, "video_id": video_id})
        except Exception as e:
            print(f"Error calling YouTube API: {e}")
            # Fallback to scraping if API fails (e.g. quota limit exceeded)
            
    # Fallback: Scrape YouTube (works locally, might fail in cloud due to blocks)
    try:
        import urllib.request
        import urllib.parse
        import re
        
        strict_query = query + " official audio -full -album -mix -hour"
        search_query = urllib.parse.quote(strict_query)
        url = f"https://www.youtube.com/results?search_query={search_query}"
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read().decode('utf-8')
            
        video_ids = re.findall(r"watch\?v=(\S{11})", html)
        if video_ids:
            video_id = video_ids[0]
            watch_url = f"https://www.youtube.com/watch?v={video_id}"
            return jsonify({"success": True, "youtube_url": watch_url, "video_id": video_id})
    except Exception as e:
        print(f"Error scraping YouTube for '{query}': {e}")
        return jsonify({"success": False, "error": f"Scraping error: {str(e)}"}), 200
        
    return jsonify({"success": False, "error": "Could not find video"}), 200


# ── lyrics ────────────────────────────────────────────────────────────────────

@app.route("/api/lyrics", methods=["GET"])
def get_lyrics():
    track_name = (request.args.get("track_name") or "").strip()
    artist_name = (request.args.get("artist_name") or "").strip()
    
    if not track_name:
        return jsonify({"success": False, "error": "track_name is required"}), 400
        
    try:
        import urllib.parse
        import re
        
        # Clean track name and artist name for better matching
        clean_track = re.sub(r'\(.*?\)', '', track_name).strip()
        clean_track = re.sub(r'\[.*?\]', '', clean_track).strip()
        
        clean_artist = artist_name.split('&')[0].split(',')[0].strip()
        
        query = urllib.parse.urlencode({"track_name": clean_track, "artist_name": clean_artist})
        url = f"https://lrclib.net/api/search?{query}"
        
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                best_match = data[0]
                synced_lyrics = best_match.get("syncedLyrics")
                plain_lyrics = best_match.get("plainLyrics")
                
                return jsonify({
                    "success": True, 
                    "syncedLyrics": synced_lyrics,
                    "plainLyrics": plain_lyrics
                })
        return jsonify({"success": False, "error": "Lyrics not found", "syncedLyrics": None, "plainLyrics": None}), 200
    except Exception as e:
        print(f"Error fetching lyrics for {track_name}: {e}")
        return jsonify({"success": False, "error": "Lyrics temporarily unavailable", "syncedLyrics": None, "plainLyrics": None}), 200

# ── favorites ─────────────────────────────────────────────────────────────────

@app.route("/api/favorites/all", methods=["GET"])
def get_favorites():
    username = (request.args.get("username") or "").strip()
    if not username:
        return jsonify({"success": False, "error": "Username required"}), 400
    favs = db_manager.get_user_favorites(username)
    return jsonify({"success": True, "favorites": favs})

@app.route("/api/favorites/add", methods=["POST"])
def add_favorite():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    track = data.get("track")
    if not username or not track:
        return jsonify({"success": False, "error": "Username and track required"}), 400
    db_manager.add_to_favorites(username, track)
    return jsonify({"success": True})

@app.route("/api/favorites/remove", methods=["POST"])
def remove_favorite():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    file_url = data.get("file_url")
    if not username or not file_url:
        return jsonify({"success": False, "error": "Username and file_url required"}), 400
    db_manager.remove_from_favorites(username, file_url)
    return jsonify({"success": True})

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


@app.route("/api/playlists/generate", methods=["POST"])
def generate_ai_playlist():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    prompt = (payload.get("prompt") or "Vibes").strip()
    
    if not username:
        return jsonify({"success": False, "error": "Username required"}), 400
        
    detected_mood = text_analyzer.analyze_text_mood(prompt)
    if detected_mood == "blocked":
        detected_mood = "calm"
        
    user_languages = db_manager.get_user_profile(username).get("languages", ["English", "Hindi"])
    skipped_tracks = db_manager.get_user_skips(username)
    songs = recommender.get_recommendations(detected_mood, languages=user_languages, limit=10, skipped_tracks=skipped_tracks)
    
    valid_covers = ["happy", "sad", "energetic", "calm", "focused"]
    cover_name = detected_mood.lower() if detected_mood.lower() in valid_covers else "calm"
    cover_url = f"/covers/{cover_name}.png"
    
    playlist_id = db_manager.create_playlist(username, f"{prompt} Mix", cover_url)
    
    for song in songs:
        db_manager.add_track_to_playlist(str(playlist_id), song)
        
    return jsonify({
        "success": True, 
        "playlist_id": str(playlist_id), 
        "mood": detected_mood,
        "cover_url": cover_url,
        "tracks": songs
    })


@app.route("/api/playlists/add_track", methods=["POST"])
def add_to_playlist():
    data = request.get_json(silent=True) or {}
    playlist_id = data.get("playlist_id")
    track_data = data.get("track")
    if not playlist_id or not track_data:
        return jsonify({"success": False, "message": "playlist_id and track are required"}), 400
    db_manager.add_track_to_playlist(playlist_id, track_data)
    return jsonify({"success": True, "message": "Added to playlist"})

@app.route("/api/playlists/save_ai", methods=["POST"])
def save_ai_playlist():
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    name = data.get("name")
    tracks = data.get("tracks")
    cover_url = data.get("cover_url")
    
    if not username or not name or not tracks:
        return jsonify({"success": False, "message": "Missing required fields"}), 400
        
    playlist_id = db_manager.save_ai_playlist(username, name, tracks, cover_url)
    return jsonify({"success": True, "playlist_id": playlist_id})


@app.route("/api/playlists/all", methods=["GET"])
def fetch_playlists():
    username = (request.args.get("username") or "").strip()
    if not username:
        return jsonify([])
    return jsonify(db_manager.get_user_playlists(username))


@app.route("/api/playlists/delete", methods=["POST"])
def delete_playlist():
    data = request.get_json(silent=True) or {}
    playlist_id = data.get("playlist_id")
    if not playlist_id:
        return jsonify({"success": False, "message": "playlist_id is required"}), 400
    db_manager.delete_playlist(playlist_id)
    return jsonify({"success": True, "message": "Playlist deleted"})

@app.route("/api/playlists/toggle_pin", methods=["POST"])
def toggle_playlist_pin():
    data = request.get_json(silent=True) or {}
    playlist_id = data.get("playlist_id")
    if not playlist_id:
        return jsonify({"success": False, "message": "playlist_id is required"}), 400
    new_status = db_manager.toggle_playlist_pin(playlist_id)
    return jsonify({"success": True, "is_pinned": new_status})

@app.route("/api/playlists/reorder", methods=["POST"])
def reorder_playlist():
    data = request.get_json(silent=True) or {}
    playlist_id = data.get("playlist_id")
    new_tracks = data.get("tracks")
    if not playlist_id or new_tracks is None:
        return jsonify({"success": False, "message": "playlist_id and tracks are required"}), 400
    db_manager.reorder_playlist(playlist_id, new_tracks)
    return jsonify({"success": True, "message": "Playlist reordered"})


@app.route("/api/playlists/remove_track", methods=["POST"])
def remove_playlist_track():
    data = request.get_json(silent=True) or {}
    playlist_id = data.get("playlist_id")
    file_url = data.get("file_url")
    if not playlist_id or not file_url:
        return jsonify({"success": False, "message": "playlist_id and file_url are required"}), 400
    db_manager.remove_track_from_playlist(playlist_id, file_url)
    return jsonify({"success": True, "message": "Track removed from playlist"})


@app.route("/api/playlists/update_name", methods=["POST"])
def update_playlist_name():
    data = request.get_json(silent=True) or {}
    playlist_id = data.get("playlist_id")
    name = (data.get("name") or "").strip()
    if not playlist_id or not name:
        return jsonify({"success": False, "message": "playlist_id and name are required"}), 400
    db_manager.update_playlist_name(playlist_id, name)
    return jsonify({"success": True, "message": "Playlist name updated"})


@app.route("/api/radio/next", methods=["POST"])
def next_radio_tracks():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    seed_mood = (payload.get("seed_mood") or "calm").strip()
    seed_source = (payload.get("seed_source") or "").strip()
    
    user_languages = ["English", "Hindi"]
    skipped_tracks = []
    if username:
        user_languages = db_manager.get_user_profile(username).get("languages", ["English", "Hindi"])
        skipped_tracks = db_manager.get_user_skips(username)
        
    # Ensure languages are respected regardless of the seed track's source
        
    songs = recommender.get_recommendations(seed_mood, languages=user_languages, limit=5, skipped_tracks=skipped_tracks)
    return jsonify({"success": True, "tracks": songs})


# ── party sessions ──────────────────────────────────────────────────────────────

import random
import string

PARTY_SESSIONS = {}

def generate_party_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=4))

@app.route("/api/party/create", methods=["POST"])
def create_party():
    payload = request.get_json(silent=True) or {}
    username = payload.get("username", "Host")
    
    code = generate_party_code()
    PARTY_SESSIONS[code] = {
        "host": username,
        "guests": [],
        "current_track": None,
        "is_playing": False,
        "current_time": 0,
        "queue": [],
        "last_updated": time.time()
    }
    return jsonify({"success": True, "code": code})

@app.route("/api/party/join", methods=["POST"])
def join_party():
    payload = request.get_json(silent=True) or {}
    username = payload.get("username", "Guest")
    code = (payload.get("code") or "").upper()
    
    if code not in PARTY_SESSIONS:
        return jsonify({"success": False, "error": "Invalid party code"}), 404
        
    if username not in PARTY_SESSIONS[code]["guests"] and username != PARTY_SESSIONS[code]["host"]:
        PARTY_SESSIONS[code]["guests"].append(username)
        
    return jsonify({"success": True, "session": PARTY_SESSIONS[code]})

@app.route("/api/party/sync", methods=["POST"])
def sync_party():
    payload = request.get_json(silent=True) or {}
    code = (payload.get("code") or "").upper()
    username = payload.get("username")
    
    if code not in PARTY_SESSIONS:
        return jsonify({"success": False, "error": "Invalid code"}), 404
        
    session = PARTY_SESSIONS[code]
    
    # Host updates the state
    if username == session["host"]:
        if "current_track" in payload:
            session["current_track"] = payload["current_track"]
        if "is_playing" in payload:
            session["is_playing"] = payload["is_playing"]
        if "current_time" in payload:
            session["current_time"] = payload["current_time"]
        session["last_updated"] = time.time()
        
    return jsonify({
        "success": True, 
        "session": session,
        "queue": session.get("queue", []),
        "current_track": session.get("current_track")
    })

@app.route("/api/party/add", methods=["POST"])
def party_add():
    payload = request.get_json(silent=True) or {}
    code = (payload.get("code") or "").upper()
    track = payload.get("track")
    if code not in PARTY_SESSIONS:
        return jsonify({"success": False, "error": "Invalid code"}), 404
    if not track:
        return jsonify({"success": False, "error": "Missing track"}), 400
    track["upvotes"] = 0
    PARTY_SESSIONS[code].setdefault("queue", []).append(track)
    return jsonify({"success": True, "queue": PARTY_SESSIONS[code]["queue"]})

@app.route("/api/party/upvote", methods=["POST"])
def party_upvote():
    payload = request.get_json(silent=True) or {}
    code = (payload.get("code") or "").upper()
    track_index = payload.get("track_index")
    if code not in PARTY_SESSIONS:
        return jsonify({"success": False, "error": "Invalid code"}), 404
    queue = PARTY_SESSIONS[code].get("queue", [])
    if track_index is None or track_index < 0 or track_index >= len(queue):
        return jsonify({"success": False, "error": "Invalid index"}), 400
    queue[track_index]["upvotes"] = queue[track_index].get("upvotes", 0) + 1
    queue.sort(key=lambda x: x.get("upvotes", 0), reverse=True)
    PARTY_SESSIONS[code]["queue"] = queue
    return jsonify({"success": True, "queue": queue})

@app.route("/api/wrapped", methods=["GET"])
def get_wrapped():
    username = request.args.get("username", "").strip()
    if not username:
        return jsonify({"success": False, "error": "Username required"}), 400
        
    mood_history = db_manager.get_mood_history(username)
    mood_counts = {}
    for entry in mood_history:
        m = entry.get("mood", "calm")
        mood_counts[m] = mood_counts.get(m, 0) + 1
    top_mood = max(mood_counts, key=mood_counts.get) if mood_counts else "calm"
    
    user_history = db_manager.get_user_history(username) if hasattr(db_manager, "get_user_history") else []
    total_minutes = len(user_history) * 3
    
    track_counts = {}
    for item in user_history:
        t_name = item.get("track_name", "Unknown")
        a_name = item.get("artist_name", "Unknown")
        key = f"{t_name} by {a_name}"
        track_counts[key] = track_counts.get(key, 0) + 1
        
    sorted_tracks = sorted(track_counts.items(), key=lambda x: x[1], reverse=True)
    top_tracks = [{"track": k, "count": v} for k, v in sorted_tracks[:5]]
    
    return jsonify({
        "success": True,
        "top_mood": top_mood,
        "top_tracks": top_tracks,
        "total_minutes": total_minutes
    })


# ── story generation ─────────────────────────────────────────────────────────

import io
import base64
from PIL import Image, ImageDraw, ImageFilter

@app.route("/api/story/generate", methods=["POST"])
def generate_story():
    payload = request.get_json(silent=True) or {}
    track_name = payload.get("track_name", "Unknown Track")
    artist_name = payload.get("artist_name", "Unknown Artist")
    cover_url = payload.get("cover_url", "")
    mood = payload.get("mood", "calm")
    
    try:
        if cover_url:
            resp = requests.get(cover_url, timeout=5)
            resp.raise_for_status()
            cover_img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            cover_img = cover_img.resize((800, 800))
        else:
            raise ValueError("No cover URL")
    except Exception as e:
        print(f"Error downloading cover art: {e}")
        cover_img = Image.new("RGB", (800, 800), color=(0, 0, 0))
        
    bg_img = Image.new("RGB", (1080, 1920))
    
    bg_blur = cover_img.resize((1080, 1920))
    bg_blur = bg_blur.filter(ImageFilter.GaussianBlur(100))
    bg_img.paste(bg_blur, (0, 0))
    
    x_offset = (1080 - 800) // 2
    y_offset = (1920 - 800) // 2
    bg_img.paste(cover_img, (x_offset, y_offset))
    
    img_byte_arr = io.BytesIO()
    bg_img.save(img_byte_arr, format='JPEG')
    base64_str = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
    
    return jsonify({
        "success": True,
        "image_b64": f"data:image/jpeg;base64,{base64_str}"
    })


if __name__ == "__main__":
    print("Starting VIP AI Server on port 5000...")
    app.run(port=5000, debug=True)