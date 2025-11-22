from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from API.emotion_analyzer import analyze_video_emotion

app = Flask(__name__)   # app이 서버 전체
CORS(app)  # 프론트랑 연결시 필요 (CORS 문제 해결)

UPLOAD_DIR = "tmp"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route("/")
def home():
    return "Flask Running"

# 감정 분석 엔드포인트 (비디오 받을 준비)
@app.route("/analyze-emotion", methods=["POST"])    # 파일 업로드(POST)
def analyze_emotion():
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

    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)
