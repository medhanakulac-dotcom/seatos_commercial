import { useState, useRef, useEffect } from "react";

const B = {
  bg: "#F5EFE7", orange: "#F5A623", green: "#2ECC71", pink: "#E84C88",
  cyan: "#2DD4BF", purple: "#7C5CFC", dark: "#1A1A1A", card: "#FFF",
  gray: "#8E8E93", light: "#E8E2D9", muted: "#C8C2B9"
};

const CUR = ["USD", "IDR", "PHP", "VND", "THB"];
const SYM = { USD: "$", IDR: "Rp", PHP: "₱", VND: "₫", THB: "฿" };

const DP = {
  monthly: { USD: { r: 60, b: 49 }, IDR: { r: 830000, b: 830000 }, PHP: { r: 2850, b: 2850 }, VND: { r: 1300000, b: 1300000 }, THB: { r: 1600, b: 2100 } },
  impl: { USD: { r: 150, b: 150 }, IDR: { r: 2540700, b: 2540700 }, PHP: { r: 8700, b: 8700 }, VND: { r: 3900000, b: 3900000 }, THB: { r: 5200, b: 5200 } },
  pos: { USD: { r: 16, b: 16 }, IDR: { r: 271000, b: 271000 }, PHP: { r: 1000, b: 1000 }, VND: { r: 420000, b: 420000 }, THB: { r: 500, b: 500 } },
  sms: { USD: { r: 0.08, b: 0.08 }, IDR: { r: 1356, b: 1356 }, PHP: { r: 5, b: 5 }, VND: { r: 2000, b: 2000 }, THB: { r: 3, b: 3 } },
  kiosk: { USD: { r: 120, b: 120 }, IDR: { r: 170000000, b: 170000000 }, PHP: { r: 7300, b: 7300 }, VND: { r: 3210000, b: 3210000 }, THB: { r: 4000, b: 4000 } }
};

const PCATS = [
  { k: "monthly", l: "Monthly Admin & Hosting" }, { k: "impl", l: "Implementation" },
  { k: "pos", l: "POS" }, { k: "sms", l: "SMS" }, { k: "kiosk", l: "Kiosk" }
];

const ITEMS = [
  { id: "api", name: "API Convenience Fee", desc: "Charged per actual API usage", inv: "Monthly", pk: null, mode: "flex", cat: "lic", clr: B.orange },
  { id: "offline", name: "Offline Convenience Fee", desc: "Charged per actual offline usage", inv: "Monthly", pk: null, mode: "flex", cat: "lic", clr: B.pink },
  { id: "flat", name: "Flat Rate Convenience Fee", desc: "Fixed monthly (estimation)", inv: "Monthly", pk: null, mode: "flat", cat: "lic", clr: B.purple },
  { id: "admin", name: "Monthly Admin, Maintenance & Hosting", inv: "Monthly", pk: "monthly", cat: "lic", clr: B.green },
  { id: "implementation", name: "Implementation", inv: "One-time", pk: "impl", cat: "svc", clr: B.cyan },
  { id: "config", name: "Configuration", inv: "", pk: null, cat: "svc", clr: B.purple },
  { id: "help", name: "Help Desk Support", inv: "", pk: null, cat: "svc", clr: B.green },
  { id: "pos", name: "POS (Monthly)", desc: "Point of Sale terminal", inv: "Monthly", pk: "pos", cat: "anc", clr: B.pink },
  { id: "sms", name: "SMS Notification", desc: "Per SMS charge", inv: "Monthly", pk: "sms", cat: "anc", clr: B.orange },
  { id: "kiosk", name: "Kiosk", desc: "Self-service kiosk", inv: "Monthly", pk: "kiosk", cat: "anc", clr: B.cyan }
];

