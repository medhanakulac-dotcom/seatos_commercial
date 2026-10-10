// Training Structure — the 6-module customer training curriculum.
// Edit the content arrays at the top; the component below lays them out.

export const trainingModules = [
  {
    n: "1",
    tag: "Foundations",
    title: "Platform Orientation",
    duration: "45 min",
    desc: "Navigating seatOS, roles and core concepts.",
    covers: [
      "Logging in & navigating the workspace",
      "Roles & permissions at a glance",
      "Core concepts and shared vocabulary",
    ],
    outcome: "Moves around seatOS without help.",
  },
  {
    n: "2",
    tag: "Core",
    title: "Daily Operator Workflow",
    duration: "90 min",
    desc: "The day-to-day actions an operator performs.",
    covers: [
      "The operator\u2019s daily checklist",
      "Working the live queue end to end",
      "Handling the common edge cases",
    ],
    outcome: "Runs a normal day unaided.",
  },
  {
    n: "3",
    tag: "Core",
    title: "The Six Core Features",
    duration: "2 hrs",
    desc: "Hands-on setup and use of each core feature.",
    covers: [
      "Guided setup of all six features",
      "Practice tasks on a sandbox account",
      "When to reach for which feature",
    ],
    outcome: "Has used all six features live.",
  },
  {
    n: "4",
    tag: "Data",
    title: "Reporting & Insights",
    duration: "60 min",
    desc: "Reading dashboards and acting on the numbers.",
    covers: ["Reading the key dashboards", "Spotting the signals that matter", "Exporting and sharing results"],
    outcome: "Acts on the numbers, not just reads them.",
  },
  {
    n: "5",
    tag: "Admin",
    title: "Configuration & Permissions",
    duration: "60 min",
    desc: "Managing users, settings and integrations.",
    covers: ["Managing users, teams & roles", "Settings and integrations", "Guardrails & approval flows"],
    outcome: "Administers the account safely.",
  },
  {
    n: "6",
    tag: "Wrap-up",
    title: "Go-Live Readiness & Survey",
    duration: "45 min",
    desc: "Final check, Q&A, and the training survey.",
    covers: ["Final go-live readiness check", "Open Q&A with the trainer", "The training survey (CSAT)"],
    outcome: "Signed off and ready to go live.",
  },
];

export const trainingOverview = [
  { label: "Format", value: "Live + hands-on" },
  { label: "Duration", value: "~2 days" },
  { label: "Audience", value: "Operators & admins" },
  { label: "Pass gate", value: "CSAT ≥ 4.5" },
];

