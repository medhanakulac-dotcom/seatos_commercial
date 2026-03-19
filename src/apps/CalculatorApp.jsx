import { useState, useMemo, useEffect } from "react";

const REGIONS = {
  Thailand: "A", Indonesia: "A", Vietnam: "A", Cambodia: "A",
  Philippines: "C", Laos: "B", EMEA: "B", "Rest of World": "B",
};
const DEAL_VALUE_TIERS = {
  A: [{ max: 1199, score: 0 },{ max: 2900, score: 1 },{ max: 4999, score: 2 },{ max: 9999, score: 3 },{ max: Infinity, score: 5 }],
  B: [{ max: 900, score: 0 },{ max: 3000, score: 1 },{ max: 5000, score: 2 },{ max: Infinity, score: 3 }],
  C: [{ max: 900, score: 0 },{ max: 3000, score: 1 },{ max: 5000, score: 2 },{ max: Infinity, score: 3 }],
};
const TICKET_VOLUME_TIERS = {
  A: [{ max: 3000, score: 0 },{ max: 10000, score: 2 },{ max: Infinity, score: 3 }],
  B: [{ max: 500, score: 0 },{ max: 5000, score: 1 },{ max: Infinity, score: 3 }],
  C: [{ max: 500, score: 0 },{ max: 5000, score: 1 },{ max: Infinity, score: 3 }],
};
const OPERATOR_SCORES = { Operator: 2, Agency: 0 };
const DEFAULTS = { ticketFee: 0.3, revenueShare: 3, implementationFee: 150, monthlyFee: 60 };
const COUNTRY_OVERRIDES = { Philippines: { monthlyFee: 30 } };

const fmt = (n) => n != null && !isNaN(n) ? Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "0";
const fmtUSD = (n) => `${fmt(n)} USD`;
const safe = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : Math.max(0, n); };
const getTierScore = (tiers, value) => { for (const t of tiers) if (value <= t.max) return t.score; return tiers[tiers.length - 1].score; };
const segmentColor = (s) => s === "High" ? "#16a34a" : s === "Mid-High" ? "#0d9488" : s === "Medium" ? "#ea8c00" : "#e11d48";
const segmentBg = (s) => s === "High" ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)" : s === "Mid-High" ? "linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)" : s === "Medium" ? "linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)" : "linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)";

function AnimNum({ value, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => { let start = display; const end = value; if (start === end) return; const diff = end - start; const steps = 18; let step = 0; const iv = setInterval(() => { step++; setDisplay(start + diff * (step / steps)); if (step >= steps) { setDisplay(end); clearInterval(iv); } }, 16); return () => clearInterval(iv); }, [value]);
  return <span>{prefix}{fmt(display)}{suffix}</span>;
}

function Card({ children, style, accent }) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, padding: "28px 32px", boxShadow: "0 2px 20px rgba(0,0,0,0.04), 0 0.5px 2px rgba(0,0,0,0.05)", position: "relative", overflow: "hidden", transition: "box-shadow 0.3s, transform 0.25s", ...style }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}>
      {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: accent }} />}
      {children}
    </div>
  );
}

function Pill({ children, color = "#f97316", style }) {
  return <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700, color, background: color + "16", ...style }}>{children}</span>;
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
      <div onClick={() => onChange(!checked)} style={{ width: 44, height: 24, borderRadius: 12, background: checked ? "linear-gradient(135deg, #f97316, #fb923c)" : "#d4d4d8", position: "relative", transition: "background 0.25s", flexShrink: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: checked ? 23 : 3, transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#52525b" }}>{label}</span>
    </label>
  );
}

function WaiverToggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none", padding: "5px 12px", borderRadius: 100, background: checked ? "linear-gradient(135deg, #e11d48, #f43f5e)" : "#f4f4f5", transition: "all 0.25s", border: `1.5px solid ${checked ? "#e11d48" : "#d4d4d8"}` }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: checked ? "#fff" : "#71717a" }}>{checked ? "WAIVED" : "Waive"}</span>
    </div>
  );
}

function Select({ value, onChange, options, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: "10px 14px", borderRadius: 12, border: "1.5px solid #e4e4e7", fontSize: 14, fontWeight: 500, color: "#3f3f46", background: "#fafaf9", outline: "none", cursor: "pointer" }}>
        {options.map((o) => <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>{typeof o === "string" ? o : o.label}</option>)}
      </select>
    </div>
  );
}

