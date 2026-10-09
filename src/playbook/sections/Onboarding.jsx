// Onboarding — the 30-day go-live and hypercare motion.
// Edit the content arrays at the top; the component below lays them out.
import { Fragment, useState } from "react";

export const onbExit = [
  { n: "1", text: "All issues and concerns have been resolved." },
  { n: "2", text: "Training CSAT score is above 4.5 — if below, improve and re-review after 7 days." },
  { n: "3", text: "Operator Health Score is at least 3 / 5 — if below, keep improving until it is." },
];

export const ONBOARDING_STEPS = [
  {
    n: "1",
    name: "Account Manager Kick-off",
    owner: "AM",
    count: "2",
    bg: "#efeafe",
    fg: "#7C5CFC",
    desc: "AM aligns on goals and formally kicks off onboarding.",
    isKickoff: true,
  },
  {
    n: "2",
    name: "Ready for Setup",
    owner: "CS",
    count: "9",
    bg: "#e4faf6",
    fg: "#1aa897",
    desc: "Handed to CS to begin account configuration.",
    note: "The Head of CS adds the deal to the setup queue and assigns it to a CS owner.",
  },
  {
    n: "3",
    name: "Data Entry",
    owner: "CS",
    count: "10",
    bg: "#e4faf6",
    fg: "#1aa897",
    desc: "CS loads the account\u2019s data, structure and settings.",
    note: "The CS team completes the account set-up and data entry.",
    moveTo: "Ready for Training",
  },
  {
    n: "4",
    name: "Ready for Training",
    owner: "Trainer / AM",
    count: "2",
    bg: "#fdf0db",
    fg: "#c97f12",
    desc: "Account prepared; training is scheduled with the customer.",
    note: "The trainer schedules the training meeting with the customer.",
    moveTo: "Training — once the schedule is confirmed",
  },
  {
    n: "5",
    name: "Training",
    owner: "Trainer",
    count: "4",
    bg: "#fdf0db",
    fg: "#c97f12",
    desc: "Trainer runs sessions to get operators confident.",
    isTraining: true,
  },
  {
    n: "6",
    name: "Ready to go Live",
    owner: "CS",
    count: "4",
    bg: "#e4faf6",
    fg: "#1aa897",
    desc: "Training is done — request the integration.",
    note: "Reaching this stage means training is complete. Now the Customer Support team requests the integration from the 12go inventory team.",
    bullets: [
      "Customer Support raises the integration request to the 12go inventory team.",
      "Post it in #tms-integration on Slack — this kicks off API enablement.",
    ],
  },
  {
    n: "7",
    name: "API Enable",
    owner: "CS",
    count: "4",
    bg: "#e4faf6",
    fg: "#1aa897",
    desc: "Integration enabled — the customer approves go-live.",
    note: "The 12go inventory team confirms readiness in #tms-integration, then the account is taken live.",
    bullets: [
      "12go inventory team notifies readiness in #tms-integration on Slack.",
      "Going live needs the 12go BD (Travelier Supply team) and the seatOS Account Manager.",
      "The customer approves go-live — from this point the account is LIVE.",
      "Invoicing starts from the go-live date.",
    ],
    important: "The AM must update the Go-Live Date field on HubSpot so everyone knows the account is live.",
  },
  {
    n: "8",
    name: "Product Optimization",
    owner: "AM",
    count: "7",
    bg: "#efeafe",
    fg: "#7C5CFC",
    desc: "AM optimises the operator\u2019s marketplace presence and tracks the impact.",
    note: "Using the Post Go-Live Health Checklist, the AM compares each route\u2019s positioning on the marketplace before vs after go-live \u2014 and keeps tuning the listing until it performs.",
    bullets: [
      "Log every route the operator sells \u2014 departure station, arrival station and vehicle class.",
      "For each route, record the placement Before vs After go-live across: Star Review, Cheapest, Fastest, Recommended, Best Seller, Top-3 Recommended and Instant Confirmation.",
      "Re-check weekly (Week 1, then Week 2) and write an Insight on what moved.",
      "Use the before/after comparison to prove the go-live impact and spot listings that still need work.",
    ],
  },
  {
    n: "9",
    name: "After go-live 7 days",
    owner: "AM",
    count: "3",
    bg: "#efeafe",
    fg: "#7C5CFC",
    desc: "First-week hypercare check-in.",
    isHypercare: true,
  },
  {
    n: "10",
    name: "After go-live 14 days",
    owner: "AM",
    count: "6",
    bg: "#efeafe",
    fg: "#7C5CFC",
    desc: "Two-week review of early adoption.",
    isHypercare14: true,
  },
  {
    n: "11",
    name: "Fully Live",
    owner: "AM",
    count: "226",
    bg: "#efeafe",
    fg: "#7C5CFC",
    desc: "Onboarding complete \u2014 account enters the steady-state matrix.",
    isHypercare30: true,
  },
];

