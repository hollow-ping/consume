document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.getElementById('screens-wrapper');
  const screens = document.querySelectorAll('.screen');
  const overlay = document.getElementById('overlay');
  const popup   = document.getElementById('popup-menu');
  const toast   = document.getElementById('toast');
  let lastLog, lastDrink, lastBtn, touchStartX;
  const popupMenuHTML = popup.innerHTML;

  // SWIPE & DOT NAVIGATION
  function showScreen(idx) {
    wrapper.style.transform = `translateX(-${idx * 100}%)`;
  }
  document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; });
  document.addEventListener('touchend', e => {
    if (touchStartX == null) return;
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 50) {
      const curr = Math.round(parseFloat(wrapper.style.transform.replace(/[^0-9.-]/g,''))/100) || 0;
      if (diff > 0 && curr > 0) showScreen(curr - 1);
      else if (diff < 0 && curr < screens.length - 1) showScreen(curr + 1);
    }
    touchStartX = null;
  });
  document.querySelectorAll('.screen-indicator .dot')
    .forEach(d => d.addEventListener('click', () => showScreen(parseInt(d.dataset.index,10))));
  showScreen(0);

  // BIND MENU HANDLERS
  function bindPopupMenu() {
    popup.querySelectorAll('li').forEach(li => {
      li.onclick = e => {
        e.stopPropagation();
        const txt = li.textContent.trim();
        if (txt === 'Custom Time') return openCustomPicker();
        const mins = parseInt(txt,10) || 0;
        const dt = new Date();
        dt.setMinutes(dt.getMinutes() - mins);
        // animate this li
        li.style.transform = 'scale(0.85)';
        setTimeout(() => li.style.transform = 'scale(1)', 200);
        logDrinkWithTime(lastDrink, li, dt.toISOString());
        closePopup();
      };
    });
  }

  // FETCH & RENDER DRINK BUTTONS
  fetch('data/drinks.json')
    .then(r => { if (!r.ok) throw r; return r.json(); })
    .then(drinks => {
      const container = document.getElementById('drink-buttons');
      container.style.position = 'relative';
      drinks.forEach(d => {
        const btn = document.createElement('div');
        btn.className = 'drink-btn';

        // log only on main area
        const main = document.createElement('div');
        main.className = 'drink-btn-content';
        main.textContent = d.drink_name;
        main.onclick = () => logDrink(d, btn);

        // entire extra area is clickable for menu
        const extra = document.createElement('div');
        extra.className = 'drink-btn-extra';
        extra.onclick = e => {
          e.stopPropagation();
          lastDrink = d; lastBtn = btn;
          popup.innerHTML = popupMenuHTML;
          bindPopupMenu();
          overlay.style.display = 'block';
          popup.style.display   = 'block';
        };
        extra.textContent = '⋯';

        btn.append(main, extra);
        container.appendChild(btn);
      });
      bindPopupMenu();
    })
    .catch(err => {
      console.error('Failed loading drinks:', err);
      document.getElementById('drink-buttons').innerHTML =
        '<p style="padding:1rem; text-align:center;">Error loading drinks</p>';
    });

  // OVERLAY & POPUP
  overlay.onclick = closePopup;
  popup.onclick   = e => e.stopPropagation();
  function closePopup() {
    popup.style.display   = 'none';
    overlay.style.display = 'none';
  }

  // CUSTOM TIME PICKER
  function openCustomPicker() {
    popup.innerHTML = `
      <div class="custom-time-grid">
        <div class="picker-col">${[...Array(12)].map((_,i)=>
          `<button class="picker-btn" data-hour="${i}">${i}</button>`).join('')}</div>
        <div class="picker-col">${[...Array(12)].map((_,i)=>
          `<button class="picker-btn" data-hour="${i+12}">${i+12}</button>`).join('')}</div>
        <div class="picker-col">${[0,15,30,45].map(m=>
          `<button class="picker-btn" data-minute="${m}">${m.toString().padStart(2,'0')}</button>`).join('')}</div>
      </div>`;
    popup.style.display = 'block';

    let h = null, m = null;
    popup.querySelectorAll('.picker-btn').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        if (b.dataset.hour != null) {
          h = +b.dataset.hour;
          popup.querySelectorAll('[data-hour]').forEach(x=>x.classList.remove('selected'));
          b.classList.add('selected');
        }
        if (b.dataset.minute != null) {
          m = +b.dataset.minute;
          popup.querySelectorAll('[data-minute]').forEach(x=>x.classList.remove('selected'));
          b.classList.add('selected');
        }
        if (h != null && m != null) {
          const dt = new Date();
          dt.setHours(h, m, 0, 0);
          // animate the minute button itself
          b.style.transform = 'scale(0.85)';
          setTimeout(()=>b.style.transform='scale(1)',200);
          logDrinkWithTime(lastDrink, b, dt.toISOString());
          closePopup();
        }
      };
    });
  }

  // LOGGING & TOAST/UNDO
  function logDrink(d, btn) { logDrinkWithTime(d, btn, new Date().toISOString()); }
  function logDrinkWithTime(d, btn, iso) {
    const entry = {
      timestamp_logged: new Date().toISOString(),
      timestamp: iso,
      drink_category: d.drink_category,
      drink_name: d.drink_name,
      is_custom_name: false,
      units: d.units
    };
    lastLog = entry;
    const hist = JSON.parse(localStorage.getItem('drink_log')||'[]');
    hist.push(entry);
    localStorage.setItem('drink_log', JSON.stringify(hist));

    toast.textContent = `✔️ Logged ${d.drink_name}`;
    toast.classList.add('show');
    toast.onclick = () => {
      const arr = JSON.parse(localStorage.getItem('drink_log')||'[]');
      const idx = arr.findIndex(x=>x.timestamp_logged===lastLog.timestamp_logged);
      if (idx > -1) {
        arr.splice(idx,1);
        localStorage.setItem('drink_log', JSON.stringify(arr));
        toast.textContent = '✔️ Undid';
        setTimeout(()=>toast.classList.remove('show'),2000);
      }
    };
  }
});
