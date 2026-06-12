/* js/storage.js — All localStorage operations */

const DB_KEY = 'tradebook_data';

const defaultData = () => ({
  profiles: [{ id: 'default', name: 'My Shop', owner: 'Trader', lang: 'en' }],
  activeProfile: 'default',
  transactions: [],
  recurringTxns: [],
  settings: { darkMode: false, pin: null, onboarded: false }
});

const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return defaultData();
      const data = JSON.parse(raw);
      // ensure recurringTxns exists for older saves
      if (!data.recurringTxns) data.recurringTxns = [];
      return data;
    } catch (e) {
      console.error('Storage load error:', e);
      return defaultData();
    }
  },

  save(data) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  },

  // Transactions
  getTransactions(profileId) {
    const data = this.load();
    return data.transactions.filter(t => t.profileId === profileId);
  },

  addTransaction(txn) {
    const data = this.load();
    const profile = data.activeProfile;
    const newTxn = {
      ...txn,
      id: Date.now().toString(),
      profileId: profile,
      date: txn.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    data.transactions.push(newTxn);
    this.save(data);
    return newTxn;
  },

  updateTransaction(id, updates) {
    const data = this.load();
    const idx = data.transactions.findIndex(t => t.id === id);
    if (idx > -1) {
      data.transactions[idx] = { ...data.transactions[idx], ...updates };
      this.save(data);
    }
  },

  deleteTransaction(id) {
    const data = this.load();
    data.transactions = data.transactions.filter(t => t.id !== id);
    this.save(data);
  },

  markPaid(id) {
    this.updateTransaction(id, { paid: true });
  },

  // Profiles
  getProfiles() { return this.load().profiles; },
  getActiveProfile() {
    const data = this.load();
    return data.profiles.find(p => p.id === data.activeProfile) || data.profiles[0];
  },

  addProfile(name) {
    const data = this.load();
    const profile = { id: 'p_' + Date.now(), name, owner: name, lang: 'en' };
    data.profiles.push(profile);
    this.save(data);
    return profile;
  },

  deleteProfile(id) {
    const data = this.load();
    if (data.profiles.length <= 1) return false;
    data.profiles = data.profiles.filter(p => p.id !== id);
    data.transactions = data.transactions.filter(t => t.profileId !== id);
    if (data.activeProfile === id) data.activeProfile = data.profiles[0].id;
    this.save(data);
    return true;
  },

  switchProfile(id) {
    const data = this.load();
    data.activeProfile = id;
    this.save(data);
  },

  updateProfile(id, updates) {
    const data = this.load();
    const idx = data.profiles.findIndex(p => p.id === id);
    if (idx > -1) data.profiles[idx] = { ...data.profiles[idx], ...updates };
    this.save(data);
  },

  // Settings
  getSettings()          { return this.load().settings; },
  setSetting(key, val)   {
    const data = this.load();
    data.settings[key] = val;
    this.save(data);
  },

  // Recurring
  getRecurring(profileId) {
    const data = this.load();
    return (data.recurringTxns || []).filter(r => r.profileId === profileId);
  },

  addRecurring(txn) {
    const data = this.load();
    if (!data.recurringTxns) data.recurringTxns = [];
    data.recurringTxns.push({ ...txn, id: 'r_' + Date.now(), profileId: data.activeProfile });
    this.save(data);
  },

  deleteRecurring(id) {
    const data = this.load();
    data.recurringTxns = (data.recurringTxns || []).filter(r => r.id !== id);
    this.save(data);
  },

  // Process due recurring transactions (run on app load)
  processRecurring() {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];
    let changed = false;
    (data.recurringTxns || []).forEach(r => {
      const last = r.lastRun || r.date;
      if (this._isDue(last, r.freq, today)) {
        data.transactions.push({
          id: Date.now().toString() + Math.random(),
          profileId: r.profileId,
          type: r.type,
          customer: r.customer,
          amount: r.amount,
          note: r.note + ' (recurring)',
          category: r.category,
          date: today,
          paid: r.type !== 'credit',
          createdAt: new Date().toISOString()
        });
        r.lastRun = today;
        changed = true;
      }
    });
    if (changed) this.save(data);
  },

  _isDue(lastRun, freq, today) {
    if (!lastRun || lastRun === today) return false;
    const last = new Date(lastRun);
    const now  = new Date(today);
    const diff = (now - last) / (1000 * 60 * 60 * 24);
    if (freq === 'daily'   && diff >= 1)  return true;
    if (freq === 'weekly'  && diff >= 7)  return true;
    if (freq === 'monthly' && diff >= 28) return true;
    return false;
  },

  // Full export
  exportJSON() {
    const data = this.load();
    const profile = data.profiles.find(p => p.id === data.activeProfile);
    const txns = data.transactions.filter(t => t.profileId === data.activeProfile);
    return JSON.stringify({ profile, transactions: txns, exportedAt: new Date().toISOString() }, null, 2);
  },

  exportCSV() {
    const data = this.load();
    const txns = data.transactions.filter(t => t.profileId === data.activeProfile);
    const headers = ['Date','Type','Customer','Amount','Category','Note','Paid'];
    const rows = txns.map(t => [
      t.date, t.type, `"${t.customer}"`, t.amount,
      t.category || 'general', `"${t.note || ''}"`, t.paid ? 'Yes' : 'No'
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  importJSON(jsonStr, merge = true) {
    try {
      const imported = JSON.parse(jsonStr);
      const data = this.load();
      if (!merge) {
        // replace transactions for active profile
        data.transactions = data.transactions.filter(t => t.profileId !== data.activeProfile);
      }
      const txns = (imported.transactions || []).map(t => ({
        ...t, profileId: data.activeProfile, id: 'imp_' + Date.now() + Math.random()
      }));
      data.transactions.push(...txns);
      this.save(data);
      return txns.length;
    } catch (e) {
      return -1;
    }
  },

  clearProfile() {
    const data = this.load();
    data.transactions = data.transactions.filter(t => t.profileId !== data.activeProfile);
    data.recurringTxns = (data.recurringTxns || []).filter(r => r.profileId !== data.activeProfile);
    this.save(data);
  }
};
/* js/translations.js */

const TRANSLATIONS = {
  en: {
    greeting_morning: 'Good morning',
    greeting_afternoon: 'Good afternoon',
    greeting_evening: 'Good evening',
    today_sales: "Today's Sales",
    expenses: 'Expenses',
    on_credit: 'On Credit',
    total_owed: 'Total Owed',
    i_sold: 'I Sold',
    on_credit_btn: 'On Credit',
    i_spent: 'I Spent',
    voice: 'Voice',
    recent_txns: 'Recent Transactions',
    see_all: 'See all',
    debt_book: 'Debt Book 📋',
    debt_sub: 'Track who owes you money',
    all_txns: 'All Transactions 📜',
    reports: 'Reports 📊',
    settings: 'Settings ⚙️',
    save_txn: '✅ Save Transaction',
    total_sales: 'Total Sales',
    net_profit: 'Net Profit',
    unpaid_credit: 'Unpaid Credit',
    daily_sales: 'Daily Sales',
    owed_alert: 'You are owed',
    in_unpaid_credit: 'in unpaid credit',
    mark_paid: 'Mark Paid',
    paid: '✓ Paid',
    owing: 'Owing',
    send_wa: '📲 Send WhatsApp Reminder to',
    share_report: '📲 Share Report on WhatsApp',
    sale: 'Sale', credit: 'Credit', expense: 'Expense',
    no_txns: 'No transactions yet',
    no_txns_sub: 'Tap a button above to record your first sale',
    no_debts: 'No debts recorded',
    no_debts_sub: 'Credit sales will appear here',
    debtors: 'Debtors', recovered: 'Recovered',
    still_owes: 'still owes', all_cleared: 'all cleared',
    transactions: 'transaction', transactions_pl: 'transactions',
  },
  yo: {
    greeting_morning: 'Ẹ káàárọ̀',
    greeting_afternoon: 'Ẹ káàárọ̀',
    greeting_evening: 'Ẹ kúirọlẹ́',
    today_sales: "Tita Ọjọ́ Oni",
    expenses: 'Ìnáwó',
    on_credit: 'Gbèsè',
    total_owed: 'Iye Gbèsè',
    i_sold: 'Mo tà',
    on_credit_btn: 'Gbèsè',
    i_spent: 'Mo na',
    voice: 'Ohùn',
    recent_txns: 'Iṣòwò tó kọjá',
    debt_book: 'Ìwé Gbèsè 📋',
    debt_sub: 'Ẹni tó jẹ ọ lára',
    save_txn: '✅ Fipamọ́',
    mark_paid: 'Sọ pé o san',
    paid: '✓ Ti san', owing: 'O jẹ',
    sale: 'Tita', credit: 'Gbèsè', expense: 'Ìnáwó',
  },
  ig: {
    greeting_morning: 'Ụtụtụ ọma',
    greeting_afternoon: 'Ehihie ọma',
    greeting_evening: 'Anyasị ọma',
    today_sales: "Ahịa Taa",
    expenses: 'Ihe eji',
    on_credit: 'Ụgwọ',
    total_owed: 'Ụgwọ Niile',
    i_sold: 'Ere m',
    on_credit_btn: 'Ụgwọ',
    i_spent: 'Nwere m',
    voice: 'Olu',
    recent_txns: 'Ahịa Ndị Ọhụrụ',
    debt_book: 'Akwụkwọ Ụgwọ 📋',
    debt_sub: 'Ndị na-etinye gi ego',
    save_txn: '✅ Chekwaa',
    mark_paid: 'Gosi na atụfu',
    paid: '✓ Akwụọla', owing: 'Na-enye ụgwọ',
    sale: 'Ahịa', credit: 'Ụgwọ', expense: 'Ihe eji',
  },
  ha: {
    greeting_morning: 'Ina kwana',
    greeting_afternoon: 'Barka da rana',
    greeting_evening: 'Barka da yamma',
    today_sales: "Kasuwancin Yau",
    expenses: 'Kashe kuɗi',
    on_credit: 'Bashi',
    total_owed: 'Yawan Bashi',
    i_sold: 'Na sayar',
    on_credit_btn: 'Bashi',
    i_spent: 'Na kashe',
    voice: 'Murya',
    recent_txns: 'Mu\'amaloli na Kwanan Nan',
    debt_book: 'Littafin Bashi 📋',
    debt_sub: 'Waɗanda ke bin ka kuɗi',
    save_txn: '✅ Adana',
    mark_paid: 'Nuna an biya',
    paid: '✓ An biya', owing: 'Yana bashi',
    sale: 'Sayarwa', credit: 'Bashi', expense: 'Kashe kuɗi',
  }
};

function t(key) {
  const lang = Storage.getActiveProfile()?.lang || 'en';
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.en[key] || key;
}
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
/* js/transactions.js */

const Transactions = {
  currentType: 'sale',
  editingId: null,

  init() {
    // Quick action buttons
    document.getElementById('quick-sale').onclick    = () => this.openModal('sale');
    document.getElementById('quick-credit').onclick  = () => this.openModal('credit');
    document.getElementById('quick-expense').onclick = () => this.openModal('expense');

    // Type selector
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.onclick = () => this.setType(btn.dataset.type);
    });

    // Recurring checkbox
    document.getElementById('txn-recurring').onchange = (e) => {
      document.getElementById('recurring-options').style.display = e.target.checked ? 'block' : 'none';
    };

    // Save button
    document.getElementById('save-txn-btn').onclick = () => this.save();

    // See all
    document.getElementById('see-all-btn').onclick = () => switchTab('history');
  },

  openModal(type = 'sale', txnId = null) {
    this.editingId = txnId;
    this.setType(type);

    if (txnId) {
      // populate for edit
      const profile = Storage.getActiveProfile();
      const txn = Storage.getTransactions(profile.id).find(t => t.id === txnId);
      if (txn) {
        document.getElementById('txn-customer').value  = txn.customer || '';
        document.getElementById('txn-amount').value    = txn.amount || '';
        document.getElementById('txn-note').value      = txn.note || '';
        document.getElementById('txn-category').value  = txn.category || 'general';
        document.getElementById('txn-modal-title').textContent = 'Edit Transaction';
        document.getElementById('save-txn-btn').textContent = '✅ Update Transaction';
        this.setType(txn.type);
      }
    } else {
      document.getElementById('txn-customer').value  = '';
      document.getElementById('txn-amount').value    = '';
      document.getElementById('txn-note').value      = '';
      document.getElementById('txn-category').value  = 'general';
      document.getElementById('txn-modal-title').textContent = 'Record Transaction';
      document.getElementById('save-txn-btn').textContent = '✅ Save Transaction';
      document.getElementById('txn-recurring').checked = false;
      document.getElementById('recurring-options').style.display = 'none';
    }

    // Populate autocomplete with known customer names
    this.refreshSuggestions();
    openModal('txn-modal');
    setTimeout(() => document.getElementById('txn-customer').focus(), 300);
  },

  setType(type) {
    this.currentType = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  },

  save() {
    const customer = document.getElementById('txn-customer').value.trim();
    const amount   = parseFloat(document.getElementById('txn-amount').value);
    const note     = document.getElementById('txn-note').value.trim();
    const category = document.getElementById('txn-category').value;
    const isRecur  = document.getElementById('txn-recurring').checked;
    const recurFreq = document.getElementById('recur-freq').value;

    if (!customer) { showToast('⚠️ Please enter a customer name'); return; }
    if (!amount || amount <= 0) { showToast('⚠️ Please enter a valid amount'); return; }

    const txnData = {
      type: this.currentType,
      customer,
      amount,
      note,
      category,
      paid: this.currentType !== 'credit',
      date: new Date().toISOString().split('T')[0]
    };

    if (this.editingId) {
      Storage.updateTransaction(this.editingId, txnData);
      showToast('✅ Transaction updated');
    } else {
      Storage.addTransaction(txnData);
      if (isRecur) {
        Storage.addRecurring({ ...txnData, freq: recurFreq });
        showToast('✅ Saved + set to repeat');
      } else {
        showToast('✅ Transaction saved');
      }
    }

    closeModal('txn-modal');
    refreshAll();
  },

  refreshSuggestions() {
    const profile = Storage.getActiveProfile();
    const txns = Storage.getTransactions(profile.id);
    const names = [...new Set(txns.map(t => t.customer).filter(Boolean))];
    const dl = document.getElementById('customer-suggestions');
    dl.innerHTML = names.map(n => `<option value="${n}">`).join('');
  },

  renderList(containerId, txns, limit = 999) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const shown = txns.slice(0, limit);
    if (!shown.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-icon">📝</p>
          <p class="empty-text">${t('no_txns')}</p>
          <p class="empty-sub">${t('no_txns_sub')}</p>
        </div>`;
      return;
    }

    const icons = { sale: '💰', credit: '📋', expense: '🧾' };
    const labels = { sale: t('sale'), credit: t('credit'), expense: t('expense') };

    container.innerHTML = shown.map(txn => `
      <div class="txn-card" data-id="${txn.id}" id="txn-${txn.id}">
        <div class="txn-icon ${txn.type}">${icons[txn.type]}</div>
        <div class="txn-info">
          <p class="txn-name">${esc(txn.customer)}</p>
          <div class="txn-meta">
            <span>${esc(txn.note || '—')} · ${shortDate(txn.date)}</span>
          </div>
        </div>
        <div class="txn-right">
          <p class="txn-amount ${txn.type}">${txn.type === 'expense' ? '-' : '+'}${fmt(txn.amount)}</p>
          <span class="status-badge ${txn.type === 'credit' ? (txn.paid ? 'paid' : 'owing') : 'expense-badge'}">
            ${txn.type === 'credit' ? (txn.paid ? t('paid') : t('owing')) : labels[txn.type]}
          </span>
          <div class="txn-actions">
            <button class="txn-edit-btn" data-id="${txn.id}" data-type="${txn.type}">✏️ Edit</button>
            <button class="txn-del-btn"  data-id="${txn.id}">🗑️ Delete</button>
          </div>
        </div>
      </div>
    `).join('');

    // Long press to reveal edit/delete
    container.querySelectorAll('.txn-card').forEach(card => {
      let pressTimer;
      card.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => card.classList.toggle('editing'), 500);
      });
      card.addEventListener('touchend', () => clearTimeout(pressTimer));
      card.addEventListener('mousedown', () => {
        pressTimer = setTimeout(() => card.classList.toggle('editing'), 500);
      });
      card.addEventListener('mouseup', () => clearTimeout(pressTimer));
    });

    container.querySelectorAll('.txn-edit-btn').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this.openModal(btn.dataset.type, btn.dataset.id); };
    });
    container.querySelectorAll('.txn-del-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('Delete this transaction?')) {
          Storage.deleteTransaction(btn.dataset.id);
          showToast('🗑️ Deleted');
          refreshAll();
        }
      };
    });
  }
};

// Helpers
function fmt(n)       { return '₦' + Number(n).toLocaleString('en-NG'); }
function esc(str)     { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
function shortDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}
/* js/debts.js */

const Debts = {
  init() {
    // nothing to bind at init — rendered dynamically
  },

  render() {
    const profile = Storage.getActiveProfile();
    const txns = Storage.getTransactions(profile.id).filter(t => t.type === 'credit');

    // Build debtor map
    const debtorMap = {};
    txns.forEach(t => {
      if (!debtorMap[t.customer]) {
        debtorMap[t.customer] = { name: t.customer, total: 0, paid: 0, items: [] };
      }
      debtorMap[t.customer].items.push(t);
      debtorMap[t.customer].total += t.amount;
      if (t.paid) debtorMap[t.customer].paid += t.amount;
    });

    const debtors = Object.values(debtorMap).sort((a, b) => (b.total - b.paid) - (a.total - a.paid));
    const totalOwed = debtors.reduce((s, d) => s + (d.total - d.paid), 0);
    const totalRecovered = debtors.reduce((s, d) => s + d.paid, 0);

    // Summary bar
    document.getElementById('total-debtors').textContent  = debtors.length;
    document.getElementById('total-owed').textContent     = fmt(totalOwed);
    document.getElementById('total-recovered').textContent = fmt(totalRecovered);

    const container = document.getElementById('debtor-list');
    if (!debtors.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-icon">🤝</p>
          <p class="empty-text">${t('no_debts')}</p>
          <p class="empty-sub">${t('no_debts_sub')}</p>
        </div>`;
      return;
    }

    container.innerHTML = debtors.map((d, idx) => {
      const owed = d.total - d.paid;
      const isCleared = owed <= 0;
      const txnWord = d.items.length === 1
        ? (t('transactions') || 'transaction')
        : (t('transactions_pl') || 'transactions');

      return `
        <div class="debtor-card">
          <div class="debtor-head" data-idx="${idx}">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="debtor-avatar ${isCleared ? 'green-av' : 'red-av'}">${d.name[0].toUpperCase()}</div>
              <div>
                <p class="debtor-name">${esc(d.name)}</p>
                <p class="debtor-count">${d.items.length} ${txnWord}</p>
              </div>
            </div>
            <div style="text-align:right">
              <p class="debtor-owed ${isCleared ? 'green' : 'red'}">${fmt(owed)}</p>
              <p class="debtor-status">${isCleared ? t('all_cleared') : t('still_owes')}</p>
            </div>
          </div>
          <div class="debtor-items" id="debtor-items-${idx}">
            ${d.items.map(item => `
              <div class="debtor-item">
                <div>
                  <p class="debtor-item-note">${esc(item.note || 'Transaction')}</p>
                  <p class="debtor-item-date">${shortDate(item.date)} · ${fmt(item.amount)}</p>
                </div>
                ${!item.paid
                  ? `<button class="mark-paid-btn" data-id="${item.id}">${t('mark_paid')}</button>`
                  : `<span style="color:var(--green-mid);font-weight:700;font-size:13px">${t('paid')}</span>`
                }
              </div>
            `).join('')}
            ${!isCleared ? `
              <button class="debtor-wa-btn" data-name="${esc(d.name)}" data-amount="${fmt(owed)}">
                📲 ${t('send_wa')} ${esc(d.name.split(' ')[0])}
              </button>` : ''}
          </div>
        </div>`;
    }).join('');

    // Toggle expand/collapse
    container.querySelectorAll('.debtor-head').forEach(head => {
      head.onclick = () => {
        const idx = head.dataset.idx;
        const items = document.getElementById(`debtor-items-${idx}`);
        items.classList.toggle('open');
      };
    });

    // Mark paid
    container.querySelectorAll('.mark-paid-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        Storage.markPaid(btn.dataset.id);
        showToast('✅ Marked as paid!');
        refreshAll();
      };
    });

    // WhatsApp reminder
    container.querySelectorAll('.debtor-wa-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const shopName = Storage.getActiveProfile().name;
        const msg = encodeURIComponent(
          `Hello ${btn.dataset.name}, this is a reminder from ${shopName}.\n\nYour outstanding balance is *${btn.dataset.amount}*.\n\nKindly pay when convenient. Thank you! 🙏`
        );
        window.open(`https://wa.me/?text=${msg}`, '_blank');
      };
    });
  }
};
/* js/reports.js */

