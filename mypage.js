// mypage.js

// Global Variables and state
let userData = {
    nickname: localStorage.getItem("userNickname") || "게스트",
    totalFastingTime: parseFloat(localStorage.getItem("totalFastingTime")) || 0,
    successRecords: JSON.parse(localStorage.getItem("successRecords")) || []
};
let weightLog = JSON.parse(localStorage.getItem("weightLog")) || [];

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

// Main functionality functions
function saveWeight() {
    const weightInput = document.getElementById("weight");
    let w = parseFloat(weightInput.value);
    if (!w) {
        showAlert("체중을 입력해 주세요.");
        return;
    }
    weightLog.push({ date: new Date().toLocaleDateString(), weight: w });
    localStorage.setItem("weightLog", JSON.stringify(weightLog));
    updateCharts();
    weightInput.value = "";
    const weightHistoryEl = document.getElementById("weightHistory");
    if (weightHistoryEl) {
        weightHistoryEl.innerText = weightLog.map(e => `${e.date}: ${e.weight}kg`).join(", ");
    }
    notify("체중이 저장되었어요!");
}

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

function updateCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
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

function updateCharts() {
    const fastingCtx = document.getElementById('fastingChart');
    if (fastingCtx) {
        new Chart(fastingCtx.getContext('2d'), {
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

// Initialization on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    const weightHistoryEl = document.getElementById("weightHistory");
    if (weightHistoryEl) {
        weightHistoryEl.innerText = weightLog.map(e => `${e.date}: ${e.weight}kg`).join(", ");
    }
    
    updateUserRecords();
    updateCalendar();
    updateCharts();
    
    const menuButton = document.getElementById("menu-button");
    if (menuButton) {
        menuButton.addEventListener("click", toggleSidebar);
    }

    // Expose functions to the global scope for HTML onclick attributes
    window.toggleSidebar = toggleSidebar;
    window.saveWeight = saveWeight;
});
