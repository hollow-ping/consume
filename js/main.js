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
    const toast = document.getElementById('toast');
    toast.textContent = `❌ ${message}`;
    toast.classList.add('show', 'error');
    setTimeout(() => toast.classList.remove('show', 'error'), 3000);
  }
}

class EventManager {
  constructor(app) {
    this.app = app;
    this.setupDelegatedEvents();
  }

  setupDelegatedEvents() {
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('touchstart', this.handleTouchStart.bind(this));
    document.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  handleClick(e) {
    if (e.target.matches('.drink-btn-content')) {
      this.app.logDrink(e.target.closest('.drink-btn').dataset.drink, new Date().toISOString());
    } else if (e.target.matches('.drink-btn-extra')) {
      this.app.showTimePopup(e.target.closest('.drink-btn').dataset.drink);
    } else if (e.target.matches('.dot')) {
      this.app.showScreen(+e.target.dataset.index);
    } else if (e.target.matches('#toast')) {
      this.app.handleToastClick();
    }
  }

  handleTouchStart(e) {
    this.app.touchStartX = e.changedTouches[0].screenX;
  }

  handleTouchEnd(e) {
    if (this.app.touchStartX === null) return;
    const diff = e.changedTouches[0].screenX - this.app.touchStartX;
    const currentScreen = Math.round(parseFloat(document.getElementById('screens-wrapper').style.transform.replace(/[^0-9.-]/g, '')) / 100) || 0;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentScreen > 0) {
        this.app.showScreen(currentScreen - 1);
      } else if (diff < 0 && currentScreen < 2) {
        this.app.showScreen(currentScreen + 1);
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
    this.toast = document.getElementById('toast');
    
    this.overlay.onclick = () => this.closePopup();
    this.popup.onclick = e => e.stopPropagation();
  }

  showScreen(index) {
    this.wrapper.style.transform = `translateX(-${index * 100}%)`;
    document.querySelectorAll('.screen-indicator .dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
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
    this.popup.style.display = 'flex';
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
    this.popup.style.display = 'grid';
    
    let selectedHour = null;
    let selectedMinute = null;

    // Render hours
    for (let hour = 0; hour < 24; hour++) {
      const button = document.createElement('button');
      button.className = 'picker-btn';
      button.textContent = hour;
      button.dataset.hour = hour;
      button.style.gridColumnStart = hour < 12 ? 1 : 2;
      button.style.gridRowStart = (hour % 12) + 1;
      this.popup.appendChild(button);
    }

    // Render minutes
    [0, 15, 30, 45].forEach((minute, index) => {
      const button = document.createElement('button');
      button.className = 'picker-btn';
      button.textContent = String(minute).padStart(2, '0');
      button.dataset.minute = minute;
      button.style.gridColumnStart = 3;
      button.style.gridRow = `${index * 3 + 1}/span 3`;
      this.popup.appendChild(button);
    });

    this.bindTimePickerButtons(selectedHour, selectedMinute);
  }

  bindTimePickerButtons(selectedHour, selectedMinute) {
    this.popup.querySelectorAll('.picker-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const isHour = 'hour' in btn.dataset;
        const isMinute = 'minute' in btn.dataset;

        if (!selectedHour && !selectedMinute) {
          if (isHour) {
            selectedHour = +btn.dataset.hour;
            this.popup.querySelectorAll('[data-hour]').forEach(x => x.classList.remove('selected'));
            btn.classList.add('selected');
          } else {
            selectedMinute = +btn.dataset.minute;
            this.popup.querySelectorAll('[data-minute]').forEach(x => x.classList.remove('selected'));
            btn.classList.add('selected');
          }
          return;
        }

        if (selectedHour && !selectedMinute) {
          if (isMinute) {
            selectedMinute = +btn.dataset.minute;
            this.submitCustomTime(selectedHour, selectedMinute);
          } else {
            selectedHour = +btn.dataset.hour;
            this.popup.querySelectorAll('[data-hour]').forEach(x => x.classList.remove('selected'));
            btn.classList.add('selected');
          }
          return;
        }

        if (!selectedHour && selectedMinute) {
          if (isHour) {
            selectedHour = +btn.dataset.hour;
            this.submitCustomTime(selectedHour, selectedMinute);
          } else {
            selectedMinute = +btn.dataset.minute;
            this.popup.querySelectorAll('[data-minute]').forEach(x => x.classList.remove('selected'));
            btn.classList.add('selected');
          }
        }
      };
    });
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

  showToast(message) {
    this.toast.textContent = message;
    this.toast.classList.add('show');
  }

  handleToastClick() {
    this.toast.classList.add('pressed');
    if (this.lastLog && this.drinkLogger.removeLog(this.lastLog.timestamp_logged)) {
      this.toast.textContent = '✔️ Undid';
    }
    setTimeout(() => {
      this.toast.classList.remove('pressed');
      this.toast.classList.remove('show');
    }, 1000);
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ConsumeApp();
});
