/* js/pin.js */

const Pin = {
  entered: '',
  confirmEntry: '',
  mode: 'enter',   // 'enter' | 'set-new' | 'set-confirm'

  init() {
    const settings = Storage.getSettings();
    if (!settings.onboarded) { showScreen('onboard'); return; }
    if (settings.pin) { showScreen('pin'); this.bindLogin(); }
    else showScreen('app');
  },

  bindLogin() {
    this.entered = '';
    this.mode = 'enter';
    document.getElementById('pin-label').textContent = 'Enter your PIN';
    this.updateDots('pin-dots', 0);

    document.querySelectorAll('.pin-key[data-val]').forEach(btn => {
      // only keys without data-target (login keys)
      if (!btn.dataset.target) {
        btn.onclick = () => this.pressLogin(btn.dataset.val);
      }
    });
    document.getElementById('pin-back').onclick = () => {
      this.entered = this.entered.slice(0, -1);
      this.updateDots('pin-dots', this.entered.length);
    };
    document.getElementById('pin-skip').onclick = () => showScreen('app');
  },

  pressLogin(val) {
    if (this.entered.length >= 4) return;
    this.entered += val;
    this.updateDots('pin-dots', this.entered.length);
    if (this.entered.length === 4) {
      const saved = Storage.getSettings().pin;
      if (this.entered === saved) {
        showScreen('app');
      } else {
        this.shakeDots('pin-dots');
        document.getElementById('pin-label').textContent = 'Wrong PIN, try again';
        setTimeout(() => {
          this.entered = '';
          this.updateDots('pin-dots', 0);
        }, 600);
      }
    }
  },

  // SET PIN flow (called from settings)
  initSetPin() {
    this.setPinEntry = '';
    this.setPinConfirm = '';
    this.mode = 'set-new';
    document.getElementById('set-pin-title').textContent = 'Set New PIN';
    document.getElementById('set-pin-hint').textContent = 'Enter a 4-digit PIN';
    this.updateDots('set-pin-dots', 0);
    openModal('set-pin-modal');

    document.querySelectorAll('.pin-key[data-target="set"]').forEach(btn => {
      btn.onclick = () => this.pressSet(btn.dataset.val);
    });
    document.getElementById('set-pin-back').onclick = () => {
      if (this.mode === 'set-new') {
        this.setPinEntry = this.setPinEntry.slice(0, -1);
        this.updateDots('set-pin-dots', this.setPinEntry.length);
      } else {
        this.setPinConfirm = this.setPinConfirm.slice(0, -1);
        this.updateDots('set-pin-dots', this.setPinConfirm.length);
      }
    };
  },

  pressSet(val) {
    if (this.mode === 'set-new') {
      if (this.setPinEntry.length >= 4) return;
      this.setPinEntry += val;
      this.updateDots('set-pin-dots', this.setPinEntry.length);
      if (this.setPinEntry.length === 4) {
        this.mode = 'set-confirm';
        this.setPinConfirm = '';
        document.getElementById('set-pin-title').textContent = 'Confirm PIN';
        document.getElementById('set-pin-hint').textContent = 'Enter the PIN again to confirm';
        this.updateDots('set-pin-dots', 0);
      }
    } else {
      if (this.setPinConfirm.length >= 4) return;
      this.setPinConfirm += val;
      this.updateDots('set-pin-dots', this.setPinConfirm.length);
      if (this.setPinConfirm.length === 4) {
        if (this.setPinEntry === this.setPinConfirm) {
          Storage.setSetting('pin', this.setPinEntry);
          closeModal('set-pin-modal');
          showToast('✅ PIN set successfully');
        } else {
          this.shakeDots('set-pin-dots');
          document.getElementById('set-pin-hint').textContent = "PINs don't match. Try again.";
          this.mode = 'set-new';
          this.setPinEntry = '';
          this.setPinConfirm = '';
          setTimeout(() => this.updateDots('set-pin-dots', 0), 400);
        }
      }
    }
  },

  updateDots(id, count) {
    const dots = document.querySelectorAll(`#${id} span`);
    dots.forEach((d, i) => {
      d.classList.toggle('filled', i < count);
    });
  },

  shakeDots(id) {
    const dots = document.querySelectorAll(`#${id} span`);
    dots.forEach(d => {
      d.classList.add('shake');
      setTimeout(() => d.classList.remove('shake'), 400);
    });
  }
};
