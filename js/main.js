document.addEventListener('DOMContentLoaded', () => {
  const wrapper   = document.getElementById('screens-wrapper');
  const screens   = document.querySelectorAll('.screen');
  const overlay   = document.getElementById('overlay');
  const popup     = document.getElementById('popup-menu');
  const toast     = document.getElementById('toast');
  const dots      = document.querySelectorAll('.screen-indicator .dot');
  let lastDrink, lastBtn, lastLog, touchStartX;
  const popupMenuHTML = popup.innerHTML;

  // Screen swipe & dot nav
  function showScreen(idx) {
    wrapper.style.transform = `translateX(-${idx*100}%)`;
  }
  document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
  document.addEventListener('touchend',   e => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].screenX - touchStartX;
    const curr = Math.round(parseFloat(wrapper.style.transform.replace(/[^0-9.-]/g,''))/100)||0;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && curr > 0) showScreen(curr-1);
      else if (diff < 0 && curr < screens.length-1) showScreen(curr+1);
    }
    touchStartX = null;
  });
  dots.forEach(d => d.addEventListener('click', () => showScreen(+d.dataset.index)));
  showScreen(0);

  // Bind offset-menu
  function bindOffsetMenu() {
    popup.querySelectorAll('li').forEach(li => {
      li.onclick = e => {
        e.stopPropagation();
        const txt = li.textContent.trim();
        li.classList.add('pressed');
        setTimeout(() => li.classList.remove('pressed'), 200);
        if (txt === 'Custom Time') return openCustomTimeGrid();
        const mins = parseInt(txt, 10) || 0;
        const dt = new Date();
        dt.setMinutes(dt.getMinutes() - mins);
        logDrinkWithTime(lastDrink, lastBtn, dt.toISOString());
        closePopup();
      };
    });
  }

  // Fetch & render drinks
  fetch('data/drinks.json')
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(drinks => {
      const container = document.getElementById('drink-buttons');
      drinks.forEach(d => {
        const btn = document.createElement('div');
        btn.className = 'drink-btn';

        // main area
        const main = document.createElement('div');
        main.className = 'drink-btn-content';
        main.textContent = d.drink_name;
        main.onclick = () => {
          btn.classList.add('pressed');
          setTimeout(() => btn.classList.remove('pressed'), 200);
          logDrinkWithTime(d, btn, new Date().toISOString());
        };

        // extra area
        const extra = document.createElement('div');
        extra.className = 'drink-btn-extra';
        extra.textContent = '⋯';
        extra.onclick = e => {
          e.stopPropagation();
          lastDrink = d; lastBtn = btn;
          overlay.style.display = 'block';
          popup.innerHTML = popupMenuHTML;
          bindOffsetMenu();
          popup.style.display = 'block';
        };

        btn.append(main, extra);
        container.appendChild(btn);
      });
      bindOffsetMenu();
    })
    .catch(err => {
      console.error('Error loading drinks.json', err);
      document.getElementById('drink-buttons').innerHTML =
        '<p style="padding:1rem;text-align:center;">Error loading drinks</p>';
    });

  // Close popup
  overlay.onclick = closePopup;
  popup.onclick   = e => e.stopPropagation();
  function closePopup() {
    popup.style.display   = 'none';
    overlay.style.display = 'none';
    popup.classList.remove('grid3');
    popup.innerHTML = popupMenuHTML;
  }

  // Custom-time grid
  function openCustomTimeGrid() {
    overlay.style.display = 'block';
    popup.classList.add('grid3');
    popup.innerHTML = '';
    popup.style.display = 'grid';

    // Hours 0–11 col1, 12–23 col2
    for (let h = 0; h < 24; h++) {
      const b = document.createElement('button');
      b.className = 'picker-btn';
      b.textContent = h;
      b.dataset.hour = h;
      b.style.gridColumnStart = (h < 12 ? 1 : 2);
      b.style.gridRowStart    = (h % 12) + 1;
      popup.appendChild(b);
    }
    // Minutes 00,15,30,45 col3 span 3 rows each
    [0,15,30,45].forEach((m,i) => {
      const b = document.createElement('button');
      b.className = 'picker-btn';
      b.textContent = String(m).padStart(2,'0');
      b.dataset.minute = m;
      b.style.gridColumnStart = 3;
      b.style.gridRow = `${i*3 + 1} / span 3`;
      popup.appendChild(b);
    });

    let selH = null, selM = null;
    popup.querySelectorAll('.picker-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        if (btn.dataset.hour != null) {
          selH = +btn.dataset.hour;
          popup.querySelectorAll('[data-hour]').forEach(x => x.classList.remove('selected'));
          btn.classList.add('selected');
        }
        if (btn.dataset.minute != null) {
          selM = +btn.dataset.minute;
          popup.querySelectorAll('[data-minute]').forEach(x => x.classList.remove('selected'));
          btn.classList.add('selected');
        }
        if (selH !== null && selM !== null) {
          btn.classList.add('pressed');
          setTimeout(() => {
            btn.classList.remove('pressed');
            const dt = new Date();
            dt.setHours(selH, selM, 0, 0);
            logDrinkWithTime(lastDrink, btn, dt.toISOString());
            closePopup();
          }, 200);
        }
      };
    });
  }

  // Log + toast/undo
  function logDrinkWithTime(d, btn, iso) {
    lastLog = {
      timestamp_logged: new Date().toISOString(),
      timestamp: iso,
      drink_category: d.drink_category,
      drink_name: d.drink_name,
      is_custom_name: false,
      units: d.units
    };
    const arr = JSON.parse(localStorage.getItem('drink_log')||'[]');
    arr.push(lastLog);
    localStorage.setItem('drink_log', JSON.stringify(arr));

    toast.textContent = `✔️ Logged ${d.drink_name}`;
    toast.classList.add('show');
    toast.onclick = () => {
      const hist = JSON.parse(localStorage.getItem('drink_log')||'[]');
      const idx = hist.findIndex(x=>x.timestamp_logged === lastLog.timestamp_logged);
      if (idx > -1) {
        hist.splice(idx,1);
        localStorage.setItem('drink_log', JSON.stringify(hist));
        toast.textContent = '✔️ Undid';
        setTimeout(() => toast.classList.remove('show'), 2000);
      }
    };
  }
});