function fmt(n, c) {
  if (n == null || isNaN(n)) return "—";
  if (c === "VND" || c === "IDR") return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtp(n, c) {
  if (n == null || isNaN(n)) return "—";
  return SYM[c] + fmt(n, c) + " " + c;
}

const LOGO_B64 = "https://res.cloudinary.com/dkwj2iikl/image/upload/v1773914487/Screenshot_2026-03-19_at_5.00.59_PM_aqryg1.png";
function SeatLogo({ h }) {
  return <img src={LOGO_B64} alt="seatOS" style={{ height: h, objectFit: "contain" }} />;
}

const sBtn = { borderRadius: 50, fontWeight: 700, border: "none", cursor: "pointer" };
const sCard = { background: B.card, borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,.04)" };
const sInp = { width: "100%", padding: "11px 16px", border: "2px solid " + B.light, borderRadius: 14, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", fontFamily: "inherit" };

function Tog({ on, set }) {
  return (
    <button onClick={e => { e.stopPropagation(); set(!on); }}
      style={{ width: 50, height: 28, borderRadius: 14, border: "none", background: on ? B.green : B.light, cursor: "pointer", position: "relative" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 25 : 3, width: 22, height: 22, borderRadius: 11, background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.12)" }} />
    </button>
  );
}

function Sec({ label, n, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 6, height: 26, borderRadius: 3, background: color || B.orange }} />
      <span style={{ fontWeight: 800, fontSize: 16, color: B.dark }}>{label}</span>
      {n > 0 && <span style={{ background: color || B.orange, color: "#fff", borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 800 }}>{n}</span>}
    </div>
  );
}

function Chk({ label, on, set, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={e => { e.stopPropagation(); set(!on); }}>
      <div style={{ width: 18, height: 18, borderRadius: 6, border: on ? "none" : "2px solid " + B.light, background: on ? (color || B.orange) : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {on && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: on ? B.dark : B.gray }}>{label}</span>
    </div>
  );
}

export default function ProposalApp() {
  const [pg, setPg] = useState("build");
  const [ld, setLd] = useState(false);
  const [ppl, setPpl] = useState([]);
  const [pr, setPr] = useState(DP);
  const [cur, setCur] = useState("USD");
  const [ft, setFt] = useState("r");
  const [spId, setSpId] = useState(null);
  const [cu, setCu] = useState({ name: "", inc: "", addr: "", email: "", s: "", e: "", country: "Thailand" });
  const [sel, setSel] = useState({});
  const [stOn, setStOn] = useState(false);
  const [stTxt, setStTxt] = useState("Customer undertakes to process all ticket bookings using seatOS.");
  const [bd, setBd] = useState({ on: false, pct: "", amt: "" });
  const [nP, setNP] = useState({ name: "", email: "", phone: "" });
  const [tP, setTP] = useState(DP);
  const ref = useRef();

  const svP = (p) => { setPpl(p); };
  const svPr = (p) => { setPr(p); setTP(p); };

  const ap = (pk) => pk && pr[pk]?.[cur] ? pr[pk][cur][ft] : null;
  const bf = (id) => {
    const d = sel[id]; if (!d) return 0;
    const m = parseFloat(d.fee); if (!isNaN(m) && d.fee !== "") return m;
    const it = ITEMS.find(i => i.id === id); if (it?.pk) return ap(it.pk) || 0; return 0;
  };
  const ff = (id) => { const b = bf(id), d = sel[id]; if (!d?.hd) return b; return Math.max(0, b - (parseFloat(d.da) || 0)); };

  const ids = Object.keys(sel);
  const tots = (() => {
    let ot = 0, mo = 0;
    ids.forEach(id => { const it = ITEMS.find(i => i.id === id); if (!it) return; const f = ff(id); if (it.inv === "One-time") ot += f; else mo += f; });
    return { ot, mo };
  })();
  const sub = tots.ot + tots.mo;
  const bda = bd.on ? (parseFloat(bd.amt) || 0) : 0;
  const bdp = bd.on ? (parseFloat(bd.pct) || 0) : 0;
  const grand = Math.max(0, sub - bda);
  const sp = ppl.find(p => p.id === spId);
  const cnt = ids.length;

  const hBP = (v) => { const p = parseFloat(v); setBd(x => ({ ...x, pct: v, amt: (!isNaN(p) && sub > 0) ? String(Math.round(p / 100 * sub * 100) / 100) : "" })); };
  const hBA = (v) => { const a = parseFloat(v); setBd(x => ({ ...x, amt: v, pct: (!isNaN(a) && sub > 0) ? String(Math.round(a / sub * 10000) / 100) : "" })); };

  if (ld) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: B.bg }}><SeatLogo h={40} /></div>;

  /* ═══ SETTINGS ═══ */
  if (pg === "set") return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", minHeight: "100vh", background: B.bg }}>
      <div style={{ background: B.card, borderBottom: "4px solid " + B.orange, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 99 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><SeatLogo h={28} /><b style={{ fontSize: 16 }}>Settings</b></div>
        <button onClick={() => setPg("build")} style={{ ...sBtn, background: B.orange, color: "#fff", padding: "8px 22px", fontSize: 13 }}>← Builder</button>
      </div>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
        <Sec label="Sales Team" n={ppl.length} color={B.green} />
        <div style={sCard}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <input placeholder="Name" value={nP.name} onChange={e => setNP(p => ({ ...p, name: e.target.value }))} style={{ ...sInp, flex: 1, minWidth: 100 }} />
            <input placeholder="Email" value={nP.email} onChange={e => setNP(p => ({ ...p, email: e.target.value }))} style={{ ...sInp, flex: 1, minWidth: 120 }} />
            <input placeholder="Phone" value={nP.phone} onChange={e => setNP(p => ({ ...p, phone: e.target.value }))} style={{ ...sInp, flex: 1, minWidth: 100 }} />
            <button onClick={() => { if (!nP.name.trim()) return; svP([...ppl, { id: String(Date.now()), ...nP }]); setNP({ name: "", email: "", phone: "" }); }} style={{ ...sBtn, background: B.green, color: "#fff", padding: "10px 20px", fontSize: 14 }}>+ Add</button>
          </div>
          {ppl.length === 0 && <p style={{ color: B.gray, textAlign: "center" }}>No sales people yet.</p>}
          {ppl.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: B.bg, borderRadius: 14, marginBottom: 8 }}>
              <div><b>{p.name}</b><div style={{ fontSize: 12, color: B.gray }}>{p.email}{p.phone ? " · " + p.phone : ""}</div></div>
              <button onClick={() => svP(ppl.filter(x => x.id !== p.id))} style={{ ...sBtn, background: "#FEE2E2", color: B.pink, padding: "5px 14px", fontSize: 12 }}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ═══ BUILDER ═══ */
  const toggle = (id) => setSel(p => {
    if (p[id]) { const n = { ...p }; delete n[id]; return n; }
    return { ...p, [id]: { fee: "", qty: 1, ct: "amount", fp: "", hd: false, dp: "", da: "", hw: false, wt: "" } };
  });
  const upd = (id, f) => setSel(p => ({ ...p, [id]: { ...p[id], ...f } }));

  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", minHeight: "100vh", background: B.bg }}>
      <div style={{ background: B.card, borderBottom: "4px solid " + B.orange, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 99, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <SeatLogo h={28} />
          <div><b style={{ fontSize: 16, display: "block" }}>Proposal Builder</b><span style={{ fontSize: 11, color: B.gray }}>SeatOS</span></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setPg("set")} style={{ ...sBtn, background: B.bg, color: B.dark, padding: "8px 18px", fontSize: 13 }}>⚙ Settings</button>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
        <Sec label="Pricing" />
        <div style={sCard}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {CUR.map(c => <button key={c} onClick={() => setCur(c)} style={{ ...sBtn, padding: "8px 16px", fontSize: 13, background: cur === c ? B.orange : "#fff", color: cur === c ? "#fff" : B.gray, border: cur === c ? "none" : "2px solid " + B.light }}>{SYM[c]} {c}</button>)}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ k: "r", l: "Regular" }, { k: "b", l: "Bundle" }].map(x => <button key={x.k} onClick={() => setFt(x.k)} style={{ ...sBtn, padding: "8px 18px", fontSize: 13, background: ft === x.k ? B.green : "#fff", color: ft === x.k ? "#fff" : B.gray, border: ft === x.k ? "none" : "2px solid " + B.light }}>{x.l}</button>)}
          </div>
        </div>

        <Sec label="Customer" n={0} color={B.pink} />
        <div style={sCard}>
          {[{ k: "name", l: "Customer Name", p: "Acme Co." }, { k: "addr", l: "Address", p: "123 Sukhumvit" }, { k: "email", l: "Email", p: "hi@acme.com" }].map(f => (
            <div key={f.k} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: B.gray, fontWeight: 600, display: "block", marginBottom: 4 }}>{f.l}</label>
              <input value={cu[f.k]} onChange={e => setCu(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} style={sInp} />
            </div>
          ))}
        </div>

        <Sec label="Licenses & Commission" n={ids.filter(id => ITEMS.find(i => i.id === id)?.cat === "lic").length} color={B.orange} />
        {ITEMS.filter(i => i.cat === "lic").map(it => {
          const on = !!sel[it.id];
          return (
            <div key={it.id} onClick={() => toggle(it.id)} style={{
              border: on ? "2px solid " + it.clr : "2px solid " + B.light, borderRadius: 20, padding: 20, marginBottom: 14,
              background: on ? it.clr + "08" : B.card, cursor: "pointer"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><b style={{ fontSize: 15 }}>{it.name}</b>{it.desc && <div style={{ fontSize: 12, color: B.gray }}>{it.desc}</div>}</div>
                <Tog on={on} set={() => toggle(it.id)} />
              </div>
            </div>
          );
        })}

        <Sec label="Services" n={ids.filter(id => ITEMS.find(i => i.id === id)?.cat === "svc").length} color={B.cyan} />
        {ITEMS.filter(i => i.cat === "svc").map(it => {
          const on = !!sel[it.id];
          return (
            <div key={it.id} onClick={() => toggle(it.id)} style={{
              border: on ? "2px solid " + it.clr : "2px solid " + B.light, borderRadius: 20, padding: 20, marginBottom: 14,
              background: on ? it.clr + "08" : B.card, cursor: "pointer"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><b style={{ fontSize: 15 }}>{it.name}</b></div>
                <Tog on={on} set={() => toggle(it.id)} />
              </div>
            </div>
          );
        })}

        <Sec label="Ancillary" n={ids.filter(id => ITEMS.find(i => i.id === id)?.cat === "anc").length} color={B.pink} />
        {ITEMS.filter(i => i.cat === "anc").map(it => {
          const on = !!sel[it.id];
          return (
            <div key={it.id} onClick={() => toggle(it.id)} style={{
              border: on ? "2px solid " + it.clr : "2px solid " + B.light, borderRadius: 20, padding: 20, marginBottom: 14,
              background: on ? it.clr + "08" : B.card, cursor: "pointer"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><b style={{ fontSize: 15 }}>{it.name}</b>{it.desc && <div style={{ fontSize: 12, color: B.gray }}>{it.desc}</div>}</div>
                <Tog on={on} set={() => toggle(it.id)} />
              </div>
            </div>
          );
        })}

        <div style={{ background: B.dark, borderRadius: 20, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>One-Time</div><div style={{ fontSize: 18, fontWeight: 700 }}>{fmtp(tots.ot, cur)}</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>Monthly</div><div style={{ fontSize: 18, fontWeight: 700 }}>{fmtp(tots.mo, cur)}</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: B.orange, marginBottom: 4 }}>Grand</div><div style={{ fontSize: 26, fontWeight: 800 }}>{fmtp(grand, cur)}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
