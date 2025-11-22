const video = document.getElementById("video");
const analyzeBtn = document.getElementById("analyze-btn");
const statusText = document.getElementById("status-text");

let stream = null;          // 웹캠 스트림
let mediaRecorder = null;   // 녹화기
let recordedChunks = [];    // 동영상 조각들 저장

// 1) 웹캠 켜기
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    console.log("카메라 시작 성공");
  } catch (err) {
    console.error("카메라 접근 실패:", err);
    statusText.innerText = "카메라에 접근할 수 없어요. 권한을 허용해 주세요.";
  }
}

startCamera();

// 2) 버튼 눌렀을 때 1초 동안 녹화
analyzeBtn.addEventListener("click", () => {
  if (!stream) {
    statusText.innerText = "카메라가 아직 준비되지 않았어요.";
    return;
  }

  analyzeBtn.disabled = true;
  statusText.innerText = "1초 동안 영상을 녹화하는 중...";

  recordedChunks = []; // 이전 녹화 데이터 초기화

  // MediaRecorder 생성
  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  } catch (e) {
    console.error("MediaRecorder 생성 실패:", e);
    statusText.innerText = "이 브라우저에서는 녹화를 지원하지 않을 수 있어요.";
    analyzeBtn.disabled = false;
    return;
  }

  // 조각 데이터 들어올 때마다 배열에 저장
  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  // 녹화 끝났을 때
  mediaRecorder.onstop = () => {
    const videoBlob = new Blob(recordedChunks, { type: "video/webm" });
    console.log("녹화 완료, Blob 크기:", videoBlob.size);

    sendVideoToServer(videoBlob);
  };

  // 녹화 시작
  mediaRecorder.start();
  console.log("녹화 시작");

  // 1초 후에 자동 종료
  setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      console.log("녹화 종료");
    }
  }, 1000);
});

// 3) 동영상 Blob 서버로 보내기
async function sendVideoToServer(videoBlob) {
  const formData = new FormData();
  formData.append("video", videoBlob, "clip.webm"); // 필드 이름: "video"

  statusText.innerText = "서버로 전송 중...";

  try {
    const res = await fetch("http://localhost:5000/analyze-emotion", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.error("서버 오류:", res.status);
      statusText.innerText = "서버에서 오류가 발생했어요 🥲";
      analyzeBtn.disabled = false;
      return;
    }

    const data = await res.json();
    console.log("서버 응답:", data);

    // F-200 기준: 여기까지 오면 "전송 + 응답 수신" 성공
    statusText.innerText = `분석 완료! 주요 감정: ${data.main_emotion || "알 수 없음"}`;
    // F-300에서 data.emotions, data.playlists 등을 이용해 UI 더 꾸밀 예정

  } catch (err) {
    console.error("요청 실패:", err);
    statusText.innerText = "서버 요청에 실패했어요 🥲";
  } finally {
    analyzeBtn.disabled = false;
  }
}
