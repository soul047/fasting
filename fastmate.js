// fastmate.js

// Global Variables and state
let fastingStart = null;
let timerInterval = null;
let waterCount = parseInt(localStorage.getItem("waterCount")) || 0;
let fastingTargetHours = parseInt(localStorage.getItem("fastingTargetHours")) || 16;
let userData = {
    nickname: localStorage.getItem("userNickname") || "게스트",
    totalFastingTime: parseFloat(localStorage.getItem("totalFastingTime")) || 0,
    successRecords: JSON.parse(localStorage.getItem("successRecords")) || []
};
const fastingStages = [
    { hour: 0, message: "아직 준비 단계에요!" },
    { hour: 3, message: "이제 몸이 에너지를 쓰기 시작했어요!" },
    { hour: 6, message: "몸속 나쁜 에너지를 태우는 중!" },
    { hour: 12, message: "와! 자가포식이 시작됐어요! 멋져요!" },
    { hour: 16, message: "정말 대단해요! 지방이 활활 타는 중!" }
];

// Helper functions
function showAlert(message) {
    const modal = document.getElementById('alertModal');
    const messageEl = document.getElementById('alertMessage');
    if (modal && messageEl) {
        messageEl.innerText = message;
        modal.style.display = 'flex';
    }
}

function notify(message) {
    if (Notification.permission === "granted") {
        new Notification("간헐적 단식 앱", { body: message });
    }
}
if (Notification.permission !== "granted") {
    Notification.requestPermission();
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        sidebar.classList.toggle("open");
    }
}

function updateTimer() {
    if (!fastingStart) return;
    let diff = Math.floor((new Date() - new Date(fastingStart)) / 1000);
    
    // Calculate remaining time
    const totalSeconds = fastingTargetHours * 3600;
    const remainingSeconds = Math.max(0, totalSeconds - diff);

    let h = String(Math.floor(remainingSeconds / 3600)).padStart(2, '0');
    let m = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, '0');
    let s = String(remainingSeconds % 60).padStart(2, '0');
    const timerEl = document.getElementById("timer");
    if (timerEl) {
        timerEl.innerText = `${h}:${m}:${s}`;
    }
    
    const currentHours = diff / 3600;
    const stage = fastingStages.slice().reverse().find(s => currentHours >= s.hour);
    const stageMessageEl = document.getElementById("fasting-stage");
    if (stage && stageMessageEl) {
        stageMessageEl.innerText = stage.message;
    }
    
    const canvas = document.getElementById('fastingGauge');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const gaugePercent = Math.min(1, currentHours / fastingTargetHours);
        drawGauge(ctx, gaugePercent);
    }

    if (remainingSeconds <= 0) {
        stopFasting();
    }
}

