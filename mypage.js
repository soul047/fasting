// mypage.js

// Firebase SDK 불러오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, where, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Variables and state
let userData = {
    nickname: "게스트",
    totalFastingTime: 0,
    successRecords: []
};
let weightLog = [];
let db;
let auth;
let userId;
let isAuthReady = false;

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
async function saveWeight() {
    if (!isAuthReady) {
        showAlert("사용자 인증 중입니다. 잠시 후 다시 시도해주세요.");
        return;
    }

    const weightInput = document.getElementById("weight");
    let w = parseFloat(weightInput.value);
    if (!w) {
        showAlert("체중을 입력해 주세요.");
        return;
    }

    try {
        const weightData = {
            date: new Date().toLocaleDateString(),
            weight: w,
            timestamp: new Date()
        };
        await addDoc(collection(db, `/artifacts/${__app_id}/users/${userId}/weights`), weightData);
        weightInput.value = "";
        notify("체중이 저장되었어요!");
    } catch (e) {
        console.error("Error adding document: ", e);
        showAlert("체중 기록 저장에 실패했습니다.");
    }
}

async function updateUserRecords() {
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
        if(window.fastingChartInstance) window.fastingChartInstance.destroy();
        window.fastingChartInstance = new Chart(fastingCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: userData.successRecords.map(e => e.date),
                datasets: [{
                    label: '단식 시간(시간)',
                    data: userData.successRecords.map(e => e.duration),
                    borderColor: '#4CAF50',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    const weightCtx = document.getElementById('weightChart');
    if (weightCtx) {
        if(window.weightChartInstance) window.weightChartInstance.destroy();
        window.weightChartInstance = new Chart(weightCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: weightLog.map(e => e.date),
                datasets: [{
                    label: '체중(kg)',
                    data: weightLog.map(e => e.weight),
                    borderColor: '#f44336',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// Initialization on DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
    // Firebase 초기화
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // onAuthStateChanged 리스너 설정
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                isAuthReady = true;
                console.log("Firebase Auth State Changed. User ID:", userId);

                // 사용자 데이터 실시간 동기화
                onSnapshot(doc(db, `/artifacts/${appId}/users/${userId}/fastingData/summary`), (docSnapshot) => {
                    if (docSnapshot.exists()) {
                        const data = docSnapshot.data();
                        userData.nickname = data.nickname || "게스트";
                        userData.totalFastingTime = data.totalFastingTime || 0;
                    }
                    updateUserRecords();
                });

                // 단식 기록 실시간 동기화
                onSnapshot(collection(db, `/artifacts/${appId}/users/${userId}/fastingRecords`), (snapshot) => {
                    userData.successRecords = snapshot.docs.map(doc => doc.data());
                    updateUserRecords();
                    updateCalendar();
                    updateCharts();
                });

                // 체중 기록 실시간 동기화
                onSnapshot(collection(db, `/artifacts/${appId}/users/${userId}/weights`), (snapshot) => {
                    weightLog = snapshot.docs.map(doc => doc.data());
                    const weightHistoryEl = document.getElementById("weightHistory");
                    if (weightHistoryEl) {
                        weightHistoryEl.innerText = weightLog.map(e => `${e.date}: ${e.weight}kg`).join(", ");
                    }
                    updateCharts();
                });

            } else {
                isAuthReady = false;
                console.log("No user signed in.");
                // 비로그인 사용자 처리
            }
        });

        // 사용자 토큰으로 로그인
        if (typeof __initial_auth_token !== 'undefined') {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }

    } catch (e) {
        console.error("Firebase initialization or auth failed:", e);
        showAlert("앱을 로드하는 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.");
    }
    
    const menuButton = document.getElementById("menu-button");
    if (menuButton) {
        menuButton.addEventListener("click", toggleSidebar);
    }
    
    // Expose functions to the global scope for HTML onclick attributes
    window.toggleSidebar = toggleSidebar;
    window.saveWeight = saveWeight;
});
