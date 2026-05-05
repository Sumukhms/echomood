from ytmusicapi import YTMusic

# Initialize the API
yt = YTMusic()

print("Searching for regional hits...")

# Let's search for something specific, like top Kannada songs
search_results = yt.search("latest Kannada hit songs", filter="songs", limit=3)

for i, track in enumerate(search_results):
    title = track.get('title', 'Unknown Title')
    artists = ", ".join([a['name'] for a in track.get('artists', [])])
    print(f"{i+1}. {title} by {artists}")