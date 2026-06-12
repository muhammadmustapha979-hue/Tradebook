/* app.js — TradeBook v2 — Main Orchestrator */

/* ═══════════════ Helpers ═══════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.style.display = 'none'; s.classList.remove('active');
  });
  const el = document.getElementById(id + '-screen') || document.getElementById(id);
  if (el) { el.style.display = 'flex'; el.classList.add('active'); }
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}

let toastTimer;
function showToast(msg, duration = 2600) {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

function switchTab(id) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  const el = document.getElementById('tab-' + id);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  if (id === 'home')     renderHome();
  if (id === 'debts')    Debts.render();
  if (id === 'history')  renderHistory();
  if (id === 'reports')  Reports.render();
  if (id === 'settings') Settings.render();
}

/* ═══════════════ Home ═══════════════ */
function renderHome() {
  const profile = Storage.getActiveProfile();
  if (!profile) return;
  const txns = Storage.getTransactions(profile.id);

  const h = new Date().getHours();
  const gKey = h < 12 ? 'greeting_morning' : h < 17 ? 'greeting_afternoon' : 'greeting_evening';
  document.getElementById('greeting').textContent    = `${t(gKey)}, ${profile.owner} 👋`;
  document.getElementById('shop-display').textContent = profile.name;

  const todayStr = new Date().toISOString().split('T')[0];
  const today    = txns.filter(tx => tx.date === todayStr);
  const sales    = today.filter(tx=>tx.type==='sale').reduce((s,tx)=>s+tx.amount,0);
  const expenses = today.filter(tx=>tx.type==='expense').reduce((s,tx)=>s+tx.amount,0);
  const credit   = today.filter(tx=>tx.type==='credit').reduce((s,tx)=>s+tx.amount,0);
  const totalDebt = txns.filter(tx=>tx.type==='credit'&&!tx.paid).reduce((s,tx)=>{
    const pp = (tx.partPayments||[]).reduce((x,p)=>x+p.amount,0);
    return s + Math.max(0, tx.amount - pp);
  }, 0);

  document.getElementById('today-sales').textContent    = fmt(sales);
  document.getElementById('today-expenses').textContent = fmt(expenses);
  document.getElementById('today-credit').textContent   = fmt(credit);
  document.getElementById('total-debt').textContent     = fmt(totalDebt);

  const alert = document.getElementById('debt-alert');
  if (totalDebt > 0) {
    alert.style.display = 'flex';
    document.getElementById('debt-alert-text').innerHTML = `${t('owed_alert')} <strong>${fmt(totalDebt)}</strong> ${t('in_unpaid_credit')}`;
  } else {
    alert.style.display = 'none';
  }

  const sorted = [...txns].sort((a,b) => new Date(b.datetime||b.date) - new Date(a.datetime||a.date));
  Transactions.renderList('txn-list', sorted, 10);
}

/* ═══════════════ History ═══════════════ */
function renderHistory() {
  const profile  = Storage.getActiveProfile();
  if (!profile) return;
  const all    = Storage.getTransactions(profile.id);
  const sorted = [...all].sort((a,b) => new Date(b.datetime||b.date) - new Date(a.datetime||a.date));
  const filter = document.querySelector('.pill.active')?.dataset.filter || 'all';
  const search = document.getElementById('history-search').value.toLowerCase();
  const filtered = sorted.filter(tx => {
    const matchType   = filter === 'all' || tx.type === filter;
    const matchSearch = !search || tx.customer.toLowerCase().includes(search) || (tx.note||'').toLowerCase().includes(search);
    return matchType && matchSearch;
  });
  Transactions.renderList('history-list', filtered);
}

/* ═══════════════ Refresh All ═══════════════ */
function refreshAll() {
  const p = Storage.getActiveProfile();
  if (!p) return;

  // Update header displays
  document.getElementById('greeting').textContent     = '';
  document.getElementById('shop-display').textContent = p.name;

  const active = document.querySelector('.tab-content.active')?.id?.replace('tab-', '') || 'home';
  renderHome();
  if (active === 'debts')    Debts.render();
  if (active === 'history')  renderHistory();
  if (active === 'reports')  Reports.render();
  if (active === 'settings') Settings.render();
}

