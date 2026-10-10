// The Playbook shell: sidebar, header search and the active section.
// Tools (src/apps) open over the content area, to the right of the sidebar.
import { useEffect, useRef, useState } from "react";
import { Hover } from "./ui.jsx";
import { NAV, SECTIONS, TOOLS } from "./navigation.js";
import { SEARCH_INDEX } from "./searchIndex.js";

const MOBILE = 860;
const isMobile = () => typeof window !== "undefined" && window.innerWidth <= MOBILE;

// Scoped to the Playbook so the tools in src/apps keep their own styling.
const CSS = `
  .pf-root, .pf-root *{box-sizing:border-box}
  .pf-aside *, .pf-main *{margin:0;padding:0}
  .pf-root ::selection{background:#F5A623;color:#fff}
  .pf-root input,.pf-root select,.pf-root textarea,.pf-root button{font-family:inherit}
  .ds-scroll::-webkit-scrollbar{width:10px}
  .ds-scroll::-webkit-scrollbar-track{background:transparent}
  .ds-scroll::-webkit-scrollbar-thumb{background:#ddd3c2;border-radius:8px;border:2px solid #F5EFE7}
  .navx::-webkit-scrollbar{width:0}
  @media(max-width:${MOBILE}px){
    aside.pf-hide{position:fixed!important;top:0;left:0;bottom:0;width:272px!important;flex-basis:272px!important;z-index:600!important;box-shadow:0 0 50px rgba(0,0,0,.45)}
    .pf-backdrop{display:block!important;position:fixed!important;inset:0;z-index:590!important;background:rgba(20,16,10,.5);border:none;cursor:pointer}
    header.pf-hide{padding:12px 16px 12px 62px!important;gap:10px 12px!important;flex-wrap:wrap!important}
    header.pf-hide > div:first-child{display:none!important}
    .pf-main [style*="position: relative"][style*="width: 260px"]{width:auto!important;flex:1 1 150px!important}
    .pf-main [style*="max-width: 1180px"]{padding-left:16px!important;padding-right:16px!important}
    .pf-main [style*="repeat("]{grid-template-columns:1fr!important}
    .pf-main [style*="0.9fr 1fr 1.4fr"]{grid-template-columns:1fr!important;gap:4px 0!important}
    #tktop{margin-left:-16px!important;margin-right:-16px!important;padding-left:16px!important;padding-right:16px!important;top:0!important}
  }
  @media(min-width:${MOBILE + 1}px){ .pf-backdrop{display:none!important} }
  @media(max-width:520px){
    .pf-main h1{font-size:25px!important;letter-spacing:-0.4px!important}
    .pf-main [style*="repeat("]{gap:12px!important}
    #tktop > div{flex-wrap:wrap!important}
    #tktop > div > button{flex:1 1 44%!important}
  }
  @media print{
    .pf-hide{display:none!important}
    .pf-main{overflow:visible!important;height:auto!important;background:#fff!important;margin:0!important}
    .pf-doc{box-shadow:none!important;border:1px solid #e4e4e7!important;max-width:100%!important}
    body{background:#fff!important}
    @page{margin:12mm}
  }
`;

const navBtn = {
  display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", borderRadius: "12px",
  border: "none", cursor: "pointer", width: "100%", textAlign: "left", fontSize: "14px",
};
const navBtnOn = { ...navBtn, position: "relative", background: "rgba(255,255,255,0.08)", color: "#fff", fontWeight: "700" };
const navBtnOff = { ...navBtn, background: "transparent", color: "rgba(255,255,255,0.42)", fontWeight: "500" };
const navBtnHover = { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.75)" };
const groupLabel = {
  fontSize: "10px", color: "rgba(255,255,255,0.28)", letterSpacing: "1.4px",
  textTransform: "uppercase", fontWeight: "700",
};

