# ai-models/test_spotify.py

print("--- Running Direct Spotify Test ---")
print("This will bypass the Flask server to test the connection directly.")

# Import the function we want to test
from music_recommender import get_recommendations

# Define a mood to test with
test_mood = 'happy'

print(f"\nAttempting to get recommendations for mood: '{test_mood}'...")

# Call the function
songs = get_recommendations(test_mood)

# Print the results
if songs:
    print("\n✅ SUCCESS: Recommendations received!")
    for i, song in enumerate(songs):
        print(f"{i+1}. {song['track_name']} by {song['artist_name']}")
else:
    print("\n❌ FAILURE: No recommendations were returned. Check for errors above.")