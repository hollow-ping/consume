
let currentScreen = 0;
const screens = document.querySelectorAll('.screen');
const toast = document.getElementById("toast");
let lastLog = null;

// Swipe screen logic
function showScreen(index) {
  screens.forEach((screen, i) => {
    screen.style.display = i === index ? 'block' : 'none';
  });
  currentScreen = index;
}
document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
document.addEventListener('touchend', e => {
  if (!touchStartX) return;
  const diffX = e.changedTouches[0].screenX - touchStartX;
  if (Math.abs(diffX) > 50) {
    if (diffX > 0 && currentScreen > 0) showScreen(currentScreen - 1);
    else if (diffX < 0 && currentScreen < screens.length - 1) showScreen(currentScreen + 1);
  }
  touchStartX = null;
});
showScreen(0);

// Load drinks
fetch("data/drinks.json")
  .then(res => res.json())
  .then(drinks => {
    const container = document.getElementById("drink-buttons");
    drinks.forEach(drink => {
      const btn = document.createElement("div");
      btn.className = "drink-btn";

      const main = document.createElement("div");
      main.className = "drink-btn-content";
      main.innerHTML = drink.drink_name;

      const extra = document.createElement("div");
      extra.className = "drink-btn-extra";
      extra.innerHTML = "...";

      main.onclick = () => {
        btn.style.transform = "scale(0.95)";
        setTimeout(() => btn.style.transform = "scale(1)", 100);
        const now = new Date().toISOString();
        const log = {
          timestamp_logged: now,
          timestamp: now,
          drink_category: drink.drink_category,
          drink_name: drink.drink_name,
          is_custom_name: false,
          units: drink.units
        };
        lastLog = log;
        const history = JSON.parse(localStorage.getItem("drink_log") || "[]");
        history.push(log);
        localStorage.setItem("drink_log", JSON.stringify(history));
        showToast(`✔️ Logged ${drink.drink_name}`);
      };

      extra.onclick = (e) => {
        const menu = document.getElementById("popup-menu");
        menu.style.display = "block";
        menu.style.top = `${e.clientY}px`;
        menu.style.left = `${e.clientX}px`;
      };

      btn.appendChild(main);
      btn.appendChild(extra);
      container.appendChild(btn);
    });
  });

// Toast logic
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  toast.onclick = undoLastLog;
  document.addEventListener("click", dismissToast, { once: true });
}
function dismissToast(e) {
  if (e.target !== toast) toast.classList.remove("show");
}
function undoLastLog() {
  const log = JSON.parse(localStorage.getItem("drink_log") || "[]");
  if (log.length && lastLog) {
    const idx = log.findIndex(l => l.timestamp_logged === lastLog.timestamp_logged);
    if (idx !== -1) {
      log.splice(idx, 1);
      localStorage.setItem("drink_log", JSON.stringify(log));
      toast.textContent = "✔️ Undid";
      setTimeout(() => toast.classList.remove("show"), 2000);
    }
  }
}
