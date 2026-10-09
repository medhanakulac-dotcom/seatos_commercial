// Pricing & Packages — fees per currency.
// Edit the content arrays at the top; the component below lays them out.
import { Fragment, useState } from "react";
import { Hover, icon } from "../ui.jsx";

export const CURRENCIES = [
  {
    code: "THB",
    name: "Thai Baht",
    sym: "\u0e3f",
    online: "10",
    sms: "3",
    admin: "1,600",
    impl: "5,200",
    pos: "500",
    kiosk: "4,000",
  },
  {
    code: "USD",
    name: "US Dollar",
    sym: "$",
    online: "0.30",
    sms: "0.08",
    admin: "60",
    impl: "150",
    pos: "16",
    kiosk: "130",
  },
  {
    code: "PHP",
    name: "Philippine Peso",
    sym: "\u20b1",
    online: "18",
    sms: "5",
    admin: "2,850",
    impl: "8,700",
    pos: "1,000",
    kiosk: "7,300",
  },
  {
    code: "IDR",
    name: "Indonesian Rupiah",
    sym: "Rp\u00a0",
    online: "5,000",
    sms: "1,356",
    admin: "830,000",
    impl: "2,540,700",
    pos: "271,000",
    kiosk: "170,000,000",
  },
  {
    code: "VND",
    name: "Vietnamese Dong",
    sym: "\u20ab",
    online: "7,900",
    sms: "2,000",
    admin: "1,300,000",
    impl: "3,900,000",
    pos: "420,000",
    kiosk: "3,210,000",
  },
];

