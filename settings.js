/* settings.js — TradeBook v2 */
const Settings = {
  init() {
    // Dark mode — header icon
    document.getElementById('dark-toggle').onclick = () => {
      const cur = Storage.getSettings().darkMode || false;
      this.setDarkMode(!cur);
    };
    // Dark mode — settings toggle
    document.getElementById('dark-mode-toggle').onchange = e => this.setDarkMode(e.target.checked);

    // Language change
    document.getElementById('settings-lang').onchange = e => {
      const p = Storage.getActiveProfile();
      if (!p) return;
      Storage.updateProfile(p.id, { lang: e.target.value });
      applyLanguage();
      showToast(t('lang_updated'));
    };

    // Edit shop rows
    document.getElementById('edit-shop-row').onclick  = () => this.openEditShop();
    document.getElementById('edit-owner-row').onclick = () => this.openEditShop();
    document.getElementById('save-shop-btn').onclick  = () => this.saveShop();

    // PIN
    document.getElementById('set-pin-row').onclick    = () => Pin.startSetPin();
    document.getElementById('remove-pin-row').onclick = () => {
      if (confirm(t('confirm_remove_pin'))) { Storage.setSetting('pin', null); showToast(t('pin_removed')); }
    };

    // Profile switch (header icon)
    document.getElementById('profile-btn').onclick = () => {
      this.renderProfileModal();
      openModal('profile-modal');
    };

    // Add profile
    document.getElementById('add-profile-btn').onclick = () => {
      const name = document.getElementById('new-profile-input').value.trim();
      if (!name) { showToast(t('enter_profile')); return; }
      Storage.addProfile(name);
      document.getElementById('new-profile-input').value = '';
      this.renderProfiles();
      showToast(t('profile_added'));
    };

    // Export / Import
    document.getElementById('export-json-btn').onclick = () => this.exportJSON();
    document.getElementById('export-csv-btn').onclick  = () => this.exportCSV();
    document.getElementById('import-btn-row').onclick  = () => document.getElementById('import-file').click();
    document.getElementById('import-file').onchange    = e => this.importFile(e);

    // Clear data
    document.getElementById('clear-data-btn').onclick = () => {
      if (confirm(t('confirm_clear')) && confirm(t('confirm_clear2'))) {
        Storage.clearProfile(); refreshAll(); showToast(t('data_cleared'));
      }
    };
  },

  render() {
    const p = Storage.getActiveProfile();
    const s = Storage.getSettings();
    if (!p) return;

    document.getElementById('settings-shop-name').textContent  = p.name;
    document.getElementById('settings-owner-name').textContent = p.owner;
    document.getElementById('settings-lang').value             = p.lang || 'en';
    document.getElementById('dark-mode-toggle').checked        = s.darkMode || false;

    this.renderProfiles();
    this.renderRecurring();
  },

  setDarkMode(on) {
    document.body.classList.toggle('dark', on);
    Storage.setSetting('darkMode', on);
    document.getElementById('dark-toggle').textContent      = on ? '☀️' : '🌙';
    document.getElementById('dark-mode-toggle').checked     = on;
  },

  renderProfiles() {
    const profiles = Storage.getProfiles();
    const active   = Storage.getActiveProfile();
    const list     = document.getElementById('profile-list');
    list.innerHTML = profiles.map(p => `
      <div class="profile-item">
        <span class="profile-name ${p.id===active?.id?'active-profile':''}" data-id="${p.id}" style="cursor:pointer">
          ${p.id===active?.id?'✓ ':''}${esc(p.name)}
        </span>
        ${profiles.length>1 ? `<button class="del-profile-btn" data-id="${p.id}">×</button>` : ''}
      </div>`).join('');

    list.querySelectorAll('.profile-name[data-id]').forEach(el => {
      el.onclick = () => { Storage.switchProfile(el.dataset.id); refreshAll(); showToast(t('profile_switched')); };
    });
    list.querySelectorAll('.del-profile-btn').forEach(btn => {
      btn.onclick = () => {
        if (!confirm(t('confirm_delete_profile'))) return;
        if (!Storage.deleteProfile(btn.dataset.id)) { showToast(t('cannot_delete_last')); return; }
        this.renderProfiles(); refreshAll(); showToast(t('profile_deleted'));
      };
    });
  },

  renderProfileModal() {
    const profiles = Storage.getProfiles();
    const active   = Storage.getActiveProfile();
    const list     = document.getElementById('modal-profile-list');
    list.innerHTML = profiles.map(p => `
      <div class="modal-profile-item" data-id="${p.id}" style="cursor:pointer">
        <div class="mpf-avatar">${p.name[0].toUpperCase()}</div>
        <p class="mpf-name">${esc(p.name)}</p>
        ${p.id===active?.id ? '<span class="mpf-check">✓</span>' : ''}
      </div>`).join('');
    list.querySelectorAll('.modal-profile-item').forEach(el => {
      el.onclick = () => {
        Storage.switchProfile(el.dataset.id);
        closeModal('profile-modal');
        refreshAll();
        showToast('✅ Switched to ' + Storage.getActiveProfile()?.name);
      };
    });
  },

  renderRecurring() {
    const p    = Storage.getActiveProfile();
    if (!p) return;
    const list = Storage.getRecurring(p.id);
    const el   = document.getElementById('recurring-list');
    if (!list.length) { el.innerHTML = `<p class="empty-sub">${t('recurring_none')}</p>`; return; }
    const fl = { daily:'Every day', weekly:'Every week', monthly:'Every month' };
    el.innerHTML = list.map(r => `
      <div class="recurring-item">
        <div>
          <p style="font-size:14px;font-weight:600;color:var(--ink)">${esc(r.customer)} — ${fmt(r.amount)}</p>
          <p style="font-size:12px;color:var(--muted)">${fl[r.freq]||r.freq}</p>
        </div>
        <button class="txn-del-btn" style="padding:6px 12px;border-radius:8px;font-size:12px" data-id="${r.id}">Remove</button>
      </div>`).join('');
    el.querySelectorAll('.txn-del-btn').forEach(btn => {
      btn.onclick = () => { Storage.deleteRecurring(btn.dataset.id); this.renderRecurring(); showToast('✅ Removed'); };
    });
  },

  openEditShop() {
    const p = Storage.getActiveProfile();
    if (!p) return;
    document.getElementById('edit-shop-name').value  = p.name;
    document.getElementById('edit-owner-name').value = p.owner;
    openModal('edit-shop-modal');
  },

  saveShop() {
    const name  = document.getElementById('edit-shop-name').value.trim();
    const owner = document.getElementById('edit-owner-name').value.trim();
    if (!name) { showToast(t('enter_shop')); return; }
    const p = Storage.getActiveProfile();
    Storage.updateProfile(p.id, { name, owner });
    closeModal('edit-shop-modal');
    refreshAll();
    showToast(t('shop_updated'));
  },

  exportJSON() {
    const json = Storage.exportJSON();
    const p    = Storage.getActiveProfile();
    triggerDownload(new Blob([json],{type:'application/json'}), `tradebook-${(p?.name||'shop').replace(/\s+/g,'-')}-${Date.now()}.json`);
    showToast('💾 JSON exported');
  },

  exportCSV() {
    const csv = Storage.exportCSV();
    const p   = Storage.getActiveProfile();
    triggerDownload(new Blob([csv],{type:'text/csv'}), `tradebook-${(p?.name||'shop').replace(/\s+/g,'-')}-${Date.now()}.csv`);
    showToast('📊 CSV exported');
  },

  importFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const count = Storage.importJSON(ev.target.result);
      showToast(count < 0 ? t('invalid_file') : `${t('imported')} ${count} ${t('transactions_word')}`);
      if (count >= 0) refreshAll();
    };
    reader.readAsText(file);
    e.target.value = '';
  }
};

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
