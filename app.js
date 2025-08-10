// app.js
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('calendar');
  if (!el) return;

  const calendar = new FullCalendar.Calendar(el, {
    initialView: 'dayGridMonth',
    height: 'auto',
    events: [] // 필요 시
  });
  calendar.render();

  // 기존에 updateCalendar를 쓰고 있다면 이렇게 내부에서 calendar를 사용
  window.updateCalendar = function(newEvents = []) {
    calendar.removeAllEvents();
    calendar.addEventSource(newEvents);
  };
});
