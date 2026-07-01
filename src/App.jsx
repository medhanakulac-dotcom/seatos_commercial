import { useState, useEffect, useCallback, useRef } from "react";
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
  const [activeTool, setActiveTool] = useState(null);
  const [sidebarW, setSidebarW] = useState(248);
  const playbookRef = useRef(null);

  // Messages from the embedded Playbook shell (tool launch, sidebar width, sign out)
  useEffect(() => {
    const onMsg = (e) => {
      const d = (e && e.data) || {};
      if (d.source !== "playbook") return;
      if (d.type === "openTool") setActiveTool(d.tool);
      else if (d.type === "closeTool") setActiveTool(null);
      else if (d.type === "sidebarWidth") setSidebarW(d.width);
      else if (d.type === "signout") handleSignOut();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const toggleSidebarFromTool = () => {
    const collapse = sidebarW !== 0;
    setSidebarW(collapse ? 0 : 248);
    if (playbookRef.current && playbookRef.current.contentWindow) {
      playbookRef.current.contentWindow.postMessage({ source: "shell", type: "setSidebar", collapsed: collapse }, "*");
    }
  };

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

  const TOOL_TITLES = {
    calculator: "Deal Calculator",
    proposal: "Proposal Builder",
    contract: "Contract Builder",
    admin: "Admin",
  };

  const playbookSrc = `/playbook.html?role=${isAdmin ? "admin" : "member"}&email=${encodeURIComponent(userEmail)}`;

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, fontFamily: "'Segoe UI',-apple-system,sans-serif" }}>
      <style>{`*{box-sizing:border-box}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* The Playbook shell is always mounted — its sidebar is the app's single navigation */}
      <iframe
        ref={playbookRef}
        title="seatOS Playbook"
        src={playbookSrc}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", display: "block" }}
      />

      {/* A tool is layered over the content area, to the right of the persistent sidebar */}
      {activeTool && (
        <div style={{
          position: "absolute", top: 0, bottom: 0, right: 0, left: sidebarW,
          background: C.bg, display: "flex", flexDirection: "column", zIndex: 100,
          animation: "fadeIn 0.15s ease-out", transition: "left 0.18s ease",
        }}>
          <div style={{
            flexShrink: 0, height: 52, background: C.dark, display: "flex",
            alignItems: "center", justifyContent: "space-between", padding: "0 14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={toggleSidebarFromTool} title="Toggle sidebar" style={{
                width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              </button>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{TOOL_TITLES[activeTool] || ""}</span>
            </div>
            <button onClick={() => setActiveTool(null)} style={{
              display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)",
              border: "none", color: "rgba(255,255,255,0.6)", padding: "7px 13px", borderRadius: 8,
              cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              Back to Playbook
            </button>
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>
            {activeTool === "calculator" && <CalculatorApp />}
            {activeTool === "proposal" && <ProposalApp />}
            {activeTool === "contract" && <ContractApp />}
            {activeTool === "admin" && isAdmin && <AdminApp currentUser={userEmail} />}
            {activeTool === "admin" && !isAdmin && (
              <div style={{ padding: 60, textAlign: "center", color: C.gray }}>Not authorized.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
