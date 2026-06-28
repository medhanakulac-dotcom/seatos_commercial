import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient.js";
import { logActivity } from "./activityLogger.js";
import ProposalApp from "./apps/ProposalApp.jsx";
import CalculatorApp from "./apps/CalculatorApp.jsx";
import ContractApp from "./apps/ContractApp.jsx";
import AdminApp from "./apps/AdminApp.jsx";

const C = {
  bg: "#F5EFE7", orange: "#F5A623", green: "#2ECC71", pink: "#E84C88",
  cyan: "#2DD4BF", purple: "#7C5CFC", dark: "#1A1A1A", gray: "#8E8E93",
};

const LOGO_THUMB = "https://res.cloudinary.com/dkwj2iikl/image/upload/v1773201660/216db52f-36bd-4673-ade2-725c4beba594_thumb_zt4ub4.jpg";

const IconCalculator = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/>
  </svg>
);
const IconProposal = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconContract = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/>
  </svg>
);
const IconAdmin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

// ─── Login Screen (email + magic link) ───────────────────────────
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email."); return; }
    setLoading(true);

    // Check if email is in allowed_users
    const { data: allowed } = await supabase
      .from("allowed_users")
      .select("email")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (!allowed) {
      setError("This email is not authorized. Ask your admin for an invite.");
      setLoading(false);
      return;
    }

    // Send magic link
    const { error: authErr } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    if (authErr) {
      setError(authErr.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div style={{ minHeight: "100vh", background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: "48px 40px", width: 400, maxWidth: "90vw", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: C.dark, marginBottom: 8 }}>Check your email</div>
          <div style={{ fontSize: 14, color: C.gray, lineHeight: 1.6, marginBottom: 24 }}>
            We sent a sign-in link to<br /><b style={{ color: C.dark }}>{email}</b>
          </div>
          <div style={{ fontSize: 12, color: "#a1a1aa" }}>Click the link in the email to sign in. You can close this tab.</div>
          <button onClick={() => { setSent(false); setEmail(""); }} style={{
            marginTop: 20, background: "none", border: "none", color: C.orange, fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline",
          }}>Use a different email</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.dark, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "48px 40px", width: 400, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
        <img src={LOGO_THUMB} alt="seatOS" style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", marginBottom: 20 }} />
        <div style={{ fontWeight: 800, fontSize: 24, color: C.dark, marginBottom: 4 }}>
          seat<span style={{ color: C.orange }}>O</span>S Deal Suite
        </div>
        <div style={{ fontSize: 13, color: C.gray, marginBottom: 32 }}>
          Sign in with your email
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
            placeholder="you@company.com" autoFocus
            style={{
              width: "100%", padding: "14px 18px", borderRadius: 14,
              border: error ? "2px solid #e11d48" : "2px solid #e4e4e7",
              fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12,
              textAlign: "center", transition: "border-color 0.2s",
            }}
          />
          {error && <div style={{ color: "#e11d48", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "14px", borderRadius: 14, border: "none",
            background: loading ? "#ccc" : C.orange, color: "#fff", fontSize: 16,
            fontWeight: 700, cursor: loading ? "wait" : "pointer",
          }}>
            {loading ? "Checking..." : "Send Sign-In Link"}
          </button>
        </form>
        <div style={{ marginTop: 20, fontSize: 11, color: "#a1a1aa" }}>
          Invite-only access. Contact your admin if you don't have access.
        </div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("calculator");
  const [open, setOpen] = useState(true);
  const [userRole, setUserRole] = useState("member");

  // Listen to auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        logActivity("login", { method: "session_restore" }, session.user.email);
        checkRole(session.user.email);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session && _event === "SIGNED_IN") {
        logActivity("login", { method: "magic_link" }, session.user.email);
        checkRole(session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkRole(email) {
    const { data } = await supabase
      .from("allowed_users")
      .select("role")
      .eq("email", email.toLowerCase())
      .single();
    if (data?.role) setUserRole(data.role);
  }

  const handleTabSwitch = useCallback((tabId) => {
    setActive(tabId);
    if (session?.user?.email) {
      logActivity("tab_switch", { tab: tabId }, session.user.email);
    }
  }, [session]);

  const handleSignOut = async () => {
    if (session?.user?.email) {
      await logActivity("logout", {}, session.user.email);
    }
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, fontFamily: "sans-serif" }}>Loading...</div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  const userEmail = session.user.email;
  const isAdmin = userRole === "admin";

  const TABS = [
    { id: "calculator", label: "Deal Calculator", icon: IconCalculator, color: C.purple },
    { id: "proposal", label: "Proposal Builder", icon: IconProposal, color: C.orange },
    { id: "contract", label: "Contract Builder", icon: IconContract, color: C.green },
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: IconAdmin, color: "#e11d48" }] : []),
  ];

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .sidebar{display:flex}
        .mobile-top{display:none}
        .mobile-bottom{display:none}
        .main-area{margin-left:${open ? 248 : 68}px;transition:margin-left 0.25s ease}
        @media(max-width:768px){
          .sidebar{display:none!important}
          .mobile-top{display:flex!important}
          .mobile-bottom{display:flex!important}
          .main-area{margin-left:0!important;padding-top:56px!important;padding-bottom:64px!important}
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI',-apple-system,sans-serif" }}>

        {/* ─── MOBILE: Top Header ─── */}
        <div className="mobile-top" style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
          height: 56, background: C.dark, alignItems: "center",
          padding: "0 16px", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={LOGO_THUMB} alt="seatOS" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>seat<span style={{ color: C.orange }}>O</span>S</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{userEmail.split("@")[0]}</span>
            <button onClick={handleSignOut} style={{
              background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)",
              padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600,
            }}>Out</button>
          </div>
        </div>

        {/* ─── MOBILE: Bottom Tab Bar ─── */}
        <div className="mobile-bottom" style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
          height: 64, background: C.dark, alignItems: "stretch",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>
          {TABS.map(tab => {
            const isActive = active === tab.id;
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => handleTabSwitch(tab.id)} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 4, border: "none", cursor: "pointer",
                background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.35)",
                position: "relative", padding: "8px 0",
              }}>
                {isActive && <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 3, borderRadius: "0 0 3px 3px", background: tab.color }} />}
                <span style={{ color: isActive ? tab.color : "inherit", display: "flex" }}><Icon /></span>
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{tab.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* ─── DESKTOP: Sidebar ─── */}
        <aside className="sidebar" style={{
          width: open ? 248 : 68, background: C.dark, color: "#fff",
          flexDirection: "column", transition: "width 0.25s ease",
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100, overflow: "hidden",
        }}>
          {/* Logo */}
          <div style={{
            padding: open ? "20px 18px" : "20px 12px", display: "flex", alignItems: "center",
            justifyContent: open ? "flex-start" : "center", gap: 12,
            borderBottom: "1px solid rgba(255,255,255,0.08)", minHeight: 76,
          }}>
            <img src={LOGO_THUMB} alt="seatOS" crossOrigin="anonymous" style={{
              width: 40, height: 40, borderRadius: 10, objectFit: "cover", flexShrink: 0,
              border: "2px solid rgba(255,255,255,0.1)",
            }} />
            {open && (
              <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.3, color: "#fff" }}>
                  seat<span style={{ color: C.orange }}>O</span>S
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 1 }}>Deal Suite</div>
              </div>
            )}
          </div>

          {/* Toggle */}
          <div style={{ padding: "10px 10px 4px", display: "flex", justifyContent: open ? "flex-end" : "center" }}>
            <button onClick={() => setOpen(!open)} style={{
              background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.4)",
              width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 12, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >{open ? "◂" : "▸"}</button>
          </div>

          {/* Nav */}
          <nav style={{ padding: "4px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            {TABS.map(tab => {
              const isActive = active === tab.id;
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => handleTabSwitch(tab.id)} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: open ? "13px 16px" : "13px 0", justifyContent: open ? "flex-start" : "center",
                  borderRadius: 12, border: "none", cursor: "pointer",
                  background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.4)",
                  fontWeight: isActive ? 700 : 500, fontSize: 14, transition: "all 0.15s",
                  width: "100%", textAlign: "left", position: "relative",
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}}
                >
                  {isActive && <div style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: "0 3px 3px 0", background: tab.color }} />}
                  <span style={{ flexShrink: 0, display: "flex", alignItems: "center", color: isActive ? tab.color : "inherit" }}><Icon /></span>
                  {open && <span>{tab.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* User info + Sign Out */}
          <div style={{
            padding: open ? "14px 16px" : "14px 8px", borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            {open && (
              <div style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userEmail}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                  {isAdmin ? "Admin" : "Member"}
                </div>
              </div>
            )}
            <button onClick={handleSignOut} style={{
              background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.4)",
              padding: open ? "8px 16px" : "8px", borderRadius: 8, cursor: "pointer",
              fontSize: 12, fontWeight: 600, width: open ? "100%" : "auto",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(231,76,60,0.15)"; e.currentTarget.style.color = "#e74c3c"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {open && "Sign Out"}
            </button>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ─── */}
        <main className="main-area" style={{ flex: 1, minHeight: "100vh", background: C.bg }}>
          <div key={active} style={{ animation: "fadeIn 0.2s ease-out" }}>
            {active === "calculator" && <CalculatorApp />}
            {active === "proposal" && <ProposalApp />}
            {active === "contract" && <ContractApp />}
            {active === "admin" && isAdmin && <AdminApp currentUser={userEmail} />}
          </div>
        </main>
      </div>
    </>
  );
}
