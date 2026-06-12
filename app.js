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
