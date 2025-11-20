import cv2
import numpy as np
import json
from deepface import DeepFace

FRAME_SKIP_INTERVAL = 15
MAX_ERROR_FRAMES = 2

TARGET_WIDTH = 640
TARGET_HEIGHT = 360

def analyze_video_emotion(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {
            "success": False,
            "error": "Cannot open video file", "path": video_path
            }
    frame_count = 0

    total_emotions = {'sadness': 0, 'anger': 0, 'surprise': 0, 'disgust': 0, 'fear':0, 'happiness': 0, 'neutral': 0}
    analyzed_frames = 0
    errored_frames = 0
    enforce_detection = True
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if frame_count % FRAME_SKIP_INTERVAL == 0:
                if frame.shape[1] > TARGET_WIDTH:
                    frame = cv2.resize(
                        frame,
                        (TARGET_WIDTH, TARGET_HEIGHT),
                        interpolation= cv2.INTER_AREA
                    )
                try:
                    analysis_result = DeepFace.analyze(
                        frame,
                        actions=['emotion'],
                        enforce_detection=True
                    )
                    emotions = analysis_result[0]['emotion']
                    for emotion, score in emotions.items():
                        total_emotions[emotion] += score
                    
                    analyzed_frames += 1
                except Exception as e:
                    print(f"Analysis error at frame{frame_count}: {e}")
                    if enforce_detection == True:
                        errored_frames += 1
                    if errored_frames > MAX_ERROR_FRAMES:
                        return {
                            "success": False,
                            "error": "Insufficient face data detected for stable analysis."
                            }
                    pass
            frame_count += 1

    finally:
        cap.release()

    if analyzed_frames ==0:
        return {
            "success": False,
            "error": "No face detected in video."
            }
    
    average_emotions = {k: v / analyzed_frames for k, v in total_emotions.items()}

    dominant_emotion = max(average_emotions, key= average_emotions.get)

    return {
        "success" : True,
        "total_frames_analyzed": analyzed_frames,
        "average_emotions": average_emotions,
        "dominant_emotions": dominant_emotion
    }