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
