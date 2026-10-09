// Customer Success — segment × health matrix and the CS operating model.
// Edit the content arrays at the top; the component below lays them out.
import { Fragment, useState } from "react";
import { Hover } from "../ui.jsx";

export const MATRIX = {
  High: {
    Unhealthy: { name: "Rescue", cadence: "Weekly", goal: "Move Unhealthy → Adopted → Healthy." },
    Adopted: { name: "Push to Healthy", cadence: "Every 2 weeks", goal: "Move Adopted → Healthy." },
    Healthy: { name: "Grow", cadence: "Monthly", goal: "Expand value and partnership." },
  },
  Mid: {
    Unhealthy: { name: "Adoption Push", cadence: "Every 2 weeks", goal: "Improve adoption." },
    Adopted: {
      name: "Maintain / Light Push",
      cadence: "Monthly",
      goal: "Acceptable baseline — light push on remaining features.",
    },
    Healthy: { name: "Maintain", cadence: "Quarterly", goal: "Maintain engagement." },
  },
  Low: {
    Unhealthy: { name: "Automated Activation", cadence: "4-week journey", goal: "Automated activation sequence." },
    Adopted: {
      name: "Self-Service / Nudge",
      cadence: "Monthly",
      goal: "Self-serve, with the occasional automated nudge.",
    },
    Healthy: { name: "Self-Service", cadence: "Monthly", goal: "Monthly self-service engagement." },
  },
};

export const healthDefs = [
  { range: "5–6", state: "Healthy", meaning: "Strong adoption", bg: "#eafaf1", fg: "#1f9d57" },
  { range: "3–4", state: "Adopted", meaning: "Acceptable / usable", bg: "#fdf3e0", fg: "#c97f12" },
  { range: "0–2", state: "Unhealthy", meaning: "Low adoption", bg: "#fdeaef", fg: "#d83a72" },
];

export const matrixRows = [
  {
    seg: "High",
    tag: "Top priority",
    tagBg: "#e4faf6",
    tagFg: "#1aa897",
    cells: [
      { bg: "#fdeaef", fg: "#d83a72", name: "Rescue", cadence: "Weekly", goal: "Move Unhealthy → Adopted → Healthy." },
      {
        bg: "#fdf3e0",
        fg: "#c97f12",
        name: "Push to Healthy",
        cadence: "Every 2 weeks",
        goal: "Move Adopted → Healthy.",
      },
      { bg: "#eafaf1", fg: "#1f9d57", name: "Grow", cadence: "Monthly", goal: "Expand value and partnership." },
    ],
  },
  {
    seg: "Mid",
    tag: "Standard",
    tagBg: "#efeafe",
    tagFg: "#7C5CFC",
    cells: [
      { bg: "#fdeaef", fg: "#d83a72", name: "Adoption Push", cadence: "Every 2 weeks", goal: "Improve adoption." },
      {
        bg: "#fdf3e0",
        fg: "#c97f12",
        name: "Maintain / Light Push",
        cadence: "Monthly",
        goal: "Acceptable baseline — light push on remaining features.",
      },
      { bg: "#eafaf1", fg: "#1f9d57", name: "Maintain", cadence: "Quarterly", goal: "Maintain engagement." },
    ],
  },
  {
    seg: "Low",
    tag: "Automated",
    tagBg: "#fdf0db",
    tagFg: "#c97f12",
    cells: [
      {
        bg: "#fdeaef",
        fg: "#d83a72",
        name: "Automated Activation",
        cadence: "4-week journey",
        goal: "Automated activation sequence.",
      },
      {
        bg: "#fdf3e0",
        fg: "#c97f12",
        name: "Self-Service / Nudge",
        cadence: "Monthly",
        goal: "Self-serve, with the occasional automated nudge.",
      },
      {
        bg: "#eafaf1",
        fg: "#1f9d57",
        name: "Self-Service",
        cadence: "Monthly",
        goal: "Monthly self-service engagement.",
      },
    ],
  },
];

