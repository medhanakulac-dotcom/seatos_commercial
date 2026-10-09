// Home — welcome banner and shortcuts into the playbook and tools.
// Edit the content arrays at the top; the component below lays them out.
import {
  Hover,
  icon,
  icCS,
  icCSTools,
  icCalc,
  icContract,
  icOnboarding,
  icPricing,
  icProposal,
  icSales,
  icTemplates,
  icToolkit,
  icTraining,
} from "../ui.jsx";

export default function Home({ nav, user }) {
  const { go, openTool, navCalc, navSales } = nav;
  const local = (user?.email || "").replace(/[@.].*/, "");
  const userFirstName = local ? local.charAt(0).toUpperCase() + local.slice(1) : "there";
  const homeSections = [
    {
      title: "Sales Process",
      sub: "New lead to signed contract",
      bg: "#efeafe",
      fg: "#7C5CFC",
      icon: icSales,
      go: go("sales"),
    },
    {
      title: "Selling Toolkit",
      sub: "How to win the deal",
      bg: "#fdeaef",
      fg: "#d83a72",
      icon: icToolkit,
      go: go("toolkit"),
    },
    {
      title: "Onboarding",
      sub: "30-day go-live motion",
      bg: "#fdf0db",
      fg: "#c97f12",
      icon: icOnboarding,
      go: go("onboarding"),
    },
    {
      title: "Training Structure",
      sub: "The six-module curriculum",
      bg: "#fdf0db",
      fg: "#c97f12",
      icon: icTraining,
      go: go("training"),
    },
    {
      title: "Customer Success",
      sub: "Segment × health matrix",
      bg: "#e4faf6",
      fg: "#1aa897",
      icon: icCS,
      go: go("cs"),
    },
    {
      title: "CS Toolkit",
      sub: "Golden rules + 30 tips",
      bg: "#e4faf6",
      fg: "#1aa897",
      icon: icCSTools,
      go: go("cstk"),
    },
    {
      title: "Pricing & Packages",
      sub: "Tiers & add-ons",
      bg: "#fdeaef",
      fg: "#d83a72",
      icon: icPricing,
      go: go("pricing"),
    },
  ];
  const homeTools = [
    {
      title: "Deal Calculator",
      sub: "Model MRR, ARR & discounts",
      bg: "#eafaf1",
      fg: "#1f9d57",
      icon: icCalc,
      ext: true,
      go: () => openTool("calculator"),
    },
    {
      title: "Proposal Builder",
      sub: "Generate a branded quote",
      bg: "#fdf0db",
      fg: "#c97f12",
      icon: icProposal,
      ext: true,
      go: () => openTool("proposal"),
    },
    {
      title: "Contract Builder",
      sub: "Build & send contracts",
      bg: "#eafaf1",
      fg: "#1f9d57",
      icon: icContract,
      ext: true,
      go: () => openTool("contract"),
    },
    {
      title: "Templates & Docs",
      sub: "Battle-tested assets",
      bg: "#efeafe",
      fg: "#7C5CFC",
      icon: icTemplates,
      ext: false,
      go: go("templates"),
    },
  ];
  return (
    <div>
      <div
        style={{
          background: "#1A1A1A",
          borderRadius: "24px",
          padding: "36px 38px",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-30px",
            top: "-50px",
            width: "240px",
            height: "240px",
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(245,166,35,.42),transparent 70%)",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            right: "120px",
            bottom: "-90px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(232,76,136,.32),transparent 70%)",
          }}
        ></div>
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#F5A623", letterSpacing: "0.3px" }}>
            Welcome back, {userFirstName} 👋
          </div>
          <h1
            style={{
              fontSize: "34px",
              fontWeight: "800",
              letterSpacing: "-0.8px",
              margin: "12px 0 10px",
              maxWidth: "640px",
              lineHeight: "1.15",
            }}
          >
            Everything you need to run a deal, from first touch to signed renewal.
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.55)", maxWidth: "540px", lineHeight: "1.55" }}>
            One source of truth for how we sell, onboard, and grow accounts at seatOS. Jump back into the tools or brush
            up on the playbook.
          </p>
          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button
              onClick={navCalc}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                background: "#2ECC71",
                color: "#fff",
                border: "none",
                borderRadius: "13px",
                padding: "13px 20px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(46,204,113,.35)",
              }}
            >
              Open Deal Calculator
            </button>{" "}
            <button
              onClick={navSales}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "none",
                borderRadius: "13px",
                padding: "13px 20px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              View Sales Process
            </button>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "13px", margin: "30px 0 4px" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "800",
            color: "#7C5CFC",
            background: "#efeafe",
            padding: "4px 9px",
            borderRadius: "8px",
          }}
        >
          Playbook
        </span>{" "}
        <span style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
          Explore the playbook
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginTop: "18px" }}>
        {homeSections.map((h, _i0) => (
          <Hover
            key={_i0}
            as="button"
            onClick={h.go}
            style={{
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              background: "#fff",
              border: "none",
              borderRadius: "18px",
              padding: "22px",
              boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
              cursor: "pointer",
            }}
            hover={{ transform: "translateY(-2px)", boxShadow: "0 14px 32px rgba(26,26,26,.09)" }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: h.bg,
                color: h.fg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "14px",
              }}
            >
              {h.icon}
            </div>
            <div style={{ fontSize: "15.5px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
              {h.title}
            </div>
            <div style={{ fontSize: "12.5px", color: "#8E8E93", marginTop: "4px", lineHeight: "1.45" }}>{h.sub}</div>
          </Hover>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "13px", margin: "32px 0 4px" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "800",
            color: "#1f9d57",
            background: "#eafaf1",
            padding: "4px 9px",
            borderRadius: "8px",
          }}
        >
          Tools
        </span>{" "}
        <span style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
          Open a tool
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginTop: "18px" }}>
        {homeTools.map((t, _i0) => (
          <Hover
            key={_i0}
            as="button"
            onClick={t.go}
            style={{
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              background: "#fff",
              border: "none",
              borderRadius: "18px",
              padding: "22px",
              boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
              cursor: "pointer",
              position: "relative",
            }}
            hover={{ transform: "translateY(-2px)", boxShadow: "0 14px 32px rgba(26,26,26,.09)" }}
          >
            {t.ext && (
              <span
                style={{
                  position: "absolute",
                  top: "15px",
                  right: "15px",
                  fontSize: "9.5px",
                  fontWeight: "800",
                  color: "#b6a894",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  letterSpacing: "0.3px",
                }}
              >
                OPENS APP
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 3h7v7M13 3L4 12" />
                </svg>
              </span>
            )}
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: t.bg,
                color: t.fg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "13px",
              }}
            >
              {t.icon}
            </div>
            <div style={{ fontSize: "14.5px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
              {t.title}
            </div>
            <div style={{ fontSize: "12px", color: "#8E8E93", marginTop: "4px", lineHeight: "1.4" }}>{t.sub}</div>
          </Hover>
        ))}
      </div>
    </div>
  );
}
