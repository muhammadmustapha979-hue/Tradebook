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
