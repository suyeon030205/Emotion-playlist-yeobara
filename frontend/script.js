// ===== 0. 디버깅 로그 =====
console.log("[FRONT] script.js loaded FINAL");

// 전역에서 쓸 변수들
let video;
let analyzeBtn;
let statusText;
let resultArea;
let analyzingScreen;
let analyzingEmoji;
let screen1;
let screen3;
let retryBtn;

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

// ===== 1. 페이지 로드 후 초기화 =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("[FRONT] DOMContentLoaded");

  // DOM 요소들 찾기
  video = document.getElementById("video");
  analyzeBtn = document.getElementById("analyze-btn");
  statusText = document.getElementById("status-text");
  resultArea = document.getElementById("result-area");

  analyzingScreen = document.getElementById("analyzing-screen");
  analyzingEmoji = document.getElementById("analyzing-emoji");

  screen1 = document.getElementById("screen-1");
  screen3 = document.getElementById("screen-3");
  retryBtn = document.getElementById("retry-btn");

  console.log("[FRONT] DOM 요소 상태 점검", {
    video,
    analyzeBtn,
    statusText,
    resultArea,
    analyzingScreen,
    analyzingEmoji,
    screen1,
    screen3,
    retryBtn,
  });

  // 필수 요소 체크(없으면 더 진행하지 않음)
  if (!video || !analyzeBtn || !statusText || !resultArea || !screen1 || !screen3 || !retryBtn) {
    console.error("[FRONT] 필수 DOM 요소를 찾지 못했습니다.");
    return;
  }

  console.log("[FRONT] DOM 요소 연결 완료");

  // 카메라 시작
  startCamera();

  // 버튼 이벤트 연결
  analyzeBtn.addEventListener("click", onAnalyzeClick);
  retryBtn.addEventListener("click", onRetryClick);

  console.log("[FRONT] 이벤트 리스너 등록 완료");
});

// ===== 2. 웹캠 켜기 =====
async function startCamera() {
  console.log("[FRONT] startCamera 호출");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error("[FRONT] getUserMedia를 지원하지 않는 브라우저입니다.");
    statusText.innerText = "이 브라우저에서는 카메라를 사용할 수 없어요.";
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    console.log("[FRONT] 카메라 준비 완료");
  } catch (err) {
    console.error("[FRONT] 카메라 접근 실패:", err);
    statusText.innerText = "카메라에 접근할 수 없어요.";
  }
}

// ===== 3. 분석 버튼 클릭 시 1초 녹화 =====
function onAnalyzeClick(e) {
  console.log("[FRONT] 분석 버튼 클릭");

  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
  }

  if (!stream) {
    statusText.innerText = "카메라가 아직 준비되지 않았어요.";
    return;
  }

  analyzeBtn.disabled = true;
  statusText.innerText = "1초 동안 영상을 녹화하는 중...";
  recordedChunks = [];

  let options = { mimeType: "video/webm" };
  try {
    mediaRecorder = new MediaRecorder(stream, options);
  } catch (err) {
    console.error("[FRONT] MediaRecorder 생성 실패:", err);
    statusText.innerText = "녹화를 지원하지 않는 브라우저입니다.";
    analyzeBtn.disabled = false;
    return;
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = () => {
    console.log("[FRONT] 녹화 stop, Blob 생성");
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    sendVideoToServer(blob);
  };

  console.log("[FRONT] 녹화 시작");
  mediaRecorder.start();

  setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      console.log("[FRONT] 1초 경과, 녹화 stop");
      mediaRecorder.stop();
    }
  }, 1000);
}

// ===== 4. 서버에 Blob 전송 + 응답 처리 =====
async function sendVideoToServer(videoBlob) {
  console.log("[FRONT] sendVideoToServer 호출");
  const formData = new FormData();
  formData.append("video", videoBlob, "clip.webm");

  statusText.innerText = "서버로 전송 중...";
  showAnalyzing();
  console.log("[FRONT] 서버로 전송 시작");

  try {
    // 백엔드가 http://127.0.0.1:5000 에서 돌고 있다고 가정
    const res = await fetch("http://127.0.0.1:5000/analyze-emotion", {
      method: "POST",
      body: formData,
    });

    console.log("[FRONT] fetch 응답 코드:", res.status);

    if (!res.ok) {
      console.error("[FRONT] 응답 에러 상태:", res.status, res.statusText);
      statusText.innerText = "서버 오류가 발생했어요 🥲";
      hideAnalyzing();
      return;
    }

    // JSON 파싱
    let data;
    try {
      data = await res.json();
    } catch (err) {
      console.error("[FRONT] 응답 JSON 파싱 실패:", err);
      statusText.innerText = "서버 응답을 해석하는 데 실패했어요.";
      hideAnalyzing();
      return;
    }

    console.log("[FRONT] 서버 응답 JSON:", data);

    if (!data || data.success === false) {
      statusText.innerText = (data && data.error) || "분석 실패 🥲";
      hideAnalyzing();
      return;
    }

    // 상태 텍스트 업데이트
    statusText.innerText = `분석 완료! 주요 감정: ${
      emotionKeyToKorean(data.dominant_emotion)
    }`;

    // 결과 카드 렌더링 (여기서 에러 나도 화면 전환은 하도록 보호)
    try {
      renderResultCard(data);
    } catch (err) {
      console.error("[FRONT] renderResultCard 중 에러 발생:", err, data);
    }

    console.log("[FRONT] showResultScreen 호출 직전");
    showResultScreen();
    console.log("[FRONT] showResultScreen 호출 완료");

    hideAnalyzing();
  } catch (err) {
    console.error("[FRONT] 요청 실패:", err);
    statusText.innerText = "서버 요청에 실패했어요 🥲";
    hideAnalyzing();
  } finally {
    analyzeBtn.disabled = false;
  }
}

