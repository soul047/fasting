// app.js
// Firebase Config (YOUR CODE HERE)
const firebaseConfig = {
    apiKey: "AIzaSyCpLWcArbLdVDG6Qd6QoCgMefrXNa2pUs8",
    authDomain: "fasting-b4ccb.firebaseapp.com",
    projectId: "fasting-b4ccb",
    storageBucket: "fasting-b4ccb.firebasestorage.app",
    messagingSenderId: "879518503068",
    appId: "1:879518503068:web:295b1d4e21a40f9cc29d59",
    measurementId: "G-EX5HR2CB35"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();

let fastingStart = null;
let timerInterval = null;
let waterCount = parseInt(localStorage.getItem("waterCount")) || 0;
let fastingTargetHours = parseInt(localStorage.getItem("fastingTargetHours")) || 16;
let fastingTimer = 0;
let currentUser = null; // 로그인한 사용자의 UID를 저장할 변수

// 9세 민후를 위한 재미있는 메시지들
const fastingStages = [
    { hour: 0, message: "아직 준비 단계에요!" },
    { hour: 3, message: "몸이 에너지를 쓰기 시작했어요!" },
    { hour: 6, message: "몸속 나쁜 에너지를 태우는 중!" },
    { hour: 12, message: "와! 자가포식이 시작됐어요! 멋져요!" },
    { hour: 16, message: "정말 대단해요! 지방이 활활 타는 중!" }
];

// --- 로그인/회원가입 관련 함수 ---

// 로그인 상태 감지 및 UI 업데이트
auth.onAuthStateChanged(async (user) => {
    const authLink = document.getElementById('authLink');
    if (user) {
        currentUser = user;
        const userDoc = await db.collection("users").doc(user.uid).get();
        const userData = userDoc.data();
        if (authLink) {
            authLink.innerText = `${userData?.nickname || "마이페이지"}`;
            authLink.href = "mypage.html";
        }
    } else {
        currentUser = null;
        if (authLink) {
            authLink.innerText = "로그인 / 회원가입";
            authLink.href = "login.html"; // 로그인 페이지로 이동
        }
    }
});

// 이메일로 회원가입
async function handleSignup() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const nickname = document.getElementById('signup-nickname').value;
    const passwordCheck = document.getElementById('signup-password-check').value;
    const agree = document.getElementById('policy-agree').checked;

    if (!email || !password || !nickname || !passwordCheck) {
        alert("모든 필드를 입력해주세요.");
        return;
    }
    if (password !== passwordCheck) {
        alert("비밀번호가 일치하지 않습니다.");
        return;
    }
    if (!agree) {
        alert("이용약관 및 개인정보처리방침에 동의해야 합니다.");
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        await db.collection("users").doc(user.uid).set({
            nickname: nickname,
            email: email,
            totalFastingSeconds: 0
        });
        alert("회원가입 성공! 자동으로 로그인됩니다.");
        window.location.href = 'index.html';
    } catch (error) {
        alert("회원가입 실패: " + error.message);
    }
}

// 이메일로 로그인
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        alert("로그인 성공!");
        window.location.href = 'index.html';
    } catch (error) {
        alert("로그인 실패: " + error.message);
    }
}

// 로그아웃
async function handleLogout() {
    try {
        await auth.signOut();
        alert("로그아웃되었습니다.");
        window.location.href = 'index.html';
    } catch (error) {
        alert("로그아웃 실패: " + error.message);
    }
}

// 구글/카카오톡 준비 중 메시지
function showComingSoon() {
    alert("준비 중입니다.");
}

// --- 메인 앱 기능 관련 함수 ---

// 단식 시작
function startFasting() {
    if (!currentUser) {
        alert("로그인 후 이용해주세요.");
        return;
    }
    fastingStart = new Date();
    localStorage.setItem("fastingStart", fastingStart.toISOString());
    document.getElementById("status").innerHTML = "현재 상태: <b>단식 중</b>";
    document.querySelector(".start").style.display = "none";
    document.querySelector(".stop").style.display = "block";
    timerInterval = setInterval(updateTimer, 1000);
    notify("단식을 시작했어요!");
}

