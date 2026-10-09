// CS Toolkit — the 10 CS golden rules and the 30 CS tips.
// Edit the content arrays at the top; the component below lays them out. The Operator Watch AI advises from a copy in
// server/operator-watch/src/infrastructure/claude/cs-toolkit.ts: change both (CSToolkit.sync.test.ts checks they match).
import { useEffect, useState } from "react";

export const csGoldenRules = [
  { num: "1", text: "Be proactive, not reactive." },
  { num: "2", text: "Understand the business before the system." },
  { num: "3", text: "Adoption is the goal, not go-live." },
  { num: "4", text: "One champion is never enough." },
  { num: "5", text: "Every meeting needs a next step." },
  { num: "6", text: "Small issues become churn if ignored." },
  { num: "7", text: "Solve business problems, not just support tickets." },
  { num: "8", text: "Create value before asking for renewal." },
  { num: "9", text: "Every customer should achieve a quick win." },
  { num: "10", text: "Help operators grow — that\u2019s what Customer Success means at seatOS." },
];

export const csCatDefs = [
  { key: "all", label: "All", sub: "30" },
  { key: "adoption", label: "Adoption & value", sub: "7" },
  { key: "people", label: "People & comms", sub: "6" },
  { key: "risk", label: "Risk & health", sub: "6" },
  { key: "run", label: "Run the account", sub: "11" },
];

const mkCsBtn = (on) => ({
  display: "flex",
  alignItems: "center",
  gap: "7px",
  fontSize: "12.5px",
  fontWeight: 800,
  padding: "8px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  letterSpacing: "-0.1px",
  transition: "all .15s",
  border: "none",
  whiteSpace: "nowrap",
  background: on ? "#1aa897" : "#fff",
  color: on ? "#fff" : "#3a3530",
  boxShadow: on ? "none" : "0 1px 2px rgba(26,26,26,.1)",
});

const mkCsBadge = (on) => ({
  fontSize: "10px",
  fontWeight: 800,
  padding: "1px 7px",
  borderRadius: "20px",
  background: on ? "rgba(255,255,255,.22)" : "#e4faf6",
  color: on ? "#fff" : "#1aa897",
});

