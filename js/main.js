document.addEventListener('DOMContentLoaded', () => {
  /* ─────────────────────────────
     0.  Make sure overlay & popup
         start completely hidden
  ────────────────────────────── */
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
  const popupHTML = popup.innerHTML;      // ← template snapshot

  /* ─────────────────────────────
     1.  DOM references
  ────────────────────────────── */
  const wrapper = document.getElementById('screens-wrapper');
  const toast   = document.getElementById('toast');
  const dots    = document.querySelectorAll('.screen-indicator .dot');

  let lastDrink, lastLog, touchStartX;

  /*