function drawGauge(ctx, percent) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    ctx.clearRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height;
    const radius = width / 2 - 10;
    const startAngle = Math.PI;
    const endAngle = Math.PI + (Math.PI * percent);
    
    // Background arc (for 100% fill)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, Math.PI * 2, false);
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Foreground arc (for current progress)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#1c8e3e';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Gauge needle
    ctx.save();
    ctx.translate(centerX, centerY);
    const angle = (Math.PI * percent);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -radius + 10);
    ctx.strokeStyle = '#f44336'; // Red color for the needle
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Percentage text
    ctx.fillStyle = '#333';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${(percent * 100).toFixed(0)}%`, centerX, centerY - radius / 2);
}

// Main functionality functions
function startFasting() {
    fastingStart = new Date();
    localStorage.setItem("fastingStart", fastingStart.toISOString());
    const statusEl = document.getElementById("status");
    if (statusEl) statusEl.innerHTML = "현재 상태: <b>단식 중</b>";
    const startButton = document.querySelector(".start");
    const stopButton = document.querySelector(".stop");
    if (startButton) startButton.style.display = "none";
    if (stopButton) stopButton.style.display = "block";
    timerInterval = setInterval(updateTimer, 1000);
    notify("단식을 시작했어요!");
}

function stopFasting() {
    if (!fastingStart) {
        showAlert("단식을 시작하지 않았습니다.");
        return;
    }
    clearInterval(timerInterval);
    const statusEl = document.getElementById("status");
    if (statusEl) statusEl.innerHTML = "현재 상태: <b>식사 시간</b>";
    const startButton = document.querySelector(".start");
    const stopButton = document.querySelector(".stop");
    if (startButton) startButton.style.display = "block";
    if (stopButton) stopButton.style.display = "none";
    
    let fastingEnd = new Date();
    let durationHours = ((fastingEnd - new Date(fastingStart)) / 3600000).toFixed(2);
    
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
    
    localStorage.setItem("totalFastingTime", userData.totalFastingTime.toFixed(2));
    localStorage.setItem("successRecords", JSON.stringify(userData.successRecords));
    localStorage.removeItem("fastingStart");
    fastingStart = null;
}

function addWater() {
    waterCount++;
    localStorage.setItem("waterCount", waterCount);
    const waterCountEl = document.getElementById("waterCount");
    if (waterCountEl) {
        waterCountEl.innerText = waterCount;
    }
    if (waterCount >= 8) {
        notify("💦 와! 오늘 물 목표를 달성했어요! 칭찬 스티커 쾅!");
    }
}

function setFastingModel() {
    const select = document.getElementById("fastingModelSelect");
    fastingTargetHours = parseInt(select.value);
    localStorage.setItem("fastingTargetHours", fastingTargetHours);
    const targetHoursEl = document.getElementById("targetHours");
    if (targetHoursEl) {
        targetHoursEl.innerText = fastingTargetHours;
    }
    notify(`${fastingTargetHours}시간 단식 모델로 설정되었어요!`);
    updateGaugeOnLoad();
}

function setFastingTarget() {
    const input = document.getElementById("fastingTargetInput");
    let inputHours = parseInt(input.value);
    if (inputHours) {
        fastingTargetHours = inputHours;
        localStorage.setItem("fastingTargetHours", fastingTargetHours);
        const targetHoursEl = document.getElementById("targetHours");
        if (targetHoursEl) {
            targetHoursEl.innerText = fastingTargetHours;
        }
        notify(`${fastingTargetHours}시간으로 목표가 직접 설정되었어요!`);
        updateGaugeOnLoad();
    }
}

function toggleTargetInput() {
    const targetInputGroup = document.getElementById('fastingTargetInputGroup');
    if (targetInputGroup) {
        targetInputGroup.classList.toggle('visible');
    }
}

// 초기 로드 시 게이지 업데이트
function updateGaugeOnLoad() {
    const canvas = document.getElementById('fastingGauge');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const savedFastingStart = localStorage.getItem("fastingStart");
        let gaugePercent = 0;
        if (savedFastingStart) {
            let diff = Math.floor((new Date() - new Date(savedFastingStart)) / 1000);
            let currentHours = diff / 3600;
            gaugePercent = Math.min(1, currentHours / fastingTargetHours);
        }
        drawGauge(ctx, gaugePercent);
    }
}

// Initialization on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    const waterCountEl = document.getElementById("waterCount");
    if (waterCountEl) {
        waterCountEl.innerText = waterCount;
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
        if (statusEl) statusEl.innerHTML = "현재 상태: <b>대기 중</b>";
        if (startButtonEl) startButtonEl.style.display = "block";
        if (stopButtonEl) stopButtonEl.style.display = "none";
    }

    updateGaugeOnLoad();
    
    const menuButton = document.getElementById("menu-button");
    if (menuButton) {
        menuButton.addEventListener("click", toggleSidebar);
    }
    
    const directInputButton = document.getElementById('directInputButton');
    if (directInputButton) {
        directInputButton.addEventListener('click', toggleTargetInput);
    }

    // Expose functions to the global scope for HTML onclick attributes
    window.toggleSidebar = toggleSidebar;
    window.startFasting = startFasting;
    window.stopFasting = stopFasting;
    window.addWater = addWater;
    window.setFastingModel = setFastingModel;
    window.setFastingTarget = setFastingTarget;
    window.toggleTargetInput = toggleTargetInput;
});
