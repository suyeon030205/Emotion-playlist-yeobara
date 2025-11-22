from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from API.emotion_analyzer import analyze_video_emotion
from API.mapping_rules import get_recommendation_keyword
from youtube_client import search_youtube_videos

app = Flask(__name__)   # app이 서버 전체
CORS(app)  # 프론트랑 연결시 필요 (CORS 문제 해결)

UPLOAD_DIR = "tmp"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route("/")
def home():
    return "Flask Running"

# 감정 분석 & 유튜브 API 연결
@app.route("/analyze-emotion", methods=["POST"])    # 파일 업로드(POST)
def analyze_and_search():
    video = request.files.get("video")

    if video is None:
        return jsonify({"error": "No video file uploaded"}), 400
    
    video_path = os.path.join(UPLOAD_DIR, video.filename)
    abs_video_path = os.path.abspath(video_path)

    video.save(video_path)

    # DeepFace 분석 함수 호출
    result = analyze_video_emotion(video_path)

    # 파일 못 열었을 때
    error_msg = result.get("error", "")
    if not result.get("success", False) and "Cannot open video file" in error_msg:
        result_path = os.path.abspath(result.get("path", ""))
        # 경로 잘못 갔을 경우
        if abs_video_path != result_path:
            # 절대 경로로 재시도
            retry_result = analyze_video_emotion(abs_video_path)  
            if retry_result.get("success", False):
                result = retry_result
            
    # 비디오 삭제
    if os.path.exists(abs_video_path):
        os.remove(abs_video_path)

    if not result.get("success", False):
        return jsonify(result), 500

    # 감정 분석 결과들
    success = result.get("success")
    average_emotions = result.get("average_emotions")
    dominant_emotion = result.get("dominant_emotion")

    # 감정으로부터 키워드 추출
    keywords = get_recommendation_keyword(dominant_emotion, average_emotions)

    if not isinstance(keywords, str):
        keywords = str(keywords)

    # 추천 영상 검색
    youtube_result = search_youtube_videos(keywords)

    if not youtube_result.get("success", False):
        return jsonify({
            "success": False,
            "error": "Failed to retrieve recommended videos."
        }), 500

    return jsonify({
        "success": success,
        "average_emotions": average_emotions,
        "dominant_emotion": dominant_emotion,
        "youtube_result": youtube_result
    })

if __name__ == "__main__":
    app.run(debug=True)