export default function Pricing({ nav }) {
  const [curCode, setCurCode] = useState("THB");
  const cur = CURRENCIES.find((c) => c.code === curCode) || CURRENCIES[0];
  const priceCurOpts = CURRENCIES.map((c) => ({
    code: c.code,
    on: c.code === curCode,
    off: c.code !== curCode,
    set: () => setCurCode(c.code),
  }));
  const priceGroups = [
    {
      label: "Per-transaction fees",
      cadence: "Billed monthly",
      accent: "#7C5CFC",
      bg: "#efeafe",
      icon: icon([
        "M3 7a2 2 0 012-2h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4z",
        "M13 5v2M13 11v2M13 17v2",
      ]),
      items: [
        { name: "Online Convenience Fee", fee: cur.sym + cur.online, unit: "per transaction" },
        { name: "SMS", fee: cur.sym + cur.sms, unit: "per message" },
      ],
    },
    {
      label: "Monthly subscription",
      cadence: "Billed monthly",
      accent: "#d83a72",
      bg: "#fdeaef",
      icon: icon(["M21 12a9 9 0 11-3-6.7L21 8", "M21 3v5h-5"]),
      items: [{ name: "Administration & Maintenance Fee", fee: cur.sym + cur.admin, unit: "per month" }],
      includes: ["Hosting", "Help Desk Support"],
    },
    {
      label: "One-time setup",
      cadence: "Charged once",
      accent: "#c97f12",
      bg: "#fdf0db",
      icon: icon(["M14.7 6.3a4 4 0 01-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 015.4-5.4l-2.7 2.7-2-2z"]),
      items: [{ name: "Implementation & Configuration", fee: cur.sym + cur.impl, unit: "one-time" }],
    },
    {
      label: "Hardware",
      cadence: "Billed monthly \u00b7 per unit",
      accent: "#1aa897",
      bg: "#e4faf6",
      icon: icon(["M2 3h20v14H2z", "M8 21h8M12 17v4"]),
      items: [
        { name: "POS", fee: cur.sym + cur.pos, unit: "per POS / month" },
        { name: "Kiosk", fee: cur.sym + cur.kiosk, unit: "per Kiosk / month" },
      ],
    },
    {
      label: "Add-ons",
      cadence: "Pricing on request",
      accent: "#F5A623",
      bg: "#fef1da",
      icon: icon(["M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.7 21a2 2 0 01-3.4 0"]),
      items: [{ name: "seatOS Notify", fee: "N/A", unit: "pricing TBC" }],
    },
  ];
  const priceCurName = cur.name;
  return (
    <div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "#fdeaef",
          color: "#d83a72",
          padding: "6px 13px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "700",
          marginBottom: "14px",
        }}
      >
        Pricing
      </div>
      <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.7px", marginBottom: "10px" }}>
        Pricing & Packages
      </h1>
      <p style={{ fontSize: "15px", color: "#8E8E93", maxWidth: "680px", lineHeight: "1.6" }}>
        The standard seatOS commercial package, grouped by <b style={{ color: "#5a5248" }}>how it's billed</b>. Switch
        currency to see local pricing. Confirm the final numbers against the signed contract for each deal.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "20px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: "800",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "#b6a894",
          }}
        >
          Currency
        </span>
        <div
          style={{
            display: "inline-flex",
            gap: "4px",
            background: "#fff",
            padding: "5px",
            borderRadius: "13px",
            boxShadow: "0 1px 2px rgba(26,26,26,.05),0 6px 18px rgba(26,26,26,.03)",
          }}
        >
          {priceCurOpts.map((c, _i0) => (
            <Fragment key={_i0}>
              {c.on && (
                <button
                  onClick={c.set}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    background: "#1A1A1A",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: "800",
                    padding: "8px 16px",
                    borderRadius: "9px",
                  }}
                >
                  {c.code}
                </button>
              )}
              {c.off && (
                <Hover
                  as="button"
                  onClick={c.set}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    background: "transparent",
                    color: "#8E8E93",
                    fontSize: "13px",
                    fontWeight: "700",
                    padding: "8px 16px",
                    borderRadius: "9px",
                  }}
                  hover={{ background: "#FBF7F0", color: "#1A1A1A" }}
                >
                  {c.code}
                </Hover>
              )}
            </Fragment>
          ))}
        </div>
        <span style={{ fontSize: "13px", color: "#8E8E93", fontWeight: "600" }}>{priceCurName}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "20px" }}>
        {priceGroups.map((g, _i0) => (
          <div
            key={_i0}
            style={{
              background: "#fff",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: g.bg,
                  color: g.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: "0",
                }}
              >
                {g.icon}
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.3px" }}>
                  {g.label}
                </div>
                <div
                  style={{
                    fontSize: "11.5px",
                    fontWeight: "700",
                    color: g.accent,
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    marginTop: "1px",
                  }}
                >
                  {g.cadence}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {g.items.map((it, _i1) => (
                <div
                  key={_i1}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "14px",
                    background: "#FBF7F0",
                    borderRadius: "13px",
                    padding: "14px 16px",
                  }}
                >
                  <span style={{ fontSize: "13.5px", fontWeight: "600", color: "#3a3530", lineHeight: "1.35" }}>
                    {it.name}
                  </span>
                  <div style={{ textAlign: "right", flexShrink: "0" }}>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "800",
                        color: "#1A1A1A",
                        letterSpacing: "-0.5px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {it.fee}
                    </div>
                    <div style={{ fontSize: "11px", color: "#b6a894", whiteSpace: "nowrap" }}>{it.unit}</div>
                  </div>
                </div>
              ))}
            </div>
            {g.includes && (
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px dashed #ece2d2" }}>
                <div
                  style={{
                    fontSize: "10.5px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#b6a894",
                    marginBottom: "9px",
                  }}
                >
                  Included at no extra charge
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {g.includes.map((inc, _i1) => (
                    <span
                      key={_i1}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#1aa897",
                        background: "#e4faf6",
                        padding: "5px 11px",
                        borderRadius: "20px",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 8.5l3.5 3.5L13 4.5" />
                      </svg>
                      {inc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: "20px",
          background: "#efeafe",
          borderRadius: "14px",
          padding: "16px 18px",
          display: "flex",
          gap: "11px",
          alignItems: "flex-start",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#7C5CFC"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: "0", marginTop: "1px" }}
        >
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 11v5M12 7.5h.01" />
        </svg>{" "}
        <span style={{ fontSize: "12.5px", color: "#5b46a8", lineHeight: "1.5" }}>
          Hosting and Help Desk Support come bundled inside the Monthly Administration & Maintenance Fee. Use the{" "}
          <b style={{ fontWeight: "800" }}>Deal Calculator</b> to model the total for a specific operator, and always
          confirm the final figures against the signed contract.
        </span>
      </div>
    </div>
  );
}