const Reports = {
  period: 'week',

  init() {
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.period = btn.dataset.period;
        this.render();
      };
    });

    document.getElementById('share-report').onclick = () => this.shareWhatsApp();
  },

  filterTxns(txns) {
    const now = new Date();
    return txns.filter(t => {
      const d = new Date(t.date + 'T12:00:00');
      if (this.period === 'week') {
        const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
      }
      if (this.period === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true; // all
    });
  },

  render() {
    const profile = Storage.getActiveProfile();
    const all = Storage.getTransactions(profile.id);
    const txns = this.filterTxns(all);

    const sales    = txns.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0);
    const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const unpaid   = txns.filter(t => t.type === 'credit' && !t.paid).reduce((s, t) => s + t.amount, 0);
    const profit   = sales - expenses;

    document.getElementById('rpt-sales').textContent    = fmt(sales);
    document.getElementById('rpt-profit').textContent   = fmt(profit);
    document.getElementById('rpt-expenses').textContent = fmt(expenses);
    document.getElementById('rpt-credit').textContent   = fmt(unpaid);

    // Colour profit card dynamically
    const profitCard = document.getElementById('rpt-profit').closest('.kpi-card');
    profitCard.style.background = profit >= 0 ? '#E8F5E9' : 'var(--red-light)';
    document.getElementById('rpt-profit').style.color = profit >= 0 ? 'var(--green-mid)' : 'var(--red)';

    this.renderBarChart(txns);
    this.renderCategories(txns);
  },

  renderBarChart(txns) {
    // Get last 7 distinct dates
    const dateSet = [...new Set(txns.map(t => t.date))].sort().slice(-7);
    const container = document.getElementById('bar-chart');
    if (!dateSet.length) { container.innerHTML = '<p class="empty-sub" style="text-align:center;padding:20px">No data yet</p>'; return; }

    const maxVal = Math.max(...dateSet.map(d =>
      txns.filter(t => t.date === d && t.type === 'sale').reduce((s, t) => s + t.amount, 0)
    ), 1);

    container.innerHTML = dateSet.map(d => {
      const val = txns.filter(t => t.date === d && t.type === 'sale').reduce((s, t) => s + t.amount, 0);
      const pct = Math.max(6, (val / maxVal) * 88);
      const label = shortDate(d);
      const valLabel = val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toString();
      return `
        <div class="bar-wrap">
          <p class="bar-val">${valLabel}</p>
          <div class="bar-fill" style="height:${pct}px"></div>
          <p class="bar-label">${label}</p>
        </div>`;
    }).join('');
  },

  renderCategories(txns) {
    const expenses = txns.filter(t => t.type === 'expense');
    const catMap = {};
    expenses.forEach(t => {
      const c = t.category || 'general';
      catMap[c] = (catMap[c] || 0) + t.amount;
    });

    const catLabels = {
      general: 'General', food: 'Food', transport: 'Transport',
      shopping: 'Shopping', bills: 'Bills', salary: 'Salary',
      business: 'Business', other: 'Other'
    };

    const container = document.getElementById('cat-breakdown');
    const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const maxCat = entries[0]?.[1] || 1;

    if (!entries.length) {
      container.innerHTML = '<p class="empty-sub" style="text-align:center;padding:10px">No expenses recorded</p>';
      return;
    }

    container.innerHTML = entries.map(([cat, val]) => `
      <div class="cat-row">
        <p class="cat-name">${catLabels[cat] || cat}</p>
        <div class="cat-bar-wrap">
          <div class="cat-bar-fill" style="width:${(val / maxCat) * 100}%"></div>
        </div>
        <p class="cat-val">${fmt(val)}</p>
      </div>`).join('');
  },

  shareWhatsApp() {
    const profile = Storage.getActiveProfile();
    const all = Storage.getTransactions(profile.id);
    const txns = this.filterTxns(all);

    const sales    = txns.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0);
    const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const unpaid   = txns.filter(t => t.type === 'credit' && !t.paid).reduce((s, t) => s + t.amount, 0);
    const profit   = sales - expenses;
    const periodLabel = { week: 'This Week', month: 'This Month', all: 'All Time' }[this.period];

    const msg = `📊 *${profile.name} — ${periodLabel} Report*\n\n` +
      `💰 Total Sales: *${fmt(sales)}*\n` +
      `🧾 Total Expenses: *${fmt(expenses)}*\n` +
      `📈 Net Profit: *${fmt(profit)}*\n` +
      `📋 Unpaid Credit: *${fmt(unpaid)}*\n\n` +
      `_Generated by TradeBook 📒_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }
};
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
/* js/settings.js */

const Settings = {
  init() {
    // Dark mode toggle (header button + settings toggle stay in sync)
    const dmToggle = document.getElementById('dark-mode-toggle');
    dmToggle.onchange = () => this.setDarkMode(dmToggle.checked);
    document.getElementById('dark-toggle').onclick = () => {
      const next = !dmToggle.checked;
      dmToggle.checked = next;
      this.setDarkMode(next);
    };

    // Edit shop
    document.getElementById('edit-shop-row').onclick  = () => this.openEditShop();
    document.getElementById('edit-owner-row').onclick = () => this.openEditShop();
    document.getElementById('save-shop-btn').onclick  = () => this.saveShop();

    // Language
    document.getElementById('settings-lang').onchange = (e) => {
      const profile = Storage.getActiveProfile();
      Storage.updateProfile(profile.id, { lang: e.target.value });
      refreshAll();
      showToast('✅ Language updated');
    };

    // PIN
    document.getElementById('set-pin-row').onclick    = () => Pin.initSetPin();
    document.getElementById('remove-pin-row').onclick = () => {
      if (confirm('Remove PIN protection?')) {
        Storage.setSetting('pin', null);
        showToast('🔓 PIN removed');
      }
    };

    // Profiles
    document.getElementById('add-profile-btn').onclick = () => {
      const name = document.getElementById('new-profile-input').value.trim();
      if (!name) { showToast('⚠️ Enter a profile name'); return; }
      Storage.addProfile(name);
      document.getElementById('new-profile-input').value = '';
      this.renderProfiles();
      showToast('✅ Profile added');
    };

    // Export
    document.getElementById('export-json-btn').onclick = () => this.exportJSON();
    document.getElementById('export-csv-btn').onclick  = () => this.exportCSV();
    document.getElementById('import-btn-row').onclick  = () => document.getElementById('import-file').click();
    document.getElementById('import-file').onchange    = (e) => this.importFile(e);

    // Clear data
    document.getElementById('clear-data-btn').onclick = () => {
      if (confirm('⚠️ This will delete ALL transactions for the current profile. Are you sure?')) {
        if (confirm('Really? This cannot be undone.')) {
          Storage.clearProfile();
          refreshAll();
          showToast('🗑️ Data cleared');
        }
      }
    };

    // Profile modal (header button)
    document.getElementById('profile-btn').onclick = () => {
      this.renderProfileModal();
      openModal('profile-modal');
    };
  },

  render() {
    const profile  = Storage.getActiveProfile();
    const settings = Storage.getSettings();

    document.getElementById('settings-shop-name').textContent  = profile.name;
    document.getElementById('settings-owner-name').textContent = profile.owner;
    document.getElementById('settings-lang').value             = profile.lang || 'en';
    document.getElementById('dark-mode-toggle').checked        = settings.darkMode || false;

    this.renderProfiles();
    this.renderRecurring();
  },

  renderProfiles() {
    const profiles = Storage.getProfiles();
    const active   = Storage.getActiveProfile();
    const list     = document.getElementById('profile-list');

    list.innerHTML = profiles.map(p => `
      <div class="profile-item">
        <span class="profile-name ${p.id === active.id ? 'active-profile' : ''}" data-id="${p.id}" style="cursor:pointer">
          ${p.id === active.id ? '✓ ' : ''}${esc(p.name)}
        </span>
        ${profiles.length > 1
          ? `<button class="del-profile-btn" data-id="${p.id}" title="Delete profile">×</button>`
          : ''}
      </div>`).join('');

    list.querySelectorAll('.profile-name[data-id]').forEach(el => {
      el.onclick = () => { Storage.switchProfile(el.dataset.id); refreshAll(); showToast('✅ Switched profile'); };
    });
    list.querySelectorAll('.del-profile-btn').forEach(btn => {
      btn.onclick = () => {
        if (confirm('Delete this profile and all its data?')) {
          if (!Storage.deleteProfile(btn.dataset.id)) { showToast('⚠️ Cannot delete last profile'); return; }
          this.renderProfiles();
          refreshAll();
          showToast('🗑️ Profile deleted');
        }
      };
    });
  },

  renderProfileModal() {
    const profiles = Storage.getProfiles();
    const active   = Storage.getActiveProfile();
    const list     = document.getElementById('modal-profile-list');

    list.innerHTML = profiles.map(p => `
      <div class="modal-profile-item" data-id="${p.id}">
        <div class="mpf-avatar">${p.name[0].toUpperCase()}</div>
        <p class="mpf-name">${esc(p.name)}</p>
        ${p.id === active.id ? '<span class="mpf-check">✓</span>' : ''}
      </div>`).join('');

    list.querySelectorAll('.modal-profile-item').forEach(el => {
      el.onclick = () => {
        Storage.switchProfile(el.dataset.id);
        closeModal('profile-modal');
        refreshAll();
        showToast('✅ Switched to ' + Storage.getActiveProfile().name);
      };
    });
  },

  renderRecurring() {
    const profile = Storage.getActiveProfile();
    const list    = Storage.getRecurring(profile.id);
    const el      = document.getElementById('recurring-list');

    if (!list.length) {
      el.innerHTML = '<p class="empty-sub">No recurring transactions set</p>';
      return;
    }

    const freqLabel = { daily: 'Every day', weekly: 'Every week', monthly: 'Every month' };
    el.innerHTML = list.map(r => `
      <div class="recurring-item">
        <div>
          <p style="font-size:14px;font-weight:600;color:var(--ink)">${esc(r.customer)} — ${fmt(r.amount)}</p>
          <p style="font-size:12px;color:var(--muted)">${freqLabel[r.freq] || r.freq}</p>
        </div>
        <button class="txn-del-btn" style="padding:6px 12px;border-radius:8px;font-size:12px" data-id="${r.id}">Remove</button>
      </div>`).join('');

    el.querySelectorAll('.txn-del-btn').forEach(btn => {
      btn.onclick = () => { Storage.deleteRecurring(btn.dataset.id); this.renderRecurring(); showToast('✅ Removed'); };
    });
  },

  setDarkMode(on) {
    document.body.classList.toggle('dark', on);
    Storage.setSetting('darkMode', on);
    document.getElementById('dark-toggle').textContent = on ? '☀️' : '🌙';
    document.getElementById('dark-mode-toggle').checked = on;
  },

  openEditShop() {
    const p = Storage.getActiveProfile();
    document.getElementById('edit-shop-name').value  = p.name;
    document.getElementById('edit-owner-name').value = p.owner;
    openModal('edit-shop-modal');
  },

  saveShop() {
    const name  = document.getElementById('edit-shop-name').value.trim();
    const owner = document.getElementById('edit-owner-name').value.trim();
    if (!name)  { showToast('⚠️ Shop name required'); return; }
    const p = Storage.getActiveProfile();
    Storage.updateProfile(p.id, { name, owner });
    closeModal('edit-shop-modal');
    refreshAll();
    showToast('✅ Shop details updated');
  },

  exportJSON() {
    const json     = Storage.exportJSON();
    const blob     = new Blob([json], { type: 'application/json' });
    const url      = URL.createObjectURL(blob);
    const profile  = Storage.getActiveProfile();
    const filename = `tradebook-${profile.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
    triggerDownload(url, filename);
    showToast('💾 JSON exported');
  },

  exportCSV() {
    const csv      = Storage.exportCSV();
    const blob     = new Blob([csv], { type: 'text/csv' });
    const url      = URL.createObjectURL(blob);
    const profile  = Storage.getActiveProfile();
    const filename = `tradebook-${profile.name.replace(/\s+/g, '-')}-${Date.now()}.csv`;
    triggerDownload(url, filename);
    showToast('📊 CSV exported');
  },

  importFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const count = Storage.importJSON(ev.target.result, true);
      if (count < 0) { showToast('⚠️ Invalid file format'); }
      else { refreshAll(); showToast(`✅ Imported ${count} transactions`); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
};

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/* js/app.js — Main orchestrator */

