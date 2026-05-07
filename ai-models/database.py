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
            self.client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=5000)
            self.client.server_info()
            print("🟢 MongoDB Connected Successfully!")
            self.db = self.client["echomood_db"]
            self.users = self.db["users"]
            self.personal_tracks = self.db["personal_tracks"]
            self.global_library = self.db["global_library"]
            self.playlists = self.db["playlists"]
        except Exception as e:
            print(f"🔴 MongoDB Connection Failed: {e}")
            print("Is MongoDB running? Check MONGO_URI in your .env file.")

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

    def save_api_track(self, user_id, track_name, artist_name, preview_url, mood):
        mood_tags = [str(mood).strip().lower()] if str(mood).strip() else ["calm"]
        track_data = {
            "user_id": user_id,
            "track_name": track_name,
            "artist_name": artist_name,
            "file_url": preview_url,
            "mood_tags": mood_tags,
            "is_external": True,
            "uploaded_at": datetime.utcnow(),
        }
        self.personal_tracks.update_one(
            {
                "user_id": user_id,
                "track_name": track_name,
                "artist_name": artist_name,
                "file_url": preview_url,
                "is_external": True,
            },
            {"$setOnInsert": track_data},
            upsert=True,
        )
        return True

    def get_user_tracks(self, user_id):
        return list(self.personal_tracks.find({"user_id": user_id}, {"_id": 0}))

    # ── global library ────────────────────────────────────────────────────────

    def seed_library(self, track_name, artist_name, preview_url, mood,
                     language, category):
        track_data = {
            "track_name": track_name,
            "artist_name": artist_name,
            "preview_url": preview_url,
            "mood": str(mood).strip().lower(),
            "language": str(language).strip(),
            "category": str(category).strip(),
            "is_external": True,
            "added_at": datetime.utcnow(),
        }
        self.global_library.update_one(
            {"track_name": track_name, "artist_name": artist_name},
            {"$setOnInsert": track_data},
            upsert=True,
        )
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

    # ── playlists ─────────────────────────────────────────────────────────────

    def create_playlist(self, user_id, name):
        # FIX: was ObjectId().get_inc() which doesn't exist and crashes
        result = self.playlists.insert_one({
            "user_id": user_id,
            "name": name,
            "tracks": [],
            "created_at": datetime.utcnow(),
        })
        return result.inserted_id

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
                "is_external": track_data.get("is_external", False),
                "mood_tags": track_data.get("mood_tags", []),
            }}},
        )

    def get_user_playlists(self, user_id):
        return [
            {**p, "_id": str(p["_id"])}
            for p in self.playlists.find({"user_id": user_id})
        ]

    def create_user_profile(self, user_id, name, languages, vibes):
        self.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "name": name,
                "languages": languages,
                "vibes": vibes,
                "last_active": datetime.utcnow(),
            }},
            upsert=True,
        )
        return True