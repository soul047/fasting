// app.js

let fastingStart = null;
let timerInterval = null;
let waterCount = parseInt(localStorage.getItem("waterCount")) || 0;
let weightLog = JSON.parse(localStorage.getItem("weightLog")) || [];
let fastingLog = JSON.parse(localStorage.getItem("fastingLog")) || [];
let fastingTargetHours = parseInt(localStorage.getItem("fastingTargetHours")) || 16;

// 사용자 데이터 (예시, 실제로는 서버에서 관리해야 함)
let userData = {
    nickname: localStorage.getItem("userNickname") || "게스트",
    totalFastingTime: parseFloat(localStorage.getItem("totalFastingTime")) || 0,
    successRecords: JSON.parse(localStorage.getItem("successRecords")) || []
};

// 9세 민후를 위한 재미있는 메시지들
const fastingStages = [
    { hour: 0, message: "아직 준비 단계에요!" },
    { hour: 3, message: "이제 몸이 에너지를 쓰기 시작했어요!" },
    { hour: 6, message: "몸속 나쁜 에너지를 태우는 중!" },
    { hour: 12, message: "와! 자가포식이 시작됐어요! 멋져요!" },
    { hour: 16, message: "정말 대단해요! 지방이 활활 타는 중!" }
];

// 사이드바 메뉴 토글 기능 (새로 추가)
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("open");
}

// 단식 시작
function startFasting() {
    fastingStart = new Date();
    localStorage.setItem("fastingStart", fastingStart.toISOString());
    document.getElementById("status").innerHTML = "현재 상태: <b>단식 중</b>";
    document.querySelector(".start").style.display = "none";
    document.querySelector(".stop").style.display = "block";
    timerInterval = setInterval(updateTimer, 1000);
    notify("단식을 시작했어요!");
}

// 단식 종료
function stopFasting() {
    if (!fastingStart) {
        console.error("단식을 시작하지 않았습니다.");
        return;
    }
    clearInterval(timerInterval);
    document.getElementById("status").innerHTML = "현재 상태: <b>식사 시간</b>";
    document.querySelector(".start").style.display = "block";
    document.querySelector(".stop").style.display = "none";
    
    let fastingEnd = new Date();
    let durationHours = ((fastingEnd - new Date(fastingStart)) / 3600000).toFixed(2);
    
    // 개인 기록 업데이트
    userData.totalFastingTime += parseFloat(durationHours);
    
    const isSuccess = parseFloat(durationHours) >= fastingTargetHours;
    let successMessage = "실패";
    if (isSuccess) {
        successMessage = "성공";
        notify(`🌟 ${parseFloat(durationHours)}시간 단식 성공! 민후는 정말 대단해요! 🌟`);
    } else {
        const successRate = ((parseFloat(durationHours) / fastingTargetHours) * 100).toFixed(0);
        successMessage = `실패 (목표의 ${successRate}%)`;
        notify(`단식이 종료되었어요! 총 ${durationHours}시간`);
    }
    
    userData.successRecords.push({
        date: fastingEnd.toISOString().split('T')[0],
        duration: parseFloat(durationHours),
        success: isSuccess,
        message: successMessage
    });
    
    // 로컬 스토리지에 데이터 저장
    localStorage.setItem("totalFastingTime", userData.totalFastingTime.toFixed(2));
    localStorage.setItem("successRecords", JSON.stringify(userData.successRecords));
    localStorage.removeItem("fastingStart");

    updateUserRecords();
    updateCharts();
    updateCalendar();
    fastingStart = null;
}

// 타이머 업데이트
function updateTimer() {
    if (!fastingStart) return;
    let diff = Math.floor((new Date() - new Date(fastingStart)) / 1000);
    let h = String(Math.floor(diff / 3600)).padStart(2, '0');
    let m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    let s = String(diff % 60).padStart(2, '0');
    document.getElementById("timer").innerText = `${h}:${m}:${s}`;
    
    const currentHours = diff / 3600;
    const stage = fastingStages.slice().reverse().find(s => currentHours >= s.hour);
    if (stage) {
        document.getElementById("fasting-stage").innerText = stage.message;
    }
    
    // 게이지 업데이트 (HTML5 Canvas 사용)
    const canvas = document.getElementById('fastingGauge');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const gaugePercent = Math.min(1, currentHours / fastingTargetHours);
        drawGauge(ctx, gaugePercent);
    }
}

// 게이지 그리기
function drawGauge(ctx, percent) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    ctx.clearRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height; // 아래쪽을 중심으로
    const radius = width / 2 - 10;
    const startAngle = Math.PI; // 180도
    const endAngle = Math.PI + (Math.PI * percent); // 180도부터 시작
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#4CAF50';
    ctx.stroke();
    
    // 배경
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, Math.PI * 2, false);
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#e0e0e0';
    ctx.stroke();
}

