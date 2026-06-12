/* pin.js — TradeBook v2 */
const Pin = {
  enterBuffer: '',
  setBuffer: '',
  setConfirmBuffer: '',
  setMode: 'new', // 'new' | 'confirm'

  /* ── Boot: decide which screen to show ── */
  boot() {
    const s = Storage.getSettings();
    if (!s.onboarded) {
      showScreen('onboard'); return;
    }
    if (s.pin && Storage.needsPinToday()) {
      showScreen('pin');
      this.initLogin();
    } else {
      showScreen('app');
      refreshAll();
    }
  },

  /* ── Daily login PIN ── */
  initLogin() {
    this.enterBuffer = '';
    document.getElementById('pin-label').textContent = t('enter_pin');
    this.updateDots('pin-dots', 0);

    document.querySelectorAll('#pin-screen .pin-key[data-val]').forEach(btn => {
      btn.onclick = () => this.pressLogin(btn.dataset.val);
    });
    document.getElementById('pin-back').onclick = () => {
      this.enterBuffer = this.enterBuffer.slice(0, -1);
      this.updateDots('pin-dots', this.enterBuffer.length);
    };
    document.getElementById('pin-skip').onclick = () => {
      showScreen('app'); refreshAll();
    };
  },

  pressLogin(val) {
    if (this.enterBuffer.length >= 4) return;
    this.enterBuffer += val;
    this.updateDots('pin-dots', this.enterBuffer.length);
    if (this.enterBuffer.length === 4) {
      const saved = Storage.getSettings().pin;
      if (this.enterBuffer === saved) {
        Storage.recordPinEntry();
        showScreen('app');
        refreshAll();
      } else {
        this.shakeDots('pin-dots');
        document.getElementById('pin-label').textContent = t('wrong_pin');
        setTimeout(() => {
          this.enterBuffer = '';
          this.updateDots('pin-dots', 0);
          document.getElementById('pin-label').textContent = t('enter_pin');
        }, 700);
      }
    }
  },

  /* ── Set PIN (from settings) ── */
  startSetPin() {
    this.setBuffer = '';
    this.setConfirmBuffer = '';
    this.setMode = 'new';
    document.getElementById('set-pin-title').textContent = t('set_pin_title');
    document.getElementById('set-pin-hint').textContent  = t('set_pin_hint');
    this.updateDots('set-pin-dots', 0);
    openModal('set-pin-modal');

    document.querySelectorAll('.pin-key[data-target="set"]').forEach(btn => {
      btn.onclick = () => this.pressSet(btn.dataset.val);
    });
    document.getElementById('set-pin-back').onclick = () => {
      if (this.setMode === 'new') {
        this.setBuffer = this.setBuffer.slice(0, -1);
        this.updateDots('set-pin-dots', this.setBuffer.length);
      } else {
        this.setConfirmBuffer = this.setConfirmBuffer.slice(0, -1);
        this.updateDots('set-pin-dots', this.setConfirmBuffer.length);
      }
    };
  },

  pressSet(val) {
    if (this.setMode === 'new') {
      if (this.setBuffer.length >= 4) return;
      this.setBuffer += val;
      this.updateDots('set-pin-dots', this.setBuffer.length);
      if (this.setBuffer.length === 4) {
        this.setMode = 'confirm';
        this.setConfirmBuffer = '';
        document.getElementById('set-pin-title').textContent = t('confirm_pin_title');
        document.getElementById('set-pin-hint').textContent  = t('confirm_pin_hint');
        this.updateDots('set-pin-dots', 0);
      }
    } else {
      if (this.setConfirmBuffer.length >= 4) return;
      this.setConfirmBuffer += val;
      this.updateDots('set-pin-dots', this.setConfirmBuffer.length);
      if (this.setConfirmBuffer.length === 4) {
        if (this.setBuffer === this.setConfirmBuffer) {
          Storage.setSetting('pin', this.setBuffer);
          Storage.recordPinEntry(); // don't ask again today
          closeModal('set-pin-modal');
          showToast(t('pin_set'));
        } else {
          this.shakeDots('set-pin-dots');
          document.getElementById('set-pin-hint').textContent = t('pins_no_match');
          this.setMode = 'new';
          this.setBuffer = '';
          this.setConfirmBuffer = '';
          setTimeout(() => this.updateDots('set-pin-dots', 0), 500);
        }
      }
    }
  },

  updateDots(id, count) {
    document.querySelectorAll(`#${id} span`).forEach((d, i) => {
      d.classList.toggle('filled', i < count);
    });
  },

  shakeDots(id) {
    document.querySelectorAll(`#${id} span`).forEach(d => {
      d.classList.add('shake');
      setTimeout(() => d.classList.remove('shake'), 400);
    });
  }
};