export default function Onboarding({ nav }) {
  const { navTraining, navCS } = nav;
  const [openStep, setOpenStep] = useState(null);
  const toggleStep = (n) => setOpenStep((cur) => (cur === n ? null : n));
  const onbSteps = ONBOARDING_STEPS.map((st) => {
    const op = openStep === st.n;
    return {
      ...st,
      open: op,
      chev: op ? "rotate(90deg)" : "rotate(0deg)",
      hasDetail: !!(st.isKickoff || st.note || st.isTraining || st.isHypercare || st.isHypercare14 || st.isHypercare30),
      kickoffOpen: op && !!st.isKickoff,
      noteOpen: op && !!st.note,
      trainingOpen: op && !!st.isTraining,
      hcOpen: op && !!st.isHypercare,
      hc14Open: op && !!st.isHypercare14,
      hc30Open: op && !!st.isHypercare30,
      toggle: () => toggleStep(st.n),
    };
  });
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
        Playbook · Runs first
      </div>
      <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.7px", marginBottom: "10px" }}>
        Onboarding & Hypercare
      </h1>
      <p style={{ fontSize: "15px", color: "#8E8E93", maxWidth: "720px", lineHeight: "1.6" }}>
        Every newly closed account starts here — not in the matrix. From the go-live date the Account Manager runs a
        fixed <b style={{ color: "#5a5248" }}>30-day hypercare</b> motion: get the account live, train the operators,
        and reach first value. Only once onboarding is complete does the segment × health matrix take over the ongoing
        motion.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "13px", margin: "30px 0 4px" }}>
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
          01
        </span>{" "}
        <span style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
          The onboarding pipeline
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", margin: "14px 0 4px" }}>
        <span style={{ fontSize: "12.5px", color: "#8E8E93" }}>
          11 stages from kick-off to fully live ·{" "}
          <b style={{ color: "#c97f12", fontWeight: "700" }}>click a stage to expand</b>. Owner shown on each stage:
        </span>{" "}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: "700",
            color: "#7C5CFC",
          }}
        >
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#7C5CFC" }}></span>AM
        </span>{" "}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: "700",
            color: "#1aa897",
          }}
        >
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#2DD4BF" }}></span>CS
        </span>{" "}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: "700",
            color: "#c97f12",
          }}
        >
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#F5A623" }}></span>Trainer
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          background: "#fdf8ef",
          borderRadius: "11px",
          padding: "10px 13px",
          marginTop: "10px",
          maxWidth: "560px",
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="#c97f12"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: "0", marginTop: "1px" }}
        >
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 7.5v3.5M8 5h0" />
        </svg>{" "}
        <span style={{ fontSize: "12px", color: "#8a6a2e", lineHeight: "1.45" }}>
          <b style={{ fontWeight: "800" }}>Trainer / AM is the same person</b> — on most accounts the Account Manager
          also runs the training, so they own both stages.
        </span>
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "10px 22px",
          marginTop: "14px",
          boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
        }}
      >
        {onbSteps.map((st, _i0) => (
          <Fragment key={_i0}>
            <div
              onClick={st.toggle}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 22px",
                gap: "16px",
                alignItems: "center",
                padding: "14px 0",
                borderBottom: "1px solid #f3ece1",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: st.bg,
                  color: st.fg,
                  fontWeight: "800",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                }}
              >
                {st.n}
              </div>
              <div style={{ minWidth: "0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "15px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
                    {st.name}
                  </span>{" "}
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: "800",
                      color: st.fg,
                      background: st.bg,
                      padding: "3px 9px",
                      borderRadius: "7px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {st.owner}
                  </span>
                  {st.isHypercare && (
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: "800",
                        color: "#c97f12",
                        background: "#fdf0db",
                        padding: "3px 9px",
                        borderRadius: "7px",
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
                        <path d="M2.5 6.5h11M6 2v3M10 2v3" />
                      </svg>
                      AM task
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.4", marginTop: "3px" }}>
                  {st.desc}
                </div>
              </div>
              {st.hasDetail && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#c9bda0",
                    transform: st.chev,
                    transition: "transform .15s ease",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              )}
            </div>
            {st.kickoffOpen && (
              <div
                style={{
                  margin: "0 0 16px 56px",
                  background: "#FBF7F0",
                  border: "1px solid #f1ece2",
                  borderLeft: "4px solid #7C5CFC",
                  borderRadius: "14px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#6a4af0",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "10px",
                  }}
                >
                  What the AM does at kick-off
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#7C5CFC",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      1
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#33291c", lineHeight: "1.45" }}>
                      Make sure <b style={{ fontWeight: "800" }}>every HubSpot property</b> on the deal is complete.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#7C5CFC",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      2
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#33291c", lineHeight: "1.45" }}>
                      <b style={{ fontWeight: "800" }}>Re-evaluate the Commercial Segment</b> now that the deal is
                      closed.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#7C5CFC",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      3
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#33291c", lineHeight: "1.45" }}>
                      Pull in <b style={{ fontWeight: "800" }}>complete data on the products the operator sells</b>.
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    marginTop: "14px",
                    background: "#e4faf6",
                    borderRadius: "10px",
                    padding: "10px 14px",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#1aa897"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>{" "}
                  <span style={{ fontSize: "12.5px", color: "#1a7d70", fontWeight: "700" }}>
                    Then move the deal to <b style={{ fontWeight: "800" }}>Ready for Setup</b>.
                  </span>
                </div>
              </div>
            )}
            {st.noteOpen && (
              <div
                style={{
                  margin: "0 0 16px 56px",
                  background: "#FBF7F0",
                  border: "1px solid #f1ece2",
                  borderLeft: "4px solid #F5A623",
                  borderRadius: "14px",
                  padding: "14px 18px",
                }}
              >
                <div style={{ fontSize: "13.5px", color: "#33291c", lineHeight: "1.5" }}>{st.note}</div>
                {st.bullets && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "11px" }}>
                    {st.bullets.map((bl, _i1) => (
                      <div
                        key={_i1}
                        style={{
                          display: "flex",
                          gap: "9px",
                          alignItems: "flex-start",
                          fontSize: "12.5px",
                          color: "#5a4a33",
                          lineHeight: "1.45",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#F5A623",
                            flexShrink: "0",
                            marginTop: "6px",
                          }}
                        ></span>
                        <span>{bl}</span>
                      </div>
                    ))}
                  </div>
                )}
                {st.important && (
                  <div
                    style={{
                      display: "flex",
                      gap: "9px",
                      alignItems: "flex-start",
                      marginTop: "12px",
                      background: "#fdeaef",
                      borderRadius: "10px",
                      padding: "10px 13px",
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#d83a72"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: "0", marginTop: "1px" }}
                    >
                      <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" />
                    </svg>{" "}
                    <span style={{ fontSize: "12.5px", color: "#a32a55", fontWeight: "700", lineHeight: "1.45" }}>
                      {st.important}
                    </span>
                  </div>
                )}
                {st.moveTo && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "9px",
                      marginTop: "12px",
                      background: "#e4faf6",
                      borderRadius: "10px",
                      padding: "9px 13px",
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="#1aa897"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>{" "}
                    <span style={{ fontSize: "12.5px", color: "#1a7d70", fontWeight: "700" }}>
                      When done, move the deal to <b style={{ fontWeight: "800" }}>{st.moveTo}</b>.
                    </span>
                  </div>
                )}
              </div>
            )}
            {st.trainingOpen && (
              <div
                style={{
                  margin: "0 0 16px 56px",
                  background: "#FBF7F0",
                  border: "1px solid #f1ece2",
                  borderLeft: "4px solid #F5A623",
                  borderRadius: "14px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#c97f12",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "10px",
                  }}
                >
                  What the trainer does
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#c97f12",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      1
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#33291c", lineHeight: "1.45" }}>
                      Run the training sessions and get the operators confident on seatOS.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#c97f12",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      2
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#33291c", lineHeight: "1.45" }}>
                      When finished, send the <b style={{ fontWeight: "800" }}>Training Survey</b> to the customer.
                    </div>
                  </div>
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginTop: "14px" }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#fdeaef",
                      borderRadius: "10px",
                      padding: "9px 13px",
                      fontSize: "12.5px",
                      color: "#a3325c",
                      fontWeight: "700",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="#d83a72"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3 4.3 13.3l.7-4.3-3.1-3 4.3-.6z" />
                    </svg>
                    Minimum survey score: 4.5
                  </span>{" "}
                  <button
                    onClick={navTraining}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#efeafe",
                      border: "none",
                      borderRadius: "10px",
                      padding: "9px 13px",
                      fontSize: "12.5px",
                      color: "#6a4af0",
                      fontWeight: "700",
                      cursor: "pointer",
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
                      <path d="M6.5 9.5l3-3M9 4h3v3M12 9.5V12a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h2.5" />
                    </svg>{" "}
                    Training structure{" "}
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "800",
                        color: "#9a82e8",
                        background: "#e3dcfa",
                        padding: "2px 7px",
                        borderRadius: "6px",
                      }}
                    >
                      Available Q3
                    </span>
                  </button>
                </div>
              </div>
            )}
            {st.hcOpen && (
              <div
                style={{
                  margin: "0 0 16px 56px",
                  background: "#FBF7F0",
                  border: "1px solid #f1ece2",
                  borderLeft: "4px solid #F5A623",
                  borderRadius: "14px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}
                >
                  <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
                    Hypercare Update Template
                  </span>{" "}
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: "800",
                      color: "#c97f12",
                      background: "#fdf0db",
                      padding: "4px 10px",
                      borderRadius: "20px",
                    }}
                  >
                    Auto-assigned task · AM
                  </span>
                </div>
                <p style={{ fontSize: "12.5px", color: "#5a5248", lineHeight: "1.55", marginBottom: "16px" }}>
                  After this stage, HubSpot assigns a task to the deal's{" "}
                  <b style={{ color: "#1A1A1A" }}>Account Manager</b> — complete the Day-7 Hypercare follow-up for the
                  operator and post it as the CRM update.
                </p>
                <div
                  style={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid #ece4d6",
                    background: "#fff",
                    maxWidth: "540px",
                    marginBottom: "18px",
                  }}
                >
                  <img
                    src="/playbook/onboarding-day7-task.png"
                    alt="HubSpot Day-7 Hypercare follow-up task assigned to the account manager"
                    style={{ display: "block", width: "100%", height: "auto" }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#c97f12",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "10px",
                  }}
                >
                  What the AM checks & records
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      1
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>
                        Active Usage Status
                      </span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>
                        — is the operator actually logging in and using seatOS day to day?
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      2
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>
                        Core Features Activated & Verified
                      </span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>
                        — confirm the core features are switched on and working as expected.
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      3
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>
                        Day-7 Health Score
                      </span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>
                        — record the score and the reason behind it.
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      4
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>Issues Identified</span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>
                        — note any blockers, bugs or adoption gaps surfaced this week.
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      5
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>
                        Actions Taken / Improvement Plan
                      </span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>
                        — what you did about them, and the plan to close what's open.
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      6
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>Next Steps</span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>
                        — the agreed follow-ups and owners for the coming days.
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      7
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>CRM Update</span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>— post the update and</span>
                      <span style={{ fontSize: "13px", color: "#a3325c", fontWeight: "700" }}>
                        tag the Manager and Head of BD
                      </span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {st.hc14Open && (
              <div
                style={{
                  margin: "0 0 16px 56px",
                  background: "#FBF7F0",
                  border: "1px solid #f1ece2",
                  borderLeft: "4px solid #F5A623",
                  borderRadius: "14px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}
                >
                  <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
                    Hypercare Update Template
                  </span>{" "}
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: "800",
                      color: "#c97f12",
                      background: "#fdf0db",
                      padding: "4px 10px",
                      borderRadius: "20px",
                    }}
                  >
                    Auto-assigned task · AM
                  </span>
                </div>
                <p style={{ fontSize: "12.5px", color: "#5a5248", lineHeight: "1.55", marginBottom: "16px" }}>
                  A second task is assigned to the <b style={{ color: "#1A1A1A" }}>Account Manager</b> at the two-week
                  mark — complete the Day-14 Hypercare follow-up for the operator and post it as the CRM update.
                </p>
                <div
                  style={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid #ece4d6",
                    background: "#fff",
                    maxWidth: "540px",
                    marginBottom: "18px",
                  }}
                >
                  <img
                    src="/playbook/onboarding-day14-task.png"
                    alt="HubSpot Day-14 Hypercare follow-up task assigned to the account manager"
                    style={{ display: "block", width: "100%", height: "auto" }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#c97f12",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "10px",
                  }}
                >
                  What the AM checks & records
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      1
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>
                        Active Usage Status
                      </span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>
                        — still logging in and using seatOS two weeks in?
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      2
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>
                        Core Features Activated & Verified
                      </span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>
                        — confirm the core features remain active and correct.
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      3
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>
                        Day-14 Health Score
                      </span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>
                        — record the score and the reason behind it.
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      4
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>Issues Identified</span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>
                        — note any blockers or adoption gaps still open.
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      5
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>
                        Actions Taken / Improvement Plan
                      </span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>
                        — what you did and the plan to close what's open.
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      6
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>Next Steps</span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>
                        — the agreed follow-ups and owners for the coming days.
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#d83a72",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      ★
                    </span>
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>CRM Update</span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>— post the update and</span>
                      <span style={{ fontSize: "13px", color: "#a3325c", fontWeight: "700" }}>
                        tag the Manager and Head of BD
                      </span>
                      <span style={{ fontSize: "13px", color: "#8E8E93" }}>.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {st.hc30Open && (
              <div
                style={{
                  margin: "0 0 16px 56px",
                  background: "#FBF7F0",
                  border: "1px solid #f1ece2",
                  borderLeft: "4px solid #F5A623",
                  borderRadius: "14px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}
                >
                  <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
                    30-Day Hypercare Review
                  </span>{" "}
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: "800",
                      color: "#c97f12",
                      background: "#fdf0db",
                      padding: "4px 10px",
                      borderRadius: "20px",
                    }}
                  >
                    Auto-assigned task · AM
                  </span>{" "}
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: "800",
                      color: "#a3325c",
                      background: "#fdeaef",
                      padding: "4px 10px",
                      borderRadius: "20px",
                    }}
                  >
                    Gate to Fully Live
                  </span>
                </div>
                <p style={{ fontSize: "12.5px", color: "#5a5248", lineHeight: "1.55", marginBottom: "16px" }}>
                  At ~30 days the <b style={{ color: "#1A1A1A" }}>Account Manager</b> runs the final review that decides
                  whether the account can move to Fully Live. The deal stays in onboarding until both gates below are
                  met.
                </p>
                <div
                  style={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid #ece4d6",
                    background: "#fff",
                    maxWidth: "540px",
                    marginBottom: "18px",
                  }}
                >
                  <img
                    src="/playbook/onboarding-day30-review.png"
                    alt="HubSpot 30-Day Hypercare Review task assigned to the account manager"
                    style={{ display: "block", width: "100%", height: "auto" }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#c97f12",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "10px",
                  }}
                >
                  What the AM verifies
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      1
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#33291c", lineHeight: "1.45" }}>
                      All issues and concerns have been <b style={{ fontWeight: "800" }}>resolved</b>.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      2
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#33291c", lineHeight: "1.45" }}>
                      Training <b style={{ fontWeight: "800" }}>CSAT score is above 4.5</b>.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      3
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#33291c", lineHeight: "1.45" }}>
                      If CSAT is below 4.5 — discuss with the customer, improve the experience, and{" "}
                      <b style={{ fontWeight: "800" }}>repeat the review after 7 days</b>.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#d83a72",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      !
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#a3325c", fontWeight: "700", lineHeight: "1.45" }}>
                      Do not move the deal to Fully Live until CSAT is above 4.5.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      5
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#33291c", lineHeight: "1.45" }}>
                      Confirm with the <b style={{ fontWeight: "800" }}>Trainer</b> that the Training CSAT process was
                      completed properly.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      6
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#33291c", lineHeight: "1.45" }}>
                      Operator has a <b style={{ fontWeight: "800" }}>Health Score of at least 3 / 5</b>.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#1A1A1A",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      7
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#33291c", lineHeight: "1.45" }}>
                      If Health Score is below 3 — continue the improvement process until it reaches the target.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                      padding: "11px 0",
                      borderTop: "1px solid #ece4d6",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "7px",
                        background: "#d83a72",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      !
                    </span>
                    <div style={{ fontSize: "13.5px", color: "#a3325c", fontWeight: "700", lineHeight: "1.45" }}>
                      Do not move the deal to Fully Live until the Health Score is at least 3 / 5.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Fragment>
        ))}
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
          02
        </span>{" "}
        <span style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
          Exit criteria
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div style={{ background: "#1A1A1A", borderRadius: "20px", padding: "26px", marginTop: "18px", color: "#fff" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1", minWidth: "240px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "800", letterSpacing: "-0.3px", marginBottom: "6px" }}>
              The gate to Fully Live
            </h3>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: "1.55", maxWidth: "420px" }}>
              From the 30-Day Hypercare Review, a deal can only move to{" "}
              <b style={{ color: "#fff", fontWeight: "700" }}>Fully Live</b> once all three hold. Then the Monday
              automation takes over and assigns the ongoing playbook from the{" "}
              <b style={{ color: "#fff", fontWeight: "700" }}>segment × health</b> matrix.
            </p>
            <button
              onClick={navCS}
              style={{
                marginTop: "16px",
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
              See the matrix →
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: "1", minWidth: "240px" }}>
            {onbExit.map((ex, _i0) => (
              <div key={_i0} style={{ display: "flex", gap: "11px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "7px",
                    background: "rgba(245,166,35,0.16)",
                    color: "#F5A623",
                    fontSize: "11px",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  {ex.n}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.82)", lineHeight: "1.45" }}>{ex.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
