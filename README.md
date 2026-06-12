# 📒 TradeBook — Digital Ledger for Nigerian Traders

> **Your exercise book, upgraded.** Record sales, track debts, and see your profit — 100% offline, built for Nigerian market traders.

![TradeBook](https://img.shields.io/badge/TradeBook-v1.0-1B4332?style=for-the-badge)
![Offline](https://img.shields.io/badge/Works-Offline-52B788?style=for-the-badge)
![Languages](https://img.shields.io/badge/Languages-EN%20%7C%20YO%20%7C%20IG%20%7C%20HA-D4A017?style=for-the-badge)

---

## 🌟 Features

| Feature | Description |
|---|---|
| 💰 **Sales Recording** | Record sales in under 5 seconds |
| 📋 **Debt Book** | Per-customer credit tracking with balances |
| 🎤 **Voice Input** | Speak your transactions in English/Pidgin |
| 📊 **Reports** | Daily/weekly/monthly profit summaries |
| 📲 **WhatsApp Reminders** | Send debt reminders directly to customers |
| 🔐 **PIN Lock** | 4-digit PIN to protect your data |
| 👥 **Multi-Profile** | Run multiple businesses from one app |
| 🌙 **Dark Mode** | Easy on the eyes at night |
| 🔁 **Recurring Transactions** | Auto-log daily/weekly/monthly transactions |
| 💾 **Export Data** | Download your records as JSON or CSV |
| 📥 **Import Data** | Restore from a previous backup |
| 🌍 **4 Languages** | English, Yoruba, Igbo, Hausa |
| 📴 **100% Offline** | Works with zero internet connection |

---

## 🚀 Getting Started

### Option 1: GitHub Pages (Recommended)

1. Fork this repository
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)` folder
4. Your app is live at `https://YOUR-USERNAME.github.io/tradebook/`

### Option 2: Run Locally

```bash
git clone https://github.com/YOUR-USERNAME/tradebook.git
cd tradebook
# Open index.html in your browser — no server needed!
open index.html
```

### Option 3: VS Code Live Server

Install the **Live Server** extension, right-click `index.html` → **Open with Live Server**

---

## 📁 Project Structure

```
tradebook/
├── index.html          # Main app shell + all HTML screens
├── css/
│   └── style.css       # All styles (dark mode, animations, responsive)
├── js/
│   ├── storage.js      # localStorage database layer
│   ├── translations.js # EN / YO / IG / HA translations
│   ├── pin.js          # PIN lock & security
│   ├── transactions.js # Add/edit/delete transactions
│   ├── debts.js        # Debt book rendering
│   ├── reports.js      # Charts & WhatsApp report sharing
│   ├── voice.js        # Web Speech API voice input
│   ├── settings.js     # Settings, profiles, import/export
│   └── app.js          # Main orchestrator & routing
└── README.md
```

---

## 🛠️ Tech Stack

- **Pure HTML/CSS/JS** — Zero dependencies, zero frameworks
- **localStorage** — All data stored on device (offline-first)
- **Web Speech API** — Voice input (Chrome/Edge supported)
- **CSS Custom Properties** — Full dark mode support
- **No build step** — Just open and use

---

## 🗺️ Roadmap

- [ ] PWA (install on home screen)
- [ ] Cloud sync (Firebase)
- [ ] Receipt photo attachment
- [ ] Low-stock inventory alerts
- [ ] USSD fallback for feature phones
- [ ] SMS debt reminders
- [ ] Airtime payment integration

---

## 🇳🇬 Built For

Local market traders in Nigeria — provisions sellers, foodstuff vendors, open-market retailers, artisans, and anyone still using an exercise book to track their business.

---

## 📄 License

MIT — free to use, modify, and distribute.

---

*TradeBook — Your exercise book, upgraded. 📒*