/* ═══════════════════════════════════════════
   Screen & Modal helpers
═══════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id + '-screen')?.classList.add('active');
  // Special: app screen is #app, not #app-screen
  if (id === 'app') {
    document.getElementById('app').classList.add('active');
    document.querySelectorAll('.screen').forEach(s => { if (s.id !== 'app') s.classList.remove('active'); });
    document.getElementById('app').style.display = 'flex';
  }
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

function showToast(msg, duration = 2400) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/* ═══════════════════════════════════════════
   Tab switching
═══════════════════════════════════════════ */
function switchTab(id) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  // Re-render tab-specific views
  if (id === 'home')     renderHome();
  if (id === 'debts')    Debts.render();
  if (id === 'history')  renderHistory();
  if (id === 'reports')  Reports.render();
  if (id === 'settings') Settings.render();
}

/* ═══════════════════════════════════════════
   Home tab render
═══════════════════════════════════════════ */
function renderHome() {
  const profile = Storage.getActiveProfile();
  const txns    = Storage.getTransactions(profile.id);

  // Greeting
  const h = new Date().getHours();
  const greetKey = h < 12 ? 'greeting_morning' : h < 17 ? 'greeting_afternoon' : 'greeting_evening';
  document.getElementById('greeting').textContent = `${t(greetKey)}, ${profile.owner} 👋`;
  document.getElementById('shop-display').textContent = profile.name;

  // Today stats
  const todayStr = new Date().toISOString().split('T')[0];
  const today    = txns.filter(tx => tx.date === todayStr);
  const sales    = today.filter(tx => tx.type === 'sale').reduce((s, tx) => s + tx.amount, 0);
  const expenses = today.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const credit   = today.filter(tx => tx.type === 'credit').reduce((s, tx) => s + tx.amount, 0);
  const totalDebt = txns.filter(tx => tx.type === 'credit' && !tx.paid).reduce((s, tx) => s + tx.amount, 0);

  document.getElementById('today-sales').textContent    = fmt(sales);
  document.getElementById('today-expenses').textContent = fmt(expenses);
  document.getElementById('today-credit').textContent   = fmt(credit);
  document.getElementById('total-debt').textContent     = fmt(totalDebt);

  // Debt alert
  const alert = document.getElementById('debt-alert');
  if (totalDebt > 0) {
    alert.style.display = 'flex';
    document.getElementById('debt-alert-text').innerHTML =
      `You are owed <strong>${fmt(totalDebt)}</strong> in unpaid credit`;
  } else {
    alert.style.display = 'none';
  }

  // Recent transactions (latest 10)
  const sorted = [...txns].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  Transactions.renderList('txn-list', sorted, 10);
}