export default function TrainingStructure({ nav }) {
  const { navOnboarding } = nav;
  return (
    <div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "#fdf0db",
          color: "#c97f12",
          padding: "6px 13px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "700",
          marginBottom: "14px",
        }}
      >
        Playbook · Onboarding
      </div>
      <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.7px", marginBottom: "10px" }}>
        Training Structure
      </h1>
      <p style={{ fontSize: "15px", color: "#8E8E93", maxWidth: "720px", lineHeight: "1.6" }}>
        The standard curriculum the trainer runs during the <b style={{ color: "#5a5248" }}>Training</b> stage of
        onboarding — so every operator is taken through the same path to confidence, and the post-training survey
        measures a consistent experience.
      </p>
      <div
        style={{
          display: "flex",
          gap: "14px",
          alignItems: "flex-start",
          background: "#fef6e7",
          border: "1px solid #f3e2bb",
          borderRadius: "16px",
          padding: "18px 20px",
          marginTop: "22px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "11px",
            background: "#F5A623",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: "0",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "15px", fontWeight: "800", color: "#8a5a12", letterSpacing: "-0.2px" }}>
              Available Q4
            </span>{" "}
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: "800",
                color: "#fff",
                background: "#F5A623",
                padding: "3px 10px",
                borderRadius: "20px",
                letterSpacing: "0.4px",
              }}
            >
              COMING SOON
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "#a07d3c", lineHeight: "1.55", marginTop: "4px", maxWidth: "640px" }}>
            The structured training programme below is being finalised and rolls out in <b>Q4</b>. Until then, treat it
            as a preview — the modules, timings and outcomes may still change before launch.
          </p>
        </div>
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "26px 30px",
          marginTop: "24px",
          boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "22px" }}>
          <div
            style={{
              width: "54px",
              height: "54px",
              borderRadius: "15px",
              background: "#fdf0db",
              color: "#c97f12",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: "0",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3L2 8l10 5 10-5-10-5z" />
              <path d="M6 10.5V16c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5.5" />
              <path d="M22 8v5" />
            </svg>
          </div>
          <div style={{ flex: "1", minWidth: "240px" }}>
            <h3 style={{ fontSize: "19px", fontWeight: "800", letterSpacing: "-0.3px" }}>
              Six modules, one consistent path
            </h3>
            <p style={{ fontSize: "13.5px", color: "#8E8E93", lineHeight: "1.5", marginTop: "3px", maxWidth: "580px" }}>
              Every operator is taken through the same sequence — from first login to go-live sign-off — so the
              post-training survey measures a like-for-like experience.
            </p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
          {trainingOverview.map((ov, _i0) => (
            <div key={_i0} style={{ background: "#FBF7F0", borderRadius: "14px", padding: "15px 18px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  color: "#b6a894",
                }}
              >
                {ov.label}
              </div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  letterSpacing: "-0.3px",
                  marginTop: "5px",
                  color: "#1A1A1A",
                }}
              >
                {ov.value}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "13px", margin: "32px 0 4px" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "800",
            color: "#c97f12",
            background: "#fdf0db",
            padding: "4px 9px",
            borderRadius: "8px",
          }}
        >
          ·
        </span>{" "}
        <span style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
          The curriculum
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginTop: "18px" }}>
        {trainingModules.map((m, _i0) => (
          <div
            key={_i0}
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "22px",
              boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "11px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "9px",
                    background: "#fdf0db",
                    color: "#c97f12",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                  }}
                >
                  {m.n}
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    color: "#b6a894",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {m.tag}
                </span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#c97f12",
                  background: "#fdf0db",
                  padding: "3px 9px",
                  borderRadius: "7px",
                }}
              >
                {m.duration}
              </span>
            </div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
              {m.title}
            </div>
            <div style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.45", marginTop: "4px" }}>{m.desc}</div>
            <div style={{ height: "1px", background: "#f3ece1", margin: "14px 0" }}></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {m.covers.map((cv, _i1) => (
                <div
                  key={_i1}
                  style={{
                    display: "flex",
                    gap: "9px",
                    alignItems: "flex-start",
                    fontSize: "12.5px",
                    color: "#3a3530",
                    lineHeight: "1.4",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#c97f12"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: "0", marginTop: "1px" }}
                  >
                    <path d="M3 8.5l3.5 3.5L13 4.5" />
                  </svg>
                  <span>{cv}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "auto", paddingTop: "16px" }}>
              <div
                style={{
                  display: "flex",
                  gap: "9px",
                  alignItems: "center",
                  background: "#FBF7F0",
                  borderRadius: "11px",
                  padding: "10px 12px",
                }}
              >
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#b6a894",
                    flexShrink: "0",
                  }}
                >
                  Outcome
                </span>{" "}
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#5a5248", lineHeight: "1.35" }}>
                  {m.outcome}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: "#1A1A1A",
          borderRadius: "18px",
          padding: "22px 26px",
          marginTop: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          flexWrap: "wrap",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>Training feeds the onboarding gate —</span>{" "}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(245,166,35,0.16)",
              color: "#F5A623",
              borderRadius: "10px",
              padding: "7px 12px",
              fontSize: "12.5px",
              fontWeight: "800",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3 4.3 13.3l.7-4.3-3.1-3 4.3-.6z" />
            </svg>
            Survey ≥ 4.5 to pass
          </span>
        </div>
        <button
          onClick={navOnboarding}
          style={{
            background: "#F5A623",
            color: "#1A1A1A",
            border: "none",
            borderRadius: "12px",
            padding: "11px 18px",
            fontSize: "13.5px",
            fontWeight: "800",
            cursor: "pointer",
          }}
        >
          Back to Onboarding →
        </button>
      </div>
    </div>
  );
}
