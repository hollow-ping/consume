document.addEventListener('DOMContentLoaded', () => {
  const wrapper   = document.getElementById('screens-wrapper');
  const screens   = document.querySelectorAll('.screen');
  const overlay   = document.getElementById('overlay');
  const popup     = document.getElementById('popup-menu');
  const toast     = document.getElementById('toast');
  const indicator = document.querySelector('.screen-indicator');
  let   lastDrink = null;
  let   lastBtn   = null;
  let   lastLog   = null;
  let   touchStartX = null;

  // preserve the original offset-menu HTML
  const popupMenuHTML = popup.innerHTML;

  // — SCREEN SWIPE & DOT NAVIGATION —
  function showScreen(idx) {
    wrapper.style.transform = `translateX(-${idx*100}%)`;
  }
  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  });
  document.addEventListener('touchend', e => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 50) {
      const curr = Math.round(
        parseFloat(wrapper.style.transform.replace(/[^0-9.-]/g,'')) / 100
      ) || 0;
      if (diff > 0 && curr > 0) showScreen(curr - 1);
      else if (diff < 0 && curr < screens.length - 1) showScreen(curr + 1);
    }
    touchStartX = null;
  });
  document.querySelectorAll('.screen-indicator .dot')
    .forEach(dot => dot.addEventListener('click', () => {
      showScreen(parseInt(dot.dataset.index, 10));
    }));
  showScreen(0);

  // — BIND OFFSET MENU ITEMS —
  function bindPopupMenu() {
    popup.querySelectorAll('li').forEach(li => {
      li.onclick = e => {
        e.stopPropagation();
        const txt = li.textContent.trim();
        if (txt === 'Custom Time') {
          openCustomPicker();
        } else {
          // press animation on the list item
          li.style.transform = 'scale(0.85)';
          setTimeout(() => { li.style.transform = 'scale(1)'; }, 200);
          const mins = parseInt(txt, 10) || 0;
          const dt = new Date();
          dt.setMinutes(dt.getMinutes() - mins);
          logDrinkWithTime(lastDrink, lastBtn, dt.toISOString());
          closePopup();
        }
      };
    });
  }

  // — FETCH & RENDER DRINK BUTTONS —
  fetch('data/drinks.json')
    .then(r => { if (!r.ok) throw r; return r.json(); })
    .then(drinks => {
      const container = document.getElementById('drink-buttons');
      container.style.position = 'relative';
      drinks.forEach(d => {
        // row container
        const btn = document.createElement('div');
        btn.className = 'drink-btn';

        // main tappable area (75%)
        const main = document.createElement('div');
        main.className = 'drink-btn-content';
        main.textContent = d.drink_name;
        main.onclick = () => {
          btn.style.transform = 'scale(0.85)';
          setTimeout(() => { btn.style.transform = 'scale(1)'; }, 200);
          logDrinkWithTime(d, btn, new Date().toISOString());
        };

        // extra tappable area (25%) opens offset menu
        const extra = document.createElement('div');
        extra.className = 'drink-btn-extra';
        extra.textContent = '⋯';
        extra.onclick = e => {
          e.stopPropagation();
          lastDrink = d;
          lastBtn   = btn;
          overlay.style.display = 'block';
          popup.innerHTML = popupMenuHTML;
          bindPopupMenu();
          popup.style.display = 'block';
        };

        btn.append(main, extra);
        container.appendChild(btn);
      });
      bindPopupMenu();
    })
    .catch(err => {
      console.error('Failed loading drinks:', err);
      document.getElementById('drink-buttons').innerHTML =
        '<p style="padding:1rem;text-align:center;">Error loading drinks</p>';
    });

  // — OVERLAY & POPUP MANAGEMENT —
  overlay.onclick = closePopup;
  popup.onclick   = e => e.stopPropagation();
  function closePopup() {
    popup.style.display   = 'none';
    overlay.style.display = 'none';
    popup.classList.remove('grid');
    popup.innerHTML = popupMenuHTML;
  }

  // — CUSTOM TIME PICKER (3-column fill) —
  function openCustomPicker() {
    overlay.style.display = 'block';
    popup.classList.add('grid');
    popup.style.display = 'grid';

    // generate hour buttons 0–23, then minutes 00,15,30,45
    const hours = Array.from({length:24}, (_,i) =>
      `<button class="picker-btn" data-hour="${i}">${i}</button>`
    ).join('');
    const minutes = [0,15,30,45].map(m =>
      `<button class="picker-btn" data-minute="${m}">${m.toString().padStart(2,'0')}</button>`
    ).join('');
    popup.innerHTML = hours + minutes;

    let selH = null, selM = null;
    popup.querySelectorAll('.picker-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        if (btn.hasAttribute('data-hour')) {
          selH = +btn.dataset.hour;
          popup.querySelectorAll('[data-hour]').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        }
        if (btn.hasAttribute('data-minute')) {
          selM = +btn.dataset.minute;
          popup.querySelectorAll('[data-minute]').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        }
        if (selH !== null && selM !== null) {
          const dt = new Date();
          dt.setHours(selH, selM, 0, 0);
          // press animation on the minute button
          btn.style.transform = 'scale(0.85)';
          setTimeout(() => { btn.style.transform = 'scale(1)'; }, 200);
          logDrinkWithTime(lastDrink, btn, dt.toISOString());
          closePopup();
        }
      };
    });
  }

  // — LOGGING + TOAST/UNDO —
  function logDrinkWithTime(drink, btn, iso) {
    lastLog = {
      timestamp_logged: new Date().toISOString(),
      timestamp: iso,
      drink_category: drink.drink_category,
      drink_name: drink.drink_name,
      is_custom_name: false,
      units: drink.units
    };
    const hist = JSON.parse(localStorage.getItem('drink_log') || '[]');
    hist.push(lastLog);
    localStorage.setItem('drink_log', JSON.stringify(hist));

    toast.textContent = `✔️ Logged ${drink.drink_name}`;
    toast.classList.add('show');
    toast.onclick = () => {
      const arr = JSON.parse(localStorage.getItem('drink_log') || '[]');
      const idx = arr.findIndex(x => x.timestamp_logged === lastLog.timestamp_logged);
      if (idx > -1) {
        arr.splice(idx,1);
        localStorage.setItem('drink_log', JSON.stringify(arr));
        toast.textContent = '✔️ Undid';
        setTimeout(() => { toast.classList.remove('show'); }, 2000);
      }
    };
  }
});
