const wrapper = document.getElementById('screens-wrapper');
const screens = document.querySelectorAll('.screen');
let currentScreen = 0;
let touchStartX = null;
const toast = document.getElementById('toast');
const popup = document.getElementById('popup-menu');
let lastLog = null;

// --- SWIPE & DOT NAVIGATION ---
function showScreen(idx) {
  wrapper.style.transform = `translateX(-${idx * 100}%)`;
  currentScreen = idx;
}
document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});
document.addEventListener('touchend', e => {
  if (touchStartX === null) return;
  const diff = e.changedTouches[0].screenX - touchStartX;
  if (Math.abs(diff) > 50) {
    if (diff > 0 && currentScreen > 0) showScreen(currentScreen - 1);
    else if (diff < 0 && currentScreen < screens.length - 1) showScreen(currentScreen + 1);
  }
  touchStartX = null;
});

// Dot clicks
document.querySelectorAll('.screen-indicator .dot').forEach(dot => {
  dot.addEventListener('click', () => {
    const idx = parseInt(dot.dataset.index, 10);
    showScreen(idx);
  });
});

// --- DRINK BUTTONS & LOGIC ---
fetch('data/drinks.json')
  .then(r => r.json())
  .then(drinks => {
    const container = document.getElementById('drink-buttons');
    drinks.forEach(d => {
      const btn = document.createElement('div');
      btn.className = 'drink-btn';

      const main = document.createElement('div');
      main.className = 'drink-btn-content';
      main.textContent = d.drink_name;

      const extra = document.createElement('div');
      extra.className = 'drink-btn-extra';
      extra.textContent = '⋯';

      // Log on full btn click
      btn.addEventListener('click', () => logDrink(d, btn));

      // Popup on extra icon
      extra.addEventListener('click', e => {
        e.stopPropagation();
        popup.style.display = 'block';
      });

      btn.append(main, extra);
      container.appendChild(btn);
    });
  });

function logDrink(drink, btn) {
  btn.style.transform = 'scale(0.85)';
  setTimeout(() => btn.style.transform = 'scale(1)', 200);

  const now = new Date().toISOString();
  const entry = {
    timestamp_logged: now,
    timestamp: now,
    drink_category: drink.drink_category,
    drink_name: drink.drink_name,
    is_custom_name: false,
    units: drink.units
  };
  lastLog = entry;

  const hist = JSON.parse(localStorage.getItem('drink_log') || '[]');
  hist.push(entry);
  localStorage.setItem('drink_log', JSON.stringify(hist));

  showToast(`✔️ Logged ${drink.drink_name}`);
}

// --- POPUP DISMISS ---
document.addEventListener('click', () => {
  popup.style.display = 'none';
});
popup.addEventListener('click', e => e.stopPropagation());

// --- TOAST & UNDO ---
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  toast.onclick = undoLast;
}

function hideToast() {
  toast.classList.remove('show');
}

function undoLast() {
  const hist = JSON.parse(localStorage.getItem('drink_log') || '[]');
  if (lastLog) {
    const idx = hist.findIndex(x => x.timestamp_logged === lastLog.timestamp_logged);
    if (idx > -1) {
      hist.splice(idx, 1);
      localStorage.setItem('drink_log', JSON.stringify(hist));
      showToast('✔️ Undid');
      setTimeout(hideToast, 2000);
    }
  }
}

