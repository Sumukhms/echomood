from ytmusicapi import YTMusic
import random
import html

class RegionalMusicRecommender:
    def __init__(self):
        print("Initializing Regional Music API (YTMusic)...")
        # Initialize the unofficial API (No keys required!)
        self.ytmusic = YTMusic()
        
        # Semantic mapping for regional moods
        # Semantic mapping for 10 regional moods
        self.regional_queries = {
            'happy': ['upbeat happy pop songs', 'dance hits', 'feel good melody'],
            'sad': ['sad emotional songs', 'heartbreak melody', 'soulful sad hits'],
            'angry': ['heavy bass intense', 'aggressive rap', 'angry rock'],
            'energetic': ['high energy dance', 'gym workout hits', 'fast beat party'],
            'calm': ['relaxing lofi', 'peaceful acoustic melody', 'calm soothing songs'],
            
            # --- NEW SEARCH QUERIES ---
            'romantic': ['romantic love songs', 'beautiful love melody', 'sweet couple songs'],
            'nostalgic': ['classic hit songs', 'old golden hits', 'retro throwback hits'],
            'focused': ['deep focus instrumental', 'study lofi beats', 'concentration music'],
            'party': ['club dance hits', 'weekend party mashup', 'dj remix hits'],
            'sleepy': ['sleep meditation music', 'deep sleep lullaby', 'night relaxing music']
        }
        print("Regional API Online.")

    def get_recommendations(self, mood: str, languages=['Hindi'], limit=6):
        """
        Fetches official songs based on mood across MULTIPLE regional languages.
        """
        # Handle the safety block
        if mood == 'blocked':
            return []

        if mood not in self.regional_queries:
            mood = 'calm'
            
        # Divide the total limit by the number of languages (e.g., 6 tracks / 3 languages = 2 tracks each)
        per_language_limit = max(1, limit // len(languages))
        all_tracks = []

        for lang in languages:
            base_query = random.choice(self.regional_queries[mood])
            search_query = f"{base_query} {lang}"
            
            print(f"🔍 Searching API for: '{search_query}'...")
            
            try:
                search_results = self.ytmusic.search(search_query, filter="songs", limit=per_language_limit)
                
                for track in search_results:
                    title = track.get('title', 'Unknown Title')
                    artists = ", ".join([a['name'] for a in track.get('artists', [])])
                    video_id = track.get('videoId')
                    
                    if video_id:
                        all_tracks.append({
                            'track_name': html.unescape(title),
                            'artist_name': html.unescape(artists),
                            'preview_url': f"https://www.youtube.com/embed/{video_id}"
                        })
            except Exception as e:
                print(f"❌ Regional API Error for {lang}: {e}")
                
        random.shuffle(all_tracks)
        return all_tracks