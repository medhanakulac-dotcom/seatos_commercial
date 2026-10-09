// Everything the header search can find. Section content is imported from each
// section file, so editing a section's content updates search automatically.
import { salesStagesData } from "./sections/SalesProcess.jsx";
import {
  sellingPoints,
  sellingPrinciples,
  salesRules,
  objections,
  extraObjections,
  stakeholderValue,
  goldenMapping,
  demoFocus,
  DECODE,
} from "./sections/SellingToolkit.jsx";
import { trainingModules } from "./sections/TrainingStructure.jsx";
import { csGoldenRules, CS_TIPS } from "./sections/CSToolkit.jsx";

// Page-level entries. `tab` + `anchor` jump to a spot in a section; `tool` opens an app.
const PAGES = [
  { label: "Sales Process", sub: "New lead to signed contract", tab: "sales", anchor: null },
  { label: "Before you create a deal", sub: "Contact + Company setup", tab: "sales", anchor: "sales-before" },
  { label: "Required deal fields", sub: "Mandatory properties in HubSpot", tab: "sales", anchor: "sales-fields" },
  { label: "The 8-stage pipeline", sub: "Stages, automation & exit criteria", tab: "sales", anchor: "sales-stages" },
  { label: "The seatOS sales rules", sub: "How we sell · philosophy", tab: "toolkit", anchor: "tk-rules" },
  { label: "The five pillars", sub: "What we sell", tab: "toolkit", anchor: "tk-pillars" },
  { label: "Selling points", sub: "Match one to their pain", tab: "toolkit", anchor: "tk-points" },
  { label: "Sell by stakeholder", sub: "Value by who is in the room", tab: "toolkit", anchor: "tk-stakeholder" },
  { label: "The golden mapping", sub: "Show vs don\u2019t show", tab: "toolkit", anchor: "tk-golden" },
  { label: "Primary Buying Department", sub: "Demo focus per buyer", tab: "toolkit", anchor: "tk-primary" },
  { label: "Handling objections", sub: "Ask, don\u2019t argue", tab: "toolkit", anchor: "tk-objections" },
  { label: "Read the real objection", sub: "What it usually means", tab: "toolkit", anchor: "tk-decode" },
  { label: "Onboarding & Hypercare", sub: "30-day go-live motion", tab: "onboarding", anchor: null },
  { label: "Training Structure", sub: "The 6-module curriculum", tab: "training", anchor: null },
  { label: "Customer Success", sub: "Segment × health matrix", tab: "cs", anchor: null },
  { label: "CS golden rules", sub: "The 10 principles", tab: "cstk", anchor: "cs-rules" },
  { label: "CS tips", sub: "The 30 detailed tips", tab: "cstk", anchor: "cs-tips" },
  { label: "CS Automation", sub: "Low segment · Available Q3", tab: "csauto", anchor: null },
  { label: "Pricing & Packages", sub: "Tiers & add-ons", tab: "pricing", anchor: null },
  { label: "Deal Calculator", sub: "Model MRR, ARR & discounts", tool: "calculator" },
  { label: "Proposal Builder", sub: "Generate a branded quote", tool: "proposal" },
  { label: "Templates & Docs", sub: "Battle-tested assets", tab: "templates", anchor: null },
];

const strip = (s) => String(s || "").replace(/[\u201C\u201D\u2018\u2019]/g, '"');

const deepIndex = [];
sellingPoints.forEach((p) =>
  deepIndex.push({ label: p.title, sub: "Selling point", tab: "toolkit", anchor: "tk-points", kw: p.body }),
);
sellingPrinciples.forEach((p) =>
  deepIndex.push({ label: p.title, sub: "Selling principle", tab: "toolkit", anchor: "tk-rules", kw: p.body }),
);
salesRules.forEach((r) =>
  deepIndex.push({ label: r.text, sub: "Sales rule", tab: "toolkit", anchor: "tk-rules", kw: "" }),
);
objections.forEach((o) =>
  deepIndex.push({ label: strip(o.q), sub: "Objection", tab: "toolkit", anchor: "tk-objections", kw: strip(o.say) }),
);
extraObjections.forEach((o) =>
  deepIndex.push({ label: o.q, sub: "Objection · quick", tab: "toolkit", anchor: "tk-objections", kw: o.a }),
);
csGoldenRules.forEach((r) =>
  deepIndex.push({ label: r.text, sub: "CS golden rule", tab: "cstk", anchor: "cs-rules", kw: "" }),
);
CS_TIPS.forEach((t) =>
  deepIndex.push({
    label: t.title,
    sub: "CS tip #" + t.n,
    tab: "cstk",
    anchor: "cs-tips",
    kw: t.body + " " + (t.bullets || []).join(" ") + " " + t.tip,
  }),
);
DECODE.forEach((d) =>
  deepIndex.push({
    label: "“" + d.says + "”",
    sub: "Read the real objection",
    tab: "toolkit",
    anchor: "tk-decode",
    kw: d.means + " " + d.move,
  }),
);
stakeholderValue.forEach((s) =>
  deepIndex.push({
    label: s.dept,
    sub: "Sell by stakeholder",
    tab: "toolkit",
    anchor: "tk-stakeholder",
    kw: s.cares + " " + (s.points || []).join(" ") + " " + strip(s.talk),
  }),
);
goldenMapping.forEach((g) =>
  deepIndex.push({
    label: g.dept + " — what to show",
    sub: "Golden mapping",
    tab: "toolkit",
    anchor: "tk-golden",
    kw: (g.show || []).join(" "),
  }),
);
demoFocus.forEach((d) =>
  deepIndex.push({
    label: d.buyer + " demo focus",
    sub: "Demo focus",
    tab: "toolkit",
    anchor: "tk-primary",
    kw: d.focus,
  }),
);
trainingModules.forEach((m) =>
  deepIndex.push({
    label: m.title,
    sub: "Training · " + m.tag,
    tab: "training",
    anchor: null,
    kw: m.desc + " " + (m.covers || []).join(" "),
  }),
);
salesStagesData.forEach((s) =>
  deepIndex.push({
    label: "Stage " + s.n + ": " + s.name,
    sub: "Pipeline stage",
    tab: "sales",
    anchor: "sales-stages",
    kw: (s.detail || "") + " " + (s.advice || ""),
  }),
);

export const SEARCH_INDEX = PAGES.concat(deepIndex);