export const CS_TIPS = [
  {
    n: "1",
    cat: "adoption",
    title: "Understand the customer before the system",
    body: "Before giving advice, understand how the operator actually works.",
    bullets: [
      "How do they sell tickets today?",
      "Which channels do they use?",
      "Which tasks are still manual?",
      "Which team uses seatOS daily?",
      "Which process causes the most complaints?",
      "Which reports does management care about?",
      "What did they expect when they signed?",
    ],
    tip: "Don\u2019t assume the customer needs more training — the real issue is often workflow, ownership, management direction or internal discipline.",
  },
  {
    n: "2",
    cat: "adoption",
    title: "Adoption is more important than go-live",
    body: "Go-live is only the beginning. A customer is successful when seatOS becomes part of their daily operation.",
    bullets: [
      "Are users logging in?",
      "Are bookings being created?",
      "Are trips managed in seatOS?",
      "Are reports being used?",
      "Are manual processes reduced?",
      "Are problems still handled outside the system?",
    ],
    tip: "If they go live but still work mainly in Excel, WhatsApp or manual reports, adoption is not complete.",
  },
  {
    n: "3",
    cat: "adoption",
    title: "Focus on daily habits",
    body: "Customers adopt seatOS when it becomes their normal way of working. Train on what users do every day, not every feature.",
    bullets: [
      "Counter staff: create bookings quickly",
      "Operations: manage trips & passenger manifests",
      "Management: read reports",
      "Finance: invoices, sales & reconciliation",
      "Customer service: changes & passenger updates",
    ],
    tip: "Don\u2019t teach everything at once — teach the workflow that helps them tomorrow morning.",
  },
  {
    n: "4",
    cat: "adoption",
    title: "Create a quick win early",
    body: "Every customer should experience one visible success within the first week after go-live.",
    bullets: [
      "First booking created",
      "First OTA booking received correctly",
      "First passenger manifest exported",
      "First successful check-in",
      "First report reviewed by management",
      "First issue resolved faster than before",
    ],
    tip: "A quick win builds confidence. Confidence builds adoption.",
  },
  {
    n: "5",
    cat: "risk",
    title: "Don\u2019t ask only \u201Cany problem?\u201D",
    body: "Customers say \u201Cno problem\u201D even when adoption is weak. Ask better questions.",
    bullets: [
      "Which part of your work still takes too much time?",
      "Which task are you still doing outside seatOS?",
      "Which team uses seatOS the least?",
      "Which report do you still prepare manually?",
      "What do your staff complain about most?",
      "What is still confusing for your team?",
    ],
    tip: "Good CS questions reveal hidden risk before the customer complains.",
  },
  {
    n: "6",
    cat: "risk",
    title: "Silence is a risk signal",
    body: "A quiet customer is not always a happy customer. They may be:",
    bullets: [
      "Not using the system",
      "Confused or losing confidence",
      "Using another process",
      "Waiting for renewal to cancel",
      "Depending on one person internally",
      "Not seeing value",
    ],
    tip: "If a customer stops replying, stops joining meetings or stops logging in, treat it as a risk.",
  },
  {
    n: "7",
    cat: "people",
    title: "Build more than one relationship",
    body: "Never depend on only one champion — if your contact leaves or loses influence, the account becomes risky.",
    bullets: [
      "Daily users",
      "Operations manager",
      "Finance contact",
      "Commercial contact",
      "Owner / management",
      "IT or system admin",
    ],
    tip: "A healthy account has multiple contacts who understand why seatOS matters.",
  },
  {
    n: "8",
    cat: "people",
    title: "Match the message to the stakeholder",
    body: "Different people care about different value.",
    bullets: [
      "Operations: faster work, fewer mistakes, clear workflow",
      "Finance: reports, payment tracking, reconciliation, control",
      "Commercial: more channels, more bookings, inventory",
      "Management: growth, visibility, standardization, scalability",
    ],
    tip: "Don\u2019t explain seatOS the same way to everyone.",
  },
  {
    n: "9",
    cat: "people",
    title: "Every meeting needs a clear next step",
    body: "A meeting without a next step is not complete. Before ending, confirm:",
    bullets: [
      "What was agreed?",
      "Who owns the action?",
      "When will it be done?",
      "What happens next?",
      "When is the next meeting?",
    ],
    tip: "Always summarize next steps before leaving the call.",
  },
  {
    n: "10",
    cat: "people",
    title: "Follow up within 24 hours",
    body: "After every important meeting, send a short recap.",
    bullets: ["What was discussed", "What was agreed", "Open issues", "Owner of each action", "Next meeting date"],
    tip: "Fast follow-up creates trust and keeps momentum.",
  },
  {
    n: "11",
    cat: "people",
    title: "Own the problem even if another team fixes it",
    body: "CS may not solve every technical issue, but CS owns customer communication.",
    bullets: [
      "Acknowledge it",
      "Explain what is being checked",
      "Give an expected update time",
      "Follow up even with no final answer",
      "Close the loop when resolved",
    ],
    tip: "Customers can accept problems — they lose trust when communication is unclear.",
  },
  {
    n: "12",
    cat: "risk",
    title: "Escalate early",
    body: "Don\u2019t wait until the customer is angry. Escalate when:",
    bullets: [
      "The customer is not using the system",
      "A critical issue repeats",
      "A promised feature is delayed",
      "A decision maker is unhappy",
      "The customer mentions cancellation",
      "Internal ownership is unclear",
    ],
    tip: "Early escalation prevents churn.",
  },
  {
    n: "13",
    cat: "adoption",
    title: "Don\u2019t over-train",
    body: "More training isn\u2019t always the answer. If a customer isn\u2019t adopting, check the real cause.",
    bullets: [
      "Is the workflow too complicated?",
      "Did management enforce the process?",
      "Are users avoiding change?",
      "Is the wrong person trained?",
      "Is the feature relevant to their work?",
      "Are they still using the old process?",
    ],
    tip: "Training teaches knowledge. Adoption changes behavior.",
  },
  {
    n: "14",
    cat: "adoption",
    title: "Connect every feature to a business outcome",
    body: "Don\u2019t say \u201Cplease use this feature.\u201D Say why it matters.",
    bullets: [
      "\u201CThis reduces manual work for your team.\u201D",
      "\u201CThis lets management see route performance.\u201D",
      "\u201CThis helps avoid missed bookings.\u201D",
      "\u201CThis helps your counter team sell faster.\u201D",
    ],
    tip: "Customers adopt features faster when they understand why the feature matters.",
  },
  {
    n: "15",
    cat: "adoption",
    title: "Identify manual work",
    body: "Manual work is usually where value is hiding.",
    bullets: [
      "Excel tracking",
      "WhatsApp coordination",
      "Manual OTA updates",
      "Manual passenger lists",
      "Manual invoice checking",
      "Manual report preparation",
      "Manual refund tracking",
    ],
    tip: "Every manual process is a potential adoption opportunity.",
  },
  {
    n: "16",
    cat: "risk",
    title: "Turn complaints into adoption opportunities",
    body: "When customers complain, don\u2019t only solve the complaint — find the root.",
    bullets: [
      "Why is this happening?",
      "One-time issue or repeated process?",
      "Which team is affected?",
      "Is there a seatOS workflow that prevents this?",
      "Do we need to retrain the team?",
    ],
    tip: "A complaint often shows where the customer hasn\u2019t fully adopted the system.",
  },
  {
    n: "17",
    cat: "risk",
    title: "Review health every week",
    body: "Customer health shouldn\u2019t be based only on feeling.",
    bullets: [
      "Login activity",
      "Booking activity",
      "Feature usage",
      "Support tickets & open issues",
      "Payment status",
      "Management engagement",
      "Renewal timeline",
    ],
    tip: "A customer can be friendly but still unhealthy.",
  },
  {
    n: "18",
    cat: "risk",
    title: "Watch for churn signals",
    body: "Churn rarely happens suddenly — the signs appear weeks or months earlier.",
    bullets: [
      "Low login or booking activity",
      "No response",
      "Repeated complaints",
      "Management change",
      "New competitor/system mentioned",
      "Payment delay",
      "Low meeting attendance",
      "They stop asking questions",
    ],
    tip: "Spot the signals early and act before renewal.",
  },
  {
    n: "19",
    cat: "run",
    title: "Prepare before every customer meeting",
    body: "Before meeting the customer, check the account.",
    bullets: [
      "Latest usage",
      "Open tickets",
      "Previous meeting notes",
      "Commercial package & renewal date",
      "Key stakeholders",
      "Pending actions",
      "Health status",
    ],
    tip: "Customers can feel when CS is prepared — preparation builds credibility.",
  },
  {
    n: "20",
    cat: "run",
    title: "Don\u2019t let issues stay vague",
    body: "Avoid vague notes like \u201Ccustomer has issue with report.\u201D",
    bullets: ["Who is affected — team & branch?", "What exactly is wrong?", "Who owns the next action, and by when?"],
    tip: "Write it clearly, e.g. \u201CFinance can\u2019t match daily sales with counter payments for Phuket branch — collect sample by Friday, product to review logic by Tuesday.\u201D",
  },
  {
    n: "21",
    cat: "run",
    title: "Help customers standardize",
    body: "seatOS creates more value when customers use one standard process across teams and branches.",
    bullets: [
      "Do all branches follow the same process?",
      "Are teams using different spreadsheets?",
      "Does management get consistent reports?",
      "Are user roles clearly defined?",
    ],
    tip: "Standardization is one of the strongest values seatOS delivers to larger operators.",
  },
  {
    n: "22",
    cat: "run",
    title: "Renewal starts on day one",
    body: "Don\u2019t wait until the contract is nearly over. Renewal depends on:",
    bullets: [
      "Adoption",
      "Trust",
      "Business value",
      "Issue resolution",
      "Management engagement",
      "A clear success story",
    ],
    tip: "If the customer can\u2019t explain the value of seatOS before renewal, the renewal is at risk.",
  },
  {
    n: "23",
    cat: "run",
    title: "Expansion comes from pain, not selling",
    body: "Don\u2019t push another product too early — look for the signal.",
    bullets: [
      "Too many passenger questions → Notify",
      "Long counter queues → POS or Kiosk",
      "Many manual OTA updates → Channel Manager",
      "Drivers need trip details → Driver App",
      "Management wants visibility → Dashboard",
      "Many agents → Agency Management",
    ],
    tip: "Never sell another module — solve the next business problem.",
  },
  {
    n: "24",
    cat: "run",
    title: "Record everything in HubSpot",
    body: "If it\u2019s not in HubSpot, the team can\u2019t manage it properly.",
    bullets: [
      "Meeting notes & customer goals",
      "Risks & open issues",
      "Next actions",
      "Stakeholders",
      "Feature requests",
      "Expansion opportunities",
      "Renewal risks",
    ],
    tip: "Good HubSpot hygiene protects the customer and the company.",
  },
  {
    n: "25",
    cat: "run",
    title: "Be proactive, not reactive",
    body: "Don\u2019t wait for the customer to contact you.",
    bullets: [
      "Check usage before problems happen",
      "Follow up after go-live",
      "Review customer health",
      "Suggest better workflows",
      "Identify risks early",
      "Help customers prepare for peak season",
    ],
    tip: "Good support solves today\u2019s problem. Great Customer Success prevents tomorrow\u2019s.",
  },
  {
    n: "26",
    cat: "run",
    title: "Keep the customer focused",
    body: "Customers may request many things — help them prioritize.",
    bullets: [
      "What is blocking go-live?",
      "What affects daily operation?",
      "What affects revenue?",
      "What affects passengers?",
      "What can wait?",
    ],
    tip: "Not every request has the same priority — help customers focus on what matters most.",
  },
  {
    n: "27",
    cat: "run",
    title: "Be careful with promises",
    body: "Don\u2019t promise custom features, timelines, integrations or commercial terms without internal confirmation.",
    bullets: ["\u201CLet me confirm with the relevant team and come back with a clear answer.\u201D"],
    tip: "Trust is built by being reliable, not by saying yes to everything.",
  },
  {
    n: "28",
    cat: "run",
    title: "Close the loop",
    body: "Never leave the customer wondering. When something is done:",
    bullets: [
      "Tell the customer",
      "Explain what changed",
      "Ask them to test",
      "Confirm if it is resolved",
      "Update HubSpot",
    ],
    tip: "An issue isn\u2019t closed until the customer confirms or the resolution is clearly communicated.",
  },
  {
    n: "29",
    cat: "people",
    title: "Create customer confidence",
    body: "Customers should feel that CS:",
    bullets: ["Understands their business", "Is responsive", "Is organized", "Follows up", "Cares about their success"],
    tip: "Confidence is created through small, consistent actions.",
  },
  {
    n: "30",
    cat: "run",
    title: "Remember the seatOS mission",
    body: "seatOS helps ground and sea transport operators:",
    bullets: [
      "Connect every sales channel",
      "Reduce manual work",
      "Improve visibility",
      "Standardize operations",
      "Grow without unnecessary complexity",
    ],
    tip: "Every CS action should help the customer move closer to that outcome.",
  },
];

