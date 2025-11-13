import cv2
from deepface import DeepFace
from collections import deque, Counter
import numpy as np
import time

class FacialEmotionAnalyzer:
    def __init__(self, history_size=20, confidence_threshold=0.5):
        self.emotion_history = deque(maxlen=history_size)
        self.confidence_history = deque(maxlen=history_size)
        self.confidence_threshold = confidence_threshold
        
        # Emotion to mood mapping
        self.emotion_to_mood = {
            'happy': 'happy',
            'neutral': 'calm',
            'sad': 'sad',
            'angry': 'angry',
            'fear': 'calm',
            'surprise': 'energetic',
            'disgust': 'angry'
        }
        
        # Performance tracking
        self.frame_count = 0
        self.fps_start_time = time.time()
        self.current_fps = 0
        
    def map_emotion_to_mood(self, emotion):
        """Convert DeepFace emotion to standardized mood."""
        return self.emotion_to_mood.get(emotion, 'calm')
    
    def get_smoothed_emotion(self):
        """Get most common emotion from history with confidence weighting."""
        if not self.emotion_history:
            return None
        
        # Weight emotions by their confidence scores
        weighted_emotions = []
        for emotion, confidence in zip(self.emotion_history, self.confidence_history):
            # Add emotion multiple times based on confidence
            weight = int(confidence * 10)
            weighted_emotions.extend([emotion] * max(1, weight))
        
        # Get most common
        most_common = Counter(weighted_emotions).most_common(1)
        return most_common[0][0] if most_common else None
    
    def calculate_fps(self):
        """Calculate current FPS."""
        self.frame_count += 1
        if self.frame_count % 30 == 0:
            elapsed = time.time() - self.fps_start_time
            self.current_fps = 30 / elapsed
            self.fps_start_time = time.time()
        return self.current_fps
    
    def draw_emotion_ui(self, frame, emotion, mood, confidence, region, emotion_probs=None):
        """Draw enhanced UI with emotion information."""
        x, y, w, h = region['x'], region['y'], region['w'], region['h']
        
        # Draw face rectangle with color based on mood
        mood_colors = {
            'happy': (0, 255, 0),      # Green
            'sad': (255, 100, 100),     # Blue-ish
            'angry': (0, 0, 255),       # Red
            'calm': (255, 255, 0),      # Cyan
            'energetic': (0, 165, 255)  # Orange
        }
        color = mood_colors.get(mood, (0, 255, 0))
        
        # Draw rectangle
        cv2.rectangle(frame, (x, y), (x + w, y + h), color, 3)
        
        # Create background for text
        overlay = frame.copy()
        cv2.rectangle(overlay, (x, y - 100), (x + w, y), (0, 0, 0), -1)
        frame = cv2.addWeighted(frame, 0.7, overlay, 0.3, 0)
        
        # Draw emotion and mood
        cv2.putText(frame, f"Emotion: {emotion.capitalize()}", 
                    (x, y - 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        cv2.putText(frame, f"Mood: {mood.capitalize()}", 
                    (x, y - 45), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        cv2.putText(frame, f"Confidence: {confidence:.2f}", 
                    (x, y - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Draw emotion probabilities bar
        if emotion_probs:
            bar_y = y + h + 30
            for i, (emo, prob) in enumerate(emotion_probs.items()):
                bar_length = int(prob * 200)
                bar_x = x + i * 25
                cv2.rectangle(frame, (bar_x, bar_y), 
                             (bar_x + 20, bar_y - bar_length), color, -1)
                cv2.putText(frame, emo[:3], (bar_x, bar_y + 15), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1)
        
        return frame
    
    def analyze_frame(self, frame):
        """Analyze a single frame."""
        try:
            # Reduce frame size for faster processing
            small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
            
            analysis = DeepFace.analyze(
                small_frame,
                actions=['emotion'],
                enforce_detection=False,
                detector_backend='opencv',  # Faster than ssd
                silent=True
            )

            if isinstance(analysis, list) and len(analysis) > 0:
                first_face = analysis[0]
                dominant_emotion = first_face['dominant_emotion']
                emotion_probs = first_face['emotion']
                
                # Scale region back to original size
                region = {k: v * 2 for k, v in first_face['region'].items()}
                
                # Get confidence (probability of dominant emotion)
                confidence = emotion_probs[dominant_emotion] / 100.0
                
                # Only add to history if confidence is high enough
                if confidence >= self.confidence_threshold:
                    self.emotion_history.append(dominant_emotion)
                    self.confidence_history.append(confidence)
                
                # Get smoothed emotion
                smoothed_emotion = self.get_smoothed_emotion()
                if smoothed_emotion is None:
                    smoothed_emotion = dominant_emotion
                
                # Map to mood
                mood = self.map_emotion_to_mood(smoothed_emotion)
                
                return {
                    'emotion': smoothed_emotion,
                    'mood': mood,
                    'confidence': confidence,
                    'region': region,
                    'emotion_probs': emotion_probs,
                    'success': True
                }
        
        except Exception as e:
            pass
        
        return {'success': False}

def run_facial_analyzer():
    """Main function to run the facial emotion analyzer."""
    analyzer = FacialEmotionAnalyzer(history_size=20, confidence_threshold=0.4)
    
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        raise IOError("Cannot open webcam")
    
    # Set camera properties for better performance
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    print("\n" + "="*50)
    print("EchoMood - Facial Emotion Recognition")
    print("="*50)
    print("Press 'q' to quit")
    print("Press 's' to save current mood")
    print("="*50 + "\n")
    
    current_mood = "calm"
    frame_skip = 2  # Process every 2nd frame for better performance
    frame_counter = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_counter += 1
        
        # Skip frames for performance
        if frame_counter % frame_skip == 0:
            result = analyzer.analyze_frame(frame)
            
            if result['success']:
                current_mood = result['mood']
                frame = analyzer.draw_emotion_ui(
                    frame, 
                    result['emotion'],
                    result['mood'],
                    result['confidence'],
                    result['region'],
                    result['emotion_probs']
                )
        
        # Draw FPS
        fps = analyzer.calculate_fps()
        cv2.putText(frame, f"FPS: {fps:.1f}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Draw current mood banner
        cv2.putText(frame, f"Current Mood: {current_mood.upper()}", 
                   (10, frame.shape[0] - 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
        
        cv2.imshow('EchoMood - Facial Emotion Recognition', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            print(f"\n💾 Saved mood: {current_mood}")
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_facial_analyzer()