document.addEventListener('DOMContentLoaded', () => {
  const wrapper   = document.getElementById('screens-wrapper');
  const screens   = document.querySelectorAll('.screen');
  const overlay   = document.getElementById('overlay');
  const popup     = document.getElementById('popup-menu');
  const toast     = document.getElementById('toast');
  const indicator = document.querySelector('.screen-indicator');
  let lastDrink = null, lastBtn = null, lastLog = null, touchStartX = null;

  // preserve original offset‐list
  const popupMenuHTML = popup.innerHTML;

  // swipe & dot nav
  function showScreen(idx) {
    wrapper.style.transform = `translateX(-${idx*100}%)`;
  }
  document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
  document.addEventListener('touchend',   e => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 50) {
      const curr = Math.round(parseFloat(wrapper.style.transform.replace(/[^0-9.-]/g,''))/100)||0;
      if (diff>0 && curr>0) showScreen(curr-1);
      else if (diff<0 && curr<screens.length-1) showScreen(curr+1);
    }
    touchStartX = null;
  });
  document.querySelectorAll('.screen-indicator .dot')
    .forEach(d=>d.addEventListener('click',()=>showScreen(+d.dataset.index)));
  showScreen(0);

  // bind offset‐menu items
  function bindOffsetMenu() {
    popup.querySelectorAll('li').forEach(li => {
      li.onclick = e => {
        e.stopPropagation();
        const txt = li.textContent.trim();
        if (txt === 'Custom Time') return openCustomTimeGrid();
        // simple offset
        li.classList.add('pressed');
        setTimeout(()=> li.classList.remove('pressed'), 200);
        const mins = parseInt(txt,10)||0;
        const dt = new Date(); dt.setMinutes(dt.getMinutes()-mins);
        logDrinkWithTime(lastDrink, lastBtn, dt.toISOString());
        closePopup();
      };
    });
  }

  // fetch & render drink buttons
  fetch('data/drinks.json')
    .then(r => { if(!r.ok) throw r; return r.json(); })
    .then(drinks => {
      const container = document.getElementById('drink-buttons');
      container.style.position = 'relative';
      drinks.forEach(d => {
        const btn = document.createElement('div');
        btn.className = 'drink-btn';

        // main 75%
        const main = document.createElement('div');
        main.className = 'drink-btn-content';
        main.textContent = d.drink_name;
        main.onclick = () => {
          btn.classList.add('pressed');
          setTimeout(()=> btn.classList.remove('pressed'), 200);
          logDrinkWithTime(d, btn, new Date().toISOString());
        };

        // extra 25%
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
      console.error(err);
      document.getElementById('drink-buttons').innerHTML =
        '<p style="padding:1rem;text-align:center;">Error loading drinks</p>';
    });

  // overlay & popup close
  overlay.onclick = closePopup;
  popup.onclick   = e => e.stopPropagation();
  function closePopup() {
    popup.style.display   = 'none';
    overlay.style.display = 'none';
    popup.classList.remove('grid3');
    popup.innerHTML = popupMenuHTML;
  }

  // CUSTOM TIME GRID 3×12 + 4
  function openCustomTimeGrid() {
    overlay.style.display = 'block';
    popup.classList.add('grid3');
    popup.style.display = 'grid';

    // build hours 0–11 in col1, 12–23 in col2
    let html = '';
    for (let i = 0; i < 24; i++) {
      html += `<button class="picker-btn" data-hour="${i}" style="
        grid-column:${i<12?1:2};
        grid-row:${(i%12)+1};
        border:1px solid black;">
        ${i}
      </button>`;
    }
    // build minutes 00,15,30,45 in col3, spanning 3 rows each
    [0,15,30,45].forEach((m,idx) => {
      const rowStart = idx*3 + 1;
      html += `<button class="picker-btn" data-minute="${m}" style="
        grid-column:3;
        grid-row:${rowStart}/${rowStart+3};
        border:1px solid black;">
        ${m.toString().padStart(2,'0')}
      </button>`;
    });

    popup.innerHTML = html;

    let selH = null, selM = null;
    popup.querySelectorAll('.picker-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        if (btn.dataset.hour != null) {
          selH = +btn.dataset.hour;
          popup.querySelectorAll('[data-hour]').forEach(b=>b.classList.remove('selected'));
          btn.classList.add('selected');
        }
        if (btn.dataset.minute != null) {
          selM = +btn.dataset.minute;
          popup.querySelectorAll('[data-minute]').forEach(b=>b.classList.remove('selected'));
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

  // log + toast/undo
  function logDrinkWithTime(d, btn, iso) {
    lastLog = {
      timestamp_logged: new Date().toISOString(),
      timestamp: iso,
      drink_category: d.drink_category,
      drink_name: d.drink_name,
      is_custom_name: false,
      units: d.units
    };
    const hist = JSON.parse(localStorage.getItem('drink_log')||'[]');
    hist.push(lastLog);
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
        setTimeout(() => toast.classList.remove('show'), 2000);
      }
    };
  }
});
