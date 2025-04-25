document.addEventListener('DOMContentLoaded', () => {
  // Make absolutely sure overlay & popup are hidden
  document.getElementById('overlay').style.display = 'none';
  const p = document.getElementById('popup-menu');
  p.style.display = 'none';
  p.classList.remove('grid3');
  p.innerHTML = `
    <ul>
      <li>15 min ago</li>
      <li>30 min ago</li>
      <li>45 min ago</li>
      <li>60 min ago</li>
      <li>Custom Time</li>
    </ul>
  `;
  
  const wrapper = document.getElementById('screens-wrapper');
  const screens = document.querySelectorAll('.screen');
  const overlay = document.getElementById('overlay');
  const popup   = document.getElementById('popup-menu');
  const toast   = document.getElementById('toast');
  const dots    = document.querySelectorAll('.screen-indicator .dot');
  let   lastDrink, lastLog, touchStartX;
  const popupHTML = popup.innerHTML;

  // — Screen swipe & dot nav —
  function showScreen(i) {
    wrapper.style.transform = `translateX(-${i*100}%)`;
  }
  document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
  document.addEventListener('touchend', e => {
    if (touchStartX == null) return;
    const diff = e.changedTouches[0].screenX - touchStartX;
    const curr = Math.round(
      parseFloat(wrapper.style.transform.replace(/[^0-9.-]/g,''))/100
    ) || 0;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && curr > 0) showScreen(curr - 1);
      else if (diff < 0 && curr < screens.length - 1) showScreen(curr + 1);
    }
    touchStartX = null;
  });
  dots.forEach(d => d.addEventListener('click', () => showScreen(+d.dataset.index)));
  showScreen(0);

  // — Bind the offset menu (“15 min ago”, etc.) —
  function bindOffset() {
    popup.querySelectorAll('li').forEach(li => {
      li.onclick = e => {
        e.stopPropagation();
        li.classList.add('pressed');
        setTimeout(() => li.classList.remove('pressed'), 200);
        const txt = li.textContent.trim();
        if (txt === 'Custom Time') return openCustomGrid();
        const mins = parseInt(txt, 10) || 0;
        const dt = new Date();
        dt.setMinutes(dt.getMinutes() - mins);
        logDrink(lastDrink, dt.toISOString());
        closePopup();
      };
    });
  }

  // — Load & render your drinks from drinks.json (same folder) —
  fetch('./drinks.json')
    .then(res => res.ok ? res.json() : Promise.reject(res.status))
    .then(list => {
      const container = document.getElementById('drink-buttons');
      list.forEach(d => {
        const btn = document.createElement('div');
        btn.className = 'drink-btn';

        // main area: taps log now
        const main = document.createElement('div');
        main.className = 'drink-btn-content';
        main.textContent = d.name || d.drink_name;
        main.onclick = () => {
          btn.classList.add('pressed');
          setTimeout(() => btn.classList.remove('pressed'), 200);
          logDrink(d, new Date().toISOString());
        };

        // extra “…” area
        const extra = document.createElement('div');
        extra.className = 'drink-btn-extra';
        extra.textContent = '⋯';
        extra.onclick = e => {
          e.stopPropagation();
          lastDrink = d;
          overlay.style.display = 'block';
          popup.innerHTML = popupHTML;
          bindOffset();
          popup.style.display = 'flex';
        };

        btn.append(main, extra);
        container.appendChild(btn);
      });
      bindOffset();
    })
    .catch(err => {
      console.error('Error loading drinks.json', err);
      document.getElementById('drink-buttons').innerHTML =
        '<p style="padding:1rem; text-align:center;">Error loading drinks</p>';
    });

  // — Close popup overlay —
  overlay.onclick = closePopup;
  popup.onclick   = e => e.stopPropagation();
  function closePopup() {
    popup.style.display   = 'none';
    overlay.style.display = 'none';
    popup.classList.remove('grid3');
    popup.innerHTML = popupHTML;
  }

  // — Custom Time Picker: first tap selects, second tap (hour or minute) submits —
  function openCustomGrid() {
    overlay.style.display = 'block';
    popup.classList.add('grid3');
    popup.innerHTML = '';
    popup.style.display = 'grid';

    let selH = null, selM = null;

    // hours 0–11 in col1, 12–23 in col2
    for (let h = 0; h < 24; h++) {
      const b = document.createElement('button');
      b.className = 'picker-btn';
      b.textContent = h;
      b.dataset.hour = h;
      b.style.gridColumnStart = (h < 12 ? 1 : 2);
      b.style.gridRowStart    = (h % 12) + 1;
      popup.appendChild(b);
    }

    // minutes 00,15,30,45 in col3, each spanning 3 rows
    [0,15,30,45].forEach((m,i) => {
      const b = document.createElement('button');
      b.className = 'picker-btn';
      b.textContent = String(m).padStart(2,'0');
      b.dataset.minute = m;
      b.style.gridColumnStart = 3;
      b.style.gridRow = `${i*3+1} / span 3`;
      popup.appendChild(b);
    });

    // handler for first vs second tap
    popup.querySelectorAll('.picker-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const isHour   = btn.dataset.hour   !== undefined;
        const isMinute = btn.dataset.minute !== undefined;

        function submit() {
          btn.classList.add('pressed');
          setTimeout(() => {
            btn.classList.remove('pressed');
            const dt = new Date();
            dt.setHours(selH, selM, 0, 0);
            logDrink(lastDrink, dt.toISOString());
            closePopup();
          }, 200);
        }

        // case: nothing chosen yet
        if (selH === null && selM === null) {
          if (isHour) {
            selH = +btn.dataset.hour;
            popup.querySelectorAll('[data-hour]').forEach(x=>x.classList.remove('selected'));
            btn.classList.add('selected');
          } else {
            selM = +btn.dataset.minute;
            popup.querySelectorAll('[data-minute]').forEach(x=>x.classList.remove('selected'));
            btn.classList.add('selected');
          }
          return;
        }

        // case: hour chosen first
        if (selH !== null && selM === null) {
          if (isMinute) {
            selM = +btn.dataset.minute;
            return submit();
          } else {
            selH = +btn.dataset.hour;
            popup.querySelectorAll('[data-hour]').forEach(x=>x.classList.remove('selected'));
            btn.classList.add('selected');
            return;
          }
        }

        // case: minute chosen first
        if (selH === null && selM !== null) {
          if (isHour) {
            selH = +btn.dataset.hour;
            return submit();
          } else {
            selM = +btn.dataset.minute;
            popup.querySelectorAll('[data-minute]').forEach(x=>x.classList.remove('selected'));
            btn.classList.add('selected');
            return;
          }
        }
      };
    });
  }

  // — Log + Toast/Undo —
  function logDrink(d, iso) {
    lastLog = {
      timestamp_logged: new Date().toISOString(),
      timestamp:         iso,
      drink_category:    d.category || d.drink_category,
      drink_name:        d.name     || d.drink_name,
      is_custom_name:    false,
      units:             d.units
    };
    const hist = JSON.parse(localStorage.getItem('drink_log')||'[]');
    hist.push(lastLog);
    localStorage.setItem('drink_log', JSON.stringify(hist));

    toast.textContent = `✔️ Logged ${lastLog.drink_name}`;
    toast.classList.add('show');
    toast.onclick = () => {
      const arr = JSON.parse(localStorage.getItem('drink_log')||'[]');
      const i   = arr.findIndex(x=>x.timestamp_logged===lastLog.timestamp_logged);
      if (i > -1) {
        arr.splice(i,1);
        localStorage.setItem('drink_log', JSON.stringify(arr));
        toast.textContent = '✔️ Undid';
        setTimeout(()=>toast.classList.remove('show'),2000);
      }
    };
  }
});
