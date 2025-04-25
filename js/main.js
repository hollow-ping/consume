
document.addEventListener('DOMContentLoaded', () => {
  /* Reset popup/overlay on every load */
  const overlay = document.getElementById('overlay');
  const popup   = document.getElementById('popup-menu');
  overlay.style.display = 'none';
  popup.style.display   = 'none';
  popup.classList.remove('grid3');
  popup.innerHTML = `
    <ul>
      <li>15 min ago</li>
      <li>30 min ago</li>
      <li>45 min ago</li>
      <li>60 min ago</li>
      <li>Custom Time</li>
    </ul>
  `;
  const popupHTML = popup.innerHTML;

  const wrapper = document.getElementById('screens-wrapper');
  const toast   = document.getElementById('toast');
  const dots    = document.querySelectorAll('.screen-indicator .dot');
  let lastDrink, lastLog, touchStartX;

  /* swipe navigation */
  function showScreen(i){ wrapper.style.transform = `translateX(-${i*100}%)`; }
  document.addEventListener('touchstart',e=> touchStartX = e.changedTouches[0].screenX);
  document.addEventListener('touchend',e=>{
    if(touchStartX==null) return;
    const diff=e.changedTouches[0].screenX-touchStartX;
    const curr=Math.round(parseFloat(wrapper.style.transform.replace(/[^0-9.-]/g,''))/100)||0;
    if(Math.abs(diff)>50){
      if(diff>0 && curr>0) showScreen(curr-1);
      else if(diff<0 && curr<2) showScreen(curr+1);
    }
    touchStartX=null;
  });
  dots.forEach(d=>d.addEventListener('click',()=>showScreen(+d.dataset.index)));
  showScreen(0);

  /* helper to close popup */
  function closePopup(){
    popup.style.display='none';
    overlay.style.display='none';
    overlay.classList.remove('show');
    popup.classList.remove('grid3');
    popup.innerHTML = popupHTML;
  }
  overlay.onclick = closePopup;
  popup.onclick = e => e.stopPropagation();

  /* bind offset list */
  function bindOffset(){
    popup.querySelectorAll('li').forEach(li=>{
      li.onclick = e=>{
        e.stopPropagation();
        li.classList.add('pressed');
        setTimeout(()=>li.classList.remove('pressed'),200);
        const label = li.textContent.trim();
        if(label==='Custom Time'){ openCustomGrid(); return; }
        const mins=parseInt(label,10)||0;
        const dt=new Date(); dt.setMinutes(dt.getMinutes()-mins);
        logDrink(lastDrink, dt.toISOString());
        closePopup();
      };
    });
  }

  /* load drinks */
  fetch('data/drinks.json')
    .then(r=>r.ok?r.json():Promise.reject(r.status))
    .then(list=>{
      const container=document.getElementById('drink-buttons');
      list.forEach(d=>{
        const btn=document.createElement('div');
        btn.className='drink-btn';

        const main=document.createElement('div');
        main.className='drink-btn-content';
        main.textContent=d.drink_name;
        main.onclick=()=>{
          btn.classList.add('pressed');
          setTimeout(()=>btn.classList.remove('pressed'),200);
          logDrink(d,new Date().toISOString());
        };

        const extra=document.createElement('div');
        extra.className='drink-btn-extra';
        extra.textContent='⋯';
        extra.onclick=e=>{
          e.stopPropagation();
          lastDrink=d;
          overlay.style.display='block';
          overlay.classList.add('show');        // <- for the CSS selector above
          popup.innerHTML = popupHTML;
          bindOffset();
          popup.style.display='flex';
        };

        btn.append(main, extra);
        container.appendChild(btn);
      });
      bindOffset();
    })
    .catch(err=>{
      console.error('load drinks',err);
      document.getElementById('drink-buttons').textContent='Error loading drinks';
    });

  /* custom time picker */
  function openCustomGrid(){
    overlay.style.display='block';
    popup.classList.add('grid3');
    popup.innerHTML='';
    popup.style.display='grid';

    let selH=null, selM=null;

    for(let h=0;h<24;h++){
      const b=document.createElement('button');
      b.className='picker-btn'; b.textContent=h; b.dataset.hour=h;
      b.style.gridColumnStart = h<12?1:2;
      b.style.gridRowStart = (h%12)+1;
      popup.appendChild(b);
    }
    [0,15,30,45].forEach((m,i)=>{
      const b=document.createElement('button');
      b.className='picker-btn'; b.textContent=String(m).padStart(2,'0'); b.dataset.minute=m;
      b.style.gridColumnStart=3;
      b.style.gridRow=`${i*3+1}/span 3`;
      popup.appendChild(b);
    });

    popup.querySelectorAll('.picker-btn').forEach(btn=>{
      btn.onclick=e=>{
        e.stopPropagation();
        const isH='hour'in btn.dataset;
        const isM='minute'in btn.dataset;
        const submit=()=>{
          btn.classList.add('pressed');
          setTimeout(()=>{
            btn.classList.remove('pressed');
            const dt=new Date(); dt.setHours(selH,selM,0,0);
            logDrink(lastDrink, dt.toISOString());
            closePopup();
          },200);
        };
        if(selH===null&&selM===null){
          if(isH){
            selH=+btn.dataset.hour;
            popup.querySelectorAll('[data-hour]').forEach(x=>x.classList.remove('selected'));
            btn.classList.add('selected');
          }else{
            selM=+btn.dataset.minute;
            popup.querySelectorAll('[data-minute]').forEach(x=>x.classList.remove('selected'));
            btn.classList.add('selected');
          }
          return;
        }
        if(selH!==null&&selM===null){
          if(isM){ selM=+btn.dataset.minute; submit(); }
          else{ selH=+btn.dataset.hour; popup.querySelectorAll('[data-hour]').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected'); }
          return;
        }
        if(selH===null&&selM!==null){
          if(isH){ selH=+btn.dataset.hour; submit(); }
          else{ selM=+btn.dataset.minute; popup.querySelectorAll('[data-minute]').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected'); }
        }
      };
    });
  }

  /* log + toast */
  function logDrink(d,iso){
    lastLog={timestamp_logged:new Date().toISOString(),timestamp:iso,drink_category:d.drink_category,drink_name:d.drink_name,units:d.units};
    const arr=JSON.parse(localStorage.getItem('drink_log')||'[]'); arr.push(lastLog);
    localStorage.setItem('drink_log',JSON.stringify(arr));
    toast.textContent=`✔️ Logged ${d.drink_name}`; toast.classList.add('show');
    toast.onclick = () => {
      toast.classList.add('pressed');
        const log = JSON.parse(localStorage.getItem('drink_log')||'[]');
        const i   = log.findIndex(x=>x.timestamp_logged===lastLog.timestamp_logged);
        if(i>-1){
          log.splice(i,1);
          localStorage.setItem('drink_log',JSON.stringify(log));
          toast.textContent = '✔️ Undid';
        }
        /* fade away after 1 s */
        setTimeout(()=>{
          toast.classList.remove('pressed');
          toast.classList.remove('show');
        },1000);
    };
  }
});
