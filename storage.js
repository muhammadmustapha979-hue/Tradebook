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