// ===== 5. 분석 중 오버레이 =====
function showAnalyzing() {
  console.log("[FRONT] showAnalyzing");
  if (!analyzingScreen) return;
  analyzingScreen.classList.remove("hidden");
  startEmojiAnimation();
}

function hideAnalyzing() {
  console.log("[FRONT] hideAnalyzing");
  if (!analyzingScreen) return;
  analyzingScreen.classList.add("hidden");
  stopEmojiAnimation();
}

function startEmojiAnimation() {
  const emojis = ["😶‍🌫️", "😊", "😢", "😡", "🤔", "🤩", "🥹", "😮"];
  let i = 0;

  if (emojiIntervalId) clearInterval(emojiIntervalId);
  emojiIntervalId = setInterval(() => {
    if (analyzingEmoji) {
      analyzingEmoji.textContent = emojis[i % emojis.length];
    }
    i++;
  }, 400);
}

function stopEmojiAnimation() {
  if (emojiIntervalId) {
    clearInterval(emojiIntervalId);
    emojiIntervalId = null;
  }
}

// ===== 6. 감정 키 → 한글 매핑 =====
function emotionKeyToKorean(key) {
  const map = {
    happy: "행복",
    happiness: "행복",

    sad: "슬픔",
    sadness: "슬픔",

    angry: "분노",
    anger: "분노",

    surprise: "놀람",
    surprised: "놀람",

    fear: "두려움",
    fearful: "두려움",

    disgust: "혐오",
    disgusted: "혐오",

    neutral: "중립",
  };
  return map[key] || (key ?? "알 수 없음");
}

