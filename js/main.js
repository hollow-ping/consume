
const wrapper = document.getElementById('screens-wrapper');
const screens = document.querySelectorAll('.screen');
let currentScreen = 0;
let touchStartX = null;
const toast = document.getElementById('toast');
let lastLog = null;

// Slide to screen index
function showScreen(index) {
  wrapper.style.transform = `translateX(-${index * 100}%)`;
  currentScreen = index;
}

// Touch events for swipe
document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});
document.addEventListener('touchend', e => {
  if (touchStartX === null) return;
  const diffX = e.changedTouches[0].screenX - touchStartX;
  if (Math.abs(diffX) > 50) {
    if (diffX > 0 && currentScreen > 0) showScreen(currentScreen - 1);
    else if (diffX < 0 && currentScreen < screens.length - 1) showScreen(currentScreen + 1);
  }
  touchStartX = null;
});

// Initial position
showScreen(0);

// Fetch and render drinks
fetch('data/drinks.json')
  .then(res => res.json())
  .then(drinks => {
    const container = document.getElementById('drink-buttons');
    drinks.forEach(drink => {
      const btn = document.createElement('div');
      btn.className = 'drink-btn';

      const main = document.createElement('div');
      main.className = 'drink-btn-content';
      main.textContent = drink.drink_name;
      main.onclick = () => logDrink(drink, btn);

      const extra = document.createElement('div');
      extra.className = 'drink-btn-extra';
      extra.textContent = '⋯';
      extra.onclick = openPopup;

      btn.append(main, extra);
      container.appendChild(btn);
    });
  });

// Log and animate
function logDrink(drink, btn) {
  btn.style.transform = 'scale(0.95)';
  setTimeout(() => btn.style.transform = 'scale(1)', 100);
  const now = new Date().toISOString();
  const entry = { timestamp_logged: now, timestamp: now,
    drink_category: drink.drink_category, drink_name: drink.drink_name,
    is_custom_name: false, units: drink.units };
  lastLog = entry;
  const history = JSON.parse(localStorage.getItem('drink_log') || '[]');
  history.push(entry);
  localStorage.setItem('drink_log', JSON.stringify(history));
  showToast(`✔️ Logged ${drink.drink_name}`);
}

// Popup menu
const popup = document.getElementById('popup-menu');
function openPopup(e) {
  e.stopPropagation();
  popup.style.display = 'block';
}
document.addEventListener('click', () => popup.style.display = 'none');

// Toast with undo
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  toast.onclick = undoLast;
}
function hideToast() {
  toast.classList.remove('show');
}
function undoLast() {
  const history = JSON.parse(localStorage.getItem('drink_log') || '[]');
  if (lastLog) {
    const idx = history.findIndex(o => o.timestamp_logged === lastLog.timestamp_logged);
    if (idx > -1) {
      history.splice(idx, 1);
      localStorage.setItem('drink_log', JSON.stringify(history));
      showToast('✔️ Undid');
      setTimeout(hideToast, 2000);
    }
  }
}
