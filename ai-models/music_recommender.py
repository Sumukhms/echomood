import random
import requests

def fetch_jiosaavn_category(query, limit=10):
    tracks = []
    import time
    for attempt in range(3):
        try:
            search_url = f"https://www.jiosaavn.com/api.php?__call=search.getResults&q={requests.utils.quote(query)}&n={limit}&p=1&_format=json&_marker=0&ctx=web6dot0"
            search_res = requests.get(search_url, timeout=5)
            search_res.raise_for_status()
            search_data = search_res.json()
            
            results = search_data.get("results", [])
            if not results:
                return []
                
            pids = ",".join([item["id"] for item in results if "id" in item])
            details_url = f"https://www.jiosaavn.com/api.php?__call=song.getDetails&pids={pids}&_format=json&_marker=0&ctx=web6dot0"
            details_res = requests.get(details_url, timeout=5)
            details_res.raise_for_status()
            details_data = details_res.json()
            
            for song in details_data.get("songs", []):
                title = song.get("title", "").replace("&quot;", '"')
                artist = song.get("more_info", {}).get("singers", song.get("subtitle", "Unknown")).replace("&quot;", '"')
                vlink = song.get("vlink")
                image = song.get("image", "").replace("150x150", "500x500").replace("50x50", "500x500")
                
                if vlink and title:
                    tracks.append({
                        "track_name": title,
                        "artist_name": artist,
                        "preview_url": vlink,
                        "file_url": vlink,
                        "cover_url": image,
                        "is_external": False,
                        "source": "JioSaavn"
                    })
            break # Success, exit retry loop
        except Exception as e:
            print(f"Attempt {attempt+1} - Error fetching {query} from JioSaavn: {e}")
            time.sleep(1)
    return tracks

