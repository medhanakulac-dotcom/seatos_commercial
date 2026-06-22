import { useState, useMemo, useEffect } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────
// Country list is kept ONLY for the Deal Value pricing card (fee overrides).
// The new segmentation framework (V1) no longer uses region groups for scoring.
const REGIONS = {
  Thailand: "A",
  Indonesia: "A",
  Vietnam: "A",
  Cambodia: "A",
  Philippines: "C",
  Laos: "B",
  EMEA: "B",
  "Rest of World": "B",
};

// ═════════════════════════════════════════════════════════════════
// SEATOS COMMERCIAL SCORE V2 — 100 POINTS (separate Existing / New)
// ─────────────────────────────────────────────────────────────────
// Existing Operator:  Deal Value 50 · Expansion 30 · Strategic 20
// New Operator:       Projected Deal Value 35 · Top Route/Demand 30
//                     · Expansion 20 · Strategic 15
//
// Why separate:
//   • Existing — actual revenue already shows importance; no need to
//     re-score monthly tickets or Top Route.
//   • New — no real revenue yet, so Top Route / Demand Signal carries
//     its own heavy weight as a proxy for real transaction potential.
//   • Travel Agencies are auto-classified Dormant.
// ═════════════════════════════════════════════════════════════════

// Per-operator factor weights (each column sums to 100).
const WEIGHTS = {
  existing: { deal: 50, topRoute: 0, expansion: 30, strategic: 20 },
  new: { deal: 35, topRoute: 30, expansion: 20, strategic: 15 },
};

// Deal Value — annual USD figure mapped to a 0–1 level, then × the
// per-operator Deal Value weight (Existing 50 / New 35).
//   Existing: Actual Annual Revenue
//   New:      Projected Annual Commission
//             = Est. Monthly Tickets × Avg Ticket Price × Commission % × 12
// NOTE: tiers are configurable defaults — adjust to your official scale.
const DEAL_VALUE_TIERS = [
  { max: 4999, frac: 0 },
  { max: 19999, frac: 0.3 },
  { max: 49999, frac: 0.6 },
  { max: 99999, frac: 0.8 },
  { max: Infinity, frac: 1 },
];

// Expansion Potential — same 3 criteria for both, raw max 30, then
// normalized to the per-operator Expansion weight (Existing 30 / New 20).
// Top Route is NOT here (New: own factor; Existing: not scored).
const EXPANSION_CRITERIA = [
  { key: "fleet", label: "Fleet > 20", points: 10 },
  { key: "posKiosk", label: "POS / Kiosk / White-label opportunity", points: 10 },
  { key: "multiRoute", label: "Multi-route / multi-branch potential", points: 10 },
];
const EXPANSION_RAW_MAX = 30;

// Strategic Value — raw max 15, normalized to per-operator weight
// (Existing 20 / New 15).
const STRATEGIC_CRITERIA = [
  { key: "marquee", label: "Marquee Brand", points: 5 },
  { key: "caseStudy", label: "Case Study Potential", points: 5 },
  { key: "marketLeverage", label: "Market Leverage", points: 5 },
];
const STRATEGIC_RAW_MAX = 15;

// Top Route / Demand Signal (New operators only) — graded proxy for
// real demand, scaled to the Top Route weight (30).
const DEMAND_SIGNAL_LEVELS = [
  { value: "none", label: "No demand signal", frac: 0 },
  { value: "demand", label: "Some demand signal", frac: 0.5 },
  { value: "topRoute", label: "On Travelier Top Route", frac: 1 },
];

// Segment Mapping (on 0–100 total)
const SEGMENT_BANDS = [
  { min: 80, name: "High" },
  { min: 50, name: "Mid" },
  { min: 20, name: "Low" },
  { min: 0, name: "Dormant" },
];

const getFrac = (tiers, value) => {
  for (const t of tiers) if (value <= t.max) return t.frac;
  return tiers[tiers.length - 1].frac;
};

// ─── DEAL VALUE PRICING (UNCHANGED) ──────────────────────────────
const DEFAULTS = {
  ticketFee: 0.3,
  revenueShare: 3,
  implementationFee: 150,
  monthlyFee: 60,
};

// Country-specific fee overrides (takes precedence over DEFAULTS)
const COUNTRY_OVERRIDES = {
  Philippines: { monthlyFee: 30 },
};

// ─── HELPERS ─────────────────────────────────────────────────────
const fmt = (n) =>
  n != null && !isNaN(n)
    ? Number(n).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : "0";

const fmtUSD = (n) => `${fmt(n)} USD`;

const safe = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.max(0, n);
};

const getTierScore = (tiers, value) => {
  for (const t of tiers) if (value <= t.max) return t.score;
  return tiers[tiers.length - 1].score;
};

const segmentColor = (s) =>
  s === "High" ? "#16a34a" : s === "Mid" ? "#0d9488" : s === "Low" ? "#ea8c00" : "#71717a";

const segmentBg = (s) =>
  s === "High"
    ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
    : s === "Mid"
    ? "linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)"
    : s === "Low"
    ? "linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)"
    : "linear-gradient(135deg, #f4f4f5 0%, #e4e4e7 100%)";

// ─── ANIMATED NUMBER ─────────────────────────────────────────────
function AnimNum({ value, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    let start = display;
    const end = value;
    if (start === end) return;
    const diff = end - start;
    const steps = 18;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setDisplay(start + diff * (step / steps));
      if (step >= steps) {
        setDisplay(end);
        clearInterval(iv);
      }
    }, 16);
    return () => clearInterval(iv);
  }, [value]);
  return (
    <span>
      {prefix}
      {fmt(display)}
      {suffix}
    </span>
  );
}

// ─── FLOATING SHAPES (transport themed) ─────────────────────────
function Shapes() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {[
        { w: 350, h: 350, bg: "radial-gradient(circle, rgba(251,146,60,0.10) 0%, transparent 70%)", top: -80, right: -100 },
        { w: 260, h: 260, bg: "radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)", bottom: 60, left: -80 },
        { w: 200, h: 200, bg: "radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)", top: "45%", right: 30 },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", width: s.w, height: s.h, borderRadius: "50%", background: s.bg, top: s.top, left: s.left, right: s.right, bottom: s.bottom, animation: `seatFloat ${7 + i * 2}s ease-in-out infinite alternate` }} />
      ))}
    </div>
  );
}

// ─── TICKET CARD ────────────────────────────────────────────────
function Card({ children, style, accent, className = "" }) {
  return (
    <div
      className={className}
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: "28px 32px",
        boxShadow: "0 2px 20px rgba(0,0,0,0.04), 0 0.5px 2px rgba(0,0,0,0.05)",
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.3s, transform 0.25s",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.04), 0 0.5px 2px rgba(0,0,0,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {accent && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: accent }} />
      )}
      {children}
    </div>
  );
}

// ─── PILL / BADGE ────────────────────────────────────────────────
function Pill({ children, color = "#f97316", style }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 14px",
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.4,
        color,
        background: color + "16",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ─── TOGGLE ──────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label
      style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}
    >
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: checked ? "linear-gradient(135deg, #f97316, #fb923c)" : "#d4d4d8",
          position: "relative",
          transition: "background 0.25s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 3,
            left: checked ? 23 : 3,
            transition: "left 0.25s",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          }}
        />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#52525b" }}>{label}</span>
    </label>
  );
}