/* ═══════════════════════════════════════════
   History tab render
═══════════════════════════════════════════ */
function renderHistory() {
  const profile  = Storage.getActiveProfile();
  const allTxns  = Storage.getTransactions(profile.id);
  const sorted   = [...allTxns].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

  // Active filter
  const activeFilter = document.querySelector('.pill.active')?.dataset.filter || 'all';
  const searchTerm   = document.getElementById('history-search').value.toLowerCase();

  const filtered = sorted.filter(tx => {
    const matchType   = activeFilter === 'all' || tx.type === activeFilter;
    const matchSearch = !searchTerm ||
      tx.customer.toLowerCase().includes(searchTerm) ||
      (tx.note || '').toLowerCase().includes(searchTerm);
    return matchType && matchSearch;
  });

  Transactions.renderList('history-list', filtered);
}

/* ═══════════════════════════════════════════
   Refresh all visible data
═══════════════════════════════════════════ */
function refreshAll() {
  const activeTab = document.querySelector('.tab-content.active')?.id?.replace('tab-', '') || 'home';
  renderHome();
  if (activeTab === 'debts')    Debts.render();
  if (activeTab === 'history')  renderHistory();
  if (activeTab === 'reports')  Reports.render();
  if (activeTab === 'settings') Settings.render();
}

