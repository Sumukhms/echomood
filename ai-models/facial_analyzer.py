import cv2
from deepface import DeepFace
from collections import deque, Counter

# Create a deque to store the last N emotions
emotion_history = deque(maxlen=15)

# Initialize the webcam
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    raise IOError("Cannot open webcam")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    try:
        # --- THE ONLY CHANGE IS HERE ---
        # Using the 'ssd' backend for a balance of speed and accuracy.
        analysis = DeepFace.analyze(
            frame,
            actions=['emotion'],
            enforce_detection=False,
            detector_backend='ssd' 
        )

        if isinstance(analysis, list) and len(analysis) > 0:
            first_face = analysis[0]
            dominant_emotion = first_face['dominant_emotion']
            region = first_face['region']

            emotion_history.append(dominant_emotion)

            if len(emotion_history) > 0:
                smoothed_emotion = Counter(emotion_history).most_common(1)[0][0]
            else:
                smoothed_emotion = dominant_emotion

            x, y, w, h = region['x'], region['y'], region['w'], region['h']
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

            text = f"Emotion: {smoothed_emotion.capitalize()}"
            cv2.putText(frame, text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

    except Exception as e:
        pass

    cv2.imshow('EchoMood - Facial Emotion Recognition', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()