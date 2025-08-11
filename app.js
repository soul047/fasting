// app.js

let fastingStart = null;
let timerInterval = null;
let waterCount = parseInt(localStorage.getItem("waterCount")) || 0;
let weightLog = JSON.parse(localStorage.getItem("weightLog")) || [];
let fastingLog = JSON.parse(localStorage.getItem("fastingLog")) || [];
let fastingTargetHours = parseInt(localStorage.getItem("fastingTargetHours")) || 16;
let fastingTimer = 0; // 현재 단식 시간을 초 단위로 저장할 변수

// 9세 민후를 위한 재미있는 메시지들
const fastingStages = [
    { hour: 0, message: "아직 준비 단계에요!" },
    { hour: 3, message: "몸이 에너지를 쓰기 시작했어요!" },
    { hour: 6, message: "몸속 나쁜 에너지를 태우는 중!" },
    { hour: 12, message: "와! 자가포식이 시작됐어요! 멋져요!" },
    { hour: 16, message: "정말 대단해요! 지방이 활활 타는 중!" }
];

// 단식 모델 선택 함수
function setFastingModel() {
    let selectedHours = parseInt(document.getElementById("fastingModelSelect").value);
    fastingTargetHours = selectedHours;
    localStorage.setItem("fastingTargetHours", selectedHours);
    document.getElementById("targetHours").innerText = selectedHours;
    notify(`${selectedHours}시간 단식 모델이 선택되었어요!`);
    drawFastingGauge();
}

// 단식 목표 직접 설정 함수
function setFastingTarget() {
    let newTarget = parseInt(document.getElementById("fastingTargetInput").value);
    if (newTarget >= 1 && newTarget <= 72) {
        fastingTargetHours = newTarget;
        localStorage.setItem("fastingTargetHours", newTarget);
        document.getElementById("targetHours").innerText = fastingTargetHours;
        document.getElementById("fastingTargetInput").value = "";
        notify(`단식 목표가 ${fastingTargetHours}시간으로 설정되었어요!`);
        drawFastingGauge();
    } else {
        alert("목표 시간은 1시간에서 72시간 사이로 설정해주세요.");
    }
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
    if (!fastingStart) return alert("단식을 시작하지 않았습니다.");
    clearInterval(timerInterval);
    document.getElementById("status").innerHTML = "현재 상태: <b>식사 시간</b>";
    document.querySelector(".start").style.display = "block";
    document.querySelector(".stop").style.display = "none";
    
    let fastingEnd = new Date();
    let durationHours = ((fastingEnd - new Date(fastingStart)) / 3600000).toFixed(2);
    let todayDate = fastingEnd.toISOString().split('T')[0];

    let existingRecordIndex = fastingLog.findIndex(record => record.date === todayDate);

    if (existingRecordIndex !== -1) {
        fastingLog[existingRecordIndex].hours = parseFloat(durationHours);
    } else {
        fastingLog.push({ date: todayDate, hours: parseFloat(durationHours) });
    }

    localStorage.setItem("fastingLog", JSON.stringify(fastingLog));
    localStorage.removeItem("fastingStart");

    if (parseFloat(durationHours) >= fastingTargetHours) {
        notify(`🎉 와! 목표였던 ${fastingTargetHours}시간을 넘겼어요! 민후는 정말 대단해! 🎉`);
    } else {
        notify(`단식이 종료되었어요! 총 ${durationHours}시간`);
    }
    
    updateCharts();
    updateCalendar();
    fastingStart = null;
    drawFastingGauge();
}

// 타이머 업데이트 (게이지 그리기 로직 추가)
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

// 반원 게이지 그리기 함수 추가
function drawFastingGauge() {
    const canvas = document.getElementById('fastingGauge');
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
function updateCalendar() {
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

// 그래프 표시
function updateCharts() {
    let fastingCtx = document.getElementById('fastingChart').getContext('2d');
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

    let weightCtx = document.getElementById('weightChart').getContext('2d');
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

// 초기 로딩
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("waterCount").innerText = waterCount;
    document.getElementById("weightHistory").innerText = 
        weightLog.map(e => `${e.date}: ${e.weight}kg`).join(", ");
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

    updateCalendar();
    updateCharts();
});