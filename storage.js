/* ═══════════════════════════════════════════
   storage.js — TradeBook v2
═══════════════════════════════════════════ */
const DB_KEY = 'tradebook_v2';

const defaultData = () => ({
  profiles: [],
  activeProfile: null,
  transactions: [],
  recurringTxns: [],
  settings: {
    darkMode: false,
    pin: null,
    onboarded: false,
    lastPinDate: null
  }
});

const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return defaultData();
      const d = JSON.parse(raw);
      if (!d.recurringTxns) d.recurringTxns = [];
      if (!d.settings) d.settings = defaultData().settings;
      return d;
    } catch(e) { return defaultData(); }
  },

  save(data) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(data)); }
    catch(e) { console.error('Save error', e); }
  },

  /* ── Transactions ── */
  getTransactions(profileId) {
    return this.load().transactions.filter(t => t.profileId === profileId);
  },

  addTransaction(txn) {
    const data = this.load();
    const now = new Date();
    const newTxn = {
      ...txn,
      id: Date.now().toString(),
      profileId: data.activeProfile,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0,5),
      datetime: now.toISOString(),
      partPayments: []
    };
    data.transactions.push(newTxn);
    this.save(data);
    return newTxn;
  },

  updateTransaction(id, updates) {
    const data = this.load();
    const idx = data.transactions.findIndex(t => t.id === id);
    if (idx > -1) { data.transactions[idx] = { ...data.transactions[idx], ...updates }; this.save(data); }
  },

  deleteTransaction(id) {
    const data = this.load();
    data.transactions = data.transactions.filter(t => t.id !== id);
    this.save(data);
  },

  addPartPayment(txnId, amount, note) {
    const data = this.load();
    const idx = data.transactions.findIndex(t => t.id === txnId);
    if (idx === -1) return;
    const txn = data.transactions[idx];
    if (!txn.partPayments) txn.partPayments = [];
    const payment = { id: Date.now().toString(), amount: Number(amount), note: note || '', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0,5) };
    txn.partPayments.push(payment);
    // Check if fully paid
    const totalPaid = txn.partPayments.reduce((s, p) => s + p.amount, 0);
    if (totalPaid >= txn.amount) txn.paid = true;
    data.transactions[idx] = txn;
    this.save(data);
    return payment;
  },

  markPaid(id) { this.updateTransaction(id, { paid: true }); },

  /* ── Profiles ── */
  getProfiles()       { return this.load().profiles; },
  getActiveProfile()  {
    const d = this.load();
    return d.profiles.find(p => p.id === d.activeProfile) || d.profiles[0] || null;
  },

  createFirstProfile(name, owner, lang) {
    const data = this.load();
    const profile = { id: 'p_' + Date.now(), name, owner, lang: lang || 'en' };
    data.profiles = [profile];
    data.activeProfile = profile.id;
    data.settings.onboarded = true;
    this.save(data);
    return profile;
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
    if (idx > -1) { data.profiles[idx] = { ...data.profiles[idx], ...updates }; this.save(data); }
  },

  /* ── Settings ── */
  getSettings()        { return this.load().settings; },
  setSetting(key, val) { const d = this.load(); d.settings[key] = val; this.save(d); },

  needsPinToday() {
    const s = this.getSettings();
    if (!s.pin) return false;
    const today = new Date().toISOString().split('T')[0];
    return s.lastPinDate !== today;
  },

  recordPinEntry() {
    const today = new Date().toISOString().split('T')[0];
    this.setSetting('lastPinDate', today);
  },

  /* ── Recurring ── */
  getRecurring(profileId) { return (this.load().recurringTxns || []).filter(r => r.profileId === profileId); },
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

  processRecurring() {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];
    let changed = false;
    (data.recurringTxns || []).forEach(r => {
      const last = r.lastRun || r.date;
      if (this._isDue(last, r.freq, today)) {
        data.transactions.push({
          id: Date.now().toString() + Math.random(),
          profileId: r.profileId, type: r.type,
          customer: r.customer, amount: r.amount,
          note: r.note + ' (recurring)', category: r.category,
          date: today, time: '08:00',
          datetime: new Date().toISOString(),
          paid: r.type !== 'credit', partPayments: []
        });
        r.lastRun = today; changed = true;
      }
    });
    if (changed) this.save(data);
  },

  _isDue(lastRun, freq, today) {
    if (!lastRun || lastRun === today) return false;
    const diff = (new Date(today) - new Date(lastRun)) / 86400000;
    if (freq === 'daily' && diff >= 1) return true;
    if (freq === 'weekly' && diff >= 7) return true;
    if (freq === 'monthly' && diff >= 28) return true;
    return false;
  },

  exportJSON() {
    const data = this.load();
    const profile = data.profiles.find(p => p.id === data.activeProfile);
    const txns = data.transactions.filter(t => t.profileId === data.activeProfile);
    return JSON.stringify({ profile, transactions: txns, exportedAt: new Date().toISOString() }, null, 2);
  },

  exportCSV() {
    const data = this.load();
    const txns = data.transactions.filter(t => t.profileId === data.activeProfile);
    const headers = ['Date','Time','Type','Customer','Amount','AmountPaid','Balance','Category','Note'];
    const rows = txns.map(t => {
      const paid = (t.partPayments || []).reduce((s, p) => s + p.amount, 0) + (t.paid && t.type !== 'credit' ? t.amount : 0);
      const bal  = t.type === 'credit' ? Math.max(0, t.amount - paid) : 0;
      return [t.date, t.time || '', t.type, `"${t.customer}"`, t.amount, paid, bal, t.category || 'general', `"${t.note || ''}"`];
    });
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  importJSON(jsonStr) {
    try {
      const imported = JSON.parse(jsonStr);
      const data = this.load();
      const txns = (imported.transactions || []).map(t => ({
        ...t, profileId: data.activeProfile,
        id: 'imp_' + Date.now() + Math.random(),
        partPayments: t.partPayments || []
      }));
      data.transactions.push(...txns);
      this.save(data);
      return txns.length;
    } catch(e) { return -1; }
  },

  clearProfile() {
    const data = this.load();
    data.transactions = data.transactions.filter(t => t.profileId !== data.activeProfile);
    data.recurringTxns = (data.recurringTxns || []).filter(r => r.profileId !== data.activeProfile);
    this.save(data);
  }
};
