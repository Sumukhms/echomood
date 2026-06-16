import requests

def test_itunes():
    query = "bollywood hits"
    url = f"https://itunes.apple.com/search?term={requests.utils.quote(query)}&limit=5&media=music"
    response = requests.get(url)
    data = response.json()
    
    for track in data.get("results", []):
        print("Track:", track.get("trackName"))
        print("Artist:", track.get("artistName"))
        print("Preview URL:", track.get("previewUrl"))
        print("-" * 20)

if __name__ == "__main__":
    test_itunes()
