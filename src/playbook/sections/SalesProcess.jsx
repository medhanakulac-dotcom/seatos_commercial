// Sales Process — HubSpot setup, required deal fields and the 8-stage pipeline.
// Edit the content arrays at the top; the component below lays them out.
import { Fragment } from "react";
import { Hover, icon, icCalc, icContract, icProposal } from "../ui.jsx";

export const salesStagesData = [
  {
    n: "1",
    name: "Unidentified Leads",
    automated: false,
    node: "#c9bda0",
    autoTag: "Manual",
    bg: "#F1ECE2",
    fg: "#8E8E93",
    detail: "Raw, unworked leads. Qualify them before investing your time.",
    process: [
      "Each month, import operators from the Travelier dashboard into HubSpot — one deal per operator.",
      "Complete the Lead Qualification Tool before making any contact.",
      "Fill in all mandatory properties: Operator Type, Country, Fleet Size, Current Booking System, Current OTA Partners, Commercial Segment, Estimated Annual Ticket Volume.",
      "If the operator clearly does not fit our ICP, mark the deal Closed Lost with the correct reason.",
    ],
    advice:
      "Research before reaching out. Before first contact you should know their routes, approximate fleet size, whether they already sell online, which OTAs they work with, and whether they are bus, ferry or mixed. Don’t spend time on operators who will never become successful seatOS customers.",
    exit: [
      "Lead Qualification completed",
      "ICP evaluated",
      "Commercial Segment assigned",
      "Deal Calculator estimated",
      "Ready for first outreach",
    ],
    tools: [{ tool: "calculator", label: "Check ICP & calculate the deal" }],
  },
  {
    n: "2",
    name: "Qualified Leads",
    automated: false,
    node: "#c9bda0",
    autoTag: "Manual",
    bg: "#F1ECE2",
    fg: "#8E8E93",
    detail: "A qualified operator worth contacting.",
    process: [
      "Complete the Deal Calculator.",
      "Assign the Commercial Segment.",
      "Assign the Deal Owner.",
      "Schedule the first outreach activity — every qualified lead must have a planned next activity in HubSpot.",
    ],
    advice:
      "Don’t pitch — start by understanding their business. Prepare three discovery questions, a hypothesis about their biggest pain, and which seatOS products might solve it. Your objective isn’t to sell; it’s to book a discovery meeting.",
    exit: [
      "Deal Calculator completed",
      "First outreach completed",
      "Discovery meeting booked",
      "Next activity scheduled",
    ],
    tools: [{ tool: "calculator", label: "Open Deal Calculator" }],
  },
  {
    n: "3",
    name: "Contact Made",
    automated: true,
    node: "#2ECC71",
    autoTag: "Automated",
    bg: "#eafaf1",
    fg: "#1f9d57",
    detail: "First conversation completed.",
    process: [
      "Log every meeting note in HubSpot.",
      "Capture: current workflow, current booking system, OTA partners, biggest operational pain, biggest commercial pain, decision maker, timeline, and budget (if known).",
      "HubSpot reminds you every few days — never leave the deal without a next activity.",
    ],
    flow: [
      { label: "Reminder every ~5 days", bg: "#fff4e0", fg: "#c97f12", arrow: true },
      { label: "5 follow-up tasks for you", bg: "#efeafe", fg: "#7C5CFC", arrow: true },
      { label: "Stalls ~30 days → auto Closed Lost", bg: "#fdeaef", fg: "#d83a72", arrow: false },
    ],
    advice:
      "Good discovery wins deals. Ask about the booking process, counter operations, passenger management, reporting, OTA management, driver workflow and pain points. Leave every meeting with a clear business pain, the decision maker identified, and the next meeting booked.",
    exit: [
      "Discovery completed",
      "Notes entered into HubSpot",
      "Pain points documented",
      "Decision maker identified",
      "Demo scheduled",
    ],
  },
  {
    n: "4",
    name: "Appointment Scheduled",
    automated: false,
    node: "#c9bda0",
    autoTag: "Manual",
    bg: "#F1ECE2",
    fg: "#8E8E93",
    detail: "Demo meeting confirmed.",
    process: [
      "Before every demo: create demo bookings, prepare demo users, and test every workflow.",
      "Upload the presentation and review the previous meeting notes.",
    ],
    advice:
      "Don’t demonstrate everything — demo only what solves their pain. Adapt the demo: Operations → save time; Commercial → increase sales; Finance → better reporting & control; Owner → business growth & scalability. Write down every new pain point immediately after the demo.",
    exit: ["Demo completed", "Feedback captured", "Additional requirements documented", "Proposal required"],
  },
  {
    n: "5",
    name: "Solution Proposal Created",
    automated: true,
    node: "#2ECC71",
    autoTag: "Automated",
    bg: "#eafaf1",
    fg: "#1f9d57",
    detail: "Proposal built around customer needs.",
    process: [
      "Immediately after the demo, create the proposal and upload it to HubSpot.",
      "Complete the Deal Calculator to size the opportunity.",
      "Schedule the proposal presentation.",
    ],
    flow: [
      { label: "Right away", bg: "#fff4e0", fg: "#c97f12", arrow: true },
      { label: "Task: “Create and update Proposal”", bg: "#efeafe", fg: "#7C5CFC", arrow: false },
    ],
    advice:
      "Never send a feature list. Build every proposal as: Problem → seatOS Solution → Business Benefit → Commercial Package. Only propose products that solve problems the customer actually mentioned.",
    exit: ["Proposal uploaded", "Internal approval completed", "Presentation booked"],
    tools: [
      { tool: "proposal", label: "Open Proposal Builder" },
      { tool: "calculator", label: "Open Deal Calculator" },
    ],
  },
  {
    n: "6",
    name: "Proposal Presented",
    automated: true,
    node: "#2ECC71",
    autoTag: "Automated",
    bg: "#eafaf1",
    fg: "#1f9d57",
    detail: "Proposal presented live.",
    process: [
      "HubSpot reminds you until the deal moves.",
      "After every proposal meeting: log objections, update the deal probability, update the close date, and schedule the next activity.",
    ],
    flow: [
      { label: "First reminder after 1 day", bg: "#fff4e0", fg: "#c97f12", arrow: true },
      { label: "Up to 10 follow-up tasks", bg: "#efeafe", fg: "#7C5CFC", arrow: true },
      { label: "Then a reminder to mark Closed Lost", bg: "#fdeaef", fg: "#d83a72", arrow: false },
    ],
    advice:
      "Present live whenever possible. In the meeting, confirm every requirement, handle objections immediately, and reconfirm the value. Ask directly: “What is stopping us from moving forward?” Finish with the remaining blockers, the decision owner and a decision date.",
    exit: ["Proposal reviewed", "Objections documented", "Next action scheduled", "Waiting for commercial decision"],
  },
  {
    n: "7",
    name: "Contract Sent",
    automated: true,
    node: "#2ECC71",
    autoTag: "Automated",
    bg: "#eafaf1",
    fg: "#1f9d57",
    detail: "Waiting for signature.",
    process: [
      "Upload the final proposal, the contract, and the signed quotation (if applicable).",
      "HubSpot reminds you until the contract is signed or the deal is closed.",
    ],
    flow: [
      { label: "First reminder after 3 days", bg: "#fff4e0", fg: "#c97f12", arrow: true },
      { label: "~4 follow-up tasks", bg: "#efeafe", fg: "#7C5CFC", arrow: true },
      { label: "Then a reminder to mark Closed Lost", bg: "#fdeaef", fg: "#d83a72", arrow: false },
    ],
    advice:
      "Don’t just ask if they’ve signed — every follow-up should move the deal forward: help legal review, clarify commercial terms, discuss the implementation timeline, introduce Customer Success, and confirm internal approval progress. Trade concessions only in exchange for commitment.",
    exit: ["Contract reviewed", "Final objections resolved", "Signature received"],
    tools: [{ tool: "contract", label: "Open Contract Builder" }],
  },
  {
    n: "8",
    name: "Contract Signed",
    automated: false,
    node: "#d83a72",
    autoTag: "Won",
    bg: "#eafaf1",
    fg: "#1f9d57",
    detail: "Congratulations — now deliver on every promise.",
    process: [
      "Before handing the deal to Account Management, complete the Handover Template.",
      "Include: customer goals, pain points, agreed solutions, custom requests, decision makers, risks, and implementation priorities.",
      "Assign the deal to the Account Manager.",
    ],
    advice:
      "Customers don’t buy software — they buy outcomes. A successful implementation starts with a complete sales handover. Nothing discussed during the sale should be lost.",
    exit: ["Handover Template completed", "Assigned to Account Manager", "Kickoff meeting scheduled"],
  },
];

