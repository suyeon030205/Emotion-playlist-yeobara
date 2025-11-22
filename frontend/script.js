const video = document.getElementById("video");
const analyzeBtn = document.getElementById("analyze-btn");
const statusText = document.getElementById("status-text");
const resultArea = document.getElementById("result-area");


const analyzingScreen = document.getElementById("analyzing-screen");
const analyzingEmoji = document.getElementById("analyzing-emoji");

// 화면 섹션
const screenLogin = document.getElementById("screen-login");
const screenSignup = document.getElementById("screen-signup");
const screenMain = document.getElementById("screen-main");

// 로그인/회원가입 폼 & 링크
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const toSignupLink = document.getElementById("to-signup");
const toLoginLink = document.getElementById("to-login");



let stream = null;
let mediaRecorder = null;
let recordedChunks = [];
let emojiIntervalId = null;


function showLoginScreen() {
  screenLogin.classList.remove("hidden");
  screenSignup.classList.add("hidden");
  screenMain.classList.add("hidden");
}

function showSignupScreen() {
  screenLogin.classList.add("hidden");
  screenSignup.classList.remove("hidden");
  screenMain.classList.add("hidden");
}

function showMainScreen() {
  screenLogin.classList.add("hidden");
  screenSignup.classList.add("hidden");
  screenMain.classList.remove("hidden");

  // 메인 들어올 때 카메라 시작 (이미 켜져 있으면 무시)
  if (!stream) {
    startCamera();
  }
}

// "회원가입 하기" 링크
toSignupLink.addEventListener("click", (e) => {
  e.preventDefault();
  showSignupScreen();
});

// "로그인으로 돌아가기" 링크
toLoginLink.addEventListener("click", (e) => {
  e.preventDefault();
  showLoginScreen();
});

// 로그인 폼 submit
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  console.log("로그인 시도:", username, password);
  // TODO: 나중에 로그인 API 붙이기

  showMainScreen();
});


// 회원가입 폼 submit
signupForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = document.getElementById("signup-username").value;
  const password = document.getElementById("signup-password").value;

  console.log("회원가입 시도:", username, password);
  // TODO: 나중에 회원가입 API 붙이면 여기서 fetch

  // 가입 후 로그인 화면으로 돌려보내는 흐름
  showLoginScreen();
});


// 앱 시작 시 로그인 화면 먼저
showLoginScreen();


// -----------------------------------------------------------
// 1) 웹캠 켜기
// -----------------------------------------------------------
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    console.error("카메라 접근 실패:", err);
    statusText.innerText = "카메라에 접근할 수 없어요.";
  }
}



// -----------------------------------------------------------
// 2) 버튼 누르면 1초 녹화
// -----------------------------------------------------------
analyzeBtn.addEventListener("click", () => {
  if (!stream) {
    statusText.innerText = "카메라가 아직 준비되지 않았어요.";
    return;
  }

  analyzeBtn.disabled = true;
  statusText.innerText = "1초 동안 영상을 녹화하는 중...";
  recordedChunks = [];

  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  } catch (e) {
    console.error("MediaRecorder 생성 실패:", e);
    statusText.innerText = "녹화를 지원하지 않는 브라우저입니다.";
    analyzeBtn.disabled = false;
    return;
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    sendVideoToServer(blob);   // ⭐ 여기서 진짜 서버로 전송!!
  };

  mediaRecorder.start();

  setTimeout(() => {
    if (mediaRecorder.state === "recording") mediaRecorder.stop();
  }, 1000);
});