// ===== 7. 결과 카드 렌더링 =====
function renderResultCard(data) {
  console.log("[FRONT] renderResultCard 호출됨", data);

  if (!resultArea) {
    console.error("[FRONT] resultArea가 없습니다. id='result-area' 확인 필요");
    return;
  }

  const emotions = data.average_emotions || {};
  const emotionEntries = Object.entries(emotions);
  const total = emotionEntries.reduce((sum, [, v]) => {
    const num = typeof v === "number" ? v : parseFloat(v) || 0;
    return sum + num;
  }, 0);

  const bars = emotionEntries
    .map(([k, v]) => {
      const num = typeof v === "number" ? v : parseFloat(v) || 0;
      const percent = total > 0 ? Math.round((num / total) * 100) : 0;
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

  // 유튜브 추천 처리
  let videos = [];
  if (data.youtube_result) {
    if (Array.isArray(data.youtube_result.videos)) {
      videos = data.youtube_result.videos;
    } else if (Array.isArray(data.youtube_result.items)) {
      videos = data.youtube_result.items;
    }
  }

  const yt = videos
    .slice(0, 3)
    .map((v) => {
      const title = v.title || v.snippet?.title || "제목 없음";
      const url = v.url || (v.videoId ? `https://www.youtube.com/watch?v=${v.videoId}` : "#");
      const thumb =
        v.thumbnail ||
        v.thumbnails?.high?.url ||
        v.thumbnails?.default?.url ||
        "";

      return `
      <a class="playlist-card" href="${url}" target="_blank">
        <div class="playlist-thumb">
          <img src="${thumb}" alt="${title}">
        </div>
        <div class="playlist-info">
          <h3>${title}</h3>
          <p>유튜브에서 보기 ▶</p>
        </div>
      </a>
    `;
    })
    .join("");

  resultArea.innerHTML = `
    <div class="emotion-result">
      <div class="emotion-result-header">
        <h3 class="emotion-main-title">오늘의 감정 리포트</h3>
        <p class="emotion-main-sub">주요 감정: <strong>${
          emotionKeyToKorean(data.dominant_emotion)
        }</strong></p>
      </div>

      <div class="emotion-bars">
        ${bars || "<p style='font-size:12px;color:#6b7280;'>감정 데이터를 불러올 수 없었어요.</p>"}
      </div>

      <div class="playlist-section">
        <h4 class="playlist-title">이 기분에 어울리는 영상 🎧</h4>
        <div class="playlist-list">
          ${
            yt ||
            "<p style='font-size:12px;color:#6b7280;'>추천 영상이 아직 없어요.</p>"
          }
        </div>
      </div>
    </div>
  `;
}

// ===== 8. 화면 전환 & 다시 분석 버튼 =====
function showResultScreen() {
  console.log("[FRONT] showResultScreen 호출", { screen1, screen3 });
  if (!screen1 || !screen3) {
    console.error("[FRONT] screen1 또는 screen3가 없습니다. id 확인 필요");
    return;
  }
  screen1.classList.add("hidden");
  screen3.classList.remove("hidden");
}

function showMainScreen() {
  console.log("[FRONT] showMainScreen 호출", { screen1, screen3 });
  if (!screen1 || !screen3) return;
  screen3.classList.add("hidden");
  screen1.classList.remove("hidden");
}

function onRetryClick(e) {
  console.log("[FRONT] 다시 분석 버튼 클릭");

  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
  }

  if (resultArea) resultArea.innerHTML = "";
  statusText.innerText =
    "아직 분석 전이에요. 버튼을 눌러 시작해 보세요!";
  showMainScreen();
}

// ===== 9. 로그인/회원가입 기능 추가 =====

// 로그인/회원가입 관련 DOM 요소들
let screenLogin;
let screenSignup;
let screenMain;
let loginForm;
let signupForm;
let toSignupLink;
let toLoginLink;

document.addEventListener("DOMContentLoaded", () => {
  console.log("[FRONT] Auth DOMContentLoaded");

  // HTML에 있을 수도/없을 수도 있는 요소들 안전하게 찾기
  screenLogin = document.getElementById("screen-login");
  screenSignup = document.getElementById("screen-signup");
  screenMain = document.getElementById("screen-main");

  loginForm = document.getElementById("login-form");
  signupForm = document.getElementById("signup-form");
  toSignupLink = document.getElementById("to-signup");
  toLoginLink = document.getElementById("to-login");

  // 로그인/회원가입 화면 자체가 없는 경우는 그냥 건너뜀
  if (!screenLogin && !screenSignup && !screenMain) {
    console.log("[FRONT] Auth 관련 화면이 없어서 로그인/회원가입 스킵");
    return;
  }

  // --- 화면 전환 함수들 (이름 충돌 방지: showMainScreen과 분리) ---
  function showLoginScreen() {
    if (screenLogin) screenLogin.classList.remove("hidden");
    if (screenSignup) screenSignup.classList.add("hidden");
    if (screenMain) screenMain.classList.add("hidden");
  }

  function showSignupScreen() {
    if (screenLogin) screenLogin.classList.add("hidden");
    if (screenSignup) screenSignup.classList.remove("hidden");
    if (screenMain) screenMain.classList.add("hidden");
  }

  function showAppMainScreen() {
    if (screenLogin) screenLogin.classList.add("hidden");
    if (screenSignup) screenSignup.classList.add("hidden");
    if (screenMain) screenMain.classList.remove("hidden");

    // 메인 화면 들어올 때, 카메라가 아직 안 켜져 있으면 켜기
    if (!stream) {
      startCamera();
    }
  }

  // "회원가입 하기" 링크
  if (toSignupLink) {
    toSignupLink.addEventListener("click", (e) => {
      e.preventDefault();
      showSignupScreen();
    });
  }

  // "로그인으로 돌아가기" 링크
  if (toLoginLink) {
    toLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      showLoginScreen();
    });
  }

  // ✅ 로그인 폼 submit
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const usernameInput = document.getElementById("login-username");
      const passwordInput = document.getElementById("login-password");
      const username = usernameInput ? usernameInput.value : "";
      const password = passwordInput ? passwordInput.value : "";

      try {
        const res = await fetch("http://127.0.0.1:5000/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // Flask-Login 세션 유지용
          credentials: "include",
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          console.log("로그인 성공:", data.message);
          showAppMainScreen();
        } else {
          alert(data.message || "로그인에 실패했습니다.");
        }
      } catch (err) {
        console.error("로그인 요청 오류:", err);
        alert("서버와 통신 중 오류가 발생했습니다.");
      }
    });
  }

  // ✅ 회원가입 폼 submit
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const usernameInput = document.getElementById("signup-username");
      const passwordInput = document.getElementById("signup-password");
      const username = usernameInput ? usernameInput.value : "";
      const password = passwordInput ? passwordInput.value : "";

      try {
        const res = await fetch("http://127.0.0.1:5000/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          alert("회원가입이 완료되었습니다! 로그인해주세요.");
          showLoginScreen();
        } else {
          alert(data.message || "회원가입 실패");
        }
      } catch (err) {
        console.error("회원가입 요청 오류:", err);
        alert("서버와 통신 중 오류가 발생했습니다.");
      }
    });
  }

  // 앱 시작 시 로그인 화면 먼저
  if (screenLogin) {
    showLoginScreen();
  }
});
