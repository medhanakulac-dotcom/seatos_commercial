// Templates & Docs — downloadable sales, legal and success documents.
// Edit the content arrays at the top; the component below lays them out.
import { Hover } from "../ui.jsx";

export const docCats = [
  { name: "All", bg: "#1A1A1A", fg: "#fff" },
  { name: "Sales", bg: "#efeafe", fg: "#7C5CFC" },
  { name: "Legal", bg: "#e4faf6", fg: "#1aa897" },
  { name: "Success", bg: "#eafaf1", fg: "#1f9d57" },
];

export const docs = [
  {
    name: "Discovery Call Script",
    desc: "MEDDICC-based question framework for first calls.",
    cat: "Sales",
    ext: "DOC",
    meta: "Updated Q2",
    bg: "#efeafe",
    fg: "#7C5CFC",
  },
  {
    name: "Demo Checklist",
    desc: "Pre-flight and live-demo runbook for AEs and SEs.",
    cat: "Sales",
    ext: "PDF",
    meta: "2 pages",
    bg: "#efeafe",
    fg: "#7C5CFC",
  },
  {
    name: "Mutual Action Plan",
    desc: "Shared timeline template to drive deals to close.",
    cat: "Sales",
    ext: "XLS",
    meta: "Editable",
    bg: "#efeafe",
    fg: "#7C5CFC",
  },
  {
    name: "Master Service Agreement",
    desc: "Standard MSA with pre-approved fallback clauses.",
    cat: "Legal",
    ext: "DOC",
    meta: "Legal-approved",
    bg: "#e4faf6",
    fg: "#1aa897",
  },
  {
    name: "Order Form",
    desc: "Fillable order form linked to the Proposal Builder.",
    cat: "Legal",
    ext: "PDF",
    meta: "v4",
    bg: "#e4faf6",
    fg: "#1aa897",
  },
  {
    name: "CS Handoff Doc",
    desc: "Everything the CSM needs from a closed-won deal.",
    cat: "Success",
    ext: "DOC",
    meta: "Required",
    bg: "#eafaf1",
    fg: "#1f9d57",
  },
];

export default function Templates({ nav }) {
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
        Library
      </div>
      <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.7px", marginBottom: "10px" }}>
        Templates & Docs
      </h1>
      <p style={{ fontSize: "15px", color: "#8E8E93", maxWidth: "660px", lineHeight: "1.6" }}>
        Battle-tested assets for every stage. Duplicate, fill in, and send. Last reviewed by RevOps this quarter.
      </p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "22px 0 22px" }}>
        {docCats.map((dc, _i0) => (
          <div
            key={_i0}
            style={{
              fontSize: "12.5px",
              fontWeight: "700",
              color: dc.fg,
              background: dc.bg,
              padding: "8px 15px",
              borderRadius: "20px",
            }}
          >
            {dc.name}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "14px" }}>
        {docs.map((d, _i0) => (
          <div
            key={_i0}
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 1px 2px rgba(26,26,26,.05),0 6px 18px rgba(26,26,26,.03)",
              display: "flex",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "54px",
                borderRadius: "10px",
                background: d.bg,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                paddingBottom: "7px",
                flexShrink: "0",
              }}
            >
              <span style={{ fontSize: "9px", fontWeight: "800", color: d.fg, letterSpacing: "0.5px" }}>{d.ext}</span>
            </div>
            <div style={{ flex: "1", minWidth: "0" }}>
              <div style={{ fontSize: "14.5px", fontWeight: "800", color: d.fg, letterSpacing: "-0.2px" }}>
                {d.name}
              </div>
              <p style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.45", margin: "4px 0 10px" }}>{d.desc}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: d.fg,
                    background: d.bg,
                    padding: "4px 10px",
                    borderRadius: "7px",
                  }}
                >
                  {d.cat}
                </span>{" "}
                <span style={{ fontSize: "11.5px", color: "#b6a894" }}>{d.meta}</span>
              </div>
            </div>
            <Hover
              as="button"
              style={{
                alignSelf: "center",
                background: "#FBF7F0",
                border: "none",
                borderRadius: "11px",
                padding: "10px",
                cursor: "pointer",
                color: "#8E8E93",
                display: "flex",
              }}
              hover={{ background: "#F5A623", color: "#fff" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 2v8M5 7l3 3 3-3M3 13h10" />
              </svg>
            </Hover>
          </div>
        ))}
      </div>
    </div>
  );
}
