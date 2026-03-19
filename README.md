# SeatOS Hub

Internal tools dashboard with sidebar navigation.

## Tools
- **Proposal Builder** — Create proposals for customers
- **Deal Calculator** — Calculate deal value & segment scoring
- **Contract Builder** — Generate subscription agreements

## Setup

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repo
4. Framework: **Vite**
5. Click **Deploy**

No extra config needed — Vercel auto-detects Vite.

## Adding the full apps

The Calculator and Contract apps are placeholders. To add the full code:

1. Open `src/apps/CalculatorApp.jsx`
2. Paste the full Document 2 code
3. Change `export default function App()` → `export default function CalculatorApp()`

Same for `src/apps/ContractApp.jsx` with Document 3.

## Project Structure

```
seatos-hub/
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
└── src/
    ├── main.jsx
    ├── App.jsx          ← Sidebar navigation shell
    └── apps/
        ├── ProposalApp.jsx
        ├── CalculatorApp.jsx
        └── ContractApp.jsx
```
