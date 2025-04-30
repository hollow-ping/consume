class DrinkLogger {
  constructor() {
    this.logs = this.loadLogs();
  }

  loadLogs() {
    try {
      return JSON.parse(localStorage.getItem('drink_log') || '[]');
    } catch (error) {
      console.error('Error loading logs:', error);
      return [];
    }
  }

  addLog(log) {
    this.logs.push(log);
    this.saveLogs();
    return log;
  }

  removeLog(timestamp) {
    const index = this.logs.findIndex(log => log.timestamp_logged === timestamp);
    if (index > -1) {
      this.logs.splice(index, 1);
      this.saveLogs();
      return true;
    }
    return false;
  }

  saveLogs() {
    try {
      localStorage.setItem('drink_log', JSON.stringify(this.logs));
    } catch (error) {
      console.error('Error saving logs:', error);
    }
  }
}

class ErrorHandler {
  static handleError(error, userMessage) {
    console.error(error);
    this.showUserError(userMessage);
  }

  static showUserError(message) {
    const app = window.consumeApp;
    if (app) {
      app.showToast(`❌ ${message}`, false);
    }
  }
}

class EventManager {
  constructor(app) {
    this.app = app;
    this.setupDelegatedEvents();
  }

  setupDelegatedEvents() {
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
  }

  handleClick(e) {
    const btn = e.target.closest('.drink-btn');
    if (btn) {
      if (e.target.classList.contains('drink-btn-extra')) {
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 150);
        this.app.showTimePopup(btn.dataset.drink);
        return;
      } else if (e.target.classList.contains('drink-btn-content') || e.target === btn) {
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 150);
        const drink = JSON.parse(btn.dataset.drink);
        this.app.logDrink(drink, new Date().toISOString());
        return;
      }
    }
    if (e.target.matches('.dot')) {
      this.app.showScreen(+e.target.dataset.index);
    }
  }

  handleTouchStart(e) {
    this.app.touchStartX = e.changedTouches[0].screenX;
  }

  handleTouchEnd(e) {
    if (this.app.touchStartX === null) return;
    
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - this.app.touchStartX;
    const minSwipeDistance = 50;
    
    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0 && this.app.currentScreen > 0) {
        this.app.showScreen(this.app.currentScreen - 1);
      } else if (diff < 0 && this.app.currentScreen < 2) {
        this.app.showScreen(this.app.currentScreen + 1);
      }
    }
    
    this.app.touchStartX = null;
  }
}

class ConsumeApp {
  constructor() {
    this.drinkLogger = new DrinkLogger();
    this.eventManager = new EventManager(this);
    this.touchStartX = null;
    this.lastLog = null;
    this.lastDrink = null;
    this.currentScreen = 0;
    this.activeToasts = new Set();
    
    window.consumeApp = this; // Make app instance globally available
    this.initializeApp();
    this.loadDrinks();
  }

  initializeApp() {
    this.setupUIElements();
    this.showScreen(0);
  }

  setupUIElements() {
    this.overlay = document.getElementById('overlay');
    this.popup = document.getElementById('popup-menu');
    this.wrapper = document.getElementById('screens-wrapper');
    
    this.overlay.onclick = () => this.closePopup();
    this.popup.onclick = e => e.stopPropagation();
  }

  showScreen(index) {
    this.currentScreen = index;
    this.wrapper.style.transform = `translateX(-${index * 100}%)`;
    document.querySelectorAll('.screen-indicator .dot').forEach((dot, i) => {
      dot.setAttribute('aria-selected', i === index);
      dot.classList.toggle('active', i === index);
    });
    
    // Clear toasts when switching screens
    this.clearToasts();
  }

