import os
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId

load_dotenv()


class MongoManager:
    def __init__(self):
        self.mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
        try:
            self.client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=2000)
            self.client.server_info()
            print("MongoDB Connected Successfully!")
        except Exception as e:
            print(f"MongoDB Connection Failed: {e}")
            print("Falling back to LOCAL PERSISTENT database (Mongita). Data will be saved locally!")
            from mongita import MongitaClientDisk
            os.makedirs("echomood_db_data", exist_ok=True)
            self.client = MongitaClientDisk(host="./echomood_db_data")

        self.db = self.client["echomood_db"]
        self.users = self.db["users"]
        self.personal_tracks = self.db["personal_tracks"]
        self.global_library = self.db["global_library"]
        self.playlists = self.db["playlists"]
        self.favorites = self.db["favorites"]
        self.feedback = self.db["feedback"]

    # ── auth ──────────────────────────────────────────────────────────────────

    def register_user(self, username, password):
        username = (username or "").strip()
        password = password or ""
        if not username or not password:
            return None
        if self.users.find_one({"username": username}):
            return None
        user_data = {
            "username": username,
            "password_hash": generate_password_hash(password),
            "created_at": datetime.utcnow(),
        }
        result = self.users.insert_one(user_data)
        if result.inserted_id:
            return {"username": username}
        return None

    def reset_password(self, username, new_password):
        username = (username or "").strip()
        new_password = new_password or ""
        if not username or not new_password:
            return False
        user = self.users.find_one({"username": username})
        if not user:
            return False
        result = self.users.update_one(
            {"username": username},
            {"$set": {"password_hash": generate_password_hash(new_password)}}
        )
        return result.modified_count > 0 or result.matched_count > 0

    def verify_user(self, username, password):
        username = (username or "").strip()
        password = password or ""
        if not username or not password:
            return None
        user = self.users.find_one({"username": username})
        if not user or not user.get("password_hash"):
            return None
        if not check_password_hash(user["password_hash"], password):
            return None
        user.pop("password_hash", None)
        user.pop("_id", None)
        return user

    # ── personal vault ────────────────────────────────────────────────────────

    def add_personal_track(self, user_id, track_name, artist_name, file_url,
                           mood_tags, is_external=False):
        self.personal_tracks.insert_one({
            "user_id": user_id,
            "track_name": track_name,
            "artist_name": artist_name,
            "file_url": file_url,
            "mood_tags": mood_tags,
            "is_external": is_external,
            "uploaded_at": datetime.utcnow(),
        })
        return True

    def save_api_track(self, user_id, track_name, artist_name, preview_url, mood, cover_url=""):
        mood_tags = [str(mood).strip().lower()] if str(mood).strip() else ["calm"]
        track_data = {
            "user_id": user_id,
            "track_name": track_name,
            "artist_name": artist_name,
            "file_url": preview_url,
            "cover_url": cover_url,
            "mood_tags": mood_tags,
            "is_external": False,
            "uploaded_at": datetime.utcnow(),
        }
        query = {
            "user_id": user_id,
            "track_name": track_name,
            "artist_name": artist_name,
            "file_url": preview_url,
            "is_external": False,
        }
        if not self.personal_tracks.find_one(query):
            self.personal_tracks.insert_one(track_data)
        return True

    def get_user_tracks(self, user_id):
        return list(self.personal_tracks.find({"user_id": user_id}, {"_id": 0}))

    # ── global library ────────────────────────────────────────────────────────

    def seed_library(self, track_name, artist_name, preview_url, mood,
                     language, category, cover_url=""):
        track_data = {
            "track_name": track_name,
            "artist_name": artist_name,
            "preview_url": preview_url,
            "cover_url": cover_url,
            "mood": str(mood).strip().lower(),
            "language": str(language).strip(),
            "category": str(category).strip(),
            "is_external": False,
            "added_at": datetime.utcnow(),
        }
        query = {"track_name": track_name, "artist_name": artist_name}
        if not self.global_library.find_one(query):
            self.global_library.insert_one(track_data)
        return True

    def get_grouped_library(self):
        grouped = {}
        for track in self.global_library.find({}, {"_id": 0}):
            cat = track.get("category", "Uncategorized")
            grouped.setdefault(cat, []).append(track)
        return grouped

    def search_library(self, query):
        if not query or not query.strip():
            return []
        pattern = {"$regex": query.strip(), "$options": "i"}
        return list(
            self.global_library.find(
                {"$or": [
                    {"track_name": pattern},
                    {"artist_name": pattern},
                    {"mood": pattern},
                    {"category": pattern},
                ]},
                {"_id": 0},
            ).limit(15)
        )

    # ── favorites ─────────────────────────────────────────────────────────────

    def add_to_favorites(self, username, track_data):
        username = (username or "").strip()
        if not username:
            return False
            
        # Deduplicate
        track_url = track_data.get("file_url") or track_data.get("preview_url", "")
        if self.favorites.find_one({"username": username, "track_data.file_url": track_url}):
            return True
            
        # Ensure file_url is set for consistent lookups
        if "file_url" not in track_data:
            track_data["file_url"] = track_url
            
        self.favorites.insert_one({
            "username": username,
            "track_data": track_data,
            "added_at": datetime.utcnow()
        })
        return True

    def remove_from_favorites(self, username, file_url):
        username = (username or "").strip()
        if not username or not file_url:
            return False
            
        result = self.favorites.delete_one({"username": username, "track_data.file_url": file_url})
        return result.deleted_count > 0

    def get_user_favorites(self, username):
        username = (username or "").strip()
        if not username:
            return []
            
        # Return list of track_data
        docs = self.favorites.find({"username": username}).sort("added_at", -1)
        return [doc["track_data"] for doc in docs]

    # ── playlists ─────────────────────────────────────────────────────────────

    def create_playlist(self, user_id, name, cover_url=None):
        # FIX: was ObjectId().get_inc() which doesn't exist and crashes
        doc = {
            "user_id": user_id,
            "name": name,
            "tracks": [],
            "created_at": datetime.utcnow(),
        }
        if cover_url:
            doc["cover_url"] = cover_url
        result = self.playlists.insert_one(doc)
        return result.inserted_id

    def save_ai_playlist(self, user_id, name, tracks, cover_url=None):
        formatted_tracks = []
        for track_data in tracks:
            track_url = track_data.get("file_url") or track_data.get("preview_url", "")
            formatted_tracks.append({
                "track_name": track_data.get("track_name", "Unknown"),
                "artist_name": track_data.get("artist_name", "Unknown"),
                "file_url": track_url,
                "cover_url": track_data.get("cover_url", ""),
                "is_external": track_data.get("is_external", False),
                "mood_tags": track_data.get("mood_tags", []),
            })
            
        doc = {
            "user_id": user_id,
            "name": name,
            "tracks": formatted_tracks,
            "created_at": datetime.utcnow(),
        }
        if cover_url:
            doc["cover_url"] = cover_url
        result = self.playlists.insert_one(doc)
        return str(result.inserted_id)

    def add_track_to_playlist(self, playlist_id, track_data):
        track_url = track_data.get("file_url") or track_data.get("preview_url", "")
        # Prevent exact duplicate tracks in the same playlist
        if self.playlists.find_one(
            {"_id": ObjectId(playlist_id), "tracks.file_url": track_url}
        ):
            return None
        return self.playlists.update_one(
            {"_id": ObjectId(playlist_id)},
            {"$push": {"tracks": {
                "track_name": track_data.get("track_name", "Unknown"),
                "artist_name": track_data.get("artist_name", "Unknown"),
                "file_url": track_url,
                "cover_url": track_data.get("cover_url", ""),
                "is_external": track_data.get("is_external", False),
                "mood_tags": track_data.get("mood_tags", []),
            }}},
        )

    def get_user_playlists(self, user_id):
        return [
            {**p, "_id": str(p["_id"])}
            for p in self.playlists.find({"user_id": user_id})
        ]

    def reorder_playlist(self, playlist_id, new_tracks):
        # We assume new_tracks is the perfectly formatted list of track dicts
        return self.playlists.update_one(
            {"_id": ObjectId(playlist_id)},
            {"$set": {"tracks": new_tracks}}
        )

    def delete_playlist(self, playlist_id):
        return self.playlists.delete_one({"_id": ObjectId(playlist_id)})

    def toggle_playlist_pin(self, playlist_id):
        playlist = self.playlists.find_one({"_id": ObjectId(playlist_id)})
        if playlist:
            new_status = not playlist.get("is_pinned", False)
            self.playlists.update_one({"_id": ObjectId(playlist_id)}, {"$set": {"is_pinned": new_status}})
            return new_status
        return False

    def remove_track_from_playlist(self, playlist_id, file_url):
        return self.playlists.update_one(
            {"_id": ObjectId(playlist_id)},
            {"$pull": {"tracks": {"file_url": file_url}}}
        )

    def update_playlist_name(self, playlist_id, name):
        return self.playlists.update_one(
            {"_id": ObjectId(playlist_id)},
            {"$set": {"name": name}}
        )

    def get_user_profile(self, username):
        user = self.users.find_one({"username": username})
        if user:
            prefs = user.get("preferences", {"languages": [], "vibes": []})
            return {"preferences": prefs, "is_public": user.get("is_public", False)}
        return {"preferences": {"languages": [], "vibes": []}, "is_public": False}

    def update_user_profile(self, username, preferences, is_public=None):
        update_doc = {"preferences": preferences}
        if is_public is not None:
            update_doc["is_public"] = is_public
            
        self.users.update_one(
            {"username": username},
            {"$set": update_doc}
        )
        return True
        
    def get_public_users(self):
        users = self.users.find({"is_public": True})
        return [{"username": u["username"]} for u in users]

    def get_public_user_profile(self, username):
        user = self.users.find_one({"username": username, "is_public": True})
        if not user:
            return None
            
        # Get liked songs
        liked_songs = self.get_user_favorites(username)
        # Get playlists
        playlists = self.get_user_playlists(str(user["_id"]))
        
        return {
            "username": user["username"],
            "preferences": user.get("preferences", {}),
            "liked_songs": liked_songs,
            "playlists": playlists
        }

    # ── feedback ─────────────────────────────────────────────────────────────

    def record_feedback(self, username, track_name, artist_name, mood, action):
        username = (username or "").strip()
        if not username:
            return False
            
        self.db["feedback"].insert_one({
            "username": username,
            "track_name": track_name,
            "artist_name": artist_name,
            "mood": str(mood).strip().lower() if mood else "calm",
            "action": action, # 'like' or 'skip'
            "timestamp": datetime.utcnow()
        })
        return True

    def get_user_skips(self, username):
        skips = self.db["feedback"].find({"username": username, "action": "skip"})
        return [skip.get("track_name") for skip in skips if skip.get("track_name")]

    def log_mood_history(self, username, mood, source):
        username = (username or "").strip()
        if not username:
            return False
        self.db["mood_history"].insert_one({
            "username": username,
            "mood": str(mood).strip().lower() if mood else "calm",
            "source": source,
            "timestamp": datetime.utcnow()
        })
        return True

    def get_mood_history(self, username, limit=50):
        username = (username or "").strip()
        if not username:
            return []
        history = self.db["mood_history"].find({"username": username}).sort("timestamp", -1).limit(limit)
        return [{
            "mood": doc.get("mood", "calm"),
            "source": doc.get("source", "unknown"),
            "timestamp": doc.get("timestamp").isoformat() if doc.get("timestamp") else None
        } for doc in history]

    def get_user_history(self, username):
        username = (username or "").strip()
        if not username:
            return []
        # Return all feedback items to calculate top tracks and listening time
        return list(self.db["feedback"].find({"username": username}))