// 단식 종료
async function stopFasting() {
    if (!fastingStart) return alert("단식을 시작하지 않았습니다.");
    clearInterval(timerInterval);
    document.getElementById("status").innerHTML = "현재 상태: <b>식사 시간</b>";
    document.querySelector(".start").style.display = "block";
    document.querySelector(".stop").style.display = "none";
    
    let fastingEnd = new Date();
    let durationSeconds = Math.floor((fastingEnd - new Date(fastingStart)) / 1000);
    let durationHours = (durationSeconds / 3600).toFixed(2);
    let todayDate = fastingEnd.toISOString().split('T')[0];

    // Firestore에 단식 기록 저장
    await db.collection("users").doc(currentUser.uid).collection("fastingLogs").doc(todayDate).set({
        date: todayDate,
        hours: parseFloat(durationHours),
        timestamp: new Date()
    }, { merge: true });

    // 총 단식 시간 업데이트
    const userRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userRef.get();
    const currentTotalSeconds = userDoc.data()?.totalFastingSeconds || 0;
    await userRef.update({
        totalFastingSeconds: currentTotalSeconds + durationSeconds
    });

    localStorage.removeItem("fastingStart");

    if (parseFloat(durationHours) >= fastingTargetHours) {
        notify(`🎉 와! 목표였던 ${fastingTargetHours}시간을 넘겼어요! 민후는 정말 대단해! 🎉`);
    } else {
        notify(`단식이 종료되었어요! 총 ${durationHours}시간`);
    }
    
    // loadFastingLogs(); // 기록을 다시 불러와 그래프와 달력 업데이트
    fastingStart = null;
    drawFastingGauge();
}

// 타이머 업데이트
function updateTimer() {
    if (!fastingStart) return;
    let diff = Math.floor((new Date() - new Date(fastingStart)) / 1000);
    fastingTimer = diff;
    let h = String(Math.floor(diff / 3600)).padStart(2, '0');
    let m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    let s = String(diff % 60).padStart(2, '0');
    document.getElementById("timer").innerText = `${h}:${m}:${s}`;
    
    drawFastingGauge();
    
    const currentHours = diff / 3600;
    const stage = fastingStages.slice().reverse().find(s => currentHours >= s.hour);
    if (stage) {
        document.getElementById("fasting-stage").innerText = stage.message;
    }
}

// 반원 게이지 그리기 함수
function drawFastingGauge() {
    const canvas = document.getElementById('fastingGauge');
    if (!canvas) return; // 페이지에 canvas가 없는 경우 함수 종료
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 20;
    const radius = 90;
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 15;
    ctx.stroke();

    const progress = (fastingTimer / (fastingTargetHours * 3600));
    const progressAngle = startAngle + (endAngle - startAngle) * Math.min(progress, 1);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, progressAngle);
    ctx.strokeStyle = '#1c8e3e';
    ctx.lineWidth = 15;
    ctx.stroke();

    if (progress >= 1) {
        ctx.fillStyle = '#1c8e3e';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('목표 달성!', centerX, centerY - radius - 10);
    }
}

// 물 기록
function addWater() {
    if (!currentUser) {
        alert("로그인 후 이용해주세요.");
        return;
    }
    waterCount++;
    localStorage.setItem("waterCount", waterCount);
    document.getElementById("waterCount").innerText = waterCount;
    if (waterCount >= 8) {
        notify("💦 와! 오늘 물 목표를 달성했어요! 칭찬 스티커 쾅!");
    }
}

