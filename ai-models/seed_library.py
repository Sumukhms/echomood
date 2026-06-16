"""
Global Library Seeder Script
This script populates the global_library collection with curated tracks
from different languages, moods, and categories.
"""

from database import MongoManager
from music_recommender import RegionalMusicRecommender

# Initialize managers
db_manager = MongoManager()
recommender = RegionalMusicRecommender()

# Define the combinations to seed
LANGUAGES = ['English', 'Hindi', 'Kannada']
MOODS = ['Happy', 'Calm', 'Energetic']

# Custom category names for each language-mood combination
CATEGORY_MAP = {
    'English': {
        'Happy': 'English Pop Hits',
        'Calm': 'English Lo-Fi',
        'Energetic': 'English EDM'
    },
    'Hindi': {
        'Happy': 'Bollywood Hits',
        'Calm': 'Hindi Chill',
        'Energetic': 'Bollywood Dancefloor'
    },
    'Kannada': {
        'Happy': 'Trending in Kannada',
        'Calm': 'Kannada Relaxation',
        'Energetic': 'Kannada Bhangra'
    }
}

print("🗑️ Dropping old global library data...")
db_manager.global_library.delete_many({})

print("🎵 Starting Global Library Seed...")
print(f"Seeding {len(LANGUAGES)} languages × {len(MOODS)} moods = {len(LANGUAGES) * len(MOODS)} categories")

total_tracks = 0

for language in LANGUAGES:
    for mood in MOODS:
        category = CATEGORY_MAP[language][mood]
        print(f"\n📥 Fetching {mood} tracks in {language} (Category: {category})...")
        
        # Fetch 20 tracks for this combination
        try:
            tracks = recommender.get_recommendations(mood, languages=[language], limit=20)
            
            if not isinstance(tracks, list):
                print(f"⚠️  Unexpected response format for {language}-{mood}")
                continue
            
            count = 0
            for track in tracks:
                # Extract required fields
                track_name = track.get('track_name', 'Unknown')
                artist_name = track.get('artist_name', 'Unknown')
                preview_url = track.get('preview_url', '')
                cover_url = track.get('cover_url', '')
                
                if track_name and artist_name and preview_url:
                    db_manager.seed_library(
                        track_name=track_name,
                        artist_name=artist_name,
                        preview_url=preview_url,
                        mood=mood,
                        language=language,
                        category=category,
                        cover_url=cover_url
                    )
                    count += 1
            
            print(f"✅ Seeded {count} tracks for {category}")
            total_tracks += count
        
        except Exception as e:
            print(f"❌ Error seeding {language}-{mood}: {e}")

print(f"\n🎉 Global Library Seeding Complete!")
print(f"Total tracks added: {total_tracks}")
