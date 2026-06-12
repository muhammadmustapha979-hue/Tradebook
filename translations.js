/* translations.js — TradeBook v2 */
const TRANSLATIONS = {
  en: {
    greeting_morning:'Good morning', greeting_afternoon:'Good afternoon', greeting_evening:'Good evening',
    today_sales:"Today's Sales", expenses:'Expenses', on_credit:'On Credit', total_owed:'Total Owed',
    i_sold:'I Sold', on_credit_btn:'On Credit', i_spent:'I Spent', voice:'Voice',
    recent_txns:'Recent Transactions', see_all:'See all',
    debt_book:'Debt Book 📋', debt_sub:'Track who owes you money',
    all_txns:'All Transactions 📜', reports:'Reports 📊', settings_title:'Settings ⚙️',
    save_txn:'✅ Save Transaction', update_txn:'✅ Update Transaction',
    total_sales:'Total Sales', net_profit:'Net Profit', unpaid_credit:'Unpaid Credit',
    daily_sales:'Daily Sales', owed_alert:'You are owed', in_unpaid_credit:'in unpaid credit',
    mark_paid:'Mark Fully Paid', part_pay:'Part Payment', paid:'✓ Paid', owing:'Owing',
    send_wa:'📲 Send WhatsApp Reminder to', share_report:'📲 Share Report on WhatsApp',
    sale:'Sale', credit:'Credit', expense:'Expense',
    no_txns:'No transactions yet', no_txns_sub:'Tap a button above to record your first sale',
    no_debts:'No debts recorded', no_debts_sub:'Credit sales will appear here',
    debtors:'Debtors', recovered:'Recovered', still_owes:'still owes', all_cleared:'all cleared',
    transactions:'transaction', transactions_pl:'transactions',
    part_payments:'Part Payments', balance:'Balance', amount_paid:'Amount Paid',
    home:'Home', debts:'Debts', history:'History', reports_tab:'Reports', settings_tab:'Settings',
    record_txn:'Record Transaction', customer_person:'Customer / Person',
    amount:'Amount (₦)', category:'Category', note_optional:'Note (optional)',
    general:'General', food:'Food & Groceries', transport:'Transport', shopping:'Shopping',
    bills:'Bills & Utilities', salary:'Salary / Wages', business:'Business Supplies', other:'Other',
    recurring:'Make this a recurring transaction', every_day:'Every Day',
    every_week:'Every Week', every_month:'Every Month',
    dark_mode:'Dark Mode', language:'Language', shop_name:'Shop Name',
    owner_name:'Owner Name', set_pin:'Set / Change PIN', remove_pin:'Remove PIN',
    export_json:'💾 Export Backup (JSON)', export_csv:'📊 Export to CSV',
    import_data:'📥 Import Data', clear_data:'🗑️ Clear All Data',
    shop_profile:'Shop Profile', appearance:'Appearance', security:'Security',
    business_profiles:'Business Profiles', data_management:'Data Management',
    save_changes:'Save Changes', edit_shop:'Edit Shop Details',
    welcome_back:'Welcome back', install_app:'Install TradeBook',
    install_sub:'Add to home screen — works offline',
    install_btn:'Install', debtors_label:'Debtors',
    enter_pin:'Enter your PIN', wrong_pin:'Wrong PIN, try again',
    tap_mic:'Tap the mic to start', listening:'🎤 Listening... speak now',
    voice_hint:'Say something like:', voice_example:'"Sold rice for five thousand naira to Mama Chidi"',
    got_it:'✅ Confirm & Save', heard:'Heard:', delete_confirm:'Delete this transaction?',
    deleted:'🗑️ Deleted', saved:'✅ Saved!', updated:'✅ Updated!', paid_done:'✅ Marked as paid!',
    part_pay_saved:'✅ Part payment recorded!', lang_updated:'✅ Language updated',
    shop_updated:'✅ Shop details updated', pin_set:'✅ PIN set successfully',
    pin_removed:'🔓 PIN removed', profile_added:'✅ Profile added',
    profile_deleted:'🗑️ Profile deleted', profile_switched:'✅ Profile switched',
    imported:'✅ Imported', transactions_word:'transactions',
    data_cleared:'🗑️ Data cleared', invalid_file:'⚠️ Invalid file format',
    enter_name:'⚠️ Please enter a customer name', enter_amount:'⚠️ Please enter a valid amount',
    enter_shop:'⚠️ Shop name required', enter_profile:'⚠️ Enter a profile name',
    cannot_delete_last:'⚠️ Cannot delete last profile',
    confirm_clear:'⚠️ Delete ALL transactions for current profile?',
    confirm_clear2:'Really? This cannot be undone.',
    confirm_delete_profile:'Delete this profile and all its data?',
    enter_part_amount:'⚠️ Enter a valid payment amount',
    exceeds_balance:'⚠️ Amount exceeds remaining balance',
    set_pin_title:'Set New PIN', confirm_pin_title:'Confirm PIN',
    set_pin_hint:'Enter a 4-digit PIN to protect your data',
    confirm_pin_hint:'Enter the PIN again to confirm',
    pins_no_match:"PINs don't match. Try again.",
    confirm_remove_pin:'Remove PIN protection?',
    recurring_none:'No recurring transactions set',
  },
  yo: {
    greeting_morning:'Ẹ káàárọ̀', greeting_afternoon:'Ẹ káàbọ̀', greeting_evening:'Ẹ kúirọlẹ́',
    today_sales:'Tita Ọjọ́ Oni', expenses:'Ìnáwó', on_credit:'Gbèsè', total_owed:'Iye Gbèsè',
    i_sold:'Mo tà', on_credit_btn:'Gbèsè', i_spent:'Mo na', voice:'Ohùn',
    recent_txns:'Iṣòwò tó kọjá', see_all:'Wo gbogbo',
    debt_book:'Ìwé Gbèsè 📋', debt_sub:'Ẹni tó jẹ ọ lára',
    all_txns:'Gbogbo Iṣòwò 📜', reports:'Ìpárọ̀ 📊', settings_title:'Ètò ⚙️',
    save_txn:'✅ Fipamọ́', update_txn:'✅ Ṣe àtúnṣe',
    total_sales:'Iye Tita', net_profit:'Èrè', unpaid_credit:'Gbèsè tó ṣẹ́kù',
    daily_sales:'Tita Ọjọ́ Kọọkan', owed_alert:'Wọ́n jẹ ọ', in_unpaid_credit:'ní gbèsè',
    mark_paid:'Sọ pé o sanwó', part_pay:'Ìsanwó Díẹ', paid:'✓ Ti san', owing:'O jẹ',
    send_wa:'📲 Firánṣẹ́ WhatsApp sí', share_report:'📲 Pín Ìpárọ̀ lórí WhatsApp',
    sale:'Tita', credit:'Gbèsè', expense:'Ìnáwó',
    no_txns:'Kò sí iṣòwò', no_txns_sub:'Tẹ bọ́tìnnì lókè láti bẹ̀rẹ̀',
    no_debts:'Kò sí gbèsè', no_debts_sub:'Tita gbèsè yóò farahàn níbí',
    debtors:'Àwọn tó jẹ', recovered:'Tí a gba padà',
    still_owes:'ṣì jẹ', all_cleared:'gbogbo ré ti sanwó',
    home:'Ilé', debts:'Gbèsè', history:'Ìtàn', reports_tab:'Ìpárọ̀', settings_tab:'Ètò',
    record_txn:'Ìgbàsilẹ̀ Iṣòwò', customer_person:'Oníbàárà', amount:'Iye Owó (₦)',
    category:'Ẹ̀ka', note_optional:'Àkọsílẹ̀ (àṣeyọrí)',
    dark_mode:'Ipò Òkùnkùn', language:'Èdè', shop_name:'Orúkọ Ilé-Ìtajà',
    owner_name:'Orúkọ Oníṣòwò', set_pin:'Ṣètò PIN', remove_pin:'Yọ PIN kúrò',
    enter_pin:'Tẹ̀ PIN rẹ', wrong_pin:'PIN tó kọjá, gbìyànjú lẹ́ẹ̀kan sí',
    save_changes:'Fipamọ́ Àwọn Àyípadà', debtors_label:'Àwọn tó jẹ',
    part_payments:'Àwọn Ìsanwó Díẹ', balance:'Iye tó ṣẹ́kù',
    delete_confirm:'Parẹ́ iṣòwò yìí?', deleted:'🗑️ Parẹ́', saved:'✅ Ti fipamọ́!',
  },
  ig: {
    greeting_morning:'Ụtụtụ ọma', greeting_afternoon:'Ehihie ọma', greeting_evening:'Anyasị ọma',
    today_sales:'Ahịa Taa', expenses:'Ihe eji', on_credit:'Ụgwọ', total_owed:'Ụgwọ Niile',
    i_sold:'Ere m', on_credit_btn:'Ụgwọ', i_spent:'Nwere m', voice:'Olu',
    recent_txns:'Ahịa Ndị Ọhụrụ', see_all:'Hụ niile',
    debt_book:'Akwụkwọ Ụgwọ 📋', debt_sub:'Ndị na-etinye gi ego',
    all_txns:'Ahịa Niile 📜', reports:'Akụkọ 📊', settings_title:'Ntọala ⚙️',
    save_txn:'✅ Chekwaa', update_txn:'✅ Melite',
    total_sales:'Ahịa Niile', net_profit:'Uru', unpaid_credit:'Ụgwọ fọdụrụ',
    daily_sales:'Ahịa Ụbọchị', owed_alert:'A na-etinye gị', in_unpaid_credit:'na ụgwọ',
    mark_paid:'Gosi na akwụọla', part_pay:'Ụgwọ Obere', paid:'✓ Akwụọla', owing:'Na-etinye ụgwọ',
    send_wa:'📲 Ziga WhatsApp na', share_report:'📲 Kekọrịta Akụkọ na WhatsApp',
    sale:'Ahịa', credit:'Ụgwọ', expense:'Ihe eji',
    no_txns:'Enweghị ahịa', no_txns_sub:'Pịa bọtọn dị n\'elu iji malite',
    no_debts:'Enweghị ụgwọ', no_debts_sub:'Ụgwọ ga-apụta ebe a',
    debtors:'Ndị na-etinye ụgwọ', recovered:'Nwetaghachiri',
    still_owes:'ka na-etinye', all_cleared:'akwụọla niile',
    home:'Ulo', debts:'Ụgwọ', history:'Akụkọ', reports_tab:'Akụkọ', settings_tab:'Ntọala',
    record_txn:'Dee Ahịa', customer_person:'Onye Ahịa', amount:'Ego (₦)',
    category:'Ụdị', note_optional:'Ndetu (ọ dịchaghị mkpa)',
    dark_mode:'Ọnọdụ Oji', language:'Asụsụ', shop_name:'Aha Ụlọ Ahịa',
    owner_name:'Aha Onye Nwe', set_pin:'Tọọ PIN', remove_pin:'Wepu PIN',
    enter_pin:'Tinye PIN gị', wrong_pin:'PIN ezighị ezi, nwalee ọzọ',
    save_changes:'Chekwaa Mgbanwe', debtors_label:'Ndị na-etinye ụgwọ',
    part_payments:'Ụgwọ Obere', balance:'Fọdụrụ',
    delete_confirm:'Hichapụ ahịa a?', deleted:'🗑️ Hichapụrụ', saved:'✅ Echekwara!',
  },
  ha: {
    greeting_morning:'Ina kwana', greeting_afternoon:'Barka da rana', greeting_evening:'Barka da yamma',
    today_sales:'Kasuwancin Yau', expenses:'Kashe kuɗi', on_credit:'Bashi', total_owed:'Yawan Bashi',
    i_sold:'Na sayar', on_credit_btn:'Bashi', i_spent:'Na kashe', voice:'Murya',
    recent_txns:'Mu\'amaloli na Ƙarshe', see_all:'Duba duka',
    debt_book:'Littafin Bashi 📋', debt_sub:'Waɗanda ke bin ka kuɗi',
    all_txns:'Dukan Mu\'amaloli 📜', reports:'Rahoto 📊', settings_title:'Saituna ⚙️',
    save_txn:'✅ Adana', update_txn:'✅ Sabunta',
    total_sales:'Dukan Sayarwa', net_profit:'Riba', unpaid_credit:'Bashi da yake',
    daily_sales:'Sayarwa ta Yau', owed_alert:'Ana binka', in_unpaid_credit:'a cikin bashi',
    mark_paid:'Nuna an biya cikakke', part_pay:'Biyan Wani Ɓangare', paid:'✓ An biya', owing:'Yana bashi',
    send_wa:'📲 Aika WhatsApp zuwa', share_report:'📲 Raba Rahoto a WhatsApp',
    sale:'Sayarwa', credit:'Bashi', expense:'Kashe kuɗi',
    no_txns:'Babu mu\'amala', no_txns_sub:'Danna maɓallin da ke sama don fara',
    no_debts:'Babu bashi', no_debts_sub:'Bashi zai bayyana anan',
    debtors:'Masu bashi', recovered:'An dawo',
    still_owes:'yana bin ka', all_cleared:'an biya duka',
    home:'Gida', debts:'Bashi', history:'Tarihi', reports_tab:'Rahoto', settings_tab:'Saituna',
    record_txn:'Rubuta Mu\'amala', customer_person:'Abokin Ciniki', amount:'Adadin Kuɗi (₦)',
    category:'Nau\'i', note_optional:'Bayani (ba tilas ba)',
    dark_mode:'Yanayin Duhu', language:'Harshe', shop_name:'Sunan Shago',
    owner_name:'Sunan Mai Shago', set_pin:'Saita PIN', remove_pin:'Cire PIN',
    enter_pin:'Shigar da PIN ɗinka', wrong_pin:'PIN ba daidai, sake gwadawa',
    save_changes:'Adana Canje-canje', debtors_label:'Masu bashi',
    part_payments:'Biyan Wani Ɓangare', balance:'Ragowar',
    delete_confirm:'Share wannan mu\'amala?', deleted:'🗑️ An share', saved:'✅ An adana!',
  }
};