// 체중 저장
async function saveWeight() {
    if (!currentUser) {
        alert("로그인 후 이용해주세요.");
        return;
    }
    let w = parseFloat(document.getElementById("weight").value);
    if (!w) return;
    let todayDate = new Date().toLocaleDateString();

    let existingRecordIndex = weightLog.findIndex(record => record.date === todayDate);

    if (existingRecordIndex !== -1) {
        weightLog[existingRecordIndex].weight = w;
    } else {
        weightLog.push({ date: todayDate, weight: w });
    }

    localStorage.setItem("weightLog", JSON.stringify(weightLog));
    updateCharts();
    document.getElementById("weight").value = "";
    document.getElementById("weightHistory").innerText = 
        weightLog.map(e => `${e.date}: ${e.weight}kg`).join(", ");
    notify("체중이 저장되었어요!");
}

// 알림
function notify(message) {
    if (Notification.permission === "granted") {
        new Notification("간헐적 단식 앱", { body: message });
    }
}
if (Notification.permission !== "granted") {
    Notification.requestPermission();
}

// 달력 표시
async function updateCalendar() {
    if (!currentUser) return;

    const fastingLogsRef = db.collection("users").doc(currentUser.uid).collection("fastingLogs");
    const snapshot = await fastingLogsRef.get();
    
    const fastingLog = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        fastingLog.push(data);
    });

    let calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    if (calendarEl.hasChildNodes()) {
        calendarEl.innerHTML = '';
    }

    let calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: fastingLog.map(e => ({
            title: `${e.hours}시간 단식`,
            start: e.date,
            color: '#1c8e3e'
        }))
    });
    calendar.render();
}

// 그래프 표시
async function updateCharts() {
    const fastingCtx = document.getElementById('fastingChart').getContext('2d');
    if (fastingCtx) {
        const fastingLogsRef = db.collection("users").doc(currentUser.uid).collection("fastingLogs");
        const snapshot = await fastingLogsRef.get();
        const fastingLog = [];
        snapshot.forEach(doc => { fastingLog.push(doc.data()); });

        new Chart(fastingCtx, {
            type: 'line',
            data: {
                labels: fastingLog.map(e => e.date),
                datasets: [{
                    label: '단식 시간(시간)',
                    data: fastingLog.map(e => e.hours),
                    borderColor: '#4CAF50',
                    fill: false
                }]
            }
        });
    }

    const weightCtx = document.getElementById('weightChart').getContext('2d');
    if (weightCtx) {
        new Chart(weightCtx, {
            type: 'line',
            data: {
                labels: weightLog.map(e => e.date),
                datasets: [{
                    label: '체중(kg)',
                    data: weightLog.map(e => e.weight),
                    borderColor: '#f44336',
                    fill: false
                }]
            }
        });
    }
}

// 기록 불러오기
async function loadUserRecords() {
    if (!currentUser) return;
    
    // 닉네임 로드
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    const userData = userDoc.data();
    if (userData) {
        document.getElementById("userNickname").innerText = userData.nickname;
        
        // 총 단식 시간 로드
        const totalHours = (userData.totalFastingSeconds / 3600).toFixed(1);
        document.getElementById("totalFastingTime").innerText = `${totalHours}시간`;
    }

    // 단식 기록 리스트 로드
    const fastingLogsRef = db.collection("users").doc(currentUser.uid).collection("fastingLogs");
    const q = fastingLogsRef.orderBy("timestamp", "desc");
    const querySnapshot = await q.get();
    
    const fastingSuccessList = document.getElementById("fastingSuccessList");
    if (fastingSuccessList) {
        fastingSuccessList.innerHTML = '';
        
        if (querySnapshot.empty) {
            fastingSuccessList.innerHTML = '<li>아직 기록이 없어요!</li>';
        } else {
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const li = document.createElement("li");
                const successPercent = ((data.hours / fastingTargetHours) * 100).toFixed(0);
                if (data.hours >= fastingTargetHours) {
                    li.innerText = `${data.date}: ${data.hours}시간 (목표 달성!) 🎉`;
                } else {
                    li.innerText = `${data.date}: ${data.hours}시간 (${successPercent}% 달성)`;
                }
                fastingSuccessList.appendChild(li);
            });
        }
    }
}

