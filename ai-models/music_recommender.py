# ai-models/music_recommender.py
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import os
from dotenv import load_dotenv
import requests
import time
import random

load_dotenv()

# Moved mood mappings to be global so the class can access it
mood_to_audio_features = {
    'happy': {
        'target_valence': 0.75, 'target_energy': 0.7, 'target_danceability': 0.7,
        'min_valence': 0.6, 'seed_genres': 'pop,dance,indie-pop,happy,summer'
    },
    'sad': {
        'target_valence': 0.25, 'target_energy': 0.3, 'target_acousticness': 0.6,
        'max_valence': 0.4, 'seed_genres': 'sad,piano,acoustic,indie,singer-songwriter'
    },
    'angry': {
        'target_valence': 0.3, 'target_energy': 0.9, 'target_loudness': 0.8,
        'min_energy': 0.7, 'seed_genres': 'rock,metal,punk,hard-rock,alternative'
    },
    'calm': {
        'target_valence': 0.5, 'target_energy': 0.3, 'target_acousticness': 0.7,
        'target_instrumentalness': 0.5, 'seed_genres': 'ambient,chill,lo-fi,study,sleep'
    },
    'energetic': {
        'target_valence': 0.75, 'target_energy': 0.9, 'target_danceability': 0.8,
        'min_energy': 0.7, 'seed_genres': 'electronic,edm,workout,party,dance'
    }
}

class SpotifyRecommender:
    def __init__(self):
        client_id = os.getenv("SPOTIPY_CLIENT_ID")
        client_secret = os.getenv("SPOTIPY_CLIENT_SECRET")

        if not client_id or not client_secret:
            raise ValueError("Spotify credentials not found. Please check your .env file.")

        self.auth_manager = SpotifyClientCredentials(
            client_id=client_id,
            client_secret=client_secret
        )
        # --- Caching logic ---
        self.access_token = None
        self.token_expiry_time = 0
        print("SpotifyRecommender initialized.")

    def _get_token(self):
        """
        Fetches a new token if the current one is expired.
        Otherwise, returns the cached token.
        """
        current_time = time.time()
        
        # Check if token is invalid or expired (with a 60s buffer)
        if not self.access_token or current_time >= (self.token_expiry_time - 60):
            print("🔄 Fetching new Spotify access token...")
            try:
                token_info = self.auth_manager.get_access_token(as_dict=True)
                if not token_info or 'access_token' not in token_info:
                    raise Exception("Failed to retrieve token_info")
                    
                self.access_token = token_info['access_token']
                self.token_expiry_time = current_time + token_info['expires_in']
                print("✅ New token fetched and cached.")
            except Exception as e:
                print(f"❌ CRITICAL: Failed to get Spotify token: {e}")
                self.access_token = None # Invalidate token
                self.token_expiry_time = 0
                return None
        else:
            print("✔️ Using cached Spotify token.")
            
        return self.access_token

    def _get_diverse_seeds(self, mood):
        """Generate diverse seed combinations for better variety."""
        all_genres = mood_to_audio_features[mood]['seed_genres'].split(',')
        seed_combinations = [all_genres[:5]] # Get first 5
        
        # Get last 5 if different
        if len(all_genres) > 5:
            seed_combinations.append(all_genres[-5:])
            
        # Get 5 random
        if len(all_genres) >= 5:
            random_genres = random.sample(all_genres, 5)
            if random_genres not in seed_combinations:
                seed_combinations.append(random_genres)
        
        return seed_combinations

    def get_recommendations(self, mood: str, limit=15):
        """
        Get music recommendations using the cached token.
        """
        if mood not in mood_to_audio_features:
            print(f"⚠️ Mood '{mood}' not recognized. Defaulting to 'calm'.")
            mood = 'calm'
        
        token = self._get_token()
        if not token:
            print("❌ Cannot get recommendations without an access token.")
            return []

        all_recommendations = {} # Use dict to avoid duplicate tracks
        seen_track_ids = set()
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # --- THIS IS THE ORIGINAL, CORRECT URL ---
        endpoint_url = "https.api.spotify.com/v1/recommendations"
        # --- END OF FIX ---
        
        seed_combinations = self._get_diverse_seeds(mood)

        try:
            for seeds in seed_combinations:
                if len(all_recommendations) >= limit:
                    break # Stop if we have enough

                params = {"limit": limit, "seed_genres": ','.join(seeds)}
                features = mood_to_audio_features[mood].copy()
                features.pop('seed_genres') # Remove from params
                params.update(features)
                
                print(f"Fetching recommendations with seeds: {seeds[:3]}...")
                
                response = requests.get(endpoint_url, headers=headers, params=params, timeout=10)
                response.raise_for_status() # Will raise error for 4xx/5xx
                
                results = response.json()
                
                if results and 'tracks' in results:
                    for track in results['tracks']:
                        if track and track['id'] not in seen_track_ids:
                            seen_track_ids.add(track['id'])
                            all_recommendations[track['id']] = {
                                'track_name': track['name'],
                                'artist_name': track['artists'][0]['name'],
                                'album': track['album']['name'],
                                'preview_url': track.get('preview_url'),
                                'external_url': track['external_urls']['spotify'],
                                'popularity': track['popularity']
                            }

            final_recs = list(all_recommendations.values())
            final_recs.sort(key=lambda x: x['popularity'], reverse=True)
            return final_recs[:limit]

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                print("❌ Spotify token expired or invalid. Forcing re-auth on next call.")
                self.access_token = None # Force re-auth
            else:
                print(f"❌ HTTP Error fetching recommendations: {e} | {e.response.text}")
            return []
        except Exception as e:
            print(f"❌ Unknown error in get_recommendations: {e}")
            import traceback
            traceback.print_exc()
            return []

# This allows the ai_server to import the class, but also lets you test the file directly
if __name__ == "__main__":
    print("Testing SpotifyRecommender...")
    # This creates a new instance and caches the token
    recommender = SpotifyRecommender()
    
    for mood in ['happy', 'sad', 'energetic']:
        print(f"\n{'='*60}\n🎵 Testing mood: '{mood}'\n{'='*60}")
        songs = recommender.get_recommendations(mood, limit=5)
        
        if songs:
            for i, song in enumerate(songs, 1):
                print(f"{i:2d}. {song['track_name']:40s} - {song['artist_name']}")
        else:
            print("❌ Failed to get recommendations.")
        time.sleep(1) # Be nice to API
    
    print("\n[Test] Calling 'happy' again (should use cached token):")
    recommender.get_recommendations('happy', limit=1)