function t(key) {
  const lang = Storage.getActiveProfile()?.lang || 'en';
  return (TRANSLATIONS[lang]?.[key]) || TRANSLATIONS.en[key] || key;
}

function applyLanguage() {
  // Re-render all text that uses t()
  const lang = Storage.getActiveProfile()?.lang || 'en';
  document.documentElement.lang = lang;

  // Nav labels
  const navMap = { home:'home', debts:'debts', history:'history', reports:'reports_tab', settings:'settings_tab' };
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const tab = btn.dataset.tab;
    const label = btn.querySelector('.nav-label');
    if (label && navMap[tab]) label.textContent = t(navMap[tab]);
  });

  // Quick action buttons
  const qaMap = { 'quick-sale': 'i_sold', 'quick-credit': 'on_credit_btn', 'quick-expense': 'i_spent', 'quick-voice': 'voice' };
  Object.entries(qaMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) { const span = el.querySelectorAll('span')[1]; if (span) span.textContent = t(key); }
  });

  // Page headers
  const headerMap = {
    'debt-book-title': 'debt_book', 'debt-book-sub': 'debt_sub',
    'history-title': 'all_txns', 'reports-title': 'reports',
    'settings-title-el': 'settings_title'
  };
  Object.entries(headerMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });

  // Form labels & buttons
  const labelMap = {
    'lbl-customer': 'customer_person', 'lbl-amount': 'amount',
    'lbl-category': 'category', 'lbl-note': 'note_optional',
    'save-txn-btn': 'save_txn',
    'voice-hint-text': 'voice_hint', 'voice-example-text': 'voice_example',
    'voice-tap-text': 'tap_mic',
  };
  Object.entries(labelMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });

  // Settings labels
  const setMap = {
    'set-dark-mode-lbl':'dark_mode', 'set-lang-lbl':'language',
    'set-shop-name-lbl':'shop_name', 'set-owner-lbl':'owner_name',
    'set-pin-lbl':'set_pin', 'set-remove-pin-lbl':'remove_pin',
    'set-export-json-lbl':'export_json', 'set-export-csv-lbl':'export_csv',
    'set-import-lbl':'import_data', 'set-clear-lbl':'clear_data',
  };
  Object.entries(setMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });

  refreshAll();
}