// 페이지에 따라 필요한 기능 실행
document.addEventListener("DOMContentLoaded", () => {
    // 마이페이지인 경우
    if (window.location.pathname.endsWith('mypage.html')) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                loadUserRecords();
                updateCalendar();
                // 체중 기록 로컬 데이터 로드
                document.getElementById("weightHistory").innerText = 
                    weightLog.map(e => `${e.date}: ${e.weight}kg`).join(", ");
            } else {
                alert("로그인이 필요합니다.");
                window.location.href = 'login.html';
            }
        });
    }
    // 메인페이지인 경우
    else if (window.location.pathname.endsWith('index.html')) {
        document.getElementById("waterCount").innerText = waterCount;
        document.getElementById("targetHours").innerText = fastingTargetHours;
        document.getElementById("fastingModelSelect").value = fastingTargetHours;
        
        const savedFastingStart = localStorage.getItem("fastingStart");
        if (savedFastingStart) {
            fastingStart = savedFastingStart;
            document.getElementById("status").innerHTML = "현재 상태: <b>단식 중</b>";
            document.querySelector(".start").style.display = "none";
            document.querySelector(".stop").style.display = "block";
            timerInterval = setInterval(updateTimer, 1000);
        } else {
            document.querySelector(".start").style.display = "block";
            document.querySelector(".stop").style.display = "none";
            drawFastingGauge();
        }

        // 로그인 상태에 따라 기록 로드
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                // 파이어베이스에서 기록을 가져와 차트 업데이트
                loadFastingLogsAndCharts();
            } else {
                // 로그인하지 않았을 때의 로직 (로컬 데이터 사용)
                updateCharts();
            }
        });
    }
    // 로그인 페이지인 경우
    else if (window.location.pathname.endsWith('login.html')) {
        // 로그인/회원가입 버튼에 이벤트 리스너 추가
        const loginBtn = document.querySelector("#login-form button");
        if (loginBtn) loginBtn.onclick = handleLogin;
        
        const signupBtn = document.querySelector("#signup-form button");
        if (signupBtn) signupBtn.onclick = handleSignup;
    }
});

// 파이어베이스에서 단식 기록과 체중 기록을 불러와서 차트와 달력 업데이트
async function loadFastingLogsAndCharts() {
    if (!currentUser) return;
    
    const fastingLog = [];
    const weightLog = [];
    
    // 단식 기록 로드
    const fastingSnapshot = await db.collection("users").doc(currentUser.uid).collection("fastingLogs").get();
    fastingSnapshot.forEach(doc => {
        fastingLog.push(doc.data());
    });
    
    // 체중 기록 로드 (로컬 데이터)
    const localWeightLog = JSON.parse(localStorage.getItem("weightLog")) || [];
    weightLog.push(...localWeightLog);
    
    updateCalendar(fastingLog);
    updateCharts(fastingLog, weightLog);
}

// 이 함수들은 기존 코드를 기반으로 하지만, 
// 파이어베이스 연동을 위해 인자를 받도록 수정되었습니다.
function updateCalendar(fastingLog) {
    if (!document.getElementById('calendar')) return;
    let calendarEl = document.getElementById('calendar');
    if (calendarEl.hasChildNodes()) {
        calendarEl.innerHTML = '';
    }
    let calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: fastingLog.map(e => ({
            title: `${e.hours}시간 단식`,
            start: e.date,
            color: '#1c8e3e'
        }))
    });
    calendar.render();
}

function updateCharts(fastingLog, weightLog) {
    const fastingCtx = document.getElementById('fastingChart');
    if (fastingCtx) {
        new Chart(fastingCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: fastingLog.map(e => e.date),
                datasets: [{
                    label: '단식 시간(시간)',
                    data: fastingLog.map(e => e.hours),
                    borderColor: '#4CAF50',
                    fill: false
                }]
            }
        });
    }
    
    const weightCtx = document.getElementById('weightChart');
    if (weightCtx) {
        new Chart(weightCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: weightLog.map(e => e.date),
                datasets: [{
                    label: '체중(kg)',
                    data: weightLog.map(e => e.weight),
                    borderColor: '#f44336',
                    fill: false
                }]
            }
        });
    }
}