import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import os
from dotenv import load_dotenv
import requests
import time
import random

load_dotenv() 

client_id = os.getenv("SPOTIPY_CLIENT_ID")
client_secret = os.getenv("SPOTIPY_CLIENT_SECRET")

if not client_id or not client_secret:
    raise ValueError("Spotify credentials not found. Please check your .env file.")

auth_manager = SpotifyClientCredentials(
    client_id=client_id, 
    client_secret=client_secret,
    cache_handler=None
)

# Enhanced mood mappings with more nuanced audio features
mood_to_audio_features = {
    'happy': {
        'target_valence': 0.75,
        'target_energy': 0.7,
        'target_danceability': 0.7,
        'min_valence': 0.6,
        'seed_genres': 'pop,dance,indie-pop,happy,summer'
    },
    'sad': {
        'target_valence': 0.25,
        'target_energy': 0.3,
        'target_acousticness': 0.6,
        'max_valence': 0.4,
        'seed_genres': 'sad,piano,acoustic,indie,singer-songwriter'
    },
    'angry': {
        'target_valence': 0.3,
        'target_energy': 0.9,
        'target_loudness': 0.8,
        'min_energy': 0.7,
        'seed_genres': 'rock,metal,punk,hard-rock,alternative'
    },
    'calm': {
        'target_valence': 0.5,
        'target_energy': 0.3,
        'target_acousticness': 0.7,
        'target_instrumentalness': 0.5,
        'seed_genres': 'ambient,chill,lo-fi,study,sleep'
    },
    'energetic': {
        'target_valence': 0.75,
        'target_energy': 0.9,
        'target_danceability': 0.8,
        'min_energy': 0.7,
        'seed_genres': 'electronic,edm,workout,party,dance'
    }
}

def get_diverse_seeds(mood):
    """Generate diverse seed combinations for better variety."""
    all_genres = mood_to_audio_features[mood]['seed_genres'].split(',')
    
    # Create multiple seed combinations
    seed_combinations = [
        all_genres[:5],  # First 5
        all_genres[-5:] if len(all_genres) > 5 else all_genres,  # Last 5
    ]
    
    # Random combination if we have enough genres
    if len(all_genres) >= 5:
        random_genres = random.sample(all_genres, min(5, len(all_genres)))
        seed_combinations.append(random_genres)
    
    return seed_combinations

def get_recommendations(mood: str, limit=15, retries=3):
    """
    Get music recommendations with improved diversity and error handling.
    """
    if mood not in mood_to_audio_features:
        print(f"Mood '{mood}' not recognized. Using 'calm' as default.")
        mood = 'calm'
    
    all_recommendations = []
    seen_tracks = set()
    
    seed_combinations = get_diverse_seeds(mood)
    
    for attempt in range(retries):
        try:
            token_info = auth_manager.get_access_token(as_dict=True)
            token = token_info['access_token']
            
            headers = {"Authorization": f"Bearer {token}"}
            endpoint_url = "https://api.spotify.com/v1/recommendations"
            
            # Try different seed combinations for variety
            for seeds in seed_combinations:
                params = {
                    "limit": 10,
                    "seed_genres": ','.join(seeds),
                }
                
                # Add audio features
                features = mood_to_audio_features[mood].copy()
                features.pop('seed_genres')  # Remove non-API parameter
                params.update(features)
                
                print(f"Fetching recommendations with seeds: {seeds[:3]}...")
                
                response = requests.get(endpoint_url, headers=headers, params=params, timeout=10)
                response.raise_for_status()
                results = response.json()
                
                if results and 'tracks' in results:
                    for track in results['tracks']:
                        track_id = track['id']
                        if track_id not in seen_tracks:
                            seen_tracks.add(track_id)
                            all_recommendations.append({
                                'track_name': track['name'],
                                'artist_name': track['artists'][0]['name'],
                                'album': track['album']['name'],
                                'preview_url': track.get('preview_url'),
                                'external_url': track['external_urls']['spotify'],
                                'popularity': track['popularity']
                            })
                
                # Stop if we have enough recommendations
                if len(all_recommendations) >= limit:
                    break
                
                time.sleep(0.5)  # Rate limiting
            
            if all_recommendations:
                # Sort by popularity for quality
                all_recommendations.sort(key=lambda x: x['popularity'], reverse=True)
                final_recs = all_recommendations[:limit]
                
                print(f"✅ Retrieved {len(final_recs)} diverse recommendations")
                return final_recs
            else:
                print(f"⚠️ No tracks found for mood: {mood}")
                if attempt < retries - 1:
                    continue
                return []
                
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                print(f"Authentication error on attempt {attempt + 1}")
                if attempt < retries - 1:
                    auth_manager.get_access_token(as_dict=False)
                    time.sleep(1)
                    continue
            print(f"HTTP Error: {e}")
            if attempt == retries - 1:
                return []
                
        except Exception as e:
            print(f"Error on attempt {attempt + 1}: {e}")
            if attempt < retries - 1:
                time.sleep(1)
                continue
            return []
    
    return []

def get_playlist_for_mood(mood: str, duration_minutes=30):
    """
    Generate a playlist with estimated duration.
    Average song length ~3.5 minutes.
    """
    num_songs = int(duration_minutes / 3.5)
    return get_recommendations(mood, limit=num_songs)

if __name__ == "__main__":
    print("Testing Enhanced Spotify Recommendations...")
    
    for mood in ['happy', 'sad', 'energetic', 'calm', 'angry']:
        print(f"\n{'='*60}")
        print(f"🎵 Testing mood: '{mood}'")
        print('='*60)
        
        songs = get_recommendations(mood, limit=10)
        
        if songs:
            for i, song in enumerate(songs, 1):
                print(f"{i:2d}. {song['track_name'][:40]:40s} - {song['artist_name'][:25]:25s} (Pop: {song['popularity']})")
        else:
            print(f"❌ Failed to get recommendations")
        
        time.sleep(1)  # Be nice to the API