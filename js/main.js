document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.getElementById('screens-wrapper');
  const screens = document.querySelectorAll('.screen');
  const overlay = document.getElementById('overlay');
  const popup   = document.getElementById('popup-menu');
  const toast   = document.getElementById('toast');
  const dots    = document.querySelectorAll('.screen-indicator .dot');
  let lastDrink, lastBtn, lastLog, touchStartX;
  const popupHTML = popup.innerHTML;

  // — swipe & nav dots —
  function showScreen(i) {
    wrapper.style.transform = `translateX(-${i*100}%)`;
  }
  document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
  document.addEventListener('touchend',   e => {
    if (touchStartX===null) return;
    const diff = e.changedTouches[0].screenX - touchStartX;
    const curr = Math.round(parseFloat(wrapper.style.transform.replace(/[^0-9.-]/g,''))/100)||0;
    if (Math.abs(diff)>50) {
      if (diff>0 && curr>0) showScreen(curr-1);
      else if (diff<0 && curr<screens.length-1) showScreen(curr+1);
    }
    touchStartX = null;
  });
  dots.forEach(d=>d.addEventListener('click',()=>showScreen(+d.dataset.index)));
  showScreen(0);

  // — bind offset menu —
  function bindOffset() {
    popup.querySelectorAll('li').forEach(li => {
      li.onclick = e => {
        e.stopPropagation();
        li.classList.add('pressed');
        setTimeout(()=>li.classList.remove('pressed'),200);
        const txt = li.textContent.trim();
        if (txt==='Custom Time') return openCustomGrid();
        const mins = parseInt(txt,10)||0;
        const dt = new Date(); dt.setMinutes(dt.getMinutes()-mins);
        logDrink(lastDrink, dt.toISOString());
        closePopup();
      };
    });
  }

  // — fetch your drinks.json from root —
  fetch('./drinks.json')
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(list => {
      const container = document.getElementById('drink-buttons');
      list.forEach(d => {
        const btn = document.createElement('div'); btn.className='drink-btn';
        const main = document.createElement('div'); main.className='drink-btn-content';
        main.textContent = d.name || d.drink_name;
        main.onclick = () => {
          btn.classList.add('pressed');
          setTimeout(()=>btn.classList.remove('pressed'),200);
          logDrink(d, new Date().toISOString());
        };
        const extra = document.createElement('div'); extra.className='drink-btn-extra';
        extra.textContent='⋯';
        extra.onclick = e => {
          e.stopPropagation();
          lastDrink = d; lastBtn = btn;
          overlay.style.display='block';
          popup.innerHTML = popupHTML;
          bindOffset();
          popup.style.display='block';
        };
        btn.append(main, extra);
        container.appendChild(btn);
      });
      bindOffset();
    })
    .catch(err => {
      console.error('Error loading drinks.json', err);
      document.getElementById('drink-buttons').innerHTML =
        '<p style="padding:1rem;text-align:center;">Error loading drinks</p>';
    });

  // — close popup —
  overlay.onclick = closePopup;
  popup.onclick   = e => e.stopPropagation();
  function closePopup() {
    popup.style.display='none';
    overlay.style.display='none';
    popup.classList.remove('grid3');
    popup.innerHTML = popupHTML;
  }

  // — custom time picker —
  function openCustomGrid() {
    overlay.style.display='block';
    popup.classList.add('grid3');
    popup.innerHTML = '';
    popup.style.display = 'grid';
    let selH = null;

    // hours 0–23
    for (let h=0; h<24; h++){
      const b = document.createElement('button');
      b.className = 'picker-btn';
      b.textContent = h;
      b.dataset.hour = h;
      b.style.gridColumnStart = (h<12?1:2);
      b.style.gridRowStart    = (h%12)+1;
      popup.appendChild(b);
    }
    // minutes in col3, span 3 rows
    [0,15,30,45].forEach((m,i)=>{
      const b = document.createElement('button');
      b.className = 'picker-btn';
      b.textContent = String(m).padStart(2,'0');
      b.dataset.minute = m;
      b.style.gridColumnStart = 3;
      b.style.gridRow = `${i*3+1} / span 3`;
      popup.appendChild(b);
    });

    popup.querySelectorAll('.picker-btn').forEach(btn=>{
      btn.onclick = e => {
        e.stopPropagation();
        if (btn.dataset.hour!=null && selH===null) {
          selH = +btn.dataset.hour;
          btn.classList.add('selected');
          return;
        }
        if (btn.dataset.minute!=null && selH!==null) {
          btn.classList.add('pressed');
          setTimeout(()=>{
            btn.classList.remove('pressed');
            const dt = new Date();
            dt.setHours(selH, +btn.dataset.minute, 0,0);
            logDrink(lastDrink, dt.toISOString());
            closePopup();
          },200);
        }
      };
    });
  }

  // — logging + toast/undo —
  function logDrink(d, iso) {
    lastLog = {
      timestamp_logged: new Date().toISOString(),
      timestamp: iso,
      drink_category: d.category||d.drink_category,
      drink_name:     d.name    ||d.drink_name,
      is_custom_name: false,
      units: d.units
    };
    const hist = JSON.parse(localStorage.getItem('drink_log')||'[]');
    hist.push(lastLog);
    localStorage.setItem('drink_log',JSON.stringify(hist));

    toast.textContent = `✔️ Logged ${lastLog.drink_name}`;
    toast.classList.add('show');
    toast.onclick = () => {
      const arr = JSON.parse(localStorage.getItem('drink_log')||'[]');
      const idx = arr.findIndex(x=>x.timestamp_logged===lastLog.timestamp_logged);
      if(idx>-1){
        arr.splice(idx,1);
        localStorage.setItem('drink_log',JSON.stringify(arr));
        toast.textContent = '✔️ Undid';
        setTimeout(()=>toast.classList.remove('show'),2000);
      }
    };
  }
});
