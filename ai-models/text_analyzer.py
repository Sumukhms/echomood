from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

def map_sentiment_to_mood(sentiment_scores):
    """
    Maps VADER sentiment scores to our project's specific mood labels.
    """
    compound_score = sentiment_scores['compound']
    
    # This logic is a starting point. We can refine it later!
    if compound_score >= 0.5:
        # Strong positive sentiment
        return "energetic" 
    elif compound_score > 0.05:
        # Mildly positive sentiment
        return "happy"
    elif compound_score < -0.5:
        # Strong negative sentiment
        return "angry"
    elif compound_score < -0.05:
        # Mildly negative sentiment
        return "sad"
    else:
        # Neutral sentiment
        return "calm"

def analyze_text_mood(text):
    """
    Analyzes a piece of text and returns a standardized mood.
    """
    # 1. Create a SentimentIntensityAnalyzer object.
    analyzer = SentimentIntensityAnalyzer()
    
    # 2. Get the polarity scores
    sentiment_scores = analyzer.polarity_scores(text)
    print(f"Analyzing text: '{text}'")
    print(f"VADER Scores: {sentiment_scores}")
    
    # 3. Map scores to a mood label
    mood = map_sentiment_to_mood(sentiment_scores)
    print(f"Detected Mood: {mood}\n")
    return mood

# --- Example Usage ---
if __name__ == "__main__":
    analyze_text_mood("Today was an absolutely fantastic and wonderful day!")
    analyze_text_mood("I'm feeling pretty good about the project.")
    analyze_text_mood("I'm not sure how I feel about this situation.")
    analyze_text_mood("This is really frustrating and I am so angry.")
    analyze_text_mood("I'm feeling quite down and melancholic today.")