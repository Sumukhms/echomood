import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import os
from dotenv import load_dotenv
import requests

load_dotenv() 
client_id = os.getenv("SPOTIPY_CLIENT_ID")
client_secret = os.getenv("SPOTIPY_CLIENT_SECRET")
if not client_id or not client_secret:
    raise ValueError("Spotify credentials not found. Please check your .env file.")

auth_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)
mood_to_audio_features = {
    'happy':    {'target_valence': 0.8, 'target_energy': 0.8},
    'sad':      {'target_valence': 0.2, 'target_energy': 0.2},
    'angry':    {'target_valence': 0.3, 'target_energy': 0.9},
    'calm':     {'target_valence': 0.5, 'target_energy': 0.3},
    'energetic':{'target_valence': 0.7, 'target_energy': 0.9}
}

def get_recommendations(mood: str):
    if mood not in mood_to_audio_features:
        print(f"Mood '{mood}' not recognized.")
        return []
    try:
        token_info = auth_manager.get_access_token(as_dict=True)
        token = token_info['access_token']
        
        endpoint_url = "https://api.spotify.com/v1/recommendations"
        
        headers = { "Authorization": f"Bearer {token}" }
        params = {
            "limit": 10,
            "seed_genres": "pop,rock,electronic,hip-hop,indie",
            **mood_to_audio_features[mood]
        }
        
        print(f"SUCCESS: Running latest code. Fetching from: {endpoint_url}")
        
        response = requests.get(endpoint_url, headers=headers, params=params)
        response.raise_for_status() 
        results = response.json()
    except Exception as e:
        print(f"An error occurred: {e}")
        return []

    if not results or not results['tracks']:
        print(f"Could not find recommendations for mood: {mood}")
        return []

    recommendations = []
    for track in results['tracks']:
        recommendations.append({
            'track_name': track['name'],
            'artist_name': track['artists'][0]['name']
        })
    return recommendations

if __name__ == "__main__":
    moods_to_test = ['happy', 'sad', 'energetic']
    for mood in moods_to_test:
        print(f"\n🎵 Getting recommendations for '{mood}'...")
        songs = get_recommendations(mood)
        if songs:
            for i, song in enumerate(songs):
                print(f"{i+1}. {song['track_name']} by {song['artist_name']}")