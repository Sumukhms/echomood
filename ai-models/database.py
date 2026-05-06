import os
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId

load_dotenv()

class MongoManager:
    def __init__(self):
        # We will use a local database for now so you don't have to deal with cloud keys yet
        # Once it's ready for production, you just change this URI to MongoDB Atlas
        self.mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
        
        try:
            self.client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=5000)
            # This forces a connection test
            self.client.server_info() 
            print("🟢 MongoDB Connected Successfully!")
            
            # Create our main database called 'echomood_db'
            self.db = self.client['echomood_db']
            
            # Define our collections (Tables)
            self.users = self.db['users']
            self.personal_tracks = self.db['personal_tracks']
            self.global_library = self.db['global_library']
            self.playlists = self.db['playlists']
            
        except Exception as e:
            print(f"🔴 MongoDB Connection Failed: {e}")
            print("Did you install MongoDB locally, or set up a MongoDB Atlas URL?")

    def create_user_profile(self, user_id, name, languages, vibes):
        """Creates or updates a user's preferences in the database"""
        user_data = {
            "user_id": user_id,
            "name": name,
            "languages": languages,
            "vibes": vibes,
            "last_active": datetime.utcnow()
        }
        # Upsert: Update if exists, Insert if it's new
        self.users.update_one({"user_id": user_id}, {"$set": user_data}, upsert=True)
        return True

    def register_user(self, username, password):
        """Registers a new user with a hashed password."""
        username = (username or '').strip()
        password = password or ''
        if not username or not password:
            return None

        if self.users.find_one({"username": username}):
            return None

        password_hash = generate_password_hash(password)
        user_data = {
            "username": username,
            "password_hash": password_hash,
            "created_at": datetime.utcnow()
        }

        result = self.users.insert_one(user_data)
        if result.inserted_id:
            return {"username": username, "created_at": user_data["created_at"]}
        return None

    def verify_user(self, username, password):
        """Verifies username/password and returns user info without the hash."""
        username = (username or '').strip()
        password = password or ''
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

    def add_personal_track(self, user_id, track_name, artist_name, file_url, mood_tags, is_external=False):
        """Saves a user's uploaded song to their personal vault"""
        track_data = {
            "user_id": user_id,
            "track_name": track_name,
            "artist_name": artist_name,
            "file_url": file_url, # Where the .mp3 is saved
            "mood_tags": mood_tags,
            "is_external": is_external,
            "uploaded_at": datetime.utcnow()
        }
        self.personal_tracks.insert_one(track_data)
        return True

    def save_api_track(self, user_id, track_name, artist_name, preview_url, mood):
        """Saves an external API recommendation (like YouTube) to the personal vault."""
        mood_tags = [str(mood).strip().lower()] if str(mood).strip() else ['calm']

        track_data = {
            "user_id": user_id,
            "track_name": track_name,
            "artist_name": artist_name,
            "file_url": preview_url,
            "mood_tags": mood_tags,
            "is_external": True,
            "uploaded_at": datetime.utcnow()
        }

        # Avoid duplicates when users tap save repeatedly.
        self.personal_tracks.update_one(
            {
                "user_id": user_id,
                "track_name": track_name,
                "artist_name": artist_name,
                "file_url": preview_url,
                "is_external": True
            },
            {"$setOnInsert": track_data},
            upsert=True
        )
        return True

    def get_user_tracks(self, user_id):
        """Fetches all uploaded tracks for a specific user."""
        tracks = list(self.personal_tracks.find({"user_id": user_id}, {"_id": 0}))
        return tracks

    def seed_library(self, track_name, artist_name, preview_url, mood, language, category):
        """Seeds the global library with a track, preventing duplicates by track_name and artist_name."""
        track_data = {
            "track_name": track_name,
            "artist_name": artist_name,
            "preview_url": preview_url,
            "mood": str(mood).strip().lower(),
            "language": str(language).strip(),
            "category": str(category).strip(),
            "is_external": True,
            "added_at": datetime.utcnow()
        }
        
        # Upsert based on track_name and artist_name to prevent duplicates
        self.global_library.update_one(
            {
                "track_name": track_name,
                "artist_name": artist_name
            },
            {"$setOnInsert": track_data},
            upsert=True
        )
        return True

    def get_grouped_library(self):
        """Returns tracks grouped by category."""
        grouped = {}
        tracks = list(self.global_library.find({}, {"_id": 0}))
        
        for track in tracks:
            category = track.get("category", "Uncategorized")
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(track)
        
        return grouped

    def search_library(self, query):
        """Search the global library for tracks by name, artist, or mood (case-insensitive)."""
        if not query or not isinstance(query, str):
            return []
        
        query = query.strip()
        if len(query) == 0:
            return []
        
        # Case-insensitive regex pattern
        pattern = f".*{query}.*"
        regex = {"$regex": pattern, "$options": "i"}
        
        # Search in track_name, artist_name, or mood
        results = list(self.global_library.find(
            {
                "$or": [
                    {"track_name": regex},
                    {"artist_name": regex},
                    {"mood": regex},
                    {"category": regex}
                ]
            },
            {"_id": 0}
        ).limit(15))
        
        return results
    
    def create_playlist(self, username, name):
        """Creates a new playlist for a user."""
        playlist = {
            "username": username,
            "name": name,
            "tracks": [],
            "created_at": datetime.utcnow()
        }
        return self.playlists.insert_one(playlist).inserted_id

    def add_track_to_playlist(self, playlist_id, track_data):
        """Adds a track (local or external) to a specific playlist, preventing duplicates."""
        # Check if track already exists in playlist
        existing_playlist = self.playlists.find_one({"_id": ObjectId(playlist_id)})
        if existing_playlist:
            for existing_track in existing_playlist.get("tracks", []):
                if (existing_track.get("track_name") == track_data.get("track_name") and 
                    existing_track.get("artist_name") == track_data.get("artist_name")):
                    return False  # Duplicate found, don't add
        
        # Ensure is_external flag is preserved
        track_to_add = {
            "track_name": track_data.get("track_name"),
            "artist_name": track_data.get("artist_name"),
            "file_url": track_data.get("file_url") or track_data.get("preview_url"),
            "is_external": track_data.get("is_external", False),
            "mood_tags": track_data.get("mood_tags", [])
        }
        result = self.playlists.update_one(
            {"_id": ObjectId(playlist_id)},
            {"$push": {"tracks": track_to_add}}
        )
        return result.modified_count > 0

    def get_user_playlists(self, username):
        """Fetches all playlists owned by a user."""
        results = self.playlists.find({"username": username})
        return [{**p, "_id": str(p["_id"])} for p in results]