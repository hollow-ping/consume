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

  function openCustomPicker() {
    // build our 3-column picker + Set button
    popup.innerHTML = `
      <div class="custom-time-container">
        <div class="picker-group" id="ampm-group">
          <button class="picker-btn selected" data-value="AM">AM</button>
          <button class="picker-btn" data-value="PM">PM</button>
        </div>
        <div class="picker-group" id="hour-group">
          ${[...Array(12)].map((_,i) => 
             `<button class="picker-btn" data-value="${i+1}">${i+1}</button>`
           ).join('')}
        </div>
        <div class="picker-group" id="minute-group">
          ${[0,15,30,45].map(m =>
             `<button class="picker-btn" data-value="${m}">${m.toString().padStart(2,'0')}</button>`
           ).join('')}
        </div>
        <button id="custom-time-set" class="picker-set-btn">Set</button>
      </div>`;
    popup.style.display   = 'block';

    // group button selection logic
    popup.querySelectorAll('.picker-group').forEach(group => {
      group.addEventListener('click', e => {
        if (e.target.classList.contains('picker-btn')) {
          group.querySelectorAll('.picker-btn').forEach(b => b.classList.remove('selected'));
          e.target.classList.add('selected');
        }
      });
    });

    // Set handler
    document.getElementById('custom-time-set').addEventListener('click', () => {
      // read selections
      const ampm  = popup.querySelector('#ampm-group .selected').dataset.value;
      const hour  = parseInt(popup.querySelector('#hour-group .selected').dataset.value,10);
      const minute= parseInt(popup.querySelector('#minute-group .selected').dataset.value,10);
      let h = hour % 12;
      if (ampm === 'PM') h += 12;
      const dt = new Date();
      dt.setHours(h, minute, 0, 0);
      logDrinkWithTime(lastDrink, lastBtn, dt.toISOString());
      closePopup();
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