export default function CSToolkit({ nav, request }) {
  const { scrollTo } = nav;
  const [csCat, setCsCat] = useState("all");
  // Arriving from search on "CS tips" shows every category.
  useEffect(() => {
    if (request?.anchor === "cs-tips") setCsCat("all");
  }, [request]);
  const csTipCats = csCatDefs.map((c) => ({
    label: c.label,
    sub: c.sub,
    style: mkCsBtn(csCat === c.key),
    badgeStyle: mkCsBadge(csCat === c.key),
    go: () => {
      setCsCat(c.key);
      scrollTo("cs-tips");
    },
  }));
  const csTips = CS_TIPS.filter((t) => csCat === "all" || t.cat === csCat);
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
        CS Toolkit
      </div>
      <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.7px", marginBottom: "10px" }}>
        Creating Customer Success
      </h1>
      <p style={{ fontSize: "15px", color: "#8E8E93", maxWidth: "740px", lineHeight: "1.6" }}>
        Customer Success isn't only answering questions or closing tickets. At seatOS it means helping operators use the
        system in a way that improves daily operations, increases adoption, reduces manual work, and creates long-term
        value. Every customer is different and every CS member is experienced — use this as a guide, not a script.
      </p>
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
          Rules
        </span>{" "}
        <span id="cs-rules" style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
          The CS golden rules
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div
        style={{
          background: "#1A1A1A",
          borderRadius: "20px",
          padding: "30px 32px",
          marginTop: "14px",
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
        <div style={{ position: "relative" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "800",
              color: "#2DD4BF",
              letterSpacing: "0.3px",
              marginBottom: "4px",
            }}
          >
            ★ Ten rules every CS member should know
          </div>
          <h3 style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.4px", marginBottom: "20px" }}>
            The mindset behind every account
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "13px 28px" }}>
            {csGoldenRules.map((r, _i0) => (
              <div key={_i0} style={{ display: "flex", gap: "13px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    background: "rgba(45,212,191,0.16)",
                    color: "#2DD4BF",
                    fontWeight: "800",
                    fontSize: "12.5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  {r.num}
                </div>
                <span
                  style={{
                    fontSize: "13.5px",
                    fontWeight: "700",
                    color: "rgba(255,255,255,0.9)",
                    lineHeight: "1.4",
                    paddingTop: "2px",
                  }}
                >
                  {r.text}
                </span>
              </div>
            ))}
          </div>
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
          Detailed
        </span>{" "}
        <span id="cs-tips" style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
          The 30 CS tips
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "14px" }}>
        {csTipCats.map((c, _i0) => (
          <button key={_i0} onClick={c.go} style={c.style}>
            {c.label}
            <span style={c.badgeStyle}>{c.sub}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "14px", marginTop: "16px" }}>
        {csTips.map((t, _i0) => (
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
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "9px",
                  background: "#e4faf6",
                  color: "#1aa897",
                  fontWeight: "800",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: "0",
                }}
              >
                {t.n}
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#1A1A1A",
                  lineHeight: "1.3",
                  letterSpacing: "-0.2px",
                  paddingTop: "4px",
                }}
              >
                {t.title}
              </div>
            </div>
            <p style={{ fontSize: "12.5px", color: "#6b6356", lineHeight: "1.55", marginTop: "11px" }}>{t.body}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginTop: "11px" }}>
              {t.bullets.map((bl, _i1) => (
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
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#1aa897"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: "0", marginTop: "1px" }}
                  >
                    <path d="M3 8.5l3.5 3.5L13 4.5" />
                  </svg>
                  <span>{bl}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "auto", paddingTop: "14px" }}>
              <div
                style={{
                  display: "flex",
                  gap: "9px",
                  alignItems: "flex-start",
                  background: "#e4faf6",
                  borderRadius: "11px",
                  padding: "11px 13px",
                }}
              >
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#1aa897",
                    flexShrink: "0",
                    paddingTop: "1px",
                  }}
                >
                  Tip
                </span>{" "}
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#1f6f63", lineHeight: "1.45" }}>
                  {t.tip}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