// -----------------------------------------------------------
// 3) 서버에 동영상 Blob 보내고 응답 받기
// -----------------------------------------------------------
async function sendVideoToServer(videoBlob) {
  const formData = new FormData();
  formData.append("video", videoBlob, "clip.webm");

  statusText.innerText = "서버로 전송 중...";
  showAnalyzing();   // ⭐ 오버레이 켜기

  try {
    const res = await fetch("http://localhost:5000/analyze-emotion", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      statusText.innerText = "서버 오류가 발생했어요 🥲";
      return;
    }

    const data = await res.json();
    console.log("서버 응답:", data);

    if (!data.success) {
      statusText.innerText = data.error || "분석 실패 🥲";
      return;
    }

    statusText.innerText = `분석 완료! 주요 감정: ${
      emotionKeyToKorean(data.dominant_emotion)
    }`;

    renderResultCard(data);    // ⭐ 결과 화면 그리기

  } catch (err) {
    console.error("요청 실패:", err);
    statusText.innerText = "서버 요청에 실패했어요 🥲";
  } finally {
    hideAnalyzing();      // ⭐ 오버레이 끄기
    analyzeBtn.disabled = false;
  }
}

// -----------------------------------------------------------
// 4) 분석 중 오버레이
// -----------------------------------------------------------
function showAnalyzing() {
  analyzingScreen.classList.remove("hidden");
  startEmojiAnimation();
}

function hideAnalyzing() {
  analyzingScreen.classList.add("hidden");
  stopEmojiAnimation();
}

function startEmojiAnimation() {
  const emojis = ["😶‍🌫️", "😊", "😢", "😡", "🤔", "🤩", "🥹", "😮"];
  let i = 0;

  if (emojiIntervalId) clearInterval(emojiIntervalId);
  emojiIntervalId = setInterval(() => {
    analyzingEmoji.textContent = emojis[i % emojis.length];
    i++;
  }, 400);
}

function stopEmojiAnimation() {
  clearInterval(emojiIntervalId);
  emojiIntervalId = null;
}

// -----------------------------------------------------------
// 5) 감정 매핑
// -----------------------------------------------------------
function emotionKeyToKorean(key) {
  const map = {
    happy: "행복",
    sad: "슬픔",
    angry: "분노",
    surprise: "놀람",
    fear: "두려움",
    disgust: "혐오",
    neutral: "중립",
  };
  return map[key] || key;
}

// -----------------------------------------------------------
// 6) 결과 카드 렌더링
// -----------------------------------------------------------
function renderResultCard(data) {
  const emotions = data.average_emotions || {};
  const videos = data.youtube_result?.videos || [];

  // 감정 게이지
  const emotionEntries = Object.entries(emotions);
  const total = emotionEntries.reduce((sum, [, v]) => sum + v, 0);

  const bars = emotionEntries
    .map(([k, v]) => {
      const percent = total > 0 ? Math.round((v / total) * 100) : 0;
      return `
        <div class="emotion-row">
          <div class="emotion-label">
            <span class="emotion-name">${emotionKeyToKorean(k)}</span>
            <span class="emotion-percent">${percent}%</span>
          </div>
          <div class="emotion-bar-track">
            <div class="emotion-bar-fill" style="width:${percent}%;"></div>
          </div>
        </div>`;
    })
    .join("");

  // 유튜브 top3
  const yt = videos.slice(0, 3)
    .map(v => `
      <a class="playlist-card" href="${v.url}" target="_blank">
        <div class="playlist-thumb">
          <img src="${v.thumbnail}" alt="${v.title}">
        </div>
        <div class="playlist-info">
          <h3>${v.title}</h3>
          <p>유튜브에서 보기 ▶</p>
        </div>
      </a>
    `)
    .join("");

  resultArea.innerHTML = `
    <div class="emotion-result">
      <div class="emotion-result-header">
        <h3 class="emotion-main-title">오늘의 감정 리포트</h3>
        <p class="emotion-main-sub">주요 감정: <strong>${
          emotionKeyToKorean(data.dominant_emotion)
        }</strong></p>
      </div>

      <div class="emotion-bars">${bars}</div>

      <div class="playlist-section">
        <h4 class="playlist-title">이 기분에 어울리는 영상 🎧</h4>
        <div class="playlist-list">${yt}</div>
      </div>
    </div>
  `;
}
