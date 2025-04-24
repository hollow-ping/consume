document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.getElementById('screens-wrapper');
  const screens = document.querySelectorAll('.screen');
  let currentScreen = 0;
  let touchStartX = null;

  const overlay = document.getElementById('overlay');
  const popup   = document.getElementById('popup-menu');
  const toast   = document.getElementById('toast');
  let lastLog   = null;
  let lastClickedDrink = null;
  let lastClickedButton = null;

  // SWIPE & DOT NAV
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
  document.querySelectorAll('.screen-indicator .dot')
    .forEach(dot => dot.addEventListener('click', () => {
      showScreen(parseInt(dot.dataset.index,10));
    }));
  showScreen(0);

  // FETCH & RENDER
  fetch('data/drinks.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(drinks => {
      const container = document.getElementById('drink-buttons');
      drinks.forEach(d => {
        const btn = document.createElement('div');
        btn.className = 'drink-btn';
        btn.addEventListener('click', () => logDrink(d, btn));

        const main = document.createElement('div');
        main.className = 'drink-btn-content';
        main.textContent = d.drink_name;

        const extra = document.createElement('div');
        extra.className = 'drink-btn-extra';
        extra.textContent = '⋯';
        extra.addEventListener('click', e => {
          e.stopPropagation();
          lastClickedDrink = d;
          lastClickedButton = btn;
          overlay.style.display = 'block';
          popup.style.display   = 'block';
        });

        btn.append(main, extra);
        container.appendChild(btn);
      });

      // TIME OFFSET HANDLERS
      document.querySelectorAll('#popup-menu li').forEach(li => {
        li.addEventListener('click', e => {
          e.stopPropagation();
          const mins = parseInt(li.textContent, 10) || 0;
          const now = new Date();
          now.setMinutes(now.getMinutes() - mins);
          logDrinkWithTime(lastClickedDrink, lastClickedButton, now.toISOString());
          popup.style.display   = 'none';
          overlay.style.display = 'none';
        });
      });
    })
    .catch(err => {
      console.error('drinks.json load error', err);
      document.getElementById('drink-buttons').innerHTML =
        '<p style="padding:1rem;text-align:center;">Error loading drinks</p>';
    });

  // POPUP DISMISS
  overlay.addEventListener('click', () => {
    popup.style.display   = 'none';
    overlay.style.display = 'none';
  });
  popup.addEventListener('click', e => e.stopPropagation());

  // LOGGING FUNCTIONS
  function logDrink(drink, btn) {
    logDrinkWithTime(drink, btn, new Date().toISOString());
  }
  function logDrinkWithTime(drink, btn, timestamp) {
    btn.style.transform = 'scale(0.85)';
    setTimeout(() => btn.style.transform = 'scale(1)', 200);
    const entry = {
      timestamp_logged: new Date().toISOString(),
      timestamp: timestamp,
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

  // TOAST & UNDO
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
        hist.splice(idx,1);
        localStorage.setItem('drink_log', JSON.stringify(hist));
        showToast('✔️ Undid');
        setTimeout(hideToast, 2000);
      }
    }
  }
});