/* ═══════════════ Onboarding ═══════════════ */
const Onboard = {
  slide: 0,
  slides: ['slide-welcome', 'slide-features', 'slide-setup', 'slide-pin'],

  init() {
    this.goTo(0);
    document.getElementById('onboard-next').onclick = () => this.next();
    // PIN keys in onboarding
    document.querySelectorAll('.pin-key[data-target="onboard"]').forEach(btn => {
      btn.onclick = () => this.pressPin(btn.dataset.val);
    });
    document.getElementById('onboard-pin-back').onclick = () => {
      this.pinBuffer = this.pinBuffer.slice(0,-1);
      this.updatePinDots(this.pinBuffer.length);
    };
    document.getElementById('onboard-skip-pin').onclick = () => this.finish(false);
    this.pinBuffer = '';
    this.pinConfirm = '';
    this.pinStage = 'set'; // 'set' | 'confirm'
  },

  goTo(idx) {
    this.slide = idx;
    document.querySelectorAll('.onboard-slide').forEach((s,i) => s.classList.toggle('active', i===idx));
    document.querySelectorAll('.onboard-dots span').forEach((d,i) => d.classList.toggle('active', i===idx));
    const isLast = idx === this.slides.length - 1;
    const nextBtn = document.getElementById('onboard-next');
    nextBtn.style.display = idx === 2 ? 'none' : (idx === 3 ? 'none' : 'block'); // hide on setup & pin
    if (idx === 2) {
      // show next only after name entered
      document.getElementById('ob-next-from-setup').style.display = 'block';
    }
  },

  next() {
    if (this.slide < this.slides.length - 1) this.goTo(this.slide + 1);
  },

  goToSetup() {
    this.goTo(2);
  },

  goToPin() {
    const shop  = document.getElementById('ob-shop-name').value.trim();
    const owner = document.getElementById('ob-owner-name').value.trim();
    if (!shop)  { showToast('⚠️ Please enter your shop name'); return; }
    if (!owner) { showToast('⚠️ Please enter your name'); return; }
    this.goTo(3);
    this.pinBuffer = '';
    this.pinConfirm = '';
    this.pinStage = 'set';
    document.getElementById('ob-pin-label').textContent = 'Create a 4-digit PIN for your app';
    this.updatePinDots(0);
  },

  pressPin(val) {
    if (this.pinStage === 'set') {
      if (this.pinBuffer.length >= 4) return;
      this.pinBuffer += val;
      this.updatePinDots(this.pinBuffer.length);
      if (this.pinBuffer.length === 4) {
        setTimeout(() => {
          this.pinStage = 'confirm';
          document.getElementById('ob-pin-label').textContent = 'Confirm your PIN';
          this.pinConfirm = '';
          this.updatePinDots(0);
        }, 200);
      }
    } else {
      if (this.pinConfirm.length >= 4) return;
      this.pinConfirm += val;
      this.updatePinDots(this.pinConfirm.length);
      if (this.pinConfirm.length === 4) {
        if (this.pinBuffer === this.pinConfirm) {
          this.finish(true, this.pinBuffer);
        } else {
          // shake and reset
          document.querySelectorAll('#ob-pin-dots span').forEach(d => {
            d.classList.add('shake');
            setTimeout(()=>d.classList.remove('shake'),400);
          });
          document.getElementById('ob-pin-label').textContent = "PINs don't match. Start over.";
          this.pinBuffer = '';
          this.pinConfirm = '';
          this.pinStage = 'set';
          setTimeout(() => {
            document.getElementById('ob-pin-label').textContent = 'Create a 4-digit PIN for your app';
            this.updatePinDots(0);
          }, 800);
        }
      }
    }
  },

  updatePinDots(count) {
    document.querySelectorAll('#ob-pin-dots span').forEach((d,i) => d.classList.toggle('filled', i < count));
  },

  finish(withPin, pin = null) {
    const shop  = document.getElementById('ob-shop-name').value.trim() || 'My Shop';
    const owner = document.getElementById('ob-owner-name').value.trim() || 'Trader';
    const lang  = document.getElementById('ob-lang-select').value || 'en';

    Storage.createFirstProfile(shop, owner, lang);
    if (withPin && pin) {
      Storage.setSetting('pin', pin);
      Storage.recordPinEntry();
    }

    // Seed demo data
    seedDemoData();

    showScreen('app');
    refreshAll();
    applyLanguage();

    // Welcome toast
    setTimeout(() => showToast(`🎉 Welcome to TradeBook, ${owner}!`, 3000), 500);
  }
};