// ─── WAIVER TOGGLE ───────────────────────────────────────────────
function WaiverToggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        userSelect: "none",
        padding: "5px 12px",
        borderRadius: 100,
        background: checked ? "linear-gradient(135deg, #e11d48, #f43f5e)" : "#f4f4f5",
        transition: "all 0.25s",
        border: `1.5px solid ${checked ? "#e11d48" : "#d4d4d8"}`,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: checked ? "#fff" : "#71717a", letterSpacing: 0.3 }}>
        {checked ? "WAIVED" : "Waive"}
      </span>
    </div>
  );
}

// ─── SELECT ──────────────────────────────────────────────────────
function Select({ value, onChange, options, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "1.5px solid #e4e4e7",
          fontSize: 14,
          fontWeight: 500,
          color: "#3f3f46",
          background: "#fafaf9",
          outline: "none",
          cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#f97316")}
        onBlur={(e) => (e.target.style.borderColor = "#e4e4e7")}
      >
        {options.map((o) => (
          <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── INPUT ───────────────────────────────────────────────────────
function Input({ value, onChange, label, prefix, suffix, placeholder, error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && (
          <span style={{ position: "absolute", left: 14, fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "0"}
          style={{
            width: "100%",
            padding: `10px ${suffix ? 44 : 14}px 10px ${prefix ? 34 : 14}px`,
            borderRadius: 12,
            border: `1.5px solid ${error ? "#e11d48" : "#e4e4e7"}`,
            fontSize: 14,
            fontWeight: 500,
            color: "#3f3f46",
            background: "#fafaf9",
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = error ? "#e11d48" : "#f97316")}
          onBlur={(e) => (e.target.style.borderColor = error ? "#e11d48" : "#e4e4e7")}
        />
        {suffix && (
          <span style={{ position: "absolute", right: 14, fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <span style={{ fontSize: 11, color: "#e11d48", fontWeight: 500 }}>{error}</span>
      )}
    </div>
  );
}

// ─── SCORE CARD (ticket stub) ────────────────────────────────────
function ScoreCard({ label, score, max, detail, color = "#f97316" }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.3s, transform 0.25s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.04)"; }}
    >
      <div style={{ background: color, padding: "10px 16px", textAlign: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ borderTop: `2px dashed ${color}25` }} />
      <div style={{ padding: "16px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
          <span style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>/ {max}</span>
        </div>
        <div style={{ fontSize: 11, color: "#71717a", marginTop: 8, lineHeight: 1.4 }}>{detail}</div>
      </div>
    </div>
  );
}

// ─── CHECK ROW (segmentation indicator) ──────────────────────────
function CheckRow({ checked, onChange, label, points }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        cursor: "pointer",
        userSelect: "none",
        background: checked ? "#f0fdf4" : "#fafaf9",
        border: `1.5px solid ${checked ? "#bbf7d0" : "#e4e4e7"}`,
        transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: checked ? "#16a34a" : "#fff",
            border: `1.5px solid ${checked ? "#16a34a" : "#d4d4d8"}`,
            transition: "all 0.2s",
          }}
        >
          {checked && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          )}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#3f3f46" }}>{label}</span>
      </div>
      {typeof points === "number" && (
        <span style={{ fontSize: 11, fontWeight: 700, color: checked ? "#16a34a" : "#a1a1aa" }}>+{points}</span>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═════════════════════════════════════════════════════════════════
export default function App() {
  // ── Deal Value (pricing) state — UNCHANGED ──
  const [model, setModel] = useState("ticket");
  const [country, setCountry] = useState("Thailand");
  const [customPricing, setCustomPricing] = useState(false);

  const [ticketVolume, setTicketVolume] = useState("");
  const [offlineInput, setOfflineInput] = useState("");
  const [offlineMode, setOfflineMode] = useState("percent"); // "percent" or "number"
  const [offlineFeeInput, setOfflineFeeInput] = useState("0.3");
  const [waiveOffline, setWaiveOffline] = useState(true);
  const [gmv, setGmv] = useState("");
  const [revenue, setRevenue] = useState("");
  const [ticketFeeInput, setTicketFeeInput] = useState("0.3");
  const [revShareInput, setRevShareInput] = useState("3");
  const [implFeeInput, setImplFeeInput] = useState("150");
  const [monthlyFeeInput, setMonthlyFeeInput] = useState("60");
  const [waiveImpl, setWaiveImpl] = useState(false);
  const [waiveMonths, setWaiveMonths] = useState(0); // 0-12 months waived
  const [waiveVariable, setWaiveVariable] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // ── Commercial Score V2 state ──
  const [operatorType, setOperatorType] = useState("Operator"); // Operator | Agency
  const [customerType, setCustomerType] = useState("new"); // existing | new (default New)

  // Deal Value input
  //   Existing: manual Actual MONTHLY Revenue (annualized × 12).
  //   New:      pulled from the Deal Value Calculator (calc.deal) — not typed here.
  const [monthlyRevenue, setMonthlyRevenue] = useState(""); // existing only

  // Top Route / Demand Signal (New only)
  const [demandSignal, setDemandSignal] = useState("none"); // none | demand | topRoute

  // Expansion Potential — 3 criteria
  const [expFleet, setExpFleet] = useState(false);
  const [expPosKiosk, setExpPosKiosk] = useState(false);
  const [expMultiRoute, setExpMultiRoute] = useState(false);

  // Strategic Value — 3 criteria
  const [stratMarquee, setStratMarquee] = useState(false);
  const [stratCaseStudy, setStratCaseStudy] = useState(false);
  const [stratMarketLeverage, setStratMarketLeverage] = useState(false);

  // ── Deal Value derived (UNCHANGED) ──
  const countryOverride = COUNTRY_OVERRIDES[country] || {};
  const defaultMonthlyFee = countryOverride.monthlyFee ?? DEFAULTS.monthlyFee;
  const isMonthlyFixed = countryOverride.monthlyFee != null;

  useEffect(() => {
    const override = COUNTRY_OVERRIDES[country];
    setMonthlyFeeInput(String(override?.monthlyFee ?? DEFAULTS.monthlyFee));
  }, [country]);

  const ticketFee = waiveVariable ? 0 : (customPricing ? safe(ticketFeeInput) : DEFAULTS.ticketFee);
  const offlineFee = waiveOffline ? 0 : (customPricing ? safe(offlineFeeInput) : DEFAULTS.ticketFee);
  const revShare = waiveVariable ? 0 : (customPricing
    ? Math.min(100, Math.max(0, safe(revShareInput)))
    : DEFAULTS.revenueShare);
  const implFee = waiveImpl ? 0 : (customPricing ? safe(implFeeInput) : DEFAULTS.implementationFee);
  const monthlyFeeRate = customPricing ? safe(monthlyFeeInput) : (isMonthlyFixed ? defaultMonthlyFee : DEFAULTS.monthlyFee);
  const paidMonths = 12 - waiveMonths;
  const monthlyTotal = monthlyFeeRate * paidMonths;
  const fixedFee = implFee + monthlyTotal;
  const hasAnyWaiver = waiveImpl || waiveMonths > 0 || waiveVariable || waiveOffline;

  const onlineVol = safe(ticketVolume);
  const offlinePct = offlineMode === "percent" ? Math.min(99.9, Math.max(0, safe(offlineInput))) : 0;
  const offlineVol = offlineMode === "percent"
    ? (offlinePct > 0 && onlineVol > 0 ? Math.round(onlineVol / (1 - offlinePct / 100) - onlineVol) : 0)
    : safe(offlineInput);
  const totalVol = onlineVol + offlineVol;

  const gmvError =
    safe(gmv) > 0 && safe(revenue) > safe(gmv)
      ? "Revenue cannot exceed GMV"
      : "";

  const calc = useMemo(() => {
    if (model === "ticket") {
      const onlineVar = onlineVol * ticketFee;
      const offlineVar = offlineVol * offlineFee;
      const variable = onlineVar + offlineVar;
      return { variable, onlineVar, offlineVar, fixed: fixedFee, deal: variable + fixedFee, vol: totalVol, onlineVol, offlineVol, implFee, monthlyFeeRate, paidMonths, waiveMonths, monthlyTotal };
    } else {
      const g = safe(gmv);
      const r = Math.min(safe(revenue), g);
      const variable = (g - r) * (revShare / 100);
      return { variable, onlineVar: 0, offlineVar: 0, fixed: fixedFee, deal: variable + fixedFee, vol: totalVol, onlineVol, offlineVol, g, r, implFee, monthlyFeeRate, paidMonths, waiveMonths, monthlyTotal };
    }
  }, [model, onlineVol, offlineVol, totalVol, gmv, revenue, ticketFee, offlineFee, revShare, fixedFee, implFee, monthlyFeeRate, paidMonths, waiveMonths, monthlyTotal]);

  // ─── COMMERCIAL SCORE V2 (Existing / New) ──────────────────────
  const seg = useMemo(() => {
    const isNew = customerType === "new";
    const W = WEIGHTS[isNew ? "new" : "existing"];

    // Deal Value — Existing: manual annual revenue.
    //               New: pulled from the Deal Value Calculator (calc.deal).
    const annualDealValue = isNew ? calc.deal : safe(monthlyRevenue) * 12;
    const dealFrac = getFrac(DEAL_VALUE_TIERS, annualDealValue);
    const dealScore = Math.round(dealFrac * W.deal);

    // Top Route / Demand Signal — New only
    const demandFrac = (DEMAND_SIGNAL_LEVELS.find((l) => l.value === demandSignal) || DEMAND_SIGNAL_LEVELS[0]).frac;
    const topRouteScore = isNew ? Math.round(demandFrac * W.topRoute) : 0;

    // Expansion Potential — raw 0–30, normalized to weight
    const expansionRaw =
      (expFleet ? 10 : 0) + (expPosKiosk ? 10 : 0) + (expMultiRoute ? 10 : 0);
    const expansionScore = Math.round((expansionRaw / EXPANSION_RAW_MAX) * W.expansion);

    // Strategic Value — raw 0–15, normalized to weight
    const strategicRaw =
      (stratMarquee ? 5 : 0) + (stratCaseStudy ? 5 : 0) + (stratMarketLeverage ? 5 : 0);
    const strategicScore = Math.round((strategicRaw / STRATEGIC_RAW_MAX) * W.strategic);

    const total = dealScore + topRouteScore + expansionScore + strategicScore;

    // Factor list for cards / chips (order + colors)
    const factors = [
      { key: "deal", label: isNew ? "Proj. Deal Value" : "Deal Value", score: dealScore, max: W.deal, color: "#14b8a6" },
      ...(isNew ? [{ key: "topRoute", label: "Demand Signal", score: topRouteScore, max: W.topRoute, color: "#a855f7" }] : []),
      { key: "expansion", label: "Expansion", score: expansionScore, max: W.expansion, color: "#f97316" },
      { key: "strategic", label: "Strategic", score: strategicScore, max: W.strategic, color: "#7c3aed" },
    ];

    // Segment band
    const band = SEGMENT_BANDS.find((b) => total >= b.min).name;

    // Travel Agency Rule — auto Dormant
    const isAgency = operatorType === "Agency";
    const segment = isAgency ? "Dormant" : band;

    return {
      isNew, W, annualDealValue, dealScore, topRouteScore,
      expansionRaw, expansionScore, strategicRaw, strategicScore,
      factors, total, band, segment, isAgency,
    };
  }, [
    customerType, monthlyRevenue, calc.deal,
    demandSignal, expFleet, expPosKiosk, expMultiRoute,
    stratMarquee, stratCaseStudy, stratMarketLeverage, operatorType,
  ]);

  // ─── DEAL VALUE FORMULA STRING (UNCHANGED) ─────────────────────
  const formula = useMemo(() => {
    const monthlyLabel = waiveMonths > 0
      ? `Monthly Fee (${fmt(monthlyFeeRate)} × ${paidMonths} mo, ${waiveMonths} waived)`
      : `Monthly Fee (${fmt(monthlyFeeRate)} × 12)`;
    const monthlyWaived = waiveMonths >= 12;

    if (model === "ticket") {
      return {
        varLines: [
          {
            label: "Travelier Online Conv. Fee",
            line: waiveVariable ? "WAIVED" : `${fmt(onlineVol)} tix × ${ticketFee} USD`,
            value: calc.onlineVar,
            waived: waiveVariable,
          },
          ...(offlineVol > 0 ? [{
            label: "Offline Convenience Fee",
            line: waiveOffline ? "WAIVED" : `${fmt(offlineVol)} tix × ${offlineFee} USD`,
            value: calc.offlineVar,
            waived: waiveOffline,
          }] : []),
        ],
        fixedLines: [
          { label: "Implementation Fee", value: implFee, waived: waiveImpl },
          { label: monthlyLabel, value: monthlyTotal, waived: monthlyWaived, partialWaive: waiveMonths > 0 && waiveMonths < 12 },
        ],
        total: calc.deal,
      };
    } else {
      const g = safe(gmv);
      const r = Math.min(safe(revenue), g);
      return {
        varLines: [
          {
            label: "Percentage Commission",
            line: waiveVariable ? "WAIVED" : `(${fmt(g)} − ${fmt(r)}) × ${revShare}%`,
            value: calc.variable,
            waived: waiveVariable,
          },
        ],
        fixedLines: [
          { label: "Implementation Fee", value: implFee, waived: waiveImpl },
          { label: monthlyLabel, value: monthlyTotal, waived: monthlyWaived, partialWaive: waiveMonths > 0 && waiveMonths < 12 },
        ],
        total: calc.deal,
      };
    }
  }, [model, onlineVol, offlineVol, gmv, revenue, ticketFee, offlineFee, revShare, calc, implFee, monthlyFeeRate, monthlyTotal, paidMonths, waiveMonths, waiveImpl, waiveVariable, waiveOffline]);

  // Comparison (default vs custom/waived) — UNCHANGED
  const comparison = useMemo(() => {
    if (!customPricing && !hasAnyWaiver) return null;
    const defFixed = DEFAULTS.implementationFee + (DEFAULTS.monthlyFee * 12);
    const custFixed = fixedFee;
    if (model === "ticket") {
      const defVar = onlineVol * DEFAULTS.ticketFee + offlineVol * DEFAULTS.ticketFee;
      const custVar = onlineVol * ticketFee + offlineVol * offlineFee;
      return {
        default: defVar + defFixed,
        custom: custVar + custFixed,
        diff: (custVar + custFixed) - (defVar + defFixed),
      };
    } else {
      const g = safe(gmv);
      const r = Math.min(safe(revenue), g);
      const defVar = (g - r) * (DEFAULTS.revenueShare / 100);
      const custVar = (g - r) * (revShare / 100);
      return {
        default: defVar + defFixed,
        custom: custVar + custFixed,
        diff: (custVar + custFixed) - (defVar + defFixed),
      };
    }
  }, [customPricing, hasAnyWaiver, model, onlineVol, offlineVol, gmv, revenue, ticketFee, offlineFee, revShare, fixedFee]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=JetBrains+Mono:wght@500;700&display=swap');
        @keyframes seatFloat { 0%{transform:translateY(0) scale(1)} 100%{transform:translateY(-18px) scale(1.04)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; margin:0; padding:0; }
        body { background: #f5f0eb; -webkit-text-size-adjust: 100%; }
        @media (max-width: 860px) {
          body { font-size: 14px; }
        }
      `}</style>

      <Shapes />

      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          minHeight: "100vh",
          background: "linear-gradient(160deg, #f5f0eb 0%, #ede7df 40%, #f0ebe4 100%)",
          color: "#27272a",
          position: "relative",
          zIndex: 1,
          padding: "0 16px 60px",
        }}
      >
        {/* ─── HEADER ───────────────────────────────────────── */}
        <div
          style={{
            background: "#fff",
            borderBottom: "4px solid #F5A623",
            marginBottom: 24,
            marginLeft: -16,
            marginRight: -16,
          }}
        >
          <header
            style={{
              maxWidth: 1120,
              margin: "0 auto",
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <b style={{ fontSize: 16, display: "block", color: "#1A1A1A" }}>
                SeatOS Commercial Segmentation
              </b>
              <span style={{ fontSize: 11, color: "#8E8E93" }}>
                Score deal value & classify customers (High / Mid / Low / Dormant) — Commercial Score V2
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <a
                href="https://lookerstudio.google.com/u/0/reporting/7b91397c-d7f0-46ce-b9f4-5a83d7ee5e84/page/p_c022vx2fsd"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 22px",
                  borderRadius: 50,
                  border: "none",
                  background: "#F5EFE7",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1A1A1A",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#E8E2D9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#F5EFE7"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 4-6"/></svg>
                View Data
              </a>
            </div>
          </header>
        </div>

        {/* ─── MAIN GRID ──────────────────────────────────────── */}
        <div
          className="grid-main"
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: 24,
            animation: "fadeUp 0.6s ease-out",
          }}
        >
          {/* ─── LEFT COLUMN ────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* DEAL VALUE CARD — UNCHANGED PRICING LOGIC */}
            <Card accent="linear-gradient(90deg, #f97316, #fb923c)">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 22,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    Deal Value Calculator
                  </div>
                  <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
                    Estimate deal value based on pricing model
                  </div>
                </div>
                <Pill color={hasAnyWaiver ? "#e11d48" : customPricing ? "#ea580c" : "#16a34a"}>
                  {hasAnyWaiver ? "Waiver Applied" : customPricing ? "Custom Pricing" : "Default Pricing"}
                </Pill>
              </div>

              {/* Model + Country row */}
              <div
                className="grid-2col"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}
              >
                <Select
                  label="Pricing Model"
                  value={model}
                  onChange={setModel}
                  options={[
                    { value: "ticket", label: "Per Ticket" },
                    { value: "gmv", label: "Percentage Commission" },
                  ]}
                />
                <Select
                  label="Country / Region"
                  value={country}
                  onChange={setCountry}
                  options={Object.keys(REGIONS)}
                />
              </div>

              {/* Inputs */}
              {model === "ticket" ? (
                <div style={{ marginBottom: 18 }}>
                  <div
                    className="grid-2col"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 6 }}
                  >
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase" }}>
                      Online Ticket Volume (past 12 months)
                    </label>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase" }}>
                        {offlineMode === "percent" ? "Offline Ticket %" : "Offline Ticket Volume"}
                      </label>
                      <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid #e4e4e7" }}>
                        {["percent", "number"].map((m) => (
                          <div
                            key={m}
                            onClick={() => setOfflineMode(m)}
                            style={{
                              padding: "3px 10px",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              background: offlineMode === m ? "#f97316" : "#fafaf9",
                              color: offlineMode === m ? "#fff" : "#71717a",
                              transition: "all 0.2s",
                            }}
                          >
                            {m === "percent" ? "%" : "#"}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div
                    className="grid-2col"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ticketVolume}
                      onChange={(e) => setTicketVolume(e.target.value)}
                      placeholder="e.g. 5000"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1.5px solid #e4e4e7",
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#3f3f46",
                        background: "#fafaf9",
                        outline: "none",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#f97316")}
                      onBlur={(e) => (e.target.style.borderColor = "#e4e4e7")}
                    />
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={offlineInput}
                        onChange={(e) => setOfflineInput(e.target.value)}
                        placeholder={offlineMode === "percent" ? "e.g. 80" : "e.g. 20000"}
                        style={{
                          width: "100%",
                          padding: `10px ${offlineMode === "percent" ? 44 : 14}px 10px 14px`,
                          borderRadius: 12,
                          border: "1.5px solid #e4e4e7",
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#3f3f46",
                          background: "#fafaf9",
                          outline: "none",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#f97316")}
                        onBlur={(e) => (e.target.style.borderColor = "#e4e4e7")}
                      />
                      {offlineMode === "percent" && (
                        <span style={{ position: "absolute", right: 14, fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>%</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="grid-3col"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 18, alignItems: "end" }}
                >
                  <Input label="Travelier GMV (past 12 months, USD)" value={gmv} onChange={setGmv} prefix="$" />
                  <Input label="Travelier Revenue (past 12 months, USD)" value={revenue} onChange={setRevenue} prefix="$" error={gmvError} />
                  <Input label="Travelier Online Ticket Volume (past 12 months)" value={ticketVolume} onChange={setTicketVolume} placeholder="e.g. 50000" />
                </div>
              )}

              {/* Ticket Volume Summary */}
              {(offlineVol > 0 || safe(offlineInput) > 0) && (
                <div style={{
                  display: "flex", gap: 12, marginBottom: 18, padding: "10px 16px",
                  background: "#f5f3ff", borderRadius: 12, border: "1px solid #e9d5ff",
                  fontSize: 13, alignItems: "center", flexWrap: "wrap",
                }}>
                  <span style={{ color: "#7c3aed", fontWeight: 700 }}>Ticket Summary (12 months)</span>
                  <span style={{ color: "#52525b" }}>Travelier Online: <strong>{fmt(onlineVol)}</strong></span>
                  <span style={{ color: "#d4d4d8" }}>+</span>
                  <span style={{ color: "#52525b" }}>Offline: <strong>{fmt(offlineVol)}</strong>{offlineMode === "percent" && ` (${safe(offlineInput)}%)`}</span>
                  <span style={{ color: "#d4d4d8" }}>=</span>
                  <span style={{ color: "#7c3aed", fontWeight: 800, fontSize: 15 }}>Total: {fmt(totalVol)}</span>
                </div>
              )}

              {/* Custom pricing & Waivers */}
              <div style={{ padding: "14px 18px", background: "#fafaf9", borderRadius: 14, marginBottom: 18 }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <Toggle checked={customPricing} onChange={setCustomPricing} label="Use Custom Pricing" />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                  {/* Implementation Fee row */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center",
                    padding: "10px 14px", background: waiveImpl ? "#fef2f2" : "#fff", borderRadius: 10,
                    border: `1px solid ${waiveImpl ? "#fecdd3" : "#e4e4e7"}`, transition: "all 0.2s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {customPricing && !waiveImpl ? (
                        <Input label="Implementation Fee" value={implFeeInput} onChange={setImplFeeInput} prefix="$" placeholder="150" />
                      ) : (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>Implementation Fee</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: waiveImpl ? "#e11d48" : "#3f3f46", textDecoration: waiveImpl ? "line-through" : "none" }}>
                            {fmtUSD(DEFAULTS.implementationFee)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div><WaiverToggle checked={waiveImpl} onChange={setWaiveImpl} /></div>
                  </div>

                  {/* Monthly Fee row */}
                  <div style={{
                    padding: "10px 14px",
                    background: waiveMonths > 0 ? (waiveMonths >= 12 ? "#fef2f2" : "#fffbeb") : (isMonthlyFixed && !customPricing) ? "#f0f9ff" : "#fff",
                    borderRadius: 10,
                    border: `1px solid ${waiveMonths >= 12 ? "#fecdd3" : waiveMonths > 0 ? "#fde68a" : (isMonthlyFixed && !customPricing) ? "#bae6fd" : "#e4e4e7"}`,
                    transition: "all 0.2s",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>Monthly Fee</div>
                        </div>
                        {customPricing ? (
                          <div style={{ marginTop: 2 }}>
                            <Input label="" value={monthlyFeeInput} onChange={setMonthlyFeeInput} prefix="$" suffix="/mo" placeholder={isMonthlyFixed ? String(defaultMonthlyFee) : "60"} />
                          </div>
                        ) : (
                          <div style={{ fontSize: 16, fontWeight: 700, color: waiveMonths >= 12 ? "#e11d48" : "#3f3f46", textDecoration: waiveMonths >= 12 ? "line-through" : "none" }}>
                            {fmtUSD(monthlyFeeRate)}<span style={{ fontSize: 12, fontWeight: 500, color: "#a1a1aa" }}> /mo</span>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", marginBottom: 4 }}>12-month total</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: waiveMonths >= 12 ? "#e11d48" : waiveMonths > 0 ? "#d97706" : "#3f3f46" }}>
                          {fmtUSD(monthlyTotal)}
                        </div>
                        {waiveMonths > 0 && waiveMonths < 12 && (
                          <div style={{ fontSize: 11, color: "#d97706", fontWeight: 600, marginTop: 2 }}>
                            saved {fmtUSD(monthlyFeeRate * waiveMonths)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      background: waiveMonths > 0 ? (waiveMonths >= 12 ? "#fef2f2" : "#fffbeb") : "#f4f4f5",
                      borderRadius: 8, padding: "8px 10px", transition: "background 0.2s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: waiveMonths > 0 ? (waiveMonths >= 12 ? "#e11d48" : "#d97706") : "#71717a", letterSpacing: 0.3 }}>
                          {waiveMonths === 0 ? "Waive months" : waiveMonths >= 12 ? `All 12 months waived` : `${waiveMonths} month${waiveMonths > 1 ? "s" : ""} waived`}
                        </span>
                        {waiveMonths > 0 && (
                          <span onClick={() => setWaiveMonths(0)} style={{ fontSize: 10, fontWeight: 700, color: "#71717a", cursor: "pointer", padding: "2px 8px", borderRadius: 100, background: "#e4e4e7" }}>
                            Reset
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 3 }}>
                        {Array.from({ length: 13 }, (_, i) => (
                          <div
                            key={i}
                            onClick={() => setWaiveMonths(i)}
                            style={{
                              flex: 1, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                              background: i === waiveMonths
                                ? (i === 0 ? "#3f3f46" : i >= 12 ? "#e11d48" : "#d97706")
                                : i <= waiveMonths ? (i >= 12 ? "#fecdd3" : "#fde68a") : "#e4e4e7",
                              color: i === waiveMonths ? "#fff" : i <= waiveMonths && i > 0 ? (i >= 12 ? "#e11d48" : "#92400e") : "#71717a",
                              border: `1.5px solid ${i === waiveMonths ? "transparent" : "transparent"}`,
                            }}
                          >
                            {i}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 9, color: "#a1a1aa" }}>No waiver</span>
                        <span style={{ fontSize: 9, color: "#a1a1aa" }}>Full waiver</span>
                      </div>
                    </div>
                  </div>

                  {/* Travelier Online Conv. Fee / Commission row */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center",
                    padding: "10px 14px", background: waiveVariable ? "#fef2f2" : "#fff", borderRadius: 10,
                    border: `1px solid ${waiveVariable ? "#fecdd3" : "#e4e4e7"}`, transition: "all 0.2s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {customPricing && !waiveVariable ? (
                        model === "ticket" ? (
                          <Input label="Travelier Online Conv. Fee" value={ticketFeeInput} onChange={setTicketFeeInput} prefix="$" suffix="/tkt" />
                        ) : (
                          <Input label="Percentage Commission" value={revShareInput} onChange={setRevShareInput} suffix="%" />
                        )
                      ) : (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>
                            {model === "ticket" ? "Travelier Online Conv. Fee" : "Percentage Commission"}
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: waiveVariable ? "#e11d48" : "#3f3f46", textDecoration: waiveVariable ? "line-through" : "none" }}>
                            {model === "ticket" ? `${DEFAULTS.ticketFee} USD /ticket` : `${DEFAULTS.revenueShare}%`}
                          </div>
                        </div>
                      )}
                    </div>
                    <div><WaiverToggle checked={waiveVariable} onChange={setWaiveVariable} /></div>
                  </div>

                  {/* Offline Convenience Fee row (always visible in ticket model) */}
                  {model === "ticket" && (
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center",
                      padding: "10px 14px", background: waiveOffline ? "#fef2f2" : "#fff", borderRadius: 10,
                      border: `1px solid ${waiveOffline ? "#fecdd3" : "#e4e4e7"}`, transition: "all 0.2s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {customPricing && !waiveOffline ? (
                          <Input label="Offline Convenience Fee" value={offlineFeeInput} onChange={setOfflineFeeInput} prefix="$" suffix="/tkt" />
                        ) : (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>
                              Offline Convenience Fee
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: waiveOffline ? "#e11d48" : "#3f3f46", textDecoration: waiveOffline ? "line-through" : "none" }}>
                              {waiveOffline ? `${DEFAULTS.ticketFee} USD /ticket` : `${offlineFee} USD /ticket`}
                            </div>
                          </div>
                        )}
                      </div>
                      <div><WaiverToggle checked={waiveOffline} onChange={setWaiveOffline} /></div>
                    </div>
                  )}
                </div>

                {hasAnyWaiver && (
                  <div style={{ marginTop: 12, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#e11d48", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>⚠</span>
                    Waived: {[
                      waiveImpl && "Implementation Fee",
                      waiveMonths > 0 && (waiveMonths >= 12 ? "Monthly Fee (all 12 mo)" : `Monthly Fee (${waiveMonths} mo)`),
                      waiveVariable && (model === "ticket" ? "Travelier Online Conv. Fee" : "Percentage Commission"),
                      waiveOffline && "Offline Conv. Fee"
                    ].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>

              {/* Formula */}
              <div style={{ background: "linear-gradient(135deg, #1c1917 0%, #292524 100%)", borderRadius: 14, padding: "20px 24px", color: "#fafaf9" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 14 }}>
                  Calculation Breakdown
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {formula.varLines.map((vl, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: vl.waived ? 0.5 : 1 }}>
                        <span style={{ fontSize: 13, color: "#a8a29e", textDecoration: vl.waived ? "line-through" : "none" }}>{vl.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, textDecoration: vl.waived ? "line-through" : "none" }}>{vl.line}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: 12 }}>
                        <span style={{ fontSize: 12, color: "#78716c" }}></span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: vl.waived ? "#78716c" : "#fb923c" }}>= {vl.waived ? "0 USD (waived)" : fmtUSD(vl.value)}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ height: 1, background: "#3f3f46", margin: "4px 0" }} />
                  {formula.fixedLines.map((fl, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: fl.waived ? 0.5 : 1 }}>
                      <span style={{ fontSize: 13, color: fl.partialWaive ? "#fbbf24" : "#a8a29e", textDecoration: fl.waived ? "line-through" : "none" }}>{fl.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: fl.partialWaive ? "#fbbf24" : "inherit", textDecoration: fl.waived ? "line-through" : "none" }}>{fl.waived ? "0 USD (waived)" : fmtUSD(fl.value)}</span>
                    </div>
                  ))}
                  <div style={{ height: 1, background: "#3f3f46", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#a8a29e" }}>Fixed Fees Subtotal</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtUSD(fixedFee)}</span>
                  </div>
                </div>
                <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fafaf9" }}>Deal Value</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#fb923c" }}>{fmtUSD(formula.total)}</span>
                </div>
              </div>

              {/* Comparison */}
              {comparison && (
                <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                  <div style={{ background: "#fafaf9", borderRadius: 12, padding: "14px 18px", border: "1.5px solid #e4e4e7" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 }}>Default Pricing</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#52525b" }}>{fmtUSD(comparison.default)}</div>
                  </div>
                  <div style={{
                    background: comparison.diff >= 0 ? "linear-gradient(135deg, #f0fdf4, #dcfce7)" : "linear-gradient(135deg, #fff1f2, #ffe4e6)",
                    borderRadius: 12, padding: "14px 18px", border: `1.5px solid ${comparison.diff >= 0 ? "#bbf7d0" : "#fecdd3"}`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 }}>
                      Custom Pricing ({comparison.diff >= 0 ? "+" : ""}{fmt(comparison.diff)})
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: comparison.diff >= 0 ? "#16a34a" : "#e11d48" }}>{fmtUSD(comparison.custom)}</div>
                  </div>
                </div>
              )}
            </Card>

            {/* COMMERCIAL SCORE CARDS (V2) */}
            <div className="grid-scores" style={{ display: "grid", gridTemplateColumns: seg.isNew ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 16 }}>
              {seg.factors.map((f) => (
                <ScoreCard
                  key={f.key}
                  label={f.label}
                  score={f.score}
                  max={f.max}
                  detail={
                    f.key === "deal"
                      ? fmtUSD(seg.annualDealValue)
                      : f.key === "topRoute"
                      ? (DEMAND_SIGNAL_LEVELS.find((l) => l.value === demandSignal) || {}).label
                      : f.key === "expansion"
                      ? `${seg.expansionRaw / 10} of 3 selected`
                      : `${seg.strategicRaw / 5} of 3 selected`
                  }
                  color={f.color}
                />
              ))}
            </div>
          </div>

          {/* ─── RIGHT COLUMN ───────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* SEGMENT INPUTS */}
            <Card accent="linear-gradient(90deg, #a855f7, #7c3aed)">
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                Segmentation Inputs
              </div>
              <div style={{ fontSize: 12, color: "#71717a", marginBottom: 18 }}>
                SeatOS Commercial Score V2 · {seg.isNew
                  ? "New: Deal 35 / Demand 30 / Exp 20 / Strat 15"
                  : "Existing: Deal 50 / Exp 30 / Strat 20"}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Select label="Operator Type" value={operatorType} onChange={setOperatorType} options={["Operator", "Agency"]} />
                  <Select label="Customer Type" value={customerType} onChange={setCustomerType} options={[{ value: "existing", label: "Existing" }, { value: "new", label: "New" }]} />
                </div>

                {seg.isAgency && (
                  <div style={{ padding: "10px 14px", background: "#f4f4f5", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "#52525b", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>ℹ</span>
                    Travel Agency Rule — auto-classified <strong>Dormant</strong> (reactive only), regardless of score.
                  </div>
                )}

                {/* ── DEAL VALUE ── */}
                <div style={{ borderTop: "1px solid #f4f4f5", paddingTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#14b8a6" }}>{seg.isNew ? "Projected Deal Value" : "Deal Value / Revenue"} <span style={{ color: "#a1a1aa", fontWeight: 600 }}>· {seg.W.deal} pts</span></div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa" }}>{seg.dealScore}/{seg.W.deal} pts</span>
                  </div>
                  {customerType === "existing" ? (
                    <>
                      <Input label="Actual Monthly Revenue (USD)" value={monthlyRevenue} onChange={setMonthlyRevenue} prefix="$" placeholder="e.g. 4000" />
                      <div style={{ marginTop: 8, fontSize: 12, color: "#52525b" }}>
                        Annualized (× 12): <strong style={{ color: "#14b8a6" }}>{fmtUSD(seg.annualDealValue)}</strong>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: "12px 14px", background: "#f0fdfa", borderRadius: 10, border: "1px solid #99f6e4" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#0d9488", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>
                        Projected Deal Value
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#14b8a6" }}>{fmtUSD(seg.annualDealValue)}</div>
                    </div>
                  )}
                </div>

                {/* ── TRAVELIER DEMAND SIGNAL (New only) ── */}
                {seg.isNew && (
                  <div style={{ borderTop: "1px solid #f4f4f5", paddingTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#a855f7" }}>Travelier Demand Signal <span style={{ color: "#a1a1aa", fontWeight: 600 }}>· {seg.W.topRoute} pts</span></div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa" }}>{seg.topRouteScore}/{seg.W.topRoute} pts</span>
                    </div>
                    <Select label="Demand Signal Strength" value={demandSignal} onChange={setDemandSignal} options={DEMAND_SIGNAL_LEVELS.map((l) => ({ value: l.value, label: l.label }))} />
                  </div>
                )}

                {/* ── EXPANSION ── */}
                <div style={{ borderTop: "1px solid #f4f4f5", paddingTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#f97316" }}>Expansion Potential <span style={{ color: "#a1a1aa", fontWeight: 600 }}>· {seg.W.expansion} pts</span></div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa" }}>{seg.expansionScore}/{seg.W.expansion} pts</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <CheckRow checked={expFleet} onChange={setExpFleet} label="Fleet > 20" points={10} />
                    <CheckRow checked={expPosKiosk} onChange={setExpPosKiosk} label="POS / Kiosk / White-label opportunity" points={10} />
                    <CheckRow checked={expMultiRoute} onChange={setExpMultiRoute} label="Multi-route / multi-branch potential" points={10} />
                  </div>
                </div>

                {/* ── STRATEGIC ── */}
                <div style={{ borderTop: "1px solid #f4f4f5", paddingTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#7c3aed" }}>Strategic Value <span style={{ color: "#a1a1aa", fontWeight: 600 }}>· {seg.W.strategic} pts</span></div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa" }}>{seg.strategicScore}/{seg.W.strategic} pts</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <CheckRow checked={stratMarquee} onChange={setStratMarquee} label="Marquee Brand" points={5} />
                    <CheckRow checked={stratCaseStudy} onChange={setStratCaseStudy} label="Case Study Potential" points={5} />
                    <CheckRow checked={stratMarketLeverage} onChange={setStratMarketLeverage} label="Market Leverage" points={5} />
                  </div>
                </div>
              </div>
            </Card>

            {/* TOTAL SCORE */}
            <Card style={{ textAlign: "center" }} accent="linear-gradient(90deg, #14b8a6, #0d9488)">
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>
                Total Commercial Score
              </div>
              <div style={{ fontSize: 52, fontWeight: 800, color: "#27272a", lineHeight: 1 }}>
                <AnimNum value={seg.total} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#a1a1aa", marginTop: 4 }}>
                out of 100
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
                {seg.factors.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      minWidth: 36, height: 32, padding: "0 6px", borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 14, color: "#fff", background: s.color,
                    }}
                  >
                    {s.score}
                  </div>
                ))}
              </div>
            </Card>

            {/* FINAL SEGMENT (boarding pass) */}
            <div style={{ background: segmentBg(seg.segment), borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 20px rgba(0,0,0,0.05)" }}>
              <div style={{ background: segmentColor(seg.segment), padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: 1.5, textTransform: "uppercase" }}>Boarding Pass</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>SEGMENT</span>
              </div>
              <div style={{ borderTop: `2px dashed ${segmentColor(seg.segment)}25` }} />
              <div style={{ padding: "24px 28px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#71717a", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
                  Final Segment
                </div>
                <div style={{ fontSize: 52, fontWeight: 800, color: segmentColor(seg.segment), lineHeight: 1, letterSpacing: -1 }}>
                  {seg.segment}
                </div>
                <div style={{ marginTop: 14, fontSize: 13, fontWeight: 500, color: "#52525b", lineHeight: 1.6 }}>
                  {seg.isAgency
                    ? "Travel Agency — automatically classified as Dormant"
                    : `Assigned ${seg.segment} because total score is ${seg.total}`}
                </div>
                <div style={{ marginTop: 16, display: "inline-flex", padding: "6px 16px", borderRadius: 100, background: segmentColor(seg.segment) + "18", fontSize: 12, fontWeight: 700, color: segmentColor(seg.segment) }}>
                  {seg.isAgency
                    ? "Agency rule"
                    : seg.segment === "High" ? "80–100 points"
                    : seg.segment === "Mid" ? "50–79 points"
                    : seg.segment === "Low" ? "20–49 points"
                    : "0–19 points"}
                </div>
              </div>
            </div>

            {/* DEAL SUMMARY */}
            <Card accent="linear-gradient(90deg, #f97316, #ea580c)" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>
                Deal Value
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#ea580c", lineHeight: 1 }}>
                <AnimNum value={calc.deal} suffix=" USD" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14, fontSize: 12, color: "#71717a", textAlign: "left" }}>
                {[
                  ...(model === "ticket" ? [
                    { label: "Travelier Online Conv. Fee", value: calc.onlineVar, waived: waiveVariable },
                    ...(offlineVol > 0 ? [{ label: "Offline Conv. Fee", value: calc.offlineVar, waived: waiveOffline }] : []),
                  ] : [
                    { label: "Percentage Commission", value: calc.variable, waived: waiveVariable },
                  ]),
                  { label: "Implementation Fee", value: calc.implFee, waived: waiveImpl },
                  {
                    label: waiveMonths > 0 && waiveMonths < 12
                      ? `Monthly Fee (${fmt(calc.monthlyFeeRate)} × ${calc.paidMonths} mo)`
                      : `Monthly Fee (${fmt(calc.monthlyFeeRate)} × 12)`,
                    value: calc.monthlyTotal,
                    waived: waiveMonths >= 12,
                    partialWaive: waiveMonths > 0 && waiveMonths < 12,
                  },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", background: row.waived ? "#fef2f2" : row.partialWaive ? "#fffbeb" : i % 2 === 0 ? "#fafaf9" : "transparent", borderRadius: 6, opacity: row.waived ? 0.6 : 1 }}>
                    <span style={{ textDecoration: row.waived ? "line-through" : "none" }}>
                      {row.label}
                      {row.partialWaive && <span style={{ color: "#d97706", fontSize: 10, fontWeight: 700 }}> ({waiveMonths} mo waived)</span>}
                    </span>
                    <strong style={{ color: row.waived ? "#e11d48" : row.partialWaive ? "#d97706" : "#3f3f46" }}>{row.waived ? "Waived" : fmtUSD(row.value)}</strong>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ─── RESPONSIVE MOBILE STYLES ─────────────────── */}
        <style>{`
          @media (max-width: 860px) {
            .grid-main { grid-template-columns: 1fr !important; }
            .grid-2col { grid-template-columns: 1fr !important; }
            .grid-3col { grid-template-columns: 1fr !important; }
            .grid-4col { grid-template-columns: 1fr 1fr !important; }
            .grid-scores { grid-template-columns: 1fr 1fr !important; }
          }
          @media (max-width: 480px) {
            .grid-4col { grid-template-columns: 1fr !important; }
            .grid-scores { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* INSTRUCTIONS & LOGIC REFERENCE (Collapsible) */}
        <div style={{ maxWidth: 1120, margin: "48px auto 0" }}>
          <div
            onClick={() => setShowInstructions(!showInstructions)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "16px 28px", borderRadius: showInstructions ? "16px 16px 0 0" : 16,
              background: showInstructions ? "linear-gradient(135deg, #1c1917, #292524)" : "#fff",
              color: showInstructions ? "#fafaf9" : "#27272a", cursor: "pointer", userSelect: "none",
              boxShadow: "0 2px 24px rgba(0,0,0,0.05), 0 0.5px 2px rgba(0,0,0,0.06)", transition: "all 0.3s",
            }}
            onMouseEnter={(e) => { if (!showInstructions) { e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.09)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
            onMouseLeave={(e) => { if (!showInstructions) { e.currentTarget.style.boxShadow = "0 2px 24px rgba(0,0,0,0.05), 0 0.5px 2px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)"; } }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.3 }}>Instructions & Scoring Logic</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.3s", transform: showInstructions ? "rotate(180deg)" : "rotate(0)" }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>

          <div style={{ maxHeight: showInstructions ? 6000 : 0, overflow: "hidden", transition: "max-height 0.5s ease-in-out" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "28px 0 0", background: "transparent" }}>

              {/* FRAMEWORK OVERVIEW */}
              <Card accent="linear-gradient(90deg, #3b82f6, #60a5fa)">
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>SeatOS Commercial Score V2 (100 Points)</div>
                <div style={{ padding: "14px 18px", background: "#fafaf9", borderRadius: 12, marginBottom: 18, fontSize: 12, color: "#52525b", lineHeight: 1.8 }}>
                  <div style={{ fontWeight: 700, color: "#1c1917", marginBottom: 6 }}>Why Existing &amp; New are scored differently</div>
                  <div><strong>Existing</strong> — actual revenue already shows importance, so no need to re-score monthly tickets or Top Route. <strong>New</strong> — no real revenue yet, so <strong>Travelier Demand Signal</strong> carries its own heavy weight (30) as a proxy for future transaction potential.</div>
                </div>
                <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {[
                    { who: "Existing Operator", color: "#14b8a6", rows: [["Deal Value / Revenue", 50], ["Expansion Potential", 30], ["Strategic Value", 20]] },
                    { who: "New Operator", color: "#f97316", rows: [["Projected Deal Value", 35], ["Travelier Demand Signal", 30], ["Expansion Potential", 20], ["Strategic Value", 15]] },
                  ].map((col, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: col.color, marginBottom: 8 }}>{col.who}</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e4e4e7" }}>
                            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, color: "#71717a", fontSize: 11, textTransform: "uppercase" }}>Factor</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700, color: "#71717a", fontSize: 11, textTransform: "uppercase" }}>Weight</th>
                          </tr>
                        </thead>
                        <tbody>
                          {col.rows.map(([label, pts], j) => (
                            <tr key={j} style={{ borderBottom: "1px solid #f4f4f5" }}>
                              <td style={{ padding: "7px 8px" }}>{label}</td>
                              <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700, color: col.color }}>{pts}</td>
                            </tr>
                          ))}
                          <tr>
                            <td style={{ padding: "7px 8px", fontWeight: 800 }}>Total</td>
                            <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 800 }}>100</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </Card>

              {/* DEAL VALUE CALCULATION */}
              <Card accent="linear-gradient(90deg, #f97316, #fb923c)">
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Deal Value Calculation</div>
                <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div style={{ background: "#fafaf9", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f97316", marginBottom: 8 }}>Model 1: Per Ticket</div>
                    <div style={{ fontSize: 12, color: "#52525b", lineHeight: 1.8 }}>
                      <div><strong>Online Variable</strong> = Online Ticket Volume × Online Conv. Fee</div>
                      <div><strong>Offline Variable</strong> = Offline Ticket Volume × Offline Conv. Fee</div>
                      <div><strong>Fixed Fees</strong> = Implementation Fee + (Monthly Fee × 12)</div>
                      <div style={{ marginTop: 6, padding: "6px 10px", background: "#fff7ed", borderRadius: 8, fontWeight: 600, color: "#ea580c" }}>
                        Deal Value = Online Variable + Offline Variable + Fixed Fees
                      </div>
                    </div>
                  </div>
                  <div style={{ background: "#fafaf9", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f97316", marginBottom: 8 }}>Model 2: Percentage Commission</div>
                    <div style={{ fontSize: 12, color: "#52525b", lineHeight: 1.8 }}>
                      <div><strong>Variable Value</strong> = (GMV − Revenue) × Commission %</div>
                      <div><strong>Fixed Fees</strong> = Implementation Fee + (Monthly Fee × 12)</div>
                      <div style={{ marginTop: 6, padding: "6px 10px", background: "#fff7ed", borderRadius: 8, fontWeight: 600, color: "#ea580c" }}>
                        Deal Value = Variable Value + Fixed Fees
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 14, fontSize: 12, color: "#71717a", lineHeight: 1.7 }}>
                  Default fees: Implementation 150 USD · Monthly 60 USD/mo (Philippines 30 USD/mo) · Online Conv. Fee 0.3 USD/ticket or 3% commission · Offline Conv. Fee 0.3 USD/ticket (waived by default).
                </div>
              </Card>

              {/* 1. DEAL VALUE SCORE */}
              <Card accent="#14b8a6">
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>1. Deal Value Score (Existing 50 / New 35)</div>
                <div style={{ fontSize: 12, color: "#52525b", lineHeight: 1.8, marginBottom: 14 }}>
                  <div><strong>Existing operators:</strong> Actual Monthly Revenue × 12 (weight 50)</div>
                  <div><strong>New operators:</strong> Projected Deal Value is pulled from the <strong>Deal Value Calculator</strong> on the left (weight 35).</div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, maxWidth: 520 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e4e4e7" }}>
                      <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, color: "#71717a", fontSize: 11, textTransform: "uppercase" }}>Annual Value (USD)</th>
                      <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 700, color: "#71717a", fontSize: 11, textTransform: "uppercase" }}>Existing (50)</th>
                      <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 700, color: "#71717a", fontSize: 11, textTransform: "uppercase" }}>New (35)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["< 5,000", "0", "0"],
                      ["5,000 – 19,999", "15", "11"],
                      ["20,000 – 49,999", "30", "21"],
                      ["50,000 – 99,999", "40", "28"],
                      ["≥ 100,000", "50", "35"],
                    ].map(([range, ex, nw], i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f4f4f5" }}>
                        <td style={{ padding: "8px" }}>{range}</td>
                        <td style={{ padding: "8px", textAlign: "center", fontWeight: 700, color: "#14b8a6" }}>{ex}</td>
                        <td style={{ padding: "8px", textAlign: "center", fontWeight: 700, color: "#f97316" }}>{nw}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* 2. EXISTING VS NEW */}
              <Card accent="#e11d48">
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>2. Existing vs New — Why Different</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { who: "Existing Operator", rule: "Actual revenue already shows importance — no monthly tickets, no Top Route. Deal Value 50 / Expansion 30 / Strategic 20.", color: "#14b8a6", bg: "#f0fdfa" },
                    { who: "New Operator", rule: "No real revenue yet, so Travelier Demand Signal becomes its own heavy factor (30). Deal 35 / Demand 30 / Expansion 20 / Strategic 15.", color: "#f97316", bg: "#fff7ed" },
                    { who: "Travel Agency", rule: "Auto-classified Dormant / reactive only, regardless of score.", color: "#71717a", bg: "#f4f4f5" },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, padding: "10px 14px", background: r.bg, borderRadius: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: r.color }}>{r.who}</div>
                      <div style={{ fontSize: 12, color: "#52525b", lineHeight: 1.6 }}>{r.rule}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* 3 & 4. EXPANSION & STRATEGIC */}
              <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <Card accent="#f97316">
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>3. Expansion Potential (Existing 30 / New 20)</div>
                  <div style={{ fontSize: 12, color: "#52525b", lineHeight: 1.6, marginBottom: 10 }}>
                    Same 3 criteria for both. Top Route is <strong>not</strong> here (New: own factor · Existing: not scored).
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e4e4e7" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, color: "#71717a", fontSize: 11, textTransform: "uppercase" }}>Criteria</th>
                        <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 700, color: "#71717a", fontSize: 11, textTransform: "uppercase" }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Fleet > 20", "10"],
                        ["POS / Kiosk / White-label", "10"],
                        ["Multi-route / multi-branch potential", "10"],
                      ].map(([type, score], i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f4f4f5" }}>
                          <td style={{ padding: "7px 8px" }}>{type}</td>
                          <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 700, color: "#f97316" }}>{score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <Card accent="#7c3aed">
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>4. Strategic Value (Existing 20 / New 15)</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e4e4e7" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, color: "#71717a", fontSize: 11, textTransform: "uppercase" }}>Criteria</th>
                        <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 700, color: "#71717a", fontSize: 11, textTransform: "uppercase" }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Marquee Brand", "5"],
                        ["Case Study Potential", "5"],
                        ["Market Leverage", "5"],
                      ].map(([type, score], i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f4f4f5" }}>
                          <td style={{ padding: "8px" }}>{type}</td>
                          <td style={{ padding: "8px", textAlign: "center", fontWeight: 700, color: "#7c3aed" }}>{score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>

              {/* 5. SEGMENT MAPPING */}
              <Card accent="linear-gradient(90deg, #16a34a, #22c55e)">
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>5. Segment Mapping</div>
                <div className="grid-4col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                  {[
                    { segment: "High", rule: "80 – 100", color: "#16a34a", bg: "#dcfce7" },
                    { segment: "Mid", rule: "50 – 79", color: "#0d9488", bg: "#ccfbf1" },
                    { segment: "Low", rule: "20 – 49", color: "#ea8c00", bg: "#fef9c3" },
                    { segment: "Dormant", rule: "0 – 19", color: "#71717a", bg: "#f4f4f5" },
                  ].map((s, i) => (
                    <div key={i} style={{ background: s.bg, borderRadius: 12, padding: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.segment}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: s.color, marginTop: 4 }}>{s.rule} pts</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "14px 18px", background: "#fef2f2", borderRadius: 12, border: "1px solid #fecdd3", fontSize: 12, color: "#52525b", lineHeight: 1.7 }}>
                  <strong style={{ color: "#e11d48" }}>Travel Agency Rule:</strong> All Travel Agencies are automatically classified as <strong>Dormant</strong> (reactive only), regardless of their commercial score.
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: "#71717a", lineHeight: 1.7 }}>
                  <strong>Review frequency:</strong> Quarterly for existing customers · during onboarding for new customers · after major business changes.
                </div>
              </Card>

              {/* Footer */}
              <div style={{ textAlign: "center", padding: "20px 0 10px", fontSize: 11, color: "#a1a1aa" }}>
                SeatOS Commercial Score V2 — Internal Tool for Business Development Team
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