  async loadDrinks() {
    try {
      const response = await fetch('data/drinks.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const drinks = await response.json();
      this.renderDrinks(drinks);
    } catch (error) {
      ErrorHandler.handleError(error, 'Failed to load drinks');
    }
  }

  renderDrinks(drinks) {
    const container = document.getElementById('drink-buttons');
    container.innerHTML = drinks.map(drink => `
      <div class="drink-btn" data-drink='${JSON.stringify(drink)}'>
        <div class="drink-btn-content">${drink.drink_name}</div>
        <div class="drink-btn-extra">⋯</div>
      </div>
    `).join('');
  }

  logDrink(drink, timestamp) {
    try {
      const log = {
        timestamp_logged: new Date().toISOString(),
        timestamp: timestamp,
        drink_category: drink.drink_category,
        drink_name: drink.drink_name,
        units: drink.units
      };
      
      this.lastLog = this.drinkLogger.addLog(log);
      this.showToast(`✔️ Logged ${drink.drink_name}`);
    } catch (error) {
      ErrorHandler.handleError(error, 'Failed to log drink');
    }
  }

  showTimePopup(drink) {
    this.lastDrink = JSON.parse(drink);
    this.overlay.classList.add('show');
    this.popup.innerHTML = `
      <ul>
        <li>15 min ago</li>
        <li>30 min ago</li>
        <li>45 min ago</li>
        <li>60 min ago</li>
        <li>Custom Time</li>
      </ul>
    `;
    this.popup.style.display = 'block';
    this.bindTimeOptions();
  }

  bindTimeOptions() {
    this.popup.querySelectorAll('li').forEach(li => {
      li.onclick = e => {
        e.stopPropagation();
        li.classList.add('pressed');
        setTimeout(() => li.classList.remove('pressed'), 150);
        
        const text = li.textContent.trim();
        if (text === 'Custom Time') {
          this.openCustomTimeGrid();
          return;
        }
        
        const minutes = parseInt(text, 10) || 0;
        const date = new Date();
        date.setMinutes(date.getMinutes() - minutes);
        this.logDrink(this.lastDrink, date.toISOString());
        this.closePopup();
      };
    });
  }

  openCustomTimeGrid() {
    this.overlay.classList.add('show');
    this.popup.classList.add('grid3');
    this.popup.innerHTML = '';
    this.popup.style.display = 'block';
    
    let selectedHour = null;
    let selectedMinute = null;

    // Create grid container
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 1fr 1fr';
    grid.style.gridTemplateRows = 'repeat(12, 1fr)';
    grid.style.gap = '0.3rem';
    grid.style.justifyItems = 'stretch';
    grid.style.alignItems = 'stretch';
    grid.style.margin = '1rem 0';
    grid.style.width = '100%';
    grid.style.height = '18rem'; // Ensures all buttons fill popup vertically

    // Col 1: hours 0-5 (rows 1-6), 6-11 (rows 7-12)
    for (let i = 0; i < 6; i++) {
      // 0-5
      const btn1 = document.createElement('button');
      btn1.className = 'picker-btn';
      btn1.textContent = i;
      btn1.dataset.hour = i;
      btn1.style.gridColumn = '1';
      btn1.style.gridRow = `${i * 2 + 1} / span 2`;
      btn1.onclick = () => {
        grid.querySelectorAll('.picker-btn[data-hour]').forEach(x => x.classList.remove('selected'));
        btn1.classList.add('selected');
        if (selectedMinute !== null) {
          this.submitCustomTime(i, selectedMinute);
          this.closePopup();
        } else {
          selectedHour = i;
        }
      };
      grid.appendChild(btn1);
      // 6-11
      const btn2 = document.createElement('button');
      btn2.className = 'picker-btn';
      btn2.textContent = i + 6;
      btn2.dataset.hour = i + 6;
      btn2.style.gridColumn = '1';
      btn2.style.gridRow = `${i * 2 + 1} / span 2`;
      btn2.onclick = () => {
        grid.querySelectorAll('.picker-btn[data-hour]').forEach(x => x.classList.remove('selected'));
        btn2.classList.add('selected');
        if (selectedMinute !== null) {
          this.submitCustomTime(i + 6, selectedMinute);
          this.closePopup();
        } else {
          selectedHour = i + 6;
        }
      };
      grid.appendChild(btn2);
    }
    // Col 2: hours 12-17 (rows 1-6), 18-23 (rows 7-12)
    for (let i = 0; i < 6; i++) {
      // 12-17
      const btn1 = document.createElement('button');
      btn1.className = 'picker-btn';
      btn1.textContent = i + 12;
      btn1.dataset.hour = i + 12;
      btn1.style.gridColumn = '2';
      btn1.style.gridRow = `${i * 2 + 1} / span 2`;
      btn1.onclick = () => {
        grid.querySelectorAll('.picker-btn[data-hour]').forEach(x => x.classList.remove('selected'));
        btn1.classList.add('selected');
        if (selectedMinute !== null) {
          this.submitCustomTime(i + 12, selectedMinute);
          this.closePopup();
        } else {
          selectedHour = i + 12;
        }
      };
      grid.appendChild(btn1);
      // 18-23
      const btn2 = document.createElement('button');
      btn2.className = 'picker-btn';
      btn2.textContent = i + 18;
      btn2.dataset.hour = i + 18;
      btn2.style.gridColumn = '2';
      btn2.style.gridRow = `${i * 2 + 1} / span 2`;
      btn2.onclick = () => {
        grid.querySelectorAll('.picker-btn[data-hour]').forEach(x => x.classList.remove('selected'));
        btn2.classList.add('selected');
        if (selectedMinute !== null) {
          this.submitCustomTime(i + 18, selectedMinute);
          this.closePopup();
        } else {
          selectedHour = i + 18;
        }
      };
      grid.appendChild(btn2);
    }
    // Col 3: minutes (0, 15, 30, 45) in rows 1, 4, 7, 10, each spanning 3 rows
    [0, 15, 30, 45].forEach((minute, idx) => {
      const button = document.createElement('button');
      button.className = 'picker-btn';
      button.textContent = String(minute).padStart(2, '0');
      button.dataset.minute = minute;
      button.style.gridColumn = '3';
      button.style.gridRow = `${idx * 3 + 1} / span 3`;
      button.onclick = () => {
        grid.querySelectorAll('.picker-btn[data-minute]').forEach(x => x.classList.remove('selected'));
        button.classList.add('selected');
        if (selectedHour !== null) {
          this.submitCustomTime(selectedHour, minute);
          this.closePopup();
        } else {
          selectedMinute = minute;
        }
      };
      grid.appendChild(button);
    });
    this.popup.appendChild(grid);
  }

  submitCustomTime(hour, minute) {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    this.logDrink(this.lastDrink, date.toISOString());
    this.closePopup();
  }

  closePopup() {
    this.popup.style.display = 'none';
    this.popup.classList.remove('grid3');
    this.overlay.classList.remove('show');
  }

  showToast(message, isUndo = false) {
    // Remove all existing toasts before showing a new one
    this.activeToasts.forEach(toast => {
      toast.classList.add('hide');
      setTimeout(() => {
        toast.remove();
        this.activeToasts.delete(toast);
      }, 200);
    });

    const toast = document.createElement('div');
    toast.className = `toast ${isUndo ? 'undo' : ''}`;
    toast.textContent = message;
    toast.onclick = () => this.handleToastClick(toast);
    
    document.body.appendChild(toast);
    this.activeToasts.add(toast);
    
    // Position the toast
    toast.style.bottom = `4rem`;
    
    // Animate fly-in
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) scale(1)';
    }, 10);

    // If this is an undo toast, fade it away after 1 second
    if (isUndo) {
      setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
          toast.remove();
          this.activeToasts.delete(toast);
        }, 300);
      }, 1000);
    }
  }

  handleToastClick(toast) {
    if (this.lastLog && !toast.classList.contains('undo')) {
      toast.classList.add('pressed');
      setTimeout(() => {
        toast.classList.remove('pressed');
        toast.classList.add('released');
        setTimeout(() => {
          toast.classList.remove('released');
          // Transform to grey undo toast and fade out after 1s
          toast.classList.add('undo');
          toast.textContent = `Undid ${this.lastLog.drink_name}`;
          setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => {
              toast.remove();
              this.activeToasts.delete(toast);
            }, 300);
          }, 1000);
        }, 150);
      }, 100);
      this.drinkLogger.removeLog(this.lastLog.timestamp_logged);
    }
  }

  clearToasts() {
    this.activeToasts.forEach(toast => {
      toast.classList.add('hide');
      setTimeout(() => {
        toast.remove();
        this.activeToasts.delete(toast);
      }, 300);
    });
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ConsumeApp();
});