/* ═══════════════ Demo Seed Data ═══════════════ */
function seedDemoData() {
  const data = Storage.load();
  const pid  = data.activeProfile;
  if (data.transactions.filter(t=>t.profileId===pid).length > 0) return;

  const day = offset => {
    const d = new Date(); d.setDate(d.getDate()-offset);
    return d.toISOString().split('T')[0];
  };

  const demos = [
    { type:'sale',    customer:'Mama Chidi',   amount:4500,  note:'Rice & tomato',      category:'food',     paid:true,  date:day(3), time:'09:15' },
    { type:'credit',  customer:'Alhaji Musa',  amount:12000, note:'Wholesale provision', category:'business', paid:false, date:day(3), time:'11:30', partPayments:[{id:'pp1',amount:3000,note:'First installment',date:day(2),time:'14:00'}] },
    { type:'sale',    customer:'Aunty Grace',  amount:2200,  note:'Beverages',          category:'food',     paid:true,  date:day(2), time:'10:00' },
    { type:'expense', customer:'Market levy',  amount:1500,  note:'Daily levy',         category:'bills',    paid:true,  date:day(2), time:'08:00' },
    { type:'credit',  customer:'Bola Student', amount:3800,  note:'School supplies',    category:'shopping', paid:false, date:day(1), time:'15:20' },
    { type:'sale',    customer:'Mr. Emeka',    amount:6700,  note:'Stationery bulk',    category:'business', paid:true,  date:day(1), time:'13:45' },
    { type:'expense', customer:'Transport',    amount:800,   note:'Okada to market',    category:'transport',paid:true,  date:day(0), time:'07:30' },
    { type:'sale',    customer:'Ngozi Bakery', amount:3200,  note:'Flour & sugar',      category:'food',     paid:true,  date:day(0), time:'11:00' },
    { type:'credit',  customer:'Mama Chidi',   amount:2000,  note:'Evening groceries',  category:'food',     paid:false, date:day(0), time:'18:30' },
  ];

  demos.forEach(d => {
    data.transactions.push({
      ...d,
      id: Date.now().toString() + Math.random(),
      profileId: pid,
      datetime: new Date(d.date + 'T' + d.time + ':00').toISOString(),
      partPayments: d.partPayments || []
    });
  });
  Storage.save(data);
}

/* ═══════════════ Bootstrap ═══════════════ */
document.addEventListener('DOMContentLoaded', () => {
  Storage.processRecurring();

  // Init modules
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

  // Close modals via [data-close]
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.onclick = () => closeModal(btn.dataset.close);
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.onclick = e => { if (e.target === overlay) closeModal(overlay.id); };
  });

  // History filters
  document.querySelectorAll('.pill').forEach(pill => {
    pill.onclick = () => {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderHistory();
    };
  });

  document.getElementById('history-search').oninput = () => renderHistory();

  // Apply saved dark mode immediately
  const s = Storage.getSettings();
  if (s.darkMode) Settings.setDarkMode(true);

  // PWA install
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e;
    if (!window.matchMedia('(display-mode: standalone)').matches) showInstallBanner();
  });
  function showInstallBanner() {
    if (document.getElementById('install-banner')) return;
    const b = document.createElement('div'); b.id = 'install-banner';
    b.innerHTML = `<div style="position:fixed;bottom:80px;left:12px;right:12px;background:var(--green);color:#fff;
      border-radius:16px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;
      box-shadow:0 8px 30px rgba(0,0,0,.35);z-index:9999;font-family:Inter,sans-serif">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:28px">📒</div>
        <div><p style="font-weight:800;font-size:14px;margin:0">Install TradeBook</p>
             <p style="font-size:11px;opacity:.75;margin:0">Works offline · Add to home screen</p></div>
      </div>
      <div style="display:flex;gap:6px">
        <button id="install-yes" style="background:#52B788;color:#fff;border:none;border-radius:10px;
                padding:8px 14px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit">Install</button>
        <button onclick="document.getElementById('install-banner').remove()"
                style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:10px;
                padding:8px 10px;font-size:13px;cursor:pointer">✕</button>
      </div></div>`;
    document.body.appendChild(b);
    document.getElementById('install-yes').onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') b.remove();
      deferredPrompt = null;
    };
  }

  // Handle manifest shortcuts
  const action = new URLSearchParams(window.location.search).get('action');
  if (action === 'sale')  setTimeout(() => Transactions.openModal('sale'), 800);
  if (action === 'debts') setTimeout(() => switchTab('debts'), 800);

  // Boot sequence
  Pin.boot();
});
