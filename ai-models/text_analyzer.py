from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from transformers import pipeline
import re

class ImprovedTextAnalyzer:
    def __init__(self):
        self.vader = SentimentIntensityAnalyzer()
        # Load a more sophisticated emotion classifier
        try:
            self.emotion_classifier = pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                top_k=None
            )
            self.use_transformer = True
        except Exception as e:
            print(f"Warning: Could not load transformer model: {e}")
            self.use_transformer = False
    
    def preprocess_text(self, text):
        """Clean and normalize text."""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        # Handle common emoticons
        text = text.replace(':)', 'happy').replace(':(', 'sad')
        text = text.replace(':D', 'very happy').replace(':/','confused')
        return text
    
    def map_emotion_to_mood(self, emotion_scores):
        """
        Maps emotion labels to standardized moods with better granularity.
        """
        # Emotion to mood mapping
        emotion_map = {
            'joy': 'happy',
            'happiness': 'happy',
            'sadness': 'sad',
            'anger': 'angry',
            'fear': 'calm',  # Calm music can help with fear
            'surprise': 'energetic',
            'neutral': 'calm',
            'disgust': 'angry'
        }
        
        if isinstance(emotion_scores, list):
            # Get top emotion
            top_emotion = max(emotion_scores, key=lambda x: x['score'])
            emotion_label = top_emotion['label'].lower()
            return emotion_map.get(emotion_label, 'calm')
        
        return 'calm'
    
    def analyze_with_vader(self, text):
        """Analyze using VADER sentiment."""
        scores = self.vader.polarity_scores(text)
        compound = scores['compound']
        
        # Enhanced mapping logic
        if compound >= 0.7:
            return "energetic"
        elif compound >= 0.3:
            return "happy"
        elif compound <= -0.7:
            return "angry"
        elif compound <= -0.3:
            return "sad"
        else:
            return "calm"
    
    def analyze_text_mood(self, text):
        """
        Main analysis function with hybrid approach.
        """
        text = self.preprocess_text(text)
        
        if len(text.strip()) < 3:
            return "calm"
        
        # Use transformer model if available
        if self.use_transformer:
            try:
                emotions = self.emotion_classifier(text)[0]
                mood_transformer = self.map_emotion_to_mood(emotions)
                print(f"Transformer detected: {mood_transformer}")
                
                # Get VADER for validation
                mood_vader = self.analyze_with_vader(text)
                print(f"VADER detected: {mood_vader}")
                
                # If both agree or transformer is highly confident, use transformer
                top_score = max(emotions, key=lambda x: x['score'])['score']
                if mood_transformer == mood_vader or top_score > 0.7:
                    return mood_transformer
                else:
                    # Average approach for disagreement
                    return mood_vader
                    
            except Exception as e:
                print(f"Transformer analysis failed: {e}")
                return self.analyze_with_vader(text)
        else:
            return self.analyze_with_vader(text)

# Global analyzer instance
analyzer = ImprovedTextAnalyzer()

def analyze_text_mood(text):
    """Wrapper function for compatibility."""
    return analyzer.analyze_text_mood(text)

if __name__ == "__main__":
    test_texts = [
        "Today was an absolutely fantastic and wonderful day!",
        "I'm feeling pretty good about the project.",
        "I'm not sure how I feel about this situation.",
        "This is really frustrating and I am so angry.",
        "I'm feeling quite down and melancholic today.",
        "WOW! This is amazing! I can't believe it! :D",
        "Everything is falling apart and I don't know what to do :("
    ]
    
    for text in test_texts:
        print(f"\nText: '{text}'")
        mood = analyze_text_mood(text)
        print(f"Final Mood: {mood}\n" + "="*60)