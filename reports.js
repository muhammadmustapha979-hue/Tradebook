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