export const champions = [
  { name: "AM Owner", initial: "AM", desc: "Drives execution & accountability", fg: "#1aa897", bg: "#e4faf6" },
  { name: "Adoption Champion", initial: "A", desc: "Pushes feature activation", fg: "#1f9d57", bg: "#eafaf1" },
  { name: "Training Champion", initial: "T", desc: "Enables the end-user team", fg: "#c97f12", bg: "#fdf0db" },
  { name: "Communication Champion", initial: "C", desc: "Keeps stakeholders aligned", fg: "#7C5CFC", bg: "#efeafe" },
  { name: "CRM Champion", initial: "CR", desc: "Owns data hygiene & signals", fg: "#d83a72", bg: "#fdeaef" },
  { name: "Commercial Governance", initial: "CG", desc: "Manages exceptions & strategy", fg: "#1A1A1A", bg: "#F5EFE7" },
];

export const principles = [
  { n: "1", text: "Commercial Segment determines priority." },
  { n: "2", text: "Product Health determines the level of intervention required." },
  { n: "3", text: "The AM Owner drives execution and accountability." },
  { n: "4", text: "Champion Types provide specialized support and expertise." },
  { n: "5", text: "Commercial Governance manages exceptions and strategic decisions." },
];

export default function CustomerSuccess({ nav }) {
  const { navOnboarding } = nav;
  const [cs, setCs] = useState({ segment: "High", health: "Unhealthy" });
  const setSeg = (v) => () => setCs((s) => ({ ...s, segment: v }));
  const setHealth = (v) => () => setCs((s) => ({ ...s, health: v }));
  const csDormant = cs.segment === "Dormant";
  const csRes = csDormant
    ? {
        name: "Reactive Only",
        cadence: "No proactive cadence",
        goal: "No proactive touchpoints — respond to inbound only.",
      }
    : MATRIX[cs.segment][cs.health];
  const segOpts = [
    { label: "High", on: cs.segment === "High", off: cs.segment !== "High", set: setSeg("High") },
    { label: "Mid", on: cs.segment === "Mid", off: cs.segment !== "Mid", set: setSeg("Mid") },
    { label: "Low", on: cs.segment === "Low", off: cs.segment !== "Low", set: setSeg("Low") },
    { label: "Dormant", on: cs.segment === "Dormant", off: cs.segment !== "Dormant", set: setSeg("Dormant") },
  ];
  const healthUnhealthyOn = cs.health === "Unhealthy";
  const healthUnhealthyOff = cs.health !== "Unhealthy";
  const setUnhealthy = setHealth("Unhealthy");
  const healthAdoptedOn = cs.health === "Adopted";
  const healthAdoptedOff = cs.health !== "Adopted";
  const setAdopted = setHealth("Adopted");
  const healthHealthyOn = cs.health === "Healthy";
  const healthHealthyOff = cs.health !== "Healthy";
  const setHealthy = setHealth("Healthy");
  const csResName = csRes.name;
  const csResCadence = csRes.cadence;
  const csResGoal = csRes.goal;
  const csSegLabel = cs.segment;
  const csHealthLabel = csDormant ? "Any" : cs.health;
  const csResUnhealthy = !csDormant && cs.health === "Unhealthy";
  const csResAdopted = !csDormant && cs.health === "Adopted";
  const csResHealthy = !csDormant && cs.health === "Healthy";
  const csIsDormant = csDormant;
  const csResDormant = csDormant;
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
        Playbook Selection Logic
      </h1>
      <p style={{ fontSize: "15px", color: "#8E8E93", maxWidth: "720px", lineHeight: "1.6" }}>
        Customer Success at seatOS isn't one-size-fits-all. Instead of guessing what an account needs, the system reads
        two signals and routes every customer to a specific, repeatable playbook.{" "}
        <b style={{ color: "#5a5248" }}>Commercial Segment</b> tells us how much the account is worth to the business —
        so it sets the <b style={{ color: "#5a5248" }}>priority</b>. <b style={{ color: "#5a5248" }}>Product Health</b>{" "}
        tells us how well they're actually using seatOS — so it sets the{" "}
        <b style={{ color: "#5a5248" }}>level of intervention</b>. Put the two together and you get exactly one
        recommended motion, with a defined cadence and a clear goal.
      </p>
      <p style={{ fontSize: "14px", color: "#a89a82", maxWidth: "720px", lineHeight: "1.6", marginTop: "10px" }}>
        Use the selector below to see what any combination resolves to, then scroll down for the full matrix, the
        champion roles that support each motion, and the principles that govern the whole system.
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
          marginTop: "20px",
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
            <path d="M13 2L3 14h8l-1 8 10-12h-8z" />
          </svg>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "15px", fontWeight: "800", color: "#8a5a12", letterSpacing: "-0.2px" }}>
              Low-segment automation — Available Q3
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
          <p style={{ fontSize: "13px", color: "#a07d3c", lineHeight: "1.55", marginTop: "4px", maxWidth: "660px" }}>
            The automated CS motions for the <b>Low</b> segment — activation journeys, nudges and self-service sequences
            — are being built and go live in <b>Q3</b>. Until then, handle Low-segment accounts manually using the
            matrix below as a guide.
          </p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "13px", margin: "30px 0 4px" }}>
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
          01
        </span>{" "}
        <span style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
          The two inputs that pick a playbook
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginTop: "24px", alignItems: "start" }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              color: "#b6a894",
              fontWeight: "700",
              marginBottom: "8px",
            }}
          >
            Input 1 · Commercial Segment
          </div>
          <p style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.5", marginBottom: "16px" }}>
            How valuable an account is to seatOS — based on contract value, growth potential and strategic fit. It
            answers “how much should we invest here?” and sets the{" "}
            <b style={{ color: "#5a5248" }}>priority and cadence</b> of the motion. Segment is set commercially and
            reviewed each quarter; it doesn't change week to week.
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                padding: "12px 0",
                borderTop: "1px solid #f3ece1",
              }}
            >
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: "800",
                  color: "#1aa897",
                  background: "#e4faf6",
                  padding: "5px 0",
                  borderRadius: "8px",
                  width: "74px",
                  textAlign: "center",
                  flexShrink: "0",
                }}
              >
                High
              </span>
              <p style={{ fontSize: "12.5px", color: "#5a5248", lineHeight: "1.5" }}>
                Strategic, top-value accounts — largest contracts or strongest growth and reference potential. They earn
                the most hands-on attention and the fastest cadence, and we actively push them toward full adoption.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                padding: "12px 0",
                borderTop: "1px solid #f3ece1",
              }}
            >
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: "800",
                  color: "#7C5CFC",
                  background: "#efeafe",
                  padding: "5px 0",
                  borderRadius: "8px",
                  width: "74px",
                  textAlign: "center",
                  flexShrink: "0",
                }}
              >
                Mid
              </span>
              <p style={{ fontSize: "12.5px", color: "#5a5248", lineHeight: "1.5" }}>
                Solid, mid-value accounts worth proactive care, but on a lighter touch than High. Three active features
                is treated as an acceptable baseline rather than a problem to fix.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                padding: "12px 0",
                borderTop: "1px solid #f3ece1",
              }}
            >
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: "800",
                  color: "#c97f12",
                  background: "#fdf0db",
                  padding: "5px 0",
                  borderRadius: "8px",
                  width: "74px",
                  textAlign: "center",
                  flexShrink: "0",
                }}
              >
                Low
              </span>
              <p style={{ fontSize: "12.5px", color: "#5a5248", lineHeight: "1.5" }}>
                Smaller accounts handled mostly through automated, scalable motions — activation journeys, nudges and
                self-service — so the team's time stays focused on higher-value segments.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                padding: "12px 0",
                borderTop: "1px solid #f3ece1",
              }}
            >
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: "800",
                  color: "#8E8E93",
                  background: "#F1ECE2",
                  padding: "5px 0",
                  borderRadius: "8px",
                  width: "74px",
                  textAlign: "center",
                  flexShrink: "0",
                }}
              >
                Dormant
              </span>
              <p style={{ fontSize: "12.5px", color: "#5a5248", lineHeight: "1.5" }}>
                Inactive or at-risk accounts with no live engagement. Reactive only — we respond to inbound requests but
                run no proactive outreach until they re-engage.
              </p>
            </div>
          </div>
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              color: "#b6a894",
              fontWeight: "700",
              marginBottom: "8px",
            }}
          >
            Input 2 · Product Health{" "}
            <span style={{ textTransform: "none", letterSpacing: "0", color: "#cfc3ae", fontWeight: "600" }}>
              — by Weekly Active Operators
            </span>
          </div>
          <p style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.5", marginBottom: "12px" }}>
            A simple, objective score: count how many of the six core seatOS features have a{" "}
            <b style={{ color: "#5a5248" }}>Weekly Active Operator</b> — a real user driving that feature each week.
            That feature count maps directly to a health state and what it means commercially.
          </p>
          <Hover
            as="a"
            href="https://datastudio.google.com/u/0/reporting/155b632b-4870-4c46-aa85-aeac649148ab/page/RC5kF"
            target="_blank"
            rel="noopener"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12.5px",
              fontWeight: "700",
              color: "#1aa897",
              background: "#e4faf6",
              padding: "9px 14px",
              borderRadius: "11px",
              textDecoration: "none",
              marginBottom: "16px",
            }}
            hover={{ background: "#d2f4ee" }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 13l4-4 3 3 3-5" />
              <path d="M3 3v10h10" />
            </svg>{" "}
            Check this account's Weekly Active Operators{" "}
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
              <path d="M6 3h7v7M13 3L5 11" />
            </svg>
          </Hover>
          <div
            style={{ display: "grid", gridTemplateColumns: "0.6fr 1fr 1.1fr", gap: "4px 12px", alignItems: "center" }}
          >
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: "800",
                color: "#b6a894",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                paddingBottom: "8px",
                borderBottom: "1px solid #f1ece2",
              }}
            >
              Feature Count
            </div>
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: "800",
                color: "#b6a894",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                paddingBottom: "8px",
                borderBottom: "1px solid #f1ece2",
              }}
            >
              Product Health
            </div>
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: "800",
                color: "#b6a894",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                paddingBottom: "8px",
                borderBottom: "1px solid #f1ece2",
              }}
            >
              Commercial Meaning
            </div>
            {healthDefs.map((hd, _i0) => (
              <Fragment key={_i0}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "800",
                    color: "#1A1A1A",
                    letterSpacing: "-0.5px",
                    padding: "12px 0",
                  }}
                >
                  {hd.range}
                </div>
                <div style={{ padding: "12px 0" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: hd.fg,
                      background: hd.bg,
                      padding: "5px 12px",
                      borderRadius: "8px",
                    }}
                  >
                    {hd.state}
                  </span>
                </div>
                <div style={{ fontSize: "13.5px", color: "#5a5248", fontWeight: "600", padding: "12px 0" }}>
                  {hd.meaning}
                </div>
              </Fragment>
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
          02
        </span>{" "}
        <span style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
          Find the playbook — try it
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div
        style={{
          background: "#1A1A1A",
          borderRadius: "22px",
          padding: "28px",
          marginTop: "18px",
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
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(45,212,191,.32),transparent 70%)",
          }}
        ></div>
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "30px",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                color: "#2DD4BF",
                marginBottom: "16px",
              }}
            >
              Find the playbook
            </div>
            <div
              style={{
                fontSize: "11.5px",
                color: "rgba(255,255,255,0.5)",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "8px",
              }}
            >
              Commercial Segment
            </div>
            <div
              style={{
                display: "flex",
                gap: "6px",
                background: "rgba(255,255,255,0.06)",
                padding: "5px",
                borderRadius: "13px",
                marginBottom: "16px",
              }}
            >
              {segOpts.map((so, _i0) => (
                <Fragment key={_i0}>
                  {so.on && (
                    <button
                      onClick={so.set}
                      style={{
                        flex: "1",
                        padding: "10px 4px",
                        borderRadius: "9px",
                        fontSize: "13px",
                        fontWeight: "700",
                        cursor: "pointer",
                        border: "none",
                        background: "#2DD4BF",
                        color: "#0c2b27",
                      }}
                    >
                      {so.label}
                    </button>
                  )}
                  {so.off && (
                    <button
                      onClick={so.set}
                      style={{
                        flex: "1",
                        padding: "10px 4px",
                        borderRadius: "9px",
                        fontSize: "13px",
                        fontWeight: "700",
                        cursor: "pointer",
                        border: "none",
                        background: "transparent",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      {so.label}
                    </button>
                  )}
                </Fragment>
              ))}
            </div>
            <div
              style={{
                fontSize: "11.5px",
                color: "rgba(255,255,255,0.5)",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "8px",
              }}
            >
              Product Health
            </div>
            <div
              style={{
                display: "flex",
                gap: "6px",
                background: "rgba(255,255,255,0.06)",
                padding: "5px",
                borderRadius: "13px",
              }}
            >
              {healthUnhealthyOn && (
                <button
                  onClick={setUnhealthy}
                  style={{
                    flex: "1",
                    padding: "10px 4px",
                    borderRadius: "9px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    border: "none",
                    background: "#E84C88",
                    color: "#fff",
                  }}
                >
                  Unhealthy
                </button>
              )}
              {healthUnhealthyOff && (
                <button
                  onClick={setUnhealthy}
                  style={{
                    flex: "1",
                    padding: "10px 4px",
                    borderRadius: "9px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    border: "none",
                    background: "transparent",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Unhealthy
                </button>
              )}
              {healthAdoptedOn && (
                <button
                  onClick={setAdopted}
                  style={{
                    flex: "1",
                    padding: "10px 4px",
                    borderRadius: "9px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    border: "none",
                    background: "#F5A623",
                    color: "#3a2600",
                  }}
                >
                  Adopted
                </button>
              )}
              {healthAdoptedOff && (
                <button
                  onClick={setAdopted}
                  style={{
                    flex: "1",
                    padding: "10px 4px",
                    borderRadius: "9px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    border: "none",
                    background: "transparent",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Adopted
                </button>
              )}
              {healthHealthyOn && (
                <button
                  onClick={setHealthy}
                  style={{
                    flex: "1",
                    padding: "10px 4px",
                    borderRadius: "9px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    border: "none",
                    background: "#2ECC71",
                    color: "#0c331f",
                  }}
                >
                  Healthy
                </button>
              )}
              {healthHealthyOff && (
                <button
                  onClick={setHealthy}
                  style={{
                    flex: "1",
                    padding: "10px 4px",
                    borderRadius: "9px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    border: "none",
                    background: "transparent",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Healthy
                </button>
              )}
            </div>
            {csIsDormant && (
              <div style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.4)", marginTop: "9px" }}>
                Dormant accounts are reactive only — health doesn't change the motion.
              </div>
            )}
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "18px",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "11.5px",
                color: "rgba(255,255,255,0.5)",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <span>{csSegLabel}</span>
              <span style={{ color: "rgba(255,255,255,0.25)" }}>+</span>
              <span>{csHealthLabel}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "12px 0 6px" }}>
              {csResUnhealthy && (
                <div style={{ width: "5px", height: "40px", borderRadius: "4px", background: "#E84C88" }}></div>
              )}
              {csResAdopted && (
                <div style={{ width: "5px", height: "40px", borderRadius: "4px", background: "#F5A623" }}></div>
              )}
              {csResHealthy && (
                <div style={{ width: "5px", height: "40px", borderRadius: "4px", background: "#2ECC71" }}></div>
              )}
              {csResDormant && (
                <div style={{ width: "5px", height: "40px", borderRadius: "4px", background: "#8E8E93" }}></div>
              )}
              <div style={{ fontSize: "30px", fontWeight: "800", letterSpacing: "-0.6px", lineHeight: "1" }}>
                {csResName}
              </div>
            </div>
            <span
              style={{
                display: "inline-block",
                fontSize: "11.5px",
                fontWeight: "700",
                color: "#2DD4BF",
                background: "rgba(45,212,191,0.12)",
                padding: "5px 12px",
                borderRadius: "20px",
                marginBottom: "12px",
              }}
            >
              ⏱ {csResCadence}
            </span>
            <p style={{ fontSize: "13.5px", color: "rgba(255,255,255,0.7)", lineHeight: "1.5" }}>{csResGoal}</p>
          </div>
        </div>
      </div>{" "}
      <Hover
        as="button"
        onClick={navOnboarding}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          width: "100%",
          textAlign: "left",
          background: "#fff",
          border: "none",
          borderRadius: "16px",
          padding: "18px 22px",
          marginTop: "24px",
          cursor: "pointer",
          boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
          borderLeft: "5px solid #F5A623",
        }}
        hover={{ background: "#fffaf1" }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "11px",
            background: "#fdf0db",
            color: "#c97f12",
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
            <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
          </svg>
        </div>
        <div style={{ flex: "1", minWidth: "0" }}>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
            New accounts run Onboarding first
          </div>
          <div style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.45", marginTop: "2px" }}>
            Every account completes a 30-day hypercare motion at go-live before the segment × health matrix takes over.
          </div>
        </div>
        <span style={{ fontSize: "13px", fontWeight: "800", color: "#c97f12", whiteSpace: "nowrap" }}>
          Open Onboarding →
        </span>
      </Hover>{" "}
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
          03
        </span>{" "}
        <span style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
          The full playbook matrix
        </span>{" "}
        <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
      </div>
      <div style={{ marginTop: "28px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "800", letterSpacing: "-0.3px", marginBottom: "4px" }}>
          The Playbook Matrix
        </h3>
        <p
          style={{ fontSize: "13.5px", color: "#8E8E93", lineHeight: "1.55", marginBottom: "16px", maxWidth: "720px" }}
        >
          Read across a row to see how the motion intensifies as health drops. Read down a column to see how the same
          health state gets a very different cadence depending on segment value. A{" "}
          <b style={{ color: "#5a5248" }}>High + Unhealthy</b> account gets a weekly Rescue, while a{" "}
          <b style={{ color: "#5a5248" }}>Low + Unhealthy</b> account gets an automated journey — same problem,
          proportional effort. The goal is always to move accounts left-to-right: Unhealthy → Adopted → Healthy.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 1fr", gap: "10px", alignItems: "stretch" }}>
          <div></div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "12px",
              fontWeight: "800",
              color: "#d83a72",
              padding: "0 4px",
            }}
          >
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#E84C88" }}></span>Unhealthy{" "}
            <span style={{ color: "#cfb7a0", fontWeight: "600" }}>0–2</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "12px",
              fontWeight: "800",
              color: "#c97f12",
              padding: "0 4px",
            }}
          >
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#F5A623" }}></span>Adopted{" "}
            <span style={{ color: "#cfb7a0", fontWeight: "600" }}>3–4</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "12px",
              fontWeight: "800",
              color: "#1f9d57",
              padding: "0 4px",
            }}
          >
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#2ECC71" }}></span>Healthy{" "}
            <span style={{ color: "#cfb7a0", fontWeight: "600" }}>5–6</span>
          </div>
          {matrixRows.map((row, _i0) => (
            <Fragment key={_i0}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "14px",
                  boxShadow: "0 1px 2px rgba(26,26,26,.05)",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: "800", letterSpacing: "-0.3px" }}>{row.seg}</div>
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: "700",
                    color: row.tagFg,
                    background: row.tagBg,
                    padding: "3px 8px",
                    borderRadius: "7px",
                    marginTop: "6px",
                    alignSelf: "flex-start",
                  }}
                >
                  {row.tag}
                </span>
              </div>
              {row.cells.map((cell, _i1) => (
                <div key={_i1} style={{ background: cell.bg, borderRadius: "14px", padding: "15px" }}>
                  <div
                    style={{
                      fontSize: "14.5px",
                      fontWeight: "800",
                      color: cell.fg,
                      letterSpacing: "-0.2px",
                      lineHeight: "1.2",
                    }}
                  >
                    {cell.name}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b6356", marginTop: "7px" }}>
                    ⏱ {cell.cadence}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#8E8E93", lineHeight: "1.4", marginTop: "5px" }}>
                    {cell.goal}
                  </div>
                </div>
              ))}
            </Fragment>
          ))}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              background: "#fff",
              borderRadius: "14px",
              padding: "14px",
              boxShadow: "0 1px 2px rgba(26,26,26,.05)",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: "800", letterSpacing: "-0.3px" }}>Dormant</div>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: "700",
                color: "#8E8E93",
                background: "#F1ECE2",
                padding: "3px 8px",
                borderRadius: "7px",
                marginTop: "6px",
                alignSelf: "flex-start",
              }}
            >
              Reactive
            </span>
          </div>
          <div
            style={{
              gridColumn: "span 3",
              background: "#F1ECE2",
              borderRadius: "14px",
              padding: "15px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "14.5px", fontWeight: "800", color: "#5a5248", letterSpacing: "-0.2px" }}>
              Reactive Only
            </div>
            <div style={{ fontSize: "12px", color: "#8E8E93", lineHeight: "1.4" }}>
              No proactive touchpoints — respond to inbound requests only, regardless of health.
            </div>
          </div>
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "24px 26px",
            marginTop: "18px",
            boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
            borderLeft: "5px solid #2DD4BF",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              color: "#1aa897",
              fontWeight: "800",
              marginBottom: "10px",
            }}
          >
            Why “Adopted” means different things by segment
          </div>
          <p style={{ fontSize: "14px", color: "#5a5248", lineHeight: "1.65", maxWidth: "820px" }}>
            We recognize <b style={{ color: "#1A1A1A" }}>3-feature adoption as an acceptable Product Health baseline</b>{" "}
            — but <b style={{ color: "#1A1A1A" }}>Commercial Segment determines the level of ambition</b>. For a
            High-value account, 3 features means the account is usable, but not yet strategic enough for growth, so its
            playbook keeps pushing toward 5–6 features. Mid and Low accounts, by contrast, are treated as acceptable at
            3+ features and shift into maintain / self-serve motions.
          </p>
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
            04
          </span>{" "}
          <span style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
            Kept current automatically
          </span>{" "}
          <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "26px",
            marginTop: "18px",
            boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#e4faf6",
                color: "#1aa897",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: "0",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 11-3-6.7L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "800", letterSpacing: "-0.3px" }}>
              Updated automatically, every Monday
            </h3>
          </div>
          <p style={{ fontSize: "14px", color: "#5a5248", lineHeight: "1.65", maxWidth: "820px" }}>
            You don't maintain any of this by hand.{" "}
            <b style={{ color: "#1A1A1A" }}>
              Every Monday, HubSpot refreshes each account's Product Health, WAO (Weekly Active Operators), and Assigned
              Playbook automatically
            </b>{" "}
            — so when you open a deal, the segment, health status, and the playbook you should be running are already up
            to date. You also get a <b style={{ color: "#1A1A1A" }}>Slack message every Monday</b> summarising which of
            your accounts need action this week and which playbook applies.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginTop: "22px" }}>
            <div>
              <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#8E8E93", marginBottom: "10px" }}>
                CSM Info — auto-updated fields on the deal record
              </div>
              <div
                style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #eee4d4", background: "#fff" }}
              >
                <img
                  src="/playbook/cs-csm-info-panel.png"
                  alt="HubSpot CSM Info panel with WAO, Health Status and Assigned Playbook circled"
                  style={{ display: "block", width: "100%", height: "auto" }}
                />
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#8E8E93", marginBottom: "10px" }}>
                AM board — segment & health surface on every card
              </div>
              <div
                style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #eee4d4", background: "#fff" }}
              >
                <img
                  src="/playbook/cs-am-board.png"
                  alt="HubSpot AM board cards with Client Segment and Health Status circled"
                  style={{ display: "block", width: "100%", height: "auto" }}
                />
              </div>
            </div>
          </div>
          <div style={{ marginTop: "18px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "11.5px",
                fontWeight: "700",
                color: "#8E8E93",
                marginBottom: "10px",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#611f69"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="4" height="4" rx="1" />
                <rect x="11" y="17" width="4" height="4" rx="1" />
                <rect x="17" y="9" width="4" height="4" rx="1" />
                <rect x="9" y="3" width="4" height="4" rx="1" />
              </svg>{" "}
              Monday Slack digest — your accounts that need action this week
            </div>
            <div
              style={{
                borderRadius: "14px",
                overflow: "hidden",
                border: "1px solid #eee4d4",
                background: "#fff",
                maxWidth: "760px",
              }}
            >
              <img
                src="/playbook/cs-slack-flags.png"
                alt="Slack message listing the accounts flagged for action this week, grouped by playbook"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
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
            05
          </span>{" "}
          <span style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
            From playbook to action
          </span>{" "}
          <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "26px",
            marginTop: "18px",
            boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#fdf0db",
                color: "#c97f12",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: "0",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M3 9h18M8 2v4M16 2v4" />
                <path d="M8 14l2.5 2.5L16 11" />
              </svg>
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "800", letterSpacing: "-0.3px" }}>
              Tasks land in HubSpot, on the playbook's cadence
            </h3>
          </div>
          <p style={{ fontSize: "14px", color: "#5a5248", lineHeight: "1.65", maxWidth: "820px" }}>
            The assigned playbook sets the schedule — a <b style={{ color: "#1A1A1A" }}>Rescue runs weekly</b>, Push to
            Healthy every two weeks, Grow monthly, and so on. On each beat, HubSpot automatically{" "}
            <b style={{ color: "#1A1A1A" }}>
              creates a task on the account and assigns it to the responsible Account Manager
            </b>
            , pre-filled with the playbook, current WAO and Product Health. The AM takes action, then{" "}
            <b style={{ color: "#1A1A1A" }}>leaves a comment on the task describing what they did</b> — that's how the
            loop is closed and tracked.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.85fr 1fr",
              gap: "24px",
              marginTop: "22px",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    background: "#fdf0db",
                    color: "#c97f12",
                    fontSize: "12px",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  1
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>
                    Playbook sets the cadence
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.45", marginTop: "2px" }}>
                    e.g. Rescue → a task every week until health recovers.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    background: "#fdf0db",
                    color: "#c97f12",
                    fontSize: "12px",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  2
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>
                    Task auto-assigned to the AM
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.45", marginTop: "2px" }}>
                    With the playbook, WAO and health pre-filled in the notes.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "8px",
                    background: "#fdf0db",
                    color: "#c97f12",
                    fontSize: "12px",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  3
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>AM acts & comments</div>
                  <div style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.45", marginTop: "2px" }}>
                    They log what they did directly on the task to close the loop.
                  </div>
                </div>
              </div>
            </div>
            <div style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #eee4d4", background: "#fff" }}>
              <img
                src="/playbook/cs-am-task.png"
                alt="HubSpot task assigned to an account manager with playbook notes and an add-comment action"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
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
            06
          </span>{" "}
          <span style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
            Who runs it — roles & principles
          </span>{" "}
          <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "18px", marginTop: "28px" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              padding: "26px",
              boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
            }}
          >
            <h3 style={{ fontSize: "17px", fontWeight: "800", letterSpacing: "-0.3px", marginBottom: "4px" }}>
              Champion Types
            </h3>
            <p style={{ fontSize: "13px", color: "#8E8E93", lineHeight: "1.5", marginBottom: "18px" }}>
              No single person runs a playbook alone. The AM Owner is accountable for the account, but pulls in these
              specialized champions depending on what the motion needs — activation help, training, or cleaner CRM data.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {champions.map((ch, _i0) => (
                <div
                  key={_i0}
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                    background: "#FBF7F0",
                    borderRadius: "14px",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "11px",
                      background: ch.bg,
                      color: ch.fg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: "0",
                      fontWeight: "800",
                      fontSize: "15px",
                    }}
                  >
                    {ch.initial}
                  </div>
                  <div style={{ minWidth: "0" }}>
                    <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}>
                      {ch.name}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#8E8E93", lineHeight: "1.35", marginTop: "1px" }}>
                      {ch.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#1A1A1A", borderRadius: "20px", padding: "26px", color: "#fff" }}>
            <h3 style={{ fontSize: "17px", fontWeight: "800", letterSpacing: "-0.3px", marginBottom: "6px" }}>
              Core Principles
            </h3>
            <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.45)", lineHeight: "1.5", marginBottom: "18px" }}>
              The five rules that keep the system consistent across every AM and account.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {principles.map((pr, _i0) => (
                <div key={_i0} style={{ display: "flex", gap: "13px", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "8px",
                      background: "rgba(45,212,191,0.15)",
                      color: "#2DD4BF",
                      fontSize: "12px",
                      fontWeight: "800",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: "0",
                    }}
                  >
                    {pr.n}
                  </div>
                  <div style={{ fontSize: "13.5px", color: "rgba(255,255,255,0.8)", lineHeight: "1.45" }}>
                    {pr.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
