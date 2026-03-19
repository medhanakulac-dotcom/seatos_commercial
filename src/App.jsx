import { useState } from "react";
import ProposalApp from "./apps/ProposalApp.jsx";
import CalculatorApp from "./apps/CalculatorApp.jsx";
import ContractApp from "./apps/ContractApp.jsx";

const C = {
  bg: "#F5EFE7",
  orange: "#F5A623",
  green: "#2ECC71",
  pink: "#E84C88",
  cyan: "#2DD4BF",
  purple: "#7C5CFC",
  dark: "#1A1A1A",
  gray: "#8E8E93",
};

const LOGO_THUMB = "https://res.cloudinary.com/dkwj2iikl/image/upload/v1773201660/216db52f-36bd-4673-ade2-725c4beba594_thumb_zt4ub4.jpg";
const LOGO_TEXT = "https://res.cloudinary.com/dkwj2iikl/image/upload/v1773914487/Screenshot_2026-03-19_at_5.00.59_PM_aqryg1.png";

const IconProposal = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconCalculator = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/>
  </svg>
);
const IconContract = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/>
  </svg>
);

const TABS = [
  { id: "calculator", label: "Deal Calculator", icon: IconCalculator, color: C.purple },
  { id: "proposal", label: "Proposal Builder", icon: IconProposal, color: C.orange },
  { id: "contract", label: "Contract Builder", icon: IconContract, color: C.green },
];

// ─── Simple password gate ─────────────────────────────────────
// Change this password to whatever you want
const ACCESS_PASSWORD = "seatos2025";

function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pw === ACCESS_PASSWORD) {
      sessionStorage.setItem("seatos_auth", "1");
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: C.dark,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI',-apple-system,sans-serif",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 24,
        padding: "48px 40px",
        width: 380,
        maxWidth: "90vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        textAlign: "center",
      }}>
        <img
          src={LOGO_THUMB}
          alt="seatOS"
          style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", marginBottom: 20 }}
        />
        <div style={{ fontWeight: 800, fontSize: 24, color: C.dark, marginBottom: 4 }}>
          seat<span style={{ color: C.orange }}>O</span>S Hub
        </div>
        <div style={{ fontSize: 13, color: C.gray, marginBottom: 32 }}>
          Internal Tools — Enter password to continue
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(false); }}
            placeholder="Password"
            autoFocus
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: 14,
              border: error ? "2px solid #e11d48" : "2px solid #e4e4e7",
              fontSize: 16,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 16,
              textAlign: "center",
              letterSpacing: 4,
              transition: "border-color 0.2s",
            }}
          />
          {error && (
            <div style={{ color: "#e11d48", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              Wrong password
            </div>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 14,
              border: "none",
              background: C.orange,
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("seatos_auth") === "1");
  const [active, setActive] = useState("calculator");
  const [open, setOpen] = useState(true);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI',-apple-system,sans-serif" }}>

        <aside style={{
          width: open ? 248 : 68,
          background: C.dark,
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.25s ease",
          position: "fixed",
          top: 0, left: 0, bottom: 0,
          zIndex: 100,
          overflow: "hidden",
        }}>
          {/* Logo */}
          <div style={{
            padding: open ? "20px 18px" : "20px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: open ? "flex-start" : "center",
            gap: 12,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            minHeight: 76,
          }}>
            <img
              src={LOGO_THUMB}
              alt="seatOS"
              crossOrigin="anonymous"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                objectFit: "cover",
                flexShrink: 0,
                border: "2px solid rgba(255,255,255,0.1)",
              }}
            />
            {open && (
              <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.3, color: "#fff" }}>
                  seat<span style={{ color: C.orange }}>O</span>S
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 1 }}>
                  Internal Tools
                </div>
              </div>
            )}
          </div>

          <div style={{
            padding: "10px 10px 4px",
            display: "flex",
            justifyContent: open ? "flex-end" : "center",
          }}>
            <button
              onClick={() => setOpen(!open)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                width: 30, height: 30, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 12,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >
              {open ? "◂" : "▸"}
            </button>
          </div>

          <nav style={{ padding: "4px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            {TABS.map(tab => {
              const isActive = active === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: open ? "13px 16px" : "13px 0",
                    justifyContent: open ? "flex-start" : "center",
                    borderRadius: 12, border: "none", cursor: "pointer",
                    background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.4)",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 14,
                    transition: "all 0.15s",
                    width: "100%", textAlign: "left",
                    position: "relative",
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}}
                >
                  {isActive && (
                    <div style={{
                      position: "absolute", left: 0, top: 8, bottom: 8,
                      width: 3, borderRadius: "0 3px 3px 0",
                      background: tab.color,
                    }} />
                  )}
                  <span style={{ flexShrink: 0, display: "flex", alignItems: "center", color: isActive ? tab.color : "inherit" }}>
                    <Icon />
                  </span>
                  {open && <span>{tab.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Footer with logout */}
          <div style={{
            padding: open ? "14px 16px" : "14px 8px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}>
            <button
              onClick={() => { sessionStorage.removeItem("seatos_auth"); setAuthed(false); }}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                padding: open ? "8px 16px" : "8px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                width: open ? "100%" : "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(231,76,60,0.15)"; e.currentTarget.style.color = "#e74c3c"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {open && "Sign Out"}
            </button>
            {open && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>Bookaway Ltd.</div>}
          </div>
        </aside>

        <main style={{
          flex: 1,
          marginLeft: open ? 248 : 68,
          transition: "margin-left 0.25s ease",
          minHeight: "100vh",
          background: C.bg,
        }}>
          <div key={active} style={{ animation: "fadeIn 0.2s ease-out" }}>
            {active === "proposal" && <ProposalApp />}
            {active === "calculator" && <CalculatorApp />}
            {active === "contract" && <ContractApp />}
          </div>
        </main>
      </div>
    </>
  );
}
