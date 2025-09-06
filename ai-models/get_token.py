# get_token.py
from spotipy.oauth2 import SpotifyClientCredentials
import os
from dotenv import load_dotenv

load_dotenv()

client_id = os.getenv("SPOTIPY_CLIENT_ID")
client_secret = os.getenv("SPOTIPY_CLIENT_SECRET")

if not client_id or not client_secret:
    raise ValueError("Spotify credentials not found.")

# Get the token and print it
auth_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)
token = auth_manager.get_access_token(as_dict=False)
print(token)