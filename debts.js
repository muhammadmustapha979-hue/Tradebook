/* debts.js — TradeBook v2 */
const Debts = {
  init() {
    document.getElementById('part-pay-save-btn').onclick = () => this.savePartPayment();
  },

  openPartPayModal(txnId, totalAmount, alreadyPaid) {
    const balance = totalAmount - alreadyPaid;
    document.getElementById('part-pay-txn-id').value    = txnId;
    document.getElementById('part-pay-balance').textContent = fmt(balance);
    document.getElementById('part-pay-amount').value    = '';
    document.getElementById('part-pay-note').value      = '';
    document.getElementById('part-pay-amount').max      = balance;
    openModal('part-pay-modal');
    setTimeout(() => document.getElementById('part-pay-amount').focus(), 350);
  },

  savePartPayment() {
    const txnId  = document.getElementById('part-pay-txn-id').value;
    const amount = parseFloat(document.getElementById('part-pay-amount').value);
    const note   = document.getElementById('part-pay-note').value.trim();
    const max    = parseFloat(document.getElementById('part-pay-amount').max);

    if (!amount || amount <= 0) { showToast(t('enter_part_amount')); return; }
    if (amount > max)           { showToast(t('exceeds_balance'));   return; }

    Storage.addPartPayment(txnId, amount, note);
    closeModal('part-pay-modal');
    showToast(t('part_pay_saved'));
    refreshAll();
  },

  render() {
    const profile = Storage.getActiveProfile();
    if (!profile) return;
    const txns = Storage.getTransactions(profile.id).filter(t => t.type === 'credit');

    const debtorMap = {};
    txns.forEach(txn => {
      if (!debtorMap[txn.customer]) debtorMap[txn.customer] = { name: txn.customer, items: [] };
      debtorMap[txn.customer].items.push(txn);
    });

    const debtors = Object.values(debtorMap).map(d => {
      const totalDebt  = d.items.reduce((s, i) => s + i.amount, 0);
      const totalPaid  = d.items.reduce((s, i) => {
        const pp = (i.partPayments||[]).reduce((x,p)=>x+p.amount,0);
        return s + (i.paid ? i.amount : pp);
      }, 0);
      return { ...d, totalDebt, totalPaid, balance: totalDebt - totalPaid };
    }).sort((a,b) => b.balance - a.balance);

    const totalOwed      = debtors.reduce((s,d) => s + d.balance, 0);
    const totalRecovered = debtors.reduce((s,d) => s + d.totalPaid, 0);

    document.getElementById('total-debtors').textContent   = debtors.length;
    document.getElementById('total-owed').textContent      = fmt(totalOwed);
    document.getElementById('total-recovered').textContent = fmt(totalRecovered);

    const container = document.getElementById('debtor-list');
    if (!debtors.length) {
      container.innerHTML = `<div class="empty-state">
        <p class="empty-icon">🤝</p>
        <p class="empty-text">${t('no_debts')}</p>
        <p class="empty-sub">${t('no_debts_sub')}</p></div>`;
      return;
    }

    container.innerHTML = debtors.map((d, idx) => {
      const isCleared = d.balance <= 0;
      const txWord = d.items.length === 1 ? t('transactions') : t('transactions_pl');
      return `
      <div class="debtor-card">
        <div class="debtor-head" data-idx="${idx}">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="debtor-avatar ${isCleared?'green-av':'red-av'}">${d.name[0].toUpperCase()}</div>
            <div>
              <p class="debtor-name">${esc(d.name)}</p>
              <p class="debtor-count">${d.items.length} ${txWord}</p>
            </div>
          </div>
          <div style="text-align:right">
            <p class="debtor-owed ${isCleared?'green':'red'}">${fmt(d.balance)}</p>
            <p class="debtor-status">${isCleared ? t('all_cleared') : t('still_owes')}</p>
          </div>
        </div>
        <div class="debtor-items" id="debtor-items-${idx}">
          ${d.items.map(item => {
            const pp = (item.partPayments||[]).reduce((s,p)=>s+p.amount,0);
            const bal = Math.max(0, item.amount - pp);
            return `
            <div class="debtor-item">
              <div style="flex:1;min-width:0">
                <p class="debtor-item-note">${esc(item.note||'Transaction')}</p>
                <p class="debtor-item-date">${fmtDatetime(item)} · Total: ${fmt(item.amount)}</p>
                ${(item.partPayments||[]).length > 0 ? `
                <div class="part-payments-list">
                  ${(item.partPayments||[]).map(p=>`
                    <p class="part-pay-row">↳ ${shortDate(p.date)} ${p.time||''} — ${fmt(p.amount)}${p.note?' ('+esc(p.note)+')':''}</p>
                  `).join('')}
                  <p class="part-pay-balance">Balance: <strong>${fmt(bal)}</strong></p>
                </div>` : ''}
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
                ${!item.paid ? `
                  <button class="mark-paid-btn" data-id="${item.id}">${t('mark_paid')}</button>
                  <button class="part-pay-btn" data-id="${item.id}" data-amount="${item.amount}" data-paid="${pp}">💳 ${t('part_pay')}</button>
                ` : `<span style="color:var(--green-mid);font-weight:700;font-size:12px">${t('paid')}</span>`}
              </div>
            </div>`;
          }).join('')}
          ${!isCleared ? `
          <button class="debtor-wa-btn"
            data-name="${esc(d.name)}"
            data-amount="${fmt(d.balance)}"
            data-shop="${esc(Storage.getActiveProfile()?.name||'Our Shop')}">
            📲 ${t('send_wa')} ${esc(d.name.split(' ')[0])}
          </button>` : ''}
        </div>
      </div>`;
    }).join('');

    // Toggle expand
    container.querySelectorAll('.debtor-head').forEach(head => {
      head.onclick = () => {
        const items = document.getElementById(`debtor-items-${head.dataset.idx}`);
        items.classList.toggle('open');
      };
    });

    // Mark fully paid
    container.querySelectorAll('.mark-paid-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        Storage.markPaid(btn.dataset.id);
        showToast(t('paid_done'));
        refreshAll();
      };
    });

    // Part payment
    container.querySelectorAll('.part-pay-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        this.openPartPayModal(btn.dataset.id, Number(btn.dataset.amount), Number(btn.dataset.paid));
      };
    });

    // WhatsApp
    container.querySelectorAll('.debtor-wa-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const msg = encodeURIComponent(
          `Hello ${btn.dataset.name}, this is a reminder from *${btn.dataset.shop}*.\n\nYour outstanding balance is *${btn.dataset.amount}*.\n\nKindly pay when convenient. Thank you! 🙏`
        );
        window.open(`https://wa.me/?text=${msg}`, '_blank');
      };
    });
  }
};
