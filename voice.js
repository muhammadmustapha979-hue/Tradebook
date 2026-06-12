/* js/voice.js */

const Voice = {
  recognition: null,
  listening: false,
  parsed: null,

  init() {
    document.getElementById('quick-voice').onclick = () => this.openModal();
    document.getElementById('voice-mic-btn').onclick = () => this.toggle();
    document.getElementById('voice-confirm-btn').onclick = () => this.confirm();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      document.getElementById('quick-voice').title = 'Voice not supported on this browser';
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-NG';

    this.recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      this.handleResult(text);
    };
    this.recognition.onend = () => {
      this.listening = false;
      this.updateUI(false);
    };
    this.recognition.onerror = (e) => {
      this.listening = false;
      this.updateUI(false);
      if (e.error === 'not-allowed') {
        document.getElementById('voice-status').textContent = '⚠️ Microphone access denied';
      } else {
        document.getElementById('voice-status').textContent = '⚠️ Could not hear. Try again.';
      }
    };
  },

  openModal() {
    this.parsed = null;
    this.listening = false;
    document.getElementById('voice-status').textContent = 'Tap the mic to start';
    document.getElementById('voice-result').style.display = 'none';
    document.getElementById('voice-confirm-btn').style.display = 'none';
    document.getElementById('voice-mic-btn').classList.remove('listening');
    document.querySelector('.voice-ring').classList.remove('listening');
    openModal('voice-modal');
  },

  toggle() {
    if (!this.recognition) {
      // Fallback: open text-based quick entry
      closeModal('voice-modal');
      Transactions.openModal('sale');
      showToast('ℹ️ Voice not supported — use manual entry');
      return;
    }
    if (this.listening) {
      this.recognition.stop();
    } else {
      this.recognition.start();
      this.listening = true;
      this.updateUI(true);
      document.getElementById('voice-status').textContent = '🎤 Listening... speak now';
    }
  },

  updateUI(listening) {
    const mic  = document.getElementById('voice-mic-btn');
    const ring = document.querySelector('.voice-ring');
    if (listening) {
      mic.classList.add('listening');
      ring.classList.add('listening');
    } else {
      mic.classList.remove('listening');
      ring.classList.remove('listening');
    }
  },

  handleResult(text) {
    document.getElementById('voice-heard').textContent = text;
    document.getElementById('voice-result').style.display = 'block';
    document.getElementById('voice-status').textContent = 'Processing...';

    this.parsed = this.parseText(text);

    if (this.parsed) {
      const { type, amount, customer, note } = this.parsed;
      const typeLabel = { sale: 'Sale', credit: 'Credit', expense: 'Expense' }[type];
      document.getElementById('voice-parsed').textContent =
        `→ ${typeLabel}: ${fmt(amount)}${customer ? ' for ' + customer : ''}${note ? ' (' + note + ')' : ''}`;
      document.getElementById('voice-status').textContent = '✅ Got it! Confirm to save.';
      document.getElementById('voice-confirm-btn').style.display = 'block';
    } else {
      document.getElementById('voice-parsed').textContent = '⚠️ Could not understand. Try again.';
      document.getElementById('voice-status').textContent = 'Tap the mic to try again';
      document.getElementById('voice-confirm-btn').style.display = 'none';
    }
  },

  parseText(text) {
    const lower = text.toLowerCase();

    // Detect type
    let type = 'sale';
    if (/credit|owe|borrow|owing|debt|gbese|bashi|ụgwọ/.test(lower)) type = 'credit';
    else if (/spend|spent|buy|bought|paid for|expense|market|levy|ìnáwó|nwere/.test(lower)) type = 'expense';

    // Extract amount — handle "five thousand", "5k", "5,000", numbers
    let amount = 0;
    const wordNums = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
      'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
      'eighty': 80, 'ninety': 90
    };
    const multipliers = { 'hundred': 100, 'thousand': 1000, 'million': 1000000 };

    // Try digit first
    const digitMatch = lower.match(/(\d[\d,]*)\s*k?\b/);
    if (digitMatch) {
      const raw = digitMatch[0].replace(/,/g, '').trim();
      amount = parseFloat(raw) * (raw.endsWith('k') ? 1000 : 1);
    } else {
      // Word numbers
      let current = 0; let total = 0;
      lower.split(/\s+/).forEach(word => {
        const w = wordNums[word];
        const m = multipliers[word];
        if (w !== undefined) current += w;
        else if (m) { current = current || 1; total += current * m; current = 0; }
      });
      amount = total + current;
    }

    if (!amount) return null;

    // Extract customer name — look for "to", "from", "for" followed by a name
    let customer = '';
    const custMatch = lower.match(/(?:to|from|for|by)\s+([a-z]+(?:\s+[a-z]+)?)/);
    if (custMatch) {
      customer = custMatch[1].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Note is everything after the amount/customer extraction
    const note = text.replace(/\d[\d,]*\s*k?/i, '').replace(/to\s+\w+(\s+\w+)?/i, '').trim().slice(0, 40);

    return { type, amount, customer: customer || 'Customer', note: note || '' };
  },

  confirm() {
    if (!this.parsed) return;
    Storage.addTransaction({
      ...this.parsed,
      paid: this.parsed.type !== 'credit',
      date: new Date().toISOString().split('T')[0]
    });
    closeModal('voice-modal');
    showToast('✅ Voice entry saved!');
    refreshAll();
  }
};
