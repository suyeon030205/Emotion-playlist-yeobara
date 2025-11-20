from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)   # app이 서버 전체
CORS(app)  # 프론트랑 연결시 필요 (CORS 문제 해결)

@app.route("/")
def home():
    return "Flask 백엔드 서버 실행 중"

# 감정 분석 엔드포인트 (비디오 받을 준비)
@app.route("/analyze-emotion", methods=["POST"])    # 파일 업로드(POST)
def analyze_emotion():
    file = request.files.get("video")

    if file is None:
        return jsonify({"error": "파일이 전송되지 않았습니다."}), 400

    # 아직 분석 코드는 없음 (B-200에서 구현)
    # 여기선 연결 테스트만
    return jsonify({"message": "파일 수신 성공!", "filename": file.filename})

if __name__ == "__main__":
    app.run(debug=True)
