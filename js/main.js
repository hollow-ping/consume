document.addEventListener('DOMContentLoaded', () => {
  const wrapper   = document.getElementById('screens-wrapper');
  const screens   = document.querySelectorAll('.screen');
  const overlay   = document.getElementById('overlay');
  const popup     = document.getElementById('popup-menu');
  const toast     = document.getElementById('toast');
  let   lastLog   = null;
  let   lastDrink = null;
  let   lastBtn   = null;
  let   touchStartX = null;

  // save original menu for restore
  const popupMenuHTML = popup.innerHTML;

  function showScreen(idx) {
    wrapper.style.transform = `translateX(-${idx * 100}%)`;
  }
  // swipe & dot nav (unchanged)...
  document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; });
  document.addEventListener('touchend',   e => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 50) {
      let cur = parseInt(wrapper.style.transform.replace(/[^0-9]/g,''),10) || 0;
      cur = cur/100;
      if (diff > 0 && cur > 0) showScreen(cur - 1);
      else if (diff < 0 && cur < screens.length - 1) showScreen(cur + 1);
    }
    touchStartX = null;
  });
  document.querySelectorAll('.screen-indicator .dot')
    .forEach(dot => dot.addEventListener('click', () => showScreen(parseInt(dot.dataset.index,10))));
  showScreen(0);

  // fetch & render buttons
  fetch('data/drinks.json')
    .then(r => { if (!r.ok) throw r; return r.json(); })
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
          lastDrink = d;
          lastBtn   = btn;
          overlay.style.display = 'block';
          popup.style.display   = 'block';
        });

        btn.append(main, extra);
        container.appendChild(btn);
      });

      // offset + custom handlers
      popup.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', e => {
          e.stopPropagation();
          const txt = li.textContent.trim();
          if (txt === 'Custom Time') {
            openCustomPicker();
          } else {
            const mins = parseInt(txt,10) || 0;
            const now = new Date();
            now.setMinutes(now.getMinutes() - mins);
            logDrinkWithTime(lastDrink, lastBtn, now.toISOString());
            closePopup();
          }
        });
      });
    });

  // close popup
  overlay.addEventListener('click', closePopup);
  popup.addEventListener('click', e => e.stopPropagation());

  function closePopup() {
    popup.innerHTML = popupMenuHTML;
    popup.style.display   = 'none';
    overlay.style.display = 'none';
  }

    // inside your DOMContentLoaded…
  // (remove the old openCustomPicker & its Set-button code entirely)
  function openCustomPicker() {
    // build 3 columns: hours 0–11, hours 12–23, minutes
    popup.innerHTML = `
      <div class="custom-time-grid">
        <div class="picker-col" id="hour-col1">
          ${[...Array(12)].map((_,i)=>
            `<button class="picker-btn" data-hour="${i}">${i}</button>`
          ).join('')}
        </div>
        <div class="picker-col" id="hour-col2">
          ${[...Array(12)].map((_,i)=>
            `<button class="picker-btn" data-hour="${i+12}">${i+12}</button>`
          ).join('')}
        </div>
        <div class="picker-col" id="minute-col">
          ${[0,15,30,45].map(m=>
            `<button class="picker-btn" data-minute="${m}">${m.toString().padStart(2,'0')}</button>`
          ).join('')}
        </div>
      </div>`;
    popup.style.display = 'block';

    let selectedHour = null;
    let selectedMinute = null;

    popup.querySelectorAll('.picker-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        // hour buttons
        if (btn.dataset.hour !== undefined) {
          selectedHour = parseInt(btn.dataset.hour, 10);
          popup.querySelectorAll('[data-hour]').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        }
        // minute buttons
        if (btn.dataset.minute !== undefined) {
          selectedMinute = parseInt(btn.dataset.minute, 10);
          popup.querySelectorAll('[data-minute]').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        }
        // once both picked, log & close
        if (selectedHour !== null && selectedMinute !== null) {
          const dt = new Date();
          dt.setHours(selectedHour, selectedMinute, 0, 0);
          logDrinkWithTime(lastDrink, lastBtn, dt.toISOString());
          closePopup();
        }
      });
    });
  }

  // logging
  function logDrink(d, btn) {
    logDrinkWithTime(d, btn, new Date().toISOString());
  }
  function logDrinkWithTime(d, btn, iso) {
    btn.style.transform = 'scale(0.85)';
    setTimeout(()=>btn.style.transform='scale(1)',200);
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
    showToast(`✔️ Logged ${d.drink_name}`);
  }

  // toast & undo
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    toast.onclick = () => {
      const hist = JSON.parse(localStorage.getItem('drink_log')||'[]');
      const idx = hist.findIndex(x=>x.timestamp_logged===lastLog.timestamp_logged);
      if(idx>-1){
        hist.splice(idx,1);
        localStorage.setItem('drink_log', JSON.stringify(hist));
        toast.textContent = '✔️ Undid';
        setTimeout(()=>toast.classList.remove('show'),2000);
      }
    };
  }
});