function Input({ value, onChange, label, prefix, suffix, placeholder, error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && <span style={{ position: "absolute", left: 14, fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>{prefix}</span>}
        <input type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "0"} style={{ width: "100%", padding: `10px ${suffix ? 44 : 14}px 10px ${prefix ? 34 : 14}px`, borderRadius: 12, border: `1.5px solid ${error ? "#e11d48" : "#e4e4e7"}`, fontSize: 14, fontWeight: 500, color: "#3f3f46", background: "#fafaf9", outline: "none" }} />
        {suffix && <span style={{ position: "absolute", right: 14, fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>{suffix}</span>}
      </div>
      {error && <span style={{ fontSize: 11, color: "#e11d48", fontWeight: 500 }}>{error}</span>}
    </div>
  );
}

function ScoreCard({ label, score, max, detail, color = "#f97316" }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
      <div style={{ background: color, padding: "10px 16px", textAlign: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
      </div>
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

export default function CalculatorApp() {
  const [model, setModel] = useState("ticket");
  const [country, setCountry] = useState("Thailand");
  const [operatorType, setOperatorType] = useState("Operator");
  const [marqueeBrand, setMarqueeBrand] = useState(false);
  const [customPricing, setCustomPricing] = useState(false);
  const [ticketVolume, setTicketVolume] = useState("");
  const [offlineInput, setOfflineInput] = useState("");
  const [offlineMode, setOfflineMode] = useState("percent");
  const [offlineFeeInput, setOfflineFeeInput] = useState("0.3");
  const [waiveOffline, setWaiveOffline] = useState(true);
  const [gmv, setGmv] = useState("");
  const [revenue, setRevenue] = useState("");
  const [ticketFeeInput, setTicketFeeInput] = useState("0.3");
  const [revShareInput, setRevShareInput] = useState("3");
  const [implFeeInput, setImplFeeInput] = useState("150");
  const [monthlyFeeInput, setMonthlyFeeInput] = useState("60");
  const [waiveImpl, setWaiveImpl] = useState(false);
  const [waiveMonths, setWaiveMonths] = useState(0);
  const [waiveVariable, setWaiveVariable] = useState(false);
  const [topRoute, setTopRoute] = useState(false);

  const countryOverride = COUNTRY_OVERRIDES[country] || {};
  const defaultMonthlyFee = countryOverride.monthlyFee ?? DEFAULTS.monthlyFee;

  useEffect(() => { const o = COUNTRY_OVERRIDES[country]; setMonthlyFeeInput(String(o?.monthlyFee ?? DEFAULTS.monthlyFee)); }, [country]);

  const ticketFee = waiveVariable ? 0 : (customPricing ? safe(ticketFeeInput) : DEFAULTS.ticketFee);
  const offlineFee = waiveOffline ? 0 : (customPricing ? safe(offlineFeeInput) : DEFAULTS.ticketFee);
  const revShare = waiveVariable ? 0 : (customPricing ? Math.min(100, Math.max(0, safe(revShareInput))) : DEFAULTS.revenueShare);
  const implFee = waiveImpl ? 0 : (customPricing ? safe(implFeeInput) : DEFAULTS.implementationFee);
  const monthlyFeeRate = customPricing ? safe(monthlyFeeInput) : defaultMonthlyFee;
  const paidMonths = 12 - waiveMonths;
  const monthlyTotal = monthlyFeeRate * paidMonths;
  const fixedFee = implFee + monthlyTotal;
  const hasAnyWaiver = waiveImpl || waiveMonths > 0 || waiveVariable || waiveOffline;

  const onlineVol = safe(ticketVolume);
  const offlinePct = offlineMode === "percent" ? Math.min(99.9, Math.max(0, safe(offlineInput))) : 0;
  const offlineVol = offlineMode === "percent" ? (offlinePct > 0 && onlineVol > 0 ? Math.round(onlineVol / (1 - offlinePct / 100) - onlineVol) : 0) : safe(offlineInput);
  const totalVol = onlineVol + offlineVol;

  const calc = useMemo(() => {
    if (model === "ticket") {
      const onlineVar = onlineVol * ticketFee;
      const offlineVar = offlineVol * offlineFee;
      const variable = onlineVar + offlineVar;
      return { variable, onlineVar, offlineVar, fixed: fixedFee, deal: variable + fixedFee, vol: totalVol, onlineVol, offlineVol, implFee, monthlyFeeRate, paidMonths, waiveMonths, monthlyTotal };
    } else {
      const g = safe(gmv); const r = Math.min(safe(revenue), g);
      const variable = (g - r) * (revShare / 100);
      return { variable, onlineVar: 0, offlineVar: 0, fixed: fixedFee, deal: variable + fixedFee, vol: totalVol, onlineVol, offlineVol, g, r, implFee, monthlyFeeRate, paidMonths, waiveMonths, monthlyTotal };
    }
  }, [model, onlineVol, offlineVol, totalVol, gmv, revenue, ticketFee, offlineFee, revShare, fixedFee, implFee, monthlyFeeRate, paidMonths, waiveMonths, monthlyTotal]);

  const scores = useMemo(() => {
    const group = REGIONS[country];
    const ticketScore = getTierScore(TICKET_VOLUME_TIERS[group], calc.vol);
    const dealScore = getTierScore(DEAL_VALUE_TIERS[group], calc.deal);
    const opScore = OPERATOR_SCORES[operatorType];
    const routeBonus = (country !== "Thailand" && topRoute) ? 1 : 0;
    const total = ticketScore + dealScore + opScore + routeBonus;
    const rawSegment = total >= 7 ? "High" : total >= 4 ? "Medium" : "Low";
    const isMidHighOverride = rawSegment === "Medium" && operatorType === "Operator" && calc.deal > 5000;
    const segment = marqueeBrand ? "High" : isMidHighOverride ? "Mid-High" : rawSegment;
    const override = marqueeBrand && rawSegment !== "High";
    const midHighOverride = isMidHighOverride && !marqueeBrand;
    return { ticketScore, dealScore, opScore, routeBonus, total, segment, override, midHighOverride, rawSegment };
  }, [calc, country, operatorType, marqueeBrand, topRoute]);

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", minHeight: "100vh", background: "linear-gradient(160deg, #f5f0eb 0%, #ede7df 40%, #f0ebe4 100%)", color: "#27272a", padding: "0 16px 60px" }}>
      <header style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div><div style={{ fontSize: 22, fontWeight: 800 }}>Deal Calculator</div><div style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", letterSpacing: 1.5, textTransform: "uppercase" }}>SeatOS BD Tool</div></div>
        <Pill color="#a855f7">Business Development</Pill>
      </header>

      <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Card accent="linear-gradient(90deg, #f97316, #fb923c)">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
              <div><div style={{ fontSize: 18, fontWeight: 800 }}>Deal Value Calculator</div><div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>Estimate deal value based on pricing model</div></div>
              <Pill color={hasAnyWaiver ? "#e11d48" : customPricing ? "#ea580c" : "#16a34a"}>{hasAnyWaiver ? "Waiver Applied" : customPricing ? "Custom Pricing" : "Default Pricing"}</Pill>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
              <Select label="Pricing Model" value={model} onChange={setModel} options={[{ value: "ticket", label: "Per Ticket" }, { value: "gmv", label: "Percentage Commission" }]} />
              <Select label="Country / Region" value={country} onChange={setCountry} options={Object.keys(REGIONS)} />
            </div>

            {model === "ticket" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                <Input label="Online Ticket Volume (12mo)" value={ticketVolume} onChange={setTicketVolume} placeholder="e.g. 5000" />
                <Input label={offlineMode === "percent" ? "Offline Ticket %" : "Offline Ticket Volume"} value={offlineInput} onChange={setOfflineInput} suffix={offlineMode === "percent" ? "%" : ""} placeholder={offlineMode === "percent" ? "e.g. 80" : "e.g. 20000"} />
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 18 }}>
                <Input label="GMV (12mo, USD)" value={gmv} onChange={setGmv} prefix="$" />
                <Input label="Revenue (12mo, USD)" value={revenue} onChange={setRevenue} prefix="$" />
                <Input label="Ticket Volume (12mo)" value={ticketVolume} onChange={setTicketVolume} placeholder="e.g. 50000" />
              </div>
            )}

            <div style={{ padding: "14px 18px", background: "#fafaf9", borderRadius: 14, marginBottom: 18 }}>
              <Toggle checked={customPricing} onChange={setCustomPricing} label="Use Custom Pricing" />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", padding: "10px 14px", background: waiveImpl ? "#fef2f2" : "#fff", borderRadius: 10, border: `1px solid ${waiveImpl ? "#fecdd3" : "#e4e4e7"}` }}>
                  <div><div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", marginBottom: 4 }}>Implementation Fee</div><div style={{ fontSize: 16, fontWeight: 700, color: waiveImpl ? "#e11d48" : "#3f3f46", textDecoration: waiveImpl ? "line-through" : "none" }}>{fmtUSD(DEFAULTS.implementationFee)}</div></div>
                  <WaiverToggle checked={waiveImpl} onChange={setWaiveImpl} />
                </div>
                <div style={{ padding: "10px 14px", background: waiveMonths >= 12 ? "#fef2f2" : "#fff", borderRadius: 10, border: `1px solid ${waiveMonths >= 12 ? "#fecdd3" : "#e4e4e7"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                    <div><div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", marginBottom: 4 }}>Monthly Fee</div><div style={{ fontSize: 16, fontWeight: 700, color: waiveMonths >= 12 ? "#e11d48" : "#3f3f46", textDecoration: waiveMonths >= 12 ? "line-through" : "none" }}>{fmtUSD(monthlyFeeRate)}<span style={{ fontSize: 12, fontWeight: 500, color: "#a1a1aa" }}> /mo</span></div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", marginBottom: 4 }}>12-month total</div><div style={{ fontSize: 18, fontWeight: 800 }}>{fmtUSD(monthlyTotal)}</div></div>
                  </div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {Array.from({ length: 13 }, (_, i) => (
                      <div key={i} onClick={() => setWaiveMonths(i)} style={{ flex: 1, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, cursor: "pointer", background: i === waiveMonths ? (i === 0 ? "#3f3f46" : i >= 12 ? "#e11d48" : "#d97706") : "#e4e4e7", color: i === waiveMonths ? "#fff" : "#71717a" }}>{i}</div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", padding: "10px 14px", background: waiveVariable ? "#fef2f2" : "#fff", borderRadius: 10, border: `1px solid ${waiveVariable ? "#fecdd3" : "#e4e4e7"}` }}>
                  <div><div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", marginBottom: 4 }}>{model === "ticket" ? "Online Conv. Fee" : "Commission"}</div><div style={{ fontSize: 16, fontWeight: 700, color: waiveVariable ? "#e11d48" : "#3f3f46", textDecoration: waiveVariable ? "line-through" : "none" }}>{model === "ticket" ? `${DEFAULTS.ticketFee} USD /ticket` : `${DEFAULTS.revenueShare}%`}</div></div>
                  <WaiverToggle checked={waiveVariable} onChange={setWaiveVariable} />
                </div>
              </div>
            </div>

            {/* Deal Value Result */}
            <div style={{ background: "linear-gradient(135deg, #1c1917, #292524)", borderRadius: 14, padding: "20px 24px", color: "#fafaf9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Deal Value</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#fb923c" }}>{fmtUSD(calc.deal)}</span>
              </div>
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: country !== "Thailand" ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 16 }}>
            <ScoreCard label="Ticket Volume" score={scores.ticketScore} max={3} detail={`${fmt(calc.vol)} tickets`} color="#a855f7" />
            <ScoreCard label="Deal Value" score={scores.dealScore} max={5} detail={`${fmtUSD(calc.deal)}`} color="#14b8a6" />
            <ScoreCard label="Operator Type" score={scores.opScore} max={2} detail={operatorType} color="#f97316" />
            {country !== "Thailand" && <ScoreCard label="Route Bonus" score={scores.routeBonus} max={1} detail={topRoute ? "Top 10 route" : "No bonus"} color="#7c3aed" />}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Card accent="linear-gradient(90deg, #a855f7, #7c3aed)">
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>Segment Inputs</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Select label="Operator Type" value={operatorType} onChange={setOperatorType} options={["Operator", "Agency"]} />
              <Toggle checked={marqueeBrand} onChange={setMarqueeBrand} label="Marquee Brand" />
              {country !== "Thailand" && <Toggle checked={topRoute} onChange={setTopRoute} label="Top 10 Route on Travelier" />}
            </div>
          </Card>

          <Card style={{ textAlign: "center" }} accent="linear-gradient(90deg, #14b8a6, #0d9488)">
            <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Total Score</div>
            <div style={{ fontSize: 52, fontWeight: 800, color: "#27272a", lineHeight: 1 }}><AnimNum value={scores.total} /></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#a1a1aa", marginTop: 4 }}>out of {country !== "Thailand" ? 11 : 10}</div>
          </Card>

          <div style={{ background: segmentBg(scores.segment), borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 20px rgba(0,0,0,0.05)" }}>
            <div style={{ background: segmentColor(scores.segment), padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: 1.5, textTransform: "uppercase" }}>Segment</span>
            </div>
            <div style={{ padding: "24px 28px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 56, fontWeight: 800, color: segmentColor(scores.segment), lineHeight: 1 }}>{scores.segment}</div>
              <div style={{ marginTop: 14, fontSize: 13, fontWeight: 500, color: "#52525b" }}>
                {scores.override ? "Marquee Brand override" : scores.midHighOverride ? `Operator Medium + Deal > 5K` : `Score: ${scores.total}`}
              </div>
            </div>
          </div>

          <Card accent="linear-gradient(90deg, #f97316, #ea580c)" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", marginBottom: 6 }}>Deal Value</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#ea580c", lineHeight: 1 }}><AnimNum value={calc.deal} suffix=" USD" /></div>
          </Card>
        </div>
      </div>

      <style>{`@media (max-width: 860px) { .grid-main{grid-template-columns:1fr!important} }`}</style>
    </div>
  );
}
