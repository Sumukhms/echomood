import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import os
from dotenv import load_dotenv
import requests # Import the requests library

# Load Environment Variables
load_dotenv() 

client_id = os.getenv("SPOTIPY_CLIENT_ID")
client_secret = os.getenv("SPOTIPY_CLIENT_SECRET")

if not client_id or not client_secret:
    raise ValueError("Spotify credentials not found. Please check your .env file.")

# --- This part is still used for authentication ---
auth_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)

# Define Mood to Music Mapping
mood_to_audio_features = {
    'happy':    {'target_valence': 0.8, 'target_energy': 0.8},
    'sad':      {'target_valence': 0.2, 'target_energy': 0.2},
    'angry':    {'target_valence': 0.3, 'target_energy': 0.9},
    'calm':     {'target_valence': 0.5, 'target_energy': 0.3},
    'energetic':{'target_valence': 0.7, 'target_energy': 0.9}
}

def get_recommendations(mood: str):
    """Gets song recommendations from Spotify by making a manual API request."""
    
    if mood not in mood_to_audio_features:
        print(f"Mood '{mood}' not recognized.")
        return []

    try:
        # --- NEW LOGIC: Manually get token and make the request ---
        # 1. Get a valid access token
        token_info = auth_manager.get_access_token()
        token = token_info['access_token']

        # 2. Define the correct API endpoint
        endpoint_url = "http://googleusercontent.com/spotify.com/8"

        # 3. Set up the request headers
        headers = {
            "Authorization": f"Bearer {token}"
        }

        # 4. Set up the request parameters
        params = {
            "limit": 10,
            "seed_genres": "pop,electronic,rock",
            **mood_to_audio_features[mood] # Add our mood features
        }

        # 5. Make the GET request
        response = requests.get(endpoint_url, headers=headers, params=params)
        response.raise_for_status() # This will raise an error if the request failed
        
        results = response.json()
        # --- END OF NEW LOGIC ---

    except Exception as e:
        print(f"An error occurred: {e}")
        return []

    if not results or not results['tracks']:
        print(f"Could not find recommendations for mood: {mood}")
        return []

    print(f"\n🎵 Here are 10 song recommendations for when you're feeling {mood}:")
    
    for i, track in enumerate(results['tracks']):
        track_name = track['name']
        artist_name = track['artists'][0]['name']
        print(f"{i+1}. {track_name} by {artist_name}")

# Test the function
if __name__ == "__main__":
    get_recommendations('happy')
    get_recommendations('sad')