/* ═══════════════════════════════════════════
   Onboarding
═══════════════════════════════════════════ */
const Onboard = {
  slide: 0,
  total: 4,

  init() {
    this.show(0);
    document.getElementById('onboard-next').onclick = () => this.next();
  },

  show(idx) {
    document.querySelectorAll('.onboard-slide').forEach((s, i) => s.classList.toggle('active', i === idx));
    document.querySelectorAll('.onboard-dots span').forEach((d, i) => d.classList.toggle('active', i === idx));
    const isLast = idx === this.total - 1;
    document.getElementById('onboard-next').textContent = isLast ? '🚀 Get Started' : 'Next →';
  },

  next() {
    if (this.slide < this.total - 1) {
      this.slide++;
      this.show(this.slide);
    } else {
      this.finish();
    }
  },

  finish() {
    const shopName  = document.getElementById('shop-name-input').value.trim() || 'My Shop';
    const ownerName = document.getElementById('owner-name-input').value.trim() || 'Trader';
    const lang      = document.getElementById('lang-select').value;
    const data = Storage.load();
    data.profiles[0].name  = shopName;
    data.profiles[0].owner = ownerName;
    data.profiles[0].lang  = lang;
    data.settings.onboarded = true;
    Storage.save(data);
    showScreen('app');
    refreshAll();
    showToast(`🎉 Welcome, ${ownerName}!`);
  }
};

