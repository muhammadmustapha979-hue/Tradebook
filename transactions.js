/* transactions.js — TradeBook v2 */
const Transactions = {
  currentType: 'sale',
  editingId: null,

  init() {
    document.getElementById('quick-sale').onclick    = () => this.openModal('sale');
    document.getElementById('quick-credit').onclick  = () => this.openModal('credit');
    document.getElementById('quick-expense').onclick = () => this.openModal('expense');
    document.getElementById('txn-recurring').onchange = e => {
      document.getElementById('recurring-options').style.display = e.target.checked ? 'block' : 'none';
    };
    document.getElementById('save-txn-btn').onclick = () => this.save();
    document.getElementById('see-all-btn').onclick  = () => switchTab('history');
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.onclick = () => this.setType(btn.dataset.type);
    });
  },

  openModal(type = 'sale', txnId = null) {
    this.editingId = txnId;
    if (txnId) {
      const p = Storage.getActiveProfile();
      const txn = Storage.getTransactions(p.id).find(t => t.id === txnId);
      if (txn) {
        document.getElementById('txn-customer').value  = txn.customer || '';
        document.getElementById('txn-amount').value    = txn.amount || '';
        document.getElementById('txn-note').value      = txn.note || '';
        document.getElementById('txn-category').value  = txn.category || 'general';
        document.getElementById('txn-modal-title').textContent = 'Edit Transaction';
        document.getElementById('save-txn-btn').textContent = t('update_txn');
        this.setType(txn.type);
      }
    } else {
      document.getElementById('txn-customer').value  = '';
      document.getElementById('txn-amount').value    = '';
      document.getElementById('txn-note').value      = '';
      document.getElementById('txn-category').value  = 'general';
      document.getElementById('txn-modal-title').textContent = t('record_txn');
      document.getElementById('save-txn-btn').textContent = t('save_txn');
      document.getElementById('txn-recurring').checked = false;
      document.getElementById('recurring-options').style.display = 'none';
      this.setType(type);
    }
    this.refreshSuggestions();
    openModal('txn-modal');
    setTimeout(() => document.getElementById('txn-customer').focus(), 350);
  },

  setType(type) {
    this.currentType = type;
    document.querySelectorAll('.type-btn').forEach(b => {
      b.classList.remove('active');
      if (b.dataset.type === type) b.classList.add('active');
    });
  },

  save() {
    const customer = document.getElementById('txn-customer').value.trim();
    const amount   = parseFloat(document.getElementById('txn-amount').value);
    const note     = document.getElementById('txn-note').value.trim();
    const category = document.getElementById('txn-category').value;
    const isRecur  = document.getElementById('txn-recurring').checked;
    const freq     = document.getElementById('recur-freq').value;

    if (!customer) { showToast(t('enter_name')); return; }
    if (!amount || amount <= 0) { showToast(t('enter_amount')); return; }

    const txnData = { type: this.currentType, customer, amount, note, category, paid: this.currentType !== 'credit' };

    if (this.editingId) {
      Storage.updateTransaction(this.editingId, txnData);
      showToast(t('updated'));
    } else {
      Storage.addTransaction(txnData);
      if (isRecur) { Storage.addRecurring({ ...txnData, freq }); showToast('✅ Saved + set to repeat'); }
      else showToast(t('saved'));
    }
    closeModal('txn-modal');
    refreshAll();
  },

  refreshSuggestions() {
    const p = Storage.getActiveProfile();
    if (!p) return;
    const names = [...new Set(Storage.getTransactions(p.id).map(t => t.customer).filter(Boolean))];
    const dl = document.getElementById('customer-suggestions');
    dl.innerHTML = names.map(n => `<option value="${esc(n)}">`).join('');
  },

  renderList(containerId, txns, limit = 999) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const shown = txns.slice(0, limit);
    if (!shown.length) {
      container.innerHTML = `<div class="empty-state">
        <p class="empty-icon">📝</p>
        <p class="empty-text">${t('no_txns')}</p>
        <p class="empty-sub">${t('no_txns_sub')}</p></div>`;
      return;
    }
    const icons = { sale:'💰', credit:'📋', expense:'🧾' };
    container.innerHTML = shown.map(txn => {
      const partPaid = (txn.partPayments || []).reduce((s, p) => s + p.amount, 0);
      const balance  = txn.type === 'credit' ? Math.max(0, txn.amount - partPaid) : 0;
      const hasParts = (txn.partPayments || []).length > 0;
      return `
      <div class="txn-card" data-id="${txn.id}">
        <div class="txn-icon ${txn.type}">${icons[txn.type]}</div>
        <div class="txn-info">
          <p class="txn-name">${esc(txn.customer)}</p>
          <p class="txn-meta">${esc(txn.note||'—')} · ${fmtDatetime(txn)}</p>
          ${hasParts && txn.type === 'credit' ? `<p class="txn-meta" style="color:var(--green-mid);font-weight:600">Paid: ${fmt(partPaid)} · Bal: ${fmt(balance)}</p>` : ''}
        </div>
        <div class="txn-right">
          <p class="txn-amount ${txn.type}">${txn.type==='expense'?'-':'+'}${fmt(txn.amount)}</p>
          <span class="status-badge ${txn.type==='credit'?(txn.paid?'paid':'owing'):'sale-badge'}">
            ${txn.type==='credit'?(txn.paid?t('paid'):t('owing')):t(txn.type)}
          </span>
          <div class="txn-actions">
            <button class="txn-edit-btn" data-id="${txn.id}" data-type="${txn.type}">✏️</button>
            ${txn.type==='credit'&&!txn.paid?`<button class="txn-part-btn" data-id="${txn.id}" data-amount="${txn.amount}" data-paid="${partPaid}">💳</button>`:''}
            <button class="txn-del-btn" data-id="${txn.id}">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');

    // Long press to reveal actions
    container.querySelectorAll('.txn-card').forEach(card => {
      let timer;
      const show = () => card.classList.add('editing');
      card.addEventListener('touchstart', () => { timer = setTimeout(show, 500); }, { passive: true });
      card.addEventListener('touchend',   () => clearTimeout(timer));
      card.addEventListener('mousedown',  () => { timer = setTimeout(show, 500); });
      card.addEventListener('mouseup',    () => clearTimeout(timer));
      // Tap elsewhere to close
      document.addEventListener('click', (e) => {
        if (!card.contains(e.target)) card.classList.remove('editing');
      }, { once: false });
    });

    container.querySelectorAll('.txn-edit-btn').forEach(btn => {
      btn.onclick = e => { e.stopPropagation(); this.openModal(btn.dataset.type, btn.dataset.id); };
    });
    container.querySelectorAll('.txn-del-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        if (confirm(t('delete_confirm'))) {
          Storage.deleteTransaction(btn.dataset.id);
          showToast(t('deleted')); refreshAll();
        }
      };
    });
    container.querySelectorAll('.txn-part-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        Debts.openPartPayModal(btn.dataset.id, Number(btn.dataset.amount), Number(btn.dataset.paid));
      };
    });
  }
};

/* ── Helpers ── */
function fmt(n)    { return '₦' + Number(n).toLocaleString('en-NG'); }
function esc(str)  { const d = document.createElement('div'); d.textContent = str||''; return d.innerHTML; }

function fmtDatetime(txn) {
  if (!txn.date) return '';
  const d = new Date((txn.date) + 'T' + (txn.time || '12:00') + ':00');
  const dateStr = d.toLocaleDateString('en-NG', { day:'numeric', month:'short' });
  const timeStr = txn.time ? ' · ' + txn.time : '';
  return dateStr + timeStr;
}

function shortDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-NG', { day:'numeric', month:'short' });
}
