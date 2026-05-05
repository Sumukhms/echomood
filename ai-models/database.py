import os
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv

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

    def add_personal_track(self, user_id, track_name, artist_name, file_url, mood_tags):
        """Saves a user's uploaded song to their personal vault"""
        track_data = {
            "user_id": user_id,
            "track_name": track_name,
            "artist_name": artist_name,
            "file_url": file_url, # Where the .mp3 is saved
            "mood_tags": mood_tags,
            "uploaded_at": datetime.utcnow()
        }
        self.personal_tracks.insert_one(track_data)
        return True