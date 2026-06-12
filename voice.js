/* voice.js — TradeBook v2 */
const Voice = {
  recognition: null,
  listening: false,
  parsed: null,
  supported: false,

  init() {
    document.getElementById('quick-voice').onclick = () => this.openModal();
    document.getElementById('voice-mic-btn').onclick = () => this.toggle();
    document.getElementById('voice-confirm-btn').onclick = () => this.confirm();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      // Not supported — show manual fallback
      document.getElementById('quick-voice').title = 'Voice: use Chrome for best support';
      this.supported = false;
      return;
    }
    this.supported = true;
    this.recognition = new SR();
    this.recognition.continuous    = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = 'en-NG';

    this.recognition.onresult = e => {
      // Try all alternatives
      for (let i = 0; i < e.results[0].length; i++) {
        const text = e.results[0][i].transcript;
        const parsed = this.parseText(text);
        if (parsed) { this.handleResult(text, parsed); return; }
      }
      // Use first result even if parsing is imperfect
      this.handleResult(e.results[0][0].transcript, this.parseText(e.results[0][0].transcript));
    };

    this.recognition.onend = () => {
      this.listening = false;
      this.setListeningUI(false);
      if (!this.parsed) {
        document.getElementById('voice-status').textContent = 'Did not catch that. Tap mic to try again.';
      }
    };

    this.recognition.onerror = e => {
      this.listening = false;
      this.setListeningUI(false);
      const msgs = {
        'not-allowed':  '⚠️ Microphone access denied. Please allow mic in browser settings.',
        'no-speech':    'No speech detected. Tap mic to try again.',
        'network':      'Network error. Check your connection.',
        'aborted':      'Stopped. Tap mic to try again.',
        'audio-capture':'No microphone found on this device.'
      };
      document.getElementById('voice-status').textContent = msgs[e.error] || `Error: ${e.error}. Try again.`;
    };
  },

  openModal() {
    this.parsed = null;
    this.listening = false;
    this.setListeningUI(false);
    document.getElementById('voice-status').textContent = t('tap_mic');
    document.getElementById('voice-result').style.display = 'none';
    document.getElementById('voice-confirm-btn').style.display = 'none';
    openModal('voice-modal');
  },

  toggle() {
    if (!this.supported) {
      // Fallback: close voice modal, open manual entry
      closeModal('voice-modal');
      showToast('ℹ️ Voice needs Chrome. Opening manual entry...');
      setTimeout(() => Transactions.openModal('sale'), 400);
      return;
    }
    if (this.listening) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.lang = 'en-NG';
        this.recognition.start();
        this.listening = true;
        this.setListeningUI(true);
        document.getElementById('voice-status').textContent = t('listening');
        document.getElementById('voice-result').style.display = 'none';
        document.getElementById('voice-confirm-btn').style.display = 'none';
        this.parsed = null;
      } catch(e) {
        showToast('⚠️ Could not start microphone. Try again.');
      }
    }
  },

  setListeningUI(on) {
    const mic  = document.getElementById('voice-mic-btn');
    const ring = document.querySelector('.voice-ring');
    if (on) { mic.style.background='linear-gradient(135deg,#C0392B,#E74C3C)'; ring.classList.add('listening'); }
    else    { mic.style.background='linear-gradient(135deg,var(--green-mid),var(--green))'; ring.classList.remove('listening'); }
  },

  handleResult(text, parsed) {
    document.getElementById('voice-heard').textContent = text;
    document.getElementById('voice-result').style.display = 'block';

    if (parsed && parsed.amount > 0) {
      this.parsed = parsed;
      const typeLabel = { sale:'Sale', credit:'Credit', expense:'Expense' }[parsed.type];
      document.getElementById('voice-parsed').textContent =
        `→ ${typeLabel}: ${fmt(parsed.amount)}${parsed.customer ? ' for ' + parsed.customer : ''}${parsed.note ? ' (' + parsed.note + ')' : ''}`;
      document.getElementById('voice-status').textContent = '✅ Got it! Confirm to save.';
      document.getElementById('voice-confirm-btn').style.display = 'block';
    } else {
      document.getElementById('voice-parsed').textContent = '⚠️ Could not understand amount. Try again.';
      document.getElementById('voice-status').textContent = 'Tap the mic to try again';
      document.getElementById('voice-confirm-btn').style.display = 'none';
    }
  },

  parseText(text) {
    if (!text) return null;
    const lower = text.toLowerCase().trim();

    // Detect type
    let type = 'sale';
    if (/credit|owe|borrow|owing|debt|gbese|bashi|ụgwọ|riba/.test(lower)) type = 'credit';
    else if (/spend|spent|buy|bought|paid for|expense|levy|ìnáwó|kashe|ihe eji/.test(lower)) type = 'expense';

    // Extract amount
    let amount = 0;
    // Direct digit match with optional comma/k suffix
    const digitMatch = lower.match(/(\d[\d,]*\.?\d*)\s*k\b/);
    const plainMatch = lower.match(/(\d[\d,]*\.?\d*)/);
    if (digitMatch) {
      amount = parseFloat(digitMatch[1].replace(/,/g,'')) * 1000;
    } else if (plainMatch) {
      amount = parseFloat(plainMatch[1].replace(/,/g,''));
    } else {
      // Word numbers
      const words = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
        eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,
        eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,
        eighty:80,ninety:90 };
      const mults = { hundred:100, thousand:1000, million:1000000 };
      let cur=0, tot=0;
      lower.split(/\s+/).forEach(w => {
        if (words[w]!==undefined) cur+=words[w];
        else if (mults[w]) { cur=cur||1; tot+=cur*mults[w]; cur=0; }
      });
      amount = tot + cur;
    }

    // Extract customer name after to/from/for/by
    let customer = '';
    const custMatch = lower.match(/(?:to|from|for|by)\s+([a-z]+(?:\s+[a-z]+){0,2})/);
    if (custMatch) {
      customer = custMatch[1].replace(/\b\w/g, c => c.toUpperCase());
    }

    // Extract note — everything that isn't a number or keyword
    let note = text
      .replace(/\d[\d,]*\.?\d*\s*k?/gi, '')
      .replace(/(?:sold|sale|credit|spend|spent|expense|for|to|from|by|on|naira|₦)/gi, '')
      .replace(/\s{2,}/g, ' ').trim().slice(0, 50);

    return { type, amount, customer: customer || 'Customer', note };
  },

  confirm() {
    if (!this.parsed || !this.parsed.amount) return;
    Storage.addTransaction({
      ...this.parsed,
      paid: this.parsed.type !== 'credit'
    });
    closeModal('voice-modal');
    showToast('✅ Voice entry saved!');
    refreshAll();
  }
};