/* ═══════════════════════════════════════════
   Bootstrap
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  // Process recurring transactions
  Storage.processRecurring();

  // Init all modules
  Transactions.init();
  Debts.init();
  Reports.init();
  Voice.init();
  Settings.init();
  Onboard.init();

  // Nav tabs
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  // Modal close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.onclick = () => closeModal(btn.dataset.close);
  });

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(overlay.id); };
  });

  // History filters
  document.querySelectorAll('.pill').forEach(pill => {
    pill.onclick = () => {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderHistory();
    };
  });

  // History search
  document.getElementById('history-search').oninput = () => renderHistory();

  // Apply saved dark mode
  const settings = Storage.getSettings();
  if (settings.darkMode) Settings.setDarkMode(true);

  // Seed demo data on first launch
  const data = Storage.load();
  if (data.settings.onboarded && data.transactions.length === 0) {
    seedDemoData();
  }

  // Route to correct screen
  Pin.init();
});

/* ═══════════════════════════════════════════
   Demo seed data (first run only)
═══════════════════════════════════════════ */
function seedDemoData() {
  const pid = Storage.load().activeProfile;
  const base = new Date();
  const day = (offset) => {
    const d = new Date(base);
    d.setDate(d.getDate() - offset);
    return d.toISOString().split('T')[0];
  };

  const demos = [
    { type: 'sale',    customer: 'Mama Chidi',  amount: 4500,  note: 'Rice & tomato',      category: 'food',     paid: true,  date: day(3) },
    { type: 'credit',  customer: 'Alhaji Musa', amount: 12000, note: 'Wholesale provision', category: 'business', paid: false, date: day(3) },
    { type: 'sale',    customer: 'Aunty Grace',  amount: 2200, note: 'Beverages',           category: 'food',     paid: true,  date: day(2) },
    { type: 'expense', customer: 'Market levy',  amount: 1500, note: 'Daily levy',          category: 'bills',    paid: true,  date: day(2) },
    { type: 'credit',  customer: 'Bola Student', amount: 3800, note: 'School supplies',     category: 'shopping', paid: false, date: day(1) },
    { type: 'sale',    customer: 'Mr. Emeka',    amount: 6700, note: 'Stationery bulk',     category: 'business', paid: true,  date: day(1) },
    { type: 'expense', customer: 'Transport',    amount: 800,  note: 'Okada to market',     category: 'transport',paid: true,  date: day(0) },
    { type: 'sale',    customer: 'Ngozi Bakery', amount: 3200, note: 'Flour & sugar',       category: 'food',     paid: true,  date: day(0) },
    { type: 'credit',  customer: 'Mama Chidi',   amount: 2000, note: 'Evening groceries',   category: 'food',     paid: false, date: day(0) },
  ];

  const data = Storage.load();
  demos.forEach(d => {
    data.transactions.push({
      ...d, id: Date.now().toString() + Math.random(),
      profileId: pid, createdAt: new Date(d.date + 'T12:00:00').toISOString()
    });
  });
  Storage.save(data);
}