// 물 기록
function addWater() {
    waterCount++;
    localStorage.setItem("waterCount", waterCount);
    document.getElementById("waterCount").innerText = waterCount;
    if (waterCount >= 8) {
        notify("💦 와! 오늘 물 목표를 달성했어요! 칭찬 스티커 쾅!");
    }
}

// 체중 저장
function saveWeight() {
    let w = parseFloat(document.getElementById("weight").value);
    if (!w) return;
    weightLog.push({ date: new Date().toLocaleDateString(), weight: w });
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

// 목표 설정
function setFastingModel() {
    const select = document.getElementById("fastingModelSelect");
    fastingTargetHours = parseInt(select.value);
    localStorage.setItem("fastingTargetHours", fastingTargetHours);
    document.getElementById("targetHours").innerText = fastingTargetHours;
    notify(`${fastingTargetHours}시간 단식 모델로 설정되었어요!`);
}

function setFastingTarget() {
    let inputHours = parseInt(document.getElementById("fastingTargetInput").value);
    if (inputHours) {
        fastingTargetHours = inputHours;
        localStorage.setItem("fastingTargetHours", fastingTargetHours);
        document.getElementById("targetHours").innerText = fastingTargetHours;
        notify(`${fastingTargetHours}시간으로 목표가 직접 설정되었어요!`);
    }
}

// 사용자 기록 UI 업데이트
function updateUserRecords() {
    const userNicknameEl = document.getElementById("userNickname");
    const totalFastingTimeEl = document.getElementById("totalFastingTime");
    const fastingSuccessListEl = document.getElementById("fastingSuccessList");

    if (userNicknameEl) userNicknameEl.innerText = userData.nickname;
    if (totalFastingTimeEl) totalFastingTimeEl.innerText = `${userData.totalFastingTime.toFixed(2)}시간`;
    
    if (fastingSuccessListEl) {
        fastingSuccessListEl.innerHTML = "";
        if (userData.successRecords.length === 0) {
            const li = document.createElement("li");
            li.innerText = "아직 기록이 없어요!";
            fastingSuccessListEl.appendChild(li);
        } else {
            userData.successRecords.forEach(record => {
                const li = document.createElement("li");
                li.innerText = `${record.date}: ${record.duration}시간 단식 (${record.message})`;
                fastingSuccessListEl.appendChild(li);
            });
        }
    }
}

// 달력 표시
function updateCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return; // 요소가 없으면 함수 종료

    let calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: userData.successRecords.map(e => ({
            title: e.success ? '✅ 성공' : '❌ 실패',
            start: e.date,
            color: e.success ? '#1c8e3e' : '#d32f2f'
        }))
    });
    calendar.render();
}

// 그래프 표시
function updateCharts() {
    const fastingCtx = document.getElementById('fastingChart') ? document.getElementById('fastingChart').getContext('2d') : null;
    if (fastingCtx) {
        new Chart(fastingCtx, {
            type: 'line',
            data: {
                labels: userData.successRecords.map(e => e.date),
                datasets: [{
                    label: '단식 시간(시간)',
                    data: userData.successRecords.map(e => e.duration),
                    borderColor: '#4CAF50',
                    fill: false
                }]
            }
        });
    }

    const weightCtx = document.getElementById('weightChart') ? document.getElementById('weightChart').getContext('2d') : null;
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

// 초기 로딩
document.addEventListener("DOMContentLoaded", () => {
    const waterCountEl = document.getElementById("waterCount");
    if (waterCountEl) {
        waterCountEl.innerText = waterCount;
    }
    const weightHistoryEl = document.getElementById("weightHistory");
    if (weightHistoryEl) {
        weightHistoryEl.innerText = weightLog.map(e => `${e.date}: ${e.weight}kg`).join(", ");
    }
    
    const savedFastingStart = localStorage.getItem("fastingStart");
    const statusEl = document.getElementById("status");
    const startButtonEl = document.querySelector(".start");
    const stopButtonEl = document.querySelector(".stop");

    if (savedFastingStart) {
        fastingStart = savedFastingStart;
        if (statusEl) statusEl.innerHTML = "현재 상태: <b>단식 중</b>";
        if (startButtonEl) startButtonEl.style.display = "none";
        if (stopButtonEl) stopButtonEl.style.display = "block";
        timerInterval = setInterval(updateTimer, 1000);
    } else {
        if (startButtonEl) startButtonEl.style.display = "block";
        if (stopButtonEl) stopButtonEl.style.display = "none";
    }

    updateUserRecords();
    updateCalendar();
    updateCharts();
    
    // 햄버거 메뉴 버튼 이벤트 리스너 추가
    const menuButton = document.getElementById("menu-button");
    if (menuButton) {
        menuButton.addEventListener("click", toggleSidebar);
    }
    
});