export const dealFields = [
  "Deal Name",
  "Pipeline",
  "Deal Stage",
  "Amount (Deal Value)",
  "Contact",
  "Company",
  "Client Segment",
  "Travelier Contract Type",
  "Country",
  "Commercial Terms",
];

export default function SalesProcess({ nav }) {
  const { openTool, navOnboarding } = nav;
  const salesFlow = salesStagesData.map((st, i) => ({
    ...st,
    notFirst: i > 0,
    toolLinks: (st.tools || []).map((tl) => {
      const m = {
        calculator: { bg: "#eafaf1", fg: "#1f9d57", icon: icCalc },
        proposal: { bg: "#fdf0db", fg: "#c97f12", icon: icProposal },
        contract: { bg: "#e4faf6", fg: "#1aa897", icon: icContract },
      }[tl.tool];
      return { label: tl.label, bg: m.bg, fg: m.fg, icon: m.icon, go: () => openTool(tl.tool) };
    }),
  }));
  return (
    <div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "#efeafe",
          color: "#7C5CFC",
          padding: "6px 13px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "700",
          marginBottom: "14px",
        }}
      >
        Sales Pipeline · BD team
      </div>
      <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.7px", marginBottom: "10px" }}>
        From New Lead to Signed Contract
      </h1>
      <p style={{ fontSize: "15px", color: "#8E8E93", maxWidth: "720px", lineHeight: "1.6" }}>
        The Sales Pipeline is where the <b style={{ color: "#5a5248" }}>BD (Business Development)</b> team works a lead
        from first contact through to a signed contract in HubSpot. Set the deal up correctly, work the stages, and
        HubSpot handles the follow-up reminders for you.
      </p>
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
          Step 1
        </span>{" "}
        <span
          id="sales-before"
          style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}
        >
          Before you create a deal
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "24px 26px",
          marginTop: "18px",
          boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
        }}
      >
        <p style={{ fontSize: "13.5px", color: "#8E8E93", lineHeight: "1.55", marginBottom: "18px" }}>
          There are <b style={{ color: "#5a5248" }}>two ways</b> a deal starts. Pick the one that matches your
          situation.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div
            style={{ background: "#FBF7F0", borderRadius: "16px", padding: "20px 22px", border: "1px solid #f1ece2" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "6px" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "800",
                  color: "#fff",
                  background: "#7C5CFC",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  letterSpacing: "0.4px",
                }}
              >
                MOST COMMON
              </span>
            </div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
              Deal already in HubSpot
            </div>
            <p style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.5", marginTop: "5px" }}>
              Normally the Head of Commercial adds deals from the{" "}
              <b style={{ color: "#5a5248" }}>Travelier dashboard</b> — with only the operator name, no Company or
              Contact attached yet. In that case, open the deal and:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
              <div style={{ display: "flex", gap: "11px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    background: "#efeafe",
                    color: "#7C5CFC",
                    fontWeight: "800",
                    fontSize: "12.5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  1
                </div>
                <div style={{ fontSize: "13px", color: "#3a3530", lineHeight: "1.4", paddingTop: "3px" }}>
                  Add the <b style={{ fontWeight: "700" }}>Contact</b> to associate.
                </div>
              </div>
              <div style={{ display: "flex", gap: "11px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    background: "#efeafe",
                    color: "#7C5CFC",
                    fontWeight: "800",
                    fontSize: "12.5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  2
                </div>
                <div style={{ fontSize: "13px", color: "#3a3530", lineHeight: "1.4", paddingTop: "3px" }}>
                  Add the <b style={{ fontWeight: "700" }}>Company</b> to associate.
                </div>
              </div>
              <div style={{ display: "flex", gap: "11px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    background: "#efeafe",
                    color: "#7C5CFC",
                    fontWeight: "800",
                    fontSize: "12.5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  3
                </div>
                <div style={{ fontSize: "13px", color: "#3a3530", lineHeight: "1.4", paddingTop: "3px" }}>
                  Complete the <b style={{ fontWeight: "700" }}>required fields</b> (see below).
                </div>
              </div>
            </div>
          </div>
          <div
            style={{ background: "#FBF7F0", borderRadius: "16px", padding: "20px 22px", border: "1px solid #f1ece2" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "6px" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "800",
                  color: "#8a5a12",
                  background: "#fdf0db",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  letterSpacing: "0.4px",
                }}
              >
                NEW OPERATOR
              </span>
            </div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
              Brand-new deal
            </div>
            <p style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.5", marginTop: "5px" }}>
              If it's new and not in HubSpot yet, build it from scratch — a deal can't exist without a Contact and
              Company:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
              <div style={{ display: "flex", gap: "11px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    background: "#fdf0db",
                    color: "#c97f12",
                    fontWeight: "800",
                    fontSize: "12.5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  1
                </div>
                <div style={{ fontSize: "13px", color: "#3a3530", lineHeight: "1.4", paddingTop: "3px" }}>
                  Create a <b style={{ fontWeight: "700" }}>Contact</b> — the person you're talking to.
                </div>
              </div>
              <div style={{ display: "flex", gap: "11px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    background: "#fdf0db",
                    color: "#c97f12",
                    fontWeight: "800",
                    fontSize: "12.5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  2
                </div>
                <div style={{ fontSize: "13px", color: "#3a3530", lineHeight: "1.4", paddingTop: "3px" }}>
                  Create a <b style={{ fontWeight: "700" }}>Company</b>, then associate the Contact to it.
                </div>
              </div>
              <div style={{ display: "flex", gap: "11px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    background: "#fdf0db",
                    color: "#c97f12",
                    fontWeight: "800",
                    fontSize: "12.5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  3
                </div>
                <div style={{ fontSize: "13px", color: "#3a3530", lineHeight: "1.4", paddingTop: "3px" }}>
                  Create the <b style={{ fontWeight: "700" }}>deal</b> and complete the required fields.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "13px", margin: "32px 0 4px" }}>
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
          Step 2
        </span>{" "}
        <span
          id="sales-fields"
          style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}
        >
          Create the deal — required fields
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "24px 26px",
          marginTop: "18px",
          boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
        }}
      >
        <p style={{ fontSize: "13.5px", color: "#8E8E93", lineHeight: "1.55", marginBottom: "16px" }}>
          Every field below is required by SeatOS's process before a deal can move forward — fill in{" "}
          <b style={{ color: "#5a5248" }}>all of them</b>.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 32px" }}>
          {dealFields.map((df, _i0) => (
            <div
              key={_i0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                padding: "9px 0",
                borderBottom: "1px solid #f3ece1",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="#7C5CFC"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: "0" }}
              >
                <path d="M3 8.5l3.5 3.5L13 4.5" />
              </svg>{" "}
              <span style={{ fontSize: "13.5px", fontWeight: "600", color: "#3a3530" }}>{df}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: "16px",
            background: "#efeafe",
            borderRadius: "13px",
            padding: "14px 16px",
            display: "flex",
            gap: "11px",
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: "15px" }}>📋</span>{" "}
          <span style={{ fontSize: "12.5px", color: "#5b46a8", lineHeight: "1.45" }}>
            <b style={{ fontWeight: "800" }}>Commercial Terms</b> is its own section with several sub-fields — fill in
            every one. Use "--" only if a fee genuinely doesn't apply.
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "13px", margin: "32px 0 4px" }}>
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
          Step 3
        </span>{" "}
        <span
          id="sales-stages"
          style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}
        >
          Work the stages — HubSpot does the follow-ups
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <p style={{ fontSize: "13.5px", color: "#8E8E93", lineHeight: "1.55", margin: "14px 0 16px", maxWidth: "760px" }}>
        Move the deal left to right. Each stage shows the HubSpot steps, how to win it, and its{" "}
        <b style={{ color: "#5a5248" }}>exit criteria</b> — don't advance a deal until those are met. That's what turns
        HubSpot from a place to store deals into a sales operating system.
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "10px 22px",
          margin: "0 0 18px",
          padding: "14px 18px",
          background: "#fff",
          borderRadius: "14px",
          boxShadow: "0 1px 2px rgba(26,26,26,.05),0 6px 18px rgba(26,26,26,.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#c9bda0", flexShrink: "0" }}
          ></span>{" "}
          <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#3a3530" }}>Manual stage</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2ECC71", flexShrink: "0" }}
          ></span>{" "}
          <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#3a3530" }}>Automated by HubSpot</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#d83a72", flexShrink: "0" }}
          ></span>{" "}
          <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#3a3530" }}>Closed Won</span>
        </div>
        <span style={{ width: "1px", height: "18px", background: "#e6dcc6" }}></span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "20px",
              borderRadius: "6px",
              background: "#fdf0db",
              flexShrink: "0",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c97f12"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="6" cy="6" r="2.4" />
              <circle cx="6" cy="18" r="2.4" />
              <circle cx="18" cy="18" r="2.4" />
              <path d="M6 8.4v7.2M8.4 6H14a4 4 0 014 4v5.6" />
            </svg>
          </span>{" "}
          <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#3a3530" }}>
            How it works here <span style={{ fontWeight: "500", color: "#8E8E93" }}>— the steps in HubSpot</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "20px",
              borderRadius: "6px",
              background: "#efeafe",
              flexShrink: "0",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7C5CFC"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18h6M10 21h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0012 2z" />
            </svg>
          </span>{" "}
          <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#3a3530" }}>
            Playbook <span style={{ fontWeight: "500", color: "#8E8E93" }}>— how to win the stage</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "20px",
              borderRadius: "6px",
              background: "#f3f9f4",
              border: "1px solid #e1f0e4",
              flexShrink: "0",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#1f9d57"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="8" r="6.3" />
              <path d="M5.4 8.2l1.8 1.8 3.4-3.6" />
            </svg>
          </span>{" "}
          <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#3a3530" }}>
            Exit criteria <span style={{ fontWeight: "500", color: "#8E8E93" }}>— don't advance until met</span>
          </span>
        </div>
      </div>
      <div className="ds-scroll" style={{ overflowX: "auto", padding: "4px 2px 14px" }}>
        <div style={{ display: "flex", alignItems: "stretch", gap: "0", width: "max-content" }}>
          {salesFlow.map((st, _i0) => (
            <Fragment key={_i0}>
              {st.notFirst && (
                <div style={{ display: "flex", alignItems: "center", padding: "0 2px", color: "#cbbda3" }}>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              )}
              <div
                style={{
                  width: "252px",
                  flexShrink: "0",
                  display: "flex",
                  flexDirection: "column",
                  background: "#fff",
                  borderRadius: "16px",
                  boxShadow: "0 1px 2px rgba(26,26,26,.05),0 6px 18px rgba(26,26,26,.03)",
                  overflow: "hidden",
                }}
              >
                <div style={{ height: "4px", background: st.node }}></div>
                <div style={{ padding: "16px 16px 18px", display: "flex", flexDirection: "column", flex: "1" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "9px",
                        background: st.bg,
                        color: st.fg,
                        fontWeight: "800",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      {st.n}
                    </div>
                    <div
                      style={{
                        fontSize: "14.5px",
                        fontWeight: "800",
                        color: "#1A1A1A",
                        letterSpacing: "-0.2px",
                        lineHeight: "1.15",
                      }}
                    >
                      {st.name}
                    </div>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "#6b6356", lineHeight: "1.5", marginTop: "11px" }}>
                    {st.detail}
                  </p>
                  {st.process && (
                    <div
                      style={{ marginTop: "13px", background: "#fdf0db", borderRadius: "11px", padding: "11px 12px" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#c97f12"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="6" cy="6" r="2.4" />
                          <circle cx="6" cy="18" r="2.4" />
                          <circle cx="18" cy="18" r="2.4" />
                          <path d="M6 8.4v7.2M8.4 6H14a4 4 0 014 4v5.6" />
                        </svg>{" "}
                        <span
                          style={{
                            fontSize: "9.5px",
                            fontWeight: "800",
                            color: "#c97f12",
                            textTransform: "uppercase",
                            letterSpacing: "0.4px",
                          }}
                        >
                          How it works here
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                        {st.process.map((ps, _i1) => (
                          <div
                            key={_i1}
                            style={{
                              display: "flex",
                              gap: "7px",
                              alignItems: "flex-start",
                              fontSize: "11.5px",
                              color: "#7a5a14",
                              lineHeight: "1.45",
                            }}
                          >
                            <span style={{ color: "#c97f12", fontWeight: "800", flexShrink: "0", lineHeight: "1.3" }}>
                              •
                            </span>
                            <span>{ps}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {st.toolLinks && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "9px", marginTop: "13px" }}>
                      {st.toolLinks.map((tl, _i1) => (
                        <Hover
                          key={_i1}
                          as="button"
                          onClick={tl.go}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "9px",
                            border: "none",
                            cursor: "pointer",
                            background: tl.bg,
                            color: tl.fg,
                            padding: "9px 14px",
                            borderRadius: "11px",
                            fontSize: "12.5px",
                            fontWeight: "800",
                            letterSpacing: "-0.1px",
                          }}
                          hover={{ filter: "brightness(0.96)" }}
                        >
                          <span style={{ display: "flex", width: "16px", height: "16px" }}>{tl.icon}</span>
                          {tl.label}{" "}
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M6 3h7v7M13 3L4 12" />
                          </svg>
                        </Hover>
                      ))}
                    </div>
                  )}
                  {st.automated && (
                    <div
                      style={{
                        marginTop: "13px",
                        background: "#FBF7F0",
                        border: "1px solid #f1ece2",
                        borderRadius: "11px",
                        padding: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "9.5px",
                          fontWeight: "800",
                          color: "#1f9d57",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                          marginBottom: "9px",
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#1f9d57"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M13 2L3 14h8l-1 8 10-12h-8z" />
                        </svg>{" "}
                        In HubSpot
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {st.flow.map((f, _i1) => (
                          <span
                            key={_i1}
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: f.fg,
                              background: f.bg,
                              padding: "6px 9px",
                              borderRadius: "7px",
                              lineHeight: "1.25",
                            }}
                          >
                            {f.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: "13px", background: "#efeafe", borderRadius: "11px", padding: "11px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#7C5CFC"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18h6M10 21h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0012 2z" />
                      </svg>{" "}
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: "800",
                          color: "#6a4af0",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        Playbook
                      </span>
                    </div>
                    <p style={{ fontSize: "11.5px", color: "#4a3f6b", lineHeight: "1.5" }}>{st.advice}</p>
                  </div>
                  {st.exit && (
                    <div
                      style={{
                        marginTop: "13px",
                        background: "#f3f9f4",
                        border: "1px solid #e1f0e4",
                        borderRadius: "11px",
                        padding: "11px 12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="#1f9d57"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="8" cy="8" r="6.3" />
                          <path d="M5.4 8.2l1.8 1.8 3.4-3.6" />
                        </svg>{" "}
                        <span
                          style={{
                            fontSize: "9.5px",
                            fontWeight: "800",
                            color: "#1f9d57",
                            textTransform: "uppercase",
                            letterSpacing: "0.4px",
                          }}
                        >
                          Exit criteria
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                        {st.exit.map((ex, _i1) => (
                          <div
                            key={_i1}
                            style={{
                              display: "flex",
                              gap: "8px",
                              alignItems: "flex-start",
                              fontSize: "11.5px",
                              color: "#2f5d3a",
                              lineHeight: "1.4",
                            }}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="#1f9d57"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ flexShrink: "0", marginTop: "1px" }}
                            >
                              <path d="M3 8.5l3.5 3.5L13 4.5" />
                            </svg>
                            <span>{ex}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Fragment>
          ))}
          <div style={{ display: "flex", alignItems: "center", padding: "0 2px", color: "#cbbda3" }}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
          <Hover
            as="button"
            onClick={navOnboarding}
            style={{
              width: "252px",
              flexShrink: "0",
              display: "flex",
              flexDirection: "column",
              textAlign: "left",
              background: "#1A1A1A",
              border: "none",
              borderRadius: "16px",
              padding: "0",
              cursor: "pointer",
              overflow: "hidden",
            }}
            hover={{ background: "#262320" }}
          >
            <div style={{ height: "4px", background: "#F5A623", width: "100%" }}></div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: "1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "9px",
                    background: "rgba(245,166,35,0.16)",
                    color: "#F5A623",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                    fontSize: "15px",
                  }}
                >
                  🚀
                </div>
                <div
                  style={{
                    fontSize: "14.5px",
                    fontWeight: "800",
                    color: "#fff",
                    letterSpacing: "-0.2px",
                    lineHeight: "1.15",
                  }}
                >
                  Account Manager Kick-off
                </div>
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: "1.5",
                  marginTop: "11px",
                  flex: "1",
                }}
              >
                On signing, the deal is duplicated into the Client Pipeline and assigned to the Account Manager — which
                kicks off Onboarding.
              </p>
              <span style={{ fontSize: "12.5px", fontWeight: "800", color: "#F5A623", marginTop: "10px" }}>
                Go to Onboarding →
              </span>
            </div>
          </Hover>
        </div>
      </div>
    </div>
  );
}