function NavItem({ item, active, onClick }) {
  const badge = item.badge && (
    <span style={{ fontSize: "9px", fontWeight: "800", color: "#1A1A1A", background: item.badge.bg, padding: "2px 7px", borderRadius: "20px", marginLeft: "auto", whiteSpace: "nowrap" }}>
      {item.badge.text}
    </span>
  );
  if (active) {
    return (
      <button onClick={onClick} style={navBtnOn}>
        <div style={{ position: "absolute", left: "0", top: "9px", bottom: "9px", width: "3px", borderRadius: "0 3px 3px 0", background: item.accent }}></div>
        <span style={{ display: "flex", color: item.iconAccent || item.accent }}>{item.icon}</span>
        {item.label}
        {badge}
      </button>
    );
  }
  return (
    <Hover as="button" onClick={onClick} style={navBtnOff} hover={navBtnHover}>
      <span style={{ display: "flex" }}>{item.icon}</span>
      {item.label}
      {badge}
    </Hover>
  );
}

export default function PlaybookShell({ userEmail, isAdmin, activeTool, onOpenTool, onCloseTool, onSignOut, renderTool }) {
  const [active, setActive] = useState("home");
  // Set when search jumps to a spot inside a section, so the section can open the right sub-tab.
  const [request, setRequest] = useState(null);
  const [collapsed, setCollapsed] = useState(isMobile);
  const [q, setQ] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const mainRef = useRef(null);

  const scrollTo = (anchor) => {
    setTimeout(() => {
      const sc = mainRef.current;
      if (!sc) return;
      if (!anchor || anchor === "__top__") { sc.scrollTop = 0; return; }
      const el = document.getElementById(anchor);
      if (el) {
        const rel = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
        const pad = anchor === "tktop" ? 60 : anchor.indexOf("tk") === 0 ? 128 : 22;
        sc.scrollTop = Math.max(0, rel - pad);
      }
    }, 90);
  };

  const go = (key) => () => {
    if (isMobile()) setCollapsed(true);
    setActive(key);
    setRequest(null);
    setQ("");
    setSearchFocused(false);
    scrollTo("__top__");
    onCloseTool();
  };
  const jump = (key, anchor) => () => {
    setActive(key);
    setRequest({ anchor });
    setQ("");
    setSearchFocused(false);
    scrollTo(anchor);
    onCloseTool();
  };
  const openTool = (tool) => onOpenTool(tool);

  // Helpers handed to every section.
  const nav = {
    go, jump, openTool, scrollTo,
    navHome: go("home"), navSales: go("sales"), navToolkit: go("toolkit"), navOnboarding: go("onboarding"),
    navTraining: go("training"), navCS: go("cs"), navCSTools: go("cstk"),
    navPricing: go("pricing"), navTemplates: go("templates"),
    navCalc: () => openTool("calculator"), navProposal: () => openTool("proposal"),
    navContract: () => openTool("contract"), navAdmin: () => openTool("admin"),
  };

  const toggleSidebar = () => setCollapsed((c) => !c);
  useEffect(() => {
    const onResize = () => { if (isMobile()) setCollapsed(true); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const ql = q.trim().toLowerCase();
  const tabName = (i) => (i.tool ? TOOLS[i.tool].title : SECTIONS[i.tab].title);
  const results = ql
    ? SEARCH_INDEX.filter((i) => (i.label + " " + i.sub + " " + (i.kw || "") + " " + tabName(i)).toLowerCase().includes(ql))
        .slice(0, 12)
        .map((i) => ({ label: i.label, sub: i.sub, tabName: tabName(i), go: i.tool ? () => openTool(i.tool) : jump(i.tab, i.anchor) }))
    : [];
  const showResults = searchFocused && ql.length > 0 && results.length > 0;
  const noResults = searchFocused && ql.length > 0 && results.length === 0;

  const local = userEmail ? userEmail.replace(/@.*/, "") : "";
  const userInitials = local ? local.slice(0, 2).toUpperCase() : "US";

  const Section = SECTIONS[active].component;
  const isOn = (item) => (activeTool ? item.tool === activeTool : item.section === active);
  const toolTitle = activeTool ? TOOLS[activeTool]?.title || "" : "";

  return (
    <div className="pf-root" style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden", color: "#1A1A1A", fontFamily: "'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif", background: "#F5EFE7" }}>
      <style>{CSS}</style>

      {collapsed && !activeTool && (
        <Hover
          as="button"
          onClick={toggleSidebar}
          title="Show sidebar"
          style={{ position: "fixed", top: "14px", left: "14px", zIndex: "500", width: "40px", height: "40px", borderRadius: "11px", border: "none", cursor: "pointer", background: "#1A1A1A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(26,26,26,.28)" }}
          hover={{ background: "#333" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </Hover>
      )}

      {!collapsed && <button className="pf-backdrop" onClick={toggleSidebar} style={{ display: "none" }}></button>}

      {/* ============ SIDEBAR ============ */}
      {!collapsed && (
        <aside className="pf-hide pf-aside" style={{ width: "248px", flex: "0 0 248px", background: "#1A1A1A", display: "flex", flexDirection: "column", color: "#fff", overflow: "hidden" }}>
          <div style={{ padding: "20px 18px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)", minHeight: "76px" }}>
            <img src="/playbook/logo.jpg" alt="seatOS" style={{ width: "40px", height: "40px", borderRadius: "11px", objectFit: "cover", flexShrink: "0", boxShadow: "0 4px 12px rgba(245,166,35,.35)" }} />
            <div style={{ overflow: "hidden", whiteSpace: "nowrap", flex: "1" }}>
              <div style={{ fontWeight: "800", fontSize: "18px", letterSpacing: "-0.3px", color: "#fff" }}>
                seat<span style={{ color: "#F5A623" }}>O</span>S
              </div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: "1px" }}>Commercial Playbook</div>
            </div>
            <Hover
              as="button"
              onClick={toggleSidebar}
              title="Hide sidebar"
              style={{ flexShrink: "0", width: "30px", height: "30px", borderRadius: "8px", border: "none", cursor: "pointer", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
              hover={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            </Hover>
          </div>

          <nav className="navx" style={{ padding: "14px 12px", flex: "1", display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto" }}>
            {NAV.map((g, gi) => (
              <div key={g.group} style={{ display: "contents" }}>
                <div style={{ ...groupLabel, padding: gi === 0 ? "6px 12px 4px" : "14px 12px 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                  {g.group}
                  {g.badge && (
                    <span style={{ fontSize: "9px", fontWeight: "800", color: "#1A1A1A", background: g.badge.bg, padding: "2px 7px", borderRadius: "20px", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>{g.badge.text}</span>
                  )}
                </div>
                {g.items
                  .filter((item) => !item.adminOnly || isAdmin)
                  .map((item) => (
                    <NavItem
                      key={item.section || item.tool}
                      item={item}
                      active={isOn(item)}
                      onClick={item.tool ? () => openTool(item.tool) : go(item.section)}
                    />
                  ))}
              </div>
            ))}
          </nav>

          <div style={{ padding: "14px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "11px", padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: "12px" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "linear-gradient(135deg,#7C5CFC,#2DD4BF)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", color: "#fff", fontSize: "13px", flexShrink: "0" }}>
                {userInitials}
              </div>
              <div style={{ minWidth: "0" }}>
                <div style={{ fontSize: "12.5px", fontWeight: "700", color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail || "Signed in"}</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>{isAdmin ? "Admin" : "Member"}</div>
              </div>
            </div>
            <Hover
              as="button"
              onClick={onSignOut}
              style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "9px", borderRadius: "10px", border: "none", cursor: "pointer", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", fontSize: "12px", fontWeight: "600" }}
              hover={{ background: "rgba(231,76,60,0.15)", color: "#e74c3c" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>{" "}
              Sign Out
            </Hover>
          </div>
        </aside>
      )}

      <div style={{ flex: "1", minWidth: "0", position: "relative", display: "flex" }}>
        {/* ============ MAIN ============ */}
        <main ref={mainRef} className="ds-scroll pf-main" style={{ flex: "1", display: "flex", flexDirection: "column", background: "#F5EFE7", overflowY: "auto" }}>
          <header className="pf-hide" style={{ position: "sticky", top: "0", zIndex: "20", display: "flex", alignItems: "center", gap: "18px", padding: "16px 30px", background: "rgba(245,239,231,0.88)", backdropFilter: "blur(10px)" }}>
            <div style={{ flex: "1", minWidth: "0" }}>
              <div style={{ fontSize: "12px", color: "#a89a82", fontWeight: "600" }}>
                Playbook · <span style={{ color: "#8E8E93" }}>{SECTIONS[active].title}</span>
              </div>
            </div>
            <div style={{ position: "relative", width: "260px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px", background: "#fff", borderRadius: "13px", padding: "10px 14px", color: "#b6a894", boxShadow: "0 1px 2px rgba(26,26,26,.05)" }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: "0" }}>
                  <circle cx="7" cy="7" r="4.3" />
                  <path d="M10.5 10.5L14 14" />
                </svg>
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setSearchFocused(true); }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                  placeholder="Search the playbook…"
                  style={{ border: "none", outline: "none", background: "transparent", fontSize: "13px", color: "#1A1A1A", width: "100%" }}
                />
              </div>
              {showResults && (
                <div className="ds-scroll" style={{ position: "absolute", top: "46px", left: "0", right: "0", background: "#fff", borderRadius: "14px", boxShadow: "0 12px 36px rgba(26,26,26,.16)", padding: "6px", zIndex: "40", maxHeight: "340px", overflowY: "auto" }}>
                  {results.map((r, i) => (
                    <Hover
                      key={i}
                      as="button"
                      onMouseDown={r.go}
                      style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1px", width: "100%", textAlign: "left", border: "none", background: "transparent", borderRadius: "10px", padding: "9px 11px", cursor: "pointer" }}
                      hover={{ background: "#FBF7F0" }}
                    >
                      <span style={{ fontSize: "13.5px", fontWeight: "700", color: "#1A1A1A" }}>{r.label}</span>
                      <span style={{ fontSize: "11.5px", color: "#b6a894" }}>{r.tabName} · {r.sub}</span>
                    </Hover>
                  ))}
                </div>
              )}
              {noResults && (
                <div style={{ position: "absolute", top: "46px", left: "0", right: "0", background: "#fff", borderRadius: "14px", boxShadow: "0 12px 36px rgba(26,26,26,.16)", padding: "16px", zIndex: "40", fontSize: "13px", color: "#8E8E93" }}>
                  No matches in the playbook.
                </div>
              )}
            </div>
            <button onClick={nav.navProposal} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#F5A623", color: "#fff", border: "none", borderRadius: "13px", padding: "11px 18px", fontSize: "13.5px", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 14px rgba(245,166,35,.4)" }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
              New proposal
            </button>
          </header>

          <div style={{ padding: "14px 34px 56px", maxWidth: "1180px", width: "100%", margin: "0 auto" }}>
            <Section nav={nav} request={request} user={{ email: userEmail }} />
          </div>
        </main>

        {/* A tool is layered over the content area, to the right of the sidebar */}
        {activeTool && (
          <div style={{ position: "absolute", inset: 0, background: "#F5EFE7", display: "flex", flexDirection: "column", zIndex: 100, animation: "pfFadeIn 0.15s ease-out" }}>
            <style>{`@keyframes pfFadeIn{from{opacity:0}to{opacity:1}}`}</style>
            <div style={{ flexShrink: 0, height: 52, background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={toggleSidebar} title="Toggle sidebar" style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
                </button>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{toolTitle}</span>
              </div>
              <button onClick={onCloseTool} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.6)", padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                Back to Playbook
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>{renderTool(activeTool)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
