// CS Automation — preview of the automated Low-segment motions.
// Edit the content arrays at the top; the component below lays them out.
import { Hover, icon, icCSAuto } from "../ui.jsx";

export const csAutoFeatures = [
  {
    title: "Automated activation",
    desc: "A 4-week onboarding journey that walks new Low-segment accounts to first value with no CSM needed.",
    icon: icCSAuto,
  },
  {
    title: "Behaviour-based nudges",
    desc: "Triggered emails and in-app prompts when usage dips or a key feature goes untouched.",
    icon: icon(["M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.7 21a2 2 0 01-3.4 0"]),
  },
  {
    title: "Self-service resources",
    desc: "Guides, checklists and help content surfaced automatically at the right moment.",
    icon: icon(["M4 19.5A2.5 2.5 0 016.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"]),
  },
  {
    title: "Health-triggered alerts",
    desc: "If an account turns unhealthy, the system flags it so a human can step in before churn.",
    icon: icon(["M12 9v4", "M12 17h.01", "M10.3 3.9L1.8 18a2 2 0 001.7 3h16.9a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"]),
  },
  {
    title: "Renewal reminders",
    desc: "Automated sequences in the run-up to renewal, with escalation if there is no response.",
    icon: icon(["M21 12a9 9 0 11-3-6.7L21 8", "M21 3v5h-5"]),
  },
  {
    title: "Usage reporting",
    desc: "Light-touch summaries that keep the account informed of the value they are getting.",
    icon: icon(["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"]),
  },
];

export default function CSAutomation({ nav }) {
  const { navCS } = nav;
  return (
    <div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "#e4faf6",
          color: "#1aa897",
          padding: "6px 13px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "700",
          marginBottom: "14px",
        }}
      >
        Customer Success
      </div>
      <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.7px", marginBottom: "10px" }}>
        CS Automation — Low Segment
      </h1>
      <p style={{ fontSize: "15px", color: "#8E8E93", maxWidth: "740px", lineHeight: "1.6" }}>
        Low-segment accounts are too many to touch one by one, so their Customer Success runs on automation instead of a
        dedicated CSM. These motions are being built and roll out in <b style={{ color: "#5a5248" }}>Q3</b>.
      </p>
      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          background: "#1A1A1A",
          borderRadius: "20px",
          padding: "26px 30px",
          marginTop: "24px",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-40px",
            top: "-50px",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(45,212,191,.3),transparent 70%)",
          }}
        ></div>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "15px",
            background: "#F5A623",
            color: "#1A1A1A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: "0",
            position: "relative",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 2L3 14h8l-1 8 10-12h-8z" />
          </svg>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap" }}>
            <h3 style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.3px" }}>Available Q3</h3>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: "800",
                color: "#1A1A1A",
                background: "#F5A623",
                padding: "3px 10px",
                borderRadius: "20px",
                letterSpacing: "0.4px",
              }}
            >
              COMING SOON
            </span>
          </div>
          <p
            style={{
              fontSize: "13.5px",
              color: "rgba(255,255,255,0.6)",
              lineHeight: "1.55",
              marginTop: "5px",
              maxWidth: "600px",
            }}
          >
            Until launch, handle Low-segment accounts manually using the Customer Success matrix. This page previews
            what the automation will cover.
          </p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "13px", margin: "32px 0 4px" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "800",
            color: "#1aa897",
            background: "#e4faf6",
            padding: "4px 9px",
            borderRadius: "8px",
          }}
        >
          Preview
        </span>{" "}
        <span style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
          What the automation will do
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginTop: "18px" }}>
        {csAutoFeatures.map((f, _i0) => (
          <div
            key={_i0}
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "22px",
              boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
              opacity: "0.96",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#e4faf6",
                color: "#1aa897",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {f.icon}
            </div>
            <div
              style={{
                fontSize: "14.5px",
                fontWeight: "800",
                color: "#1A1A1A",
                marginTop: "13px",
                letterSpacing: "-0.2px",
              }}
            >
              {f.title}
            </div>
            <p style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.5", marginTop: "5px" }}>{f.desc}</p>
          </div>
        ))}
      </div>
      <div
        style={{
          background: "#FBF7F0",
          border: "1px solid #ece2d2",
          borderRadius: "16px",
          padding: "20px 22px",
          marginTop: "24px",
          display: "flex",
          gap: "13px",
          alignItems: "center",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "38px",
            height: "38px",
            borderRadius: "11px",
            background: "#fff",
            color: "#1aa897",
            flexShrink: "0",
            boxShadow: "0 1px 2px rgba(26,26,26,.05)",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v18h18" />
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
          </svg>
        </span>
        <div style={{ flex: "1", minWidth: "0" }}>
          <div style={{ fontSize: "14.5px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
            Meanwhile, use the matrix
          </div>
          <div style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.45", marginTop: "2px" }}>
            Low-segment playbooks (Automated Activation, Self-Service / Nudge) still apply — run them manually until Q3.
          </div>
        </div>
        <Hover
          as="button"
          onClick={navCS}
          style={{
            background: "#1aa897",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "11px 18px",
            fontSize: "13px",
            fontWeight: "800",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          hover={{ filter: "brightness(0.95)" }}
        >
          Open Customer Success →
        </Hover>
      </div>
    </div>
  );
}
