/* js/settings.js */

const Settings = {
  init() {
    // Dark mode toggle (header button + settings toggle stay in sync)
    const dmToggle = document.getElementById('dark-mode-toggle');
    dmToggle.onchange = () => this.setDarkMode(dmToggle.checked);
    document.getElementById('dark-toggle').onclick = () => {
      const next = !dmToggle.checked;
      dmToggle.checked = next;
      this.setDarkMode(next);
    };

    // Edit shop
    document.getElementById('edit-shop-row').onclick  = () => this.openEditShop();
    document.getElementById('edit-owner-row').onclick = () => this.openEditShop();
    document.getElementById('save-shop-btn').onclick  = () => this.saveShop();

    // Language
    document.getElementById('settings-lang').onchange = (e) => {
      const profile = Storage.getActiveProfile();
      Storage.updateProfile(profile.id, { lang: e.target.value });
      refreshAll();
      showToast('✅ Language updated');
    };

    // PIN
    document.getElementById('set-pin-row').onclick    = () => Pin.initSetPin();
    document.getElementById('remove-pin-row').onclick = () => {
      if (confirm('Remove PIN protection?')) {
        Storage.setSetting('pin', null);
        showToast('🔓 PIN removed');
      }
    };

    // Profiles
    document.getElementById('add-profile-btn').onclick = () => {
      const name = document.getElementById('new-profile-input').value.trim();
      if (!name) { showToast('⚠️ Enter a profile name'); return; }
      Storage.addProfile(name);
      document.getElementById('new-profile-input').value = '';
      this.renderProfiles();
      showToast('✅ Profile added');
    };

    // Export
    document.getElementById('export-json-btn').onclick = () => this.exportJSON();
    document.getElementById('export-csv-btn').onclick  = () => this.exportCSV();
    document.getElementById('import-btn-row').onclick  = () => document.getElementById('import-file').click();
    document.getElementById('import-file').onchange    = (e) => this.importFile(e);

    // Clear data
    document.getElementById('clear-data-btn').onclick = () => {
      if (confirm('⚠️ This will delete ALL transactions for the current profile. Are you sure?')) {
        if (confirm('Really? This cannot be undone.')) {
          Storage.clearProfile();
          refreshAll();
          showToast('🗑️ Data cleared');
        }
      }
    };

    // Profile modal (header button)
    document.getElementById('profile-btn').onclick = () => {
      this.renderProfileModal();
      openModal('profile-modal');
    };
  },

  render() {
    const profile  = Storage.getActiveProfile();
    const settings = Storage.getSettings();

    document.getElementById('settings-shop-name').textContent  = profile.name;
    document.getElementById('settings-owner-name').textContent = profile.owner;
    document.getElementById('settings-lang').value             = profile.lang || 'en';
    document.getElementById('dark-mode-toggle').checked        = settings.darkMode || false;

    this.renderProfiles();
    this.renderRecurring();
  },

  renderProfiles() {
    const profiles = Storage.getProfiles();
    const active   = Storage.getActiveProfile();
    const list     = document.getElementById('profile-list');

    list.innerHTML = profiles.map(p => `
      <div class="profile-item">
        <span class="profile-name ${p.id === active.id ? 'active-profile' : ''}" data-id="${p.id}" style="cursor:pointer">
          ${p.id === active.id ? '✓ ' : ''}${esc(p.name)}
        </span>
        ${profiles.length > 1
          ? `<button class="del-profile-btn" data-id="${p.id}" title="Delete profile">×</button>`
          : ''}
      </div>`).join('');

    list.querySelectorAll('.profile-name[data-id]').forEach(el => {
      el.onclick = () => { Storage.switchProfile(el.dataset.id); refreshAll(); showToast('✅ Switched profile'); };
    });
    list.querySelectorAll('.del-profile-btn').forEach(btn => {
      btn.onclick = () => {
        if (confirm('Delete this profile and all its data?')) {
          if (!Storage.deleteProfile(btn.dataset.id)) { showToast('⚠️ Cannot delete last profile'); return; }
          this.renderProfiles();
          refreshAll();
          showToast('🗑️ Profile deleted');
        }
      };
    });
  },

  renderProfileModal() {
    const profiles = Storage.getProfiles();
    const active   = Storage.getActiveProfile();
    const list     = document.getElementById('modal-profile-list');

    list.innerHTML = profiles.map(p => `
      <div class="modal-profile-item" data-id="${p.id}">
        <div class="mpf-avatar">${p.name[0].toUpperCase()}</div>
        <p class="mpf-name">${esc(p.name)}</p>
        ${p.id === active.id ? '<span class="mpf-check">✓</span>' : ''}
      </div>`).join('');

    list.querySelectorAll('.modal-profile-item').forEach(el => {
      el.onclick = () => {
        Storage.switchProfile(el.dataset.id);
        closeModal('profile-modal');
        refreshAll();
        showToast('✅ Switched to ' + Storage.getActiveProfile().name);
      };
    });
  },

  renderRecurring() {
    const profile = Storage.getActiveProfile();
    const list    = Storage.getRecurring(profile.id);
    const el      = document.getElementById('recurring-list');

    if (!list.length) {
      el.innerHTML = '<p class="empty-sub">No recurring transactions set</p>';
      return;
    }

    const freqLabel = { daily: 'Every day', weekly: 'Every week', monthly: 'Every month' };
    el.innerHTML = list.map(r => `
      <div class="recurring-item">
        <div>
          <p style="font-size:14px;font-weight:600;color:var(--ink)">${esc(r.customer)} — ${fmt(r.amount)}</p>
          <p style="font-size:12px;color:var(--muted)">${freqLabel[r.freq] || r.freq}</p>
        </div>
        <button class="txn-del-btn" style="padding:6px 12px;border-radius:8px;font-size:12px" data-id="${r.id}">Remove</button>
      </div>`).join('');

    el.querySelectorAll('.txn-del-btn').forEach(btn => {
      btn.onclick = () => { Storage.deleteRecurring(btn.dataset.id); this.renderRecurring(); showToast('✅ Removed'); };
    });
  },

  setDarkMode(on) {
    document.body.classList.toggle('dark', on);
    Storage.setSetting('darkMode', on);
    document.getElementById('dark-toggle').textContent = on ? '☀️' : '🌙';
    document.getElementById('dark-mode-toggle').checked = on;
  },

  openEditShop() {
    const p = Storage.getActiveProfile();
    document.getElementById('edit-shop-name').value  = p.name;
    document.getElementById('edit-owner-name').value = p.owner;
    openModal('edit-shop-modal');
  },

  saveShop() {
    const name  = document.getElementById('edit-shop-name').value.trim();
    const owner = document.getElementById('edit-owner-name').value.trim();
    if (!name)  { showToast('⚠️ Shop name required'); return; }
    const p = Storage.getActiveProfile();
    Storage.updateProfile(p.id, { name, owner });
    closeModal('edit-shop-modal');
    refreshAll();
    showToast('✅ Shop details updated');
  },

  exportJSON() {
    const json     = Storage.exportJSON();
    const blob     = new Blob([json], { type: 'application/json' });
    const url      = URL.createObjectURL(blob);
    const profile  = Storage.getActiveProfile();
    const filename = `tradebook-${profile.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
    triggerDownload(url, filename);
    showToast('💾 JSON exported');
  },

  exportCSV() {
    const csv      = Storage.exportCSV();
    const blob     = new Blob([csv], { type: 'text/csv' });
    const url      = URL.createObjectURL(blob);
    const profile  = Storage.getActiveProfile();
    const filename = `tradebook-${profile.name.replace(/\s+/g, '-')}-${Date.now()}.csv`;
    triggerDownload(url, filename);
    showToast('📊 CSV exported');
  },

  importFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const count = Storage.importJSON(ev.target.result, true);
      if (count < 0) { showToast('⚠️ Invalid file format'); }
      else { refreshAll(); showToast(`✅ Imported ${count} transactions`); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
};

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