class RegionalMusicRecommender:
    def __init__(self):
        print("Initializing Global Music API (iTunes)...")
        self.regional_queries = {
            'happy': ['upbeat pop vocal', 'feel good pop hits', 'happy acoustic singer', 'sunshine pop hits'],
            'sad': ['sad emotional vocal', 'heartbreak pop', 'soulful singer', 'melancholy acoustic vocal', 'sad indie pop'],
            'angry': ['heavy rap hits', 'aggressive rock vocal', 'hard rock anthems', 'metal vocal hits'],
            'energetic': ['high energy pop', 'workout pop hits', 'fast party vocal', 'upbeat rock anthems'],
            'calm': ['relaxing acoustic vocal', 'peaceful singer songwriter', 'soft pop vocal', 'calm r&b hits'],
            'romantic': ['romantic love vocal', 'beautiful love pop', 'sweet r&b love', 'soft pop love ballad'],
            'nostalgic': ['classic hit pop', 'old golden pop hits', 'retro throwback vocal', '80s pop vocal', '90s hit vocal'],
            'focused': ['focus pop hits', 'study pop vocal', 'classical crossover vocal', 'soft indie vocal'],
            'party': ['club dance vocal', 'party anthems vocal', 'dj remix hits', 'pop dance hits'],
            'sleepy': ['soft acoustic vocal', 'relaxing pop vocal', 'smooth r&b ballad', 'soft piano vocal']
        }
        print("Global API Online.")

    def get_recommendations(self, mood: str, languages=['Hindi'], limit=6, skipped_tracks=None):
        if mood == 'blocked':
            return []

        if mood not in self.regional_queries:
            mood = 'calm'
            
        hindi_queries = {
            'happy': ['bollywood dance hits', 'hindi upbeat party', 'bollywood feel good', 'hindi pop hits'],
            'sad': ['bollywood sad song', 'hindi emotional', 'arijit singh sad', 'hindi heartbreak'],
            'angry': ['bollywood aggressive rock', 'hindi rap heavy', 'bollywood action music'],
            'energetic': ['bollywood workout', 'hindi party anthems', 'bhangra dance hits', 'punjabi upbeat'],
            'calm': ['hindi relaxing acoustic', 'bollywood soothing melody', 'hindi lofi', 'bollywood calm acoustic'],
            'romantic': ['bollywood romantic hits', 'hindi love songs', 'arijit singh romantic', 'hindi soft love'],
            'nostalgic': ['bollywood classic hits', 'hindi 90s hits', 'retro bollywood', 'kishore kumar hits'],
            'focused': ['hindi study lofi', 'bollywood instrumental', 'indian classical flute'],
            'party': ['bollywood club hits', 'punjabi party dance', 'dj remix hindi', 'bollywood edm'],
            'sleepy': ['hindi lullaby', 'bollywood soft instrumental', 'indian classical sleep']
        }
            
        skipped = skipped_tracks or []
        fetch_limit = 50
        all_tracks = []

        indian_languages = ['hindi', 'kannada', 'tamil', 'telugu', 'malayalam', 'punjabi', 'bengali', 'marathi', 'gujarati', 'urdu']
        country_mapping = {
            'spanish': 'ES', 'french': 'FR', 'japanese': 'JP', 'korean': 'KR',
            'german': 'DE', 'italian': 'IT', 'arabic': 'AE', 'portuguese': 'BR'
        }

        for lang in languages:
            lang_lower = lang.lower()
            
            if lang_lower in indian_languages:
                country_code = 'IN'
                # Use Indian specific queries but insert the actual language
                base_query = random.choice(hindi_queries.get(mood, hindi_queries['calm']))
                if lang_lower == 'hindi':
                    search_query = base_query
                else:
                    search_query = base_query.replace('hindi', lang_lower).replace('bollywood', lang_lower)
            else:
                country_code = country_mapping.get(lang_lower, 'US')
                base_query = random.choice(self.regional_queries[mood])
                search_query = f"{base_query} {lang}"
            
            print(f"Searching APIs for: '{search_query}' in country '{country_code}' (Deep Fetch)...")
            
            itunes_tracks = []
            try:
                url = f"https://itunes.apple.com/search?term={requests.utils.quote(search_query)}&limit={fetch_limit}&media=music&country={country_code}"
                response = requests.get(url, timeout=5)
                data = response.json()
                
                for track in data.get('results', []):
                    track_name = track.get('trackName')
                    artist_name = track.get('artistName', 'Unknown')
                    preview_url = track.get('previewUrl')
                    cover_url = track.get('artworkUrl100', '')
                    
                    if cover_url:
                        cover_url = cover_url.replace('100x100bb', '600x600bb')
                        
                    if preview_url and track_name and preview_url not in skipped:
                        itunes_tracks.append({
                            'track_name': track_name,
                            'artist_name': artist_name,
                            'preview_url': preview_url,
                            'file_url': preview_url,
                            'cover_url': cover_url,
                            'mood': mood,
                            'source': 'iTunes'
                        })
            except Exception as e:
                print(f"Error: {e}")
                
            # Fetch JioSaavn if it's an Indian language
            saavn_tracks = []
            if country_code == 'IN':
                print(f"Fetching from JioSaavn for query: {search_query}")
                raw_saavn = fetch_jiosaavn_category(search_query, limit=20)
                for t in raw_saavn:
                    if t["preview_url"] not in skipped:
                        t["mood"] = mood
                        saavn_tracks.append(t)
                        
            merged = itunes_tracks + saavn_tracks
            random.shuffle(merged)
            
            # Deduplicate by track name and limit images
            seen = set()
            image_counts = {}
            for track in merged:
                tname = track["track_name"].lower()
                timg = track.get("cover_url", "")
                img_count = image_counts.get(timg, 0)
                
                if tname not in seen and img_count < 2:
                    seen.add(tname)
                    if timg:
                        image_counts[timg] = img_count + 1
                    all_tracks.append(track)
                    
        random.shuffle(all_tracks)
        return all_tracks