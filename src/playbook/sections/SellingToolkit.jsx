// Selling Toolkit — sales rules, pillars, selling points, stakeholder plays and objections.
// Edit the content arrays at the top; the component below lays them out.
import { useEffect, useState } from "react";
import { icon } from "../ui.jsx";

export const sellingPoints = [
  {
    n: "1",
    core: true,
    title: "Grow revenue, not headcount",
    body: "Grow the business without growing the team — seatOS automates operations so operators sell more without hiring more. Use it with growing operators, multi-branch companies and staff shortages.",
  },
  {
    n: "2",
    core: false,
    title: "One platform, every sales channel",
    body: "Instead of managing OTA, website, counter, POS, kiosk and agents separately, seatOS connects everything into one platform with real-time inventory and pricing.",
  },
  {
    n: "3",
    core: false,
    title: "Stop revenue leakage",
    body: "Most operators don\u2019t know where they lose money. seatOS eliminates overbooking, closed allotments, pricing mistakes, slow inventory updates, refund errors and missed sales — one of your strongest opening messages.",
  },
  {
    n: "4",
    core: false,
    title: "Replace manual operations with automation",
    body: "Customers don\u2019t buy automation — they buy less manual work, faster operations, fewer mistakes and consistent processes: auto trip open/close, OTA sync, booking notifications, centralised inventory.",
  },
  {
    n: "5",
    core: false,
    title: "Scale through connectivity",
    body: "Traditional operators grow by hiring, opening counters and more manual coordination. seatOS grows them by connecting more OTAs, adding agents, selling online and expanding digitally.",
  },
  {
    n: "6",
    core: false,
    title: "Complete visibility",
    body: "Managers finally know which routes make money, which channels perform, where inventory leaks and which trips are underpriced — acting today instead of reacting next month.",
  },
  {
    n: "7",
    core: false,
    title: "Built for Southeast Asia",
    body: "Unlike generic transport software, seatOS understands ferry, bus, multi-stop routes, OTAs, local agents, counter sales and kiosks — built specifically for SEA transport operators.",
  },
  {
    n: "8",
    core: false,
    title: "Faster customer experience",
    body: "Faster booking, faster counter service, faster check-in and better passenger communication. The customer notices the difference immediately.",
  },
  {
    n: "9",
    core: false,
    title: "Better control for management",
    body: "Owners gain one source of truth, standardised processes, multi-branch control, multi-country scalability and real-time reporting — instead of spreadsheets and manual reports.",
  },
  {
    n: "10",
    core: false,
    title: "Easy to implement",
    body: "Guided onboarding, setup support, training, go-live in under a month and ongoing customer success — which removes the fear of switching systems.",
  },
];

export const sellingPrinciples = [
  {
    n: "1",
    cat: "adoption",
    title: "Sell outcomes, not software",
    body: "Never open with features. Open with the problem — revenue leakage, manual work, slow operations, lost sales, no visibility. Only introduce seatOS once they agree these are real business problems.",
  },
  {
    n: "2",
    cat: "adoption",
    title: "Diagnose before demonstrating",
    body: "Discovery should answer: where is revenue leaking, which process wastes the most staff time, which channels cause the biggest headache, and what they can\u2019t control today. No leak found, no solution to recommend.",
  },
  {
    n: "3",
    cat: "adoption",
    title: "Quantify every pain",
    body: "Turn \u201Cmanual work\u201D into \u201Chow many hours a day?\u201D and \u201COTA issues\u201D into \u201Chow long to update every OTA?\u201D The bigger the quantified pain, the easier the sale.",
  },
  {
    n: "4",
    cat: "adoption",
    title: "Sell the transformation",
    body: "Don\u2019t compare systems. Compare the Old Way (manual updates, calling OTA staff, hiring more people, finding problems late) with the New Way (automatic inventory, connected channels, real-time control, scale without hiring).",
  },
  {
    n: "5",
    cat: "risk",
    title: "Connect every feature to one pain",
    body: "Never demo randomly. Customer Pain → seatOS Feature → Business Outcome. If a feature doesn\u2019t solve a pain they mentioned, don\u2019t show it.",
  },
  {
    n: "6",
    cat: "risk",
    title: "Speak the customer\u2019s language",
    body: "Operations: faster, less manual work. Commercial: more bookings, more channels. Finance: revenue, reporting, cost control. Owner: growth, visibility, scale. Never give everyone the same demo.",
  },
  {
    n: "7",
    cat: "people",
    title: "Position seatOS as the operating system",
    body: "Don\u2019t say \u201Cwe have a TMS.\u201D Say \u201CseatOS becomes the operating system that connects every sales channel into one place.\u201D",
  },
  {
    n: "8",
    cat: "people",
    title: "Every feature must create measurable value",
    body: "Channel Manager → no more midnight OTA updates. TMS → standardised operations. POS → faster counter sales. Kiosk → shorter queues. Dashboard → catch revenue leaks. Always close with \u201Cso what does this mean for your business?\u201D",
  },
  {
    n: "9",
    cat: "people",
    title: "Sell one platform",
    body: "Don\u2019t sell TMS, POS, Notify and Kiosk separately. Sell one connected platform: one platform, every channel, one source of truth.",
  },
  {
    n: "10",
    cat: "people",
    title: "Use proof before promises",
    body: "Lead with customer stories, time saved, manual work reduced, booking growth and testimonials. Operators believe other operators far more than they believe salespeople.",
  },
  {
    n: "11",
    cat: "people",
    title: "Sell growth without adding people",
    body: "When they say \u201Cwe need more staff,\u201D reframe it: \u201Clet\u2019s see if technology can solve that before hiring.\u201D Grow without growing the team.",
  },
  {
    n: "12",
    cat: "risk",
    title: "End every presentation with an audit",
    body: "Don\u2019t finish with \u201Cany questions?\u201D Finish with \u201Clet\u2019s review where your revenue is leaking\u201D — a Revenue Leak Audit, not a product pitch.",
  },
];

export const salesRules = [
  { num: "1", text: "Don\u2019t sell software — solve business problems." },
  { num: "2", text: "Discovery before demo." },
  { num: "3", text: "Pain before proposal." },
  { num: "4", text: "Every feature must solve a pain." },
  { num: "5", text: "Sell outcomes, not functionality." },
  { num: "6", text: "Show the old way vs the seatOS way." },
  { num: "7", text: "Quantify the customer\u2019s pain whenever possible." },
  { num: "8", text: "One platform. Every channel. One source of truth." },
  { num: "9", text: "Growth without growing the team." },
  { num: "10", text: "Never leave a meeting without the next agreed action." },
];

export const objections = [
  {
    q: "\u201CYour price is too high.\u201D",
    dont: "You\u2019ll make it back in no time.",
    say: "I understand — what are you comparing the investment against: your current system, a manual process, or another solution? Our goal isn\u2019t to be the cheapest; it\u2019s to simplify operations, connect every channel and support your growth. If those outcomes aren\u2019t valuable, seatOS probably isn\u2019t the right fit.",
  },
  {
    q: "\u201CWe already have a system.\u201D",
    dont: "seatOS is better.",
    say: "That\u2019s good — most of our customers had a system before switching too. Out of curiosity, if you could improve one thing about your current setup, what would it be? Now they\u2019re selling themselves.",
  },
  {
    q: "\u201CIt\u2019s too expensive.\u201D",
    dont: "Jumping straight to defending the price.",
    say: "Which part feels expensive — the implementation, the monthly platform fee, or the processing fee? Once they answer, respond to that specific concern.",
  },
  {
    q: "\u201CWe don\u2019t have budget.\u201D",
    dont: "Okay, let us know.",
    say: "Understood — is this mainly a budget-timing issue, or are you still unsure whether seatOS is the right solution? If it\u2019s timing: when do you normally review technology investments?",
  },
  {
    q: "\u201CWe\u2019ll think about it.\u201D",
    dont: "Sure, no problem.",
    say: "Of everything we discussed today, what would you like to evaluate internally? And what would you need to feel confident moving forward?",
  },
  {
    q: "\u201CWe don\u2019t need all the features.\u201D",
    dont: "You should use everything.",
    say: "That\u2019s completely fine — we don\u2019t expect every operator to use every module. Let\u2019s focus only on the workflows that solve your biggest challenges today.",
  },
];

export const extraObjections = [
  {
    q: "We\u2019re too small.",
    a: "seatOS supports operators of every size. The question isn\u2019t how many vehicles you have — it\u2019s whether your current process will still work as your business grows.",
  },
  {
    q: "We\u2019re too big.",
    a: "That\u2019s exactly why enterprise operators choose a centralized platform. The more branches, routes and channels you manage, the more valuable standardization becomes.",
  },
  {
    q: "Our staff already knows the current process.",
    a: "Great — we\u2019re not changing how you serve passengers, we\u2019re simplifying the work behind the scenes so your team spends less time on repetitive tasks.",
  },
  {
    q: "Our customers prefer buying at the counter.",
    a: "Perfectly fine. seatOS isn\u2019t about replacing counter sales — it helps you manage counter, online channels and agents from one platform.",
  },
  {
    q: "We don\u2019t want to depend on technology.",
    a: "Your business already depends on technology — spreadsheets, messaging apps, OTAs. seatOS simply brings those disconnected tools into one controlled platform.",
  },
  {
    q: "Our internet isn\u2019t reliable.",
    a: "Connectivity can vary across locations. Let\u2019s review how your branches operate today and identify the best deployment approach for your environment.",
  },
  {
    q: "We don\u2019t trust cloud systems.",
    a: "A common concern. A centralized platform actually keeps your data stored securely and accessible to authorized users, instead of scattered across personal computers and spreadsheets.",
  },
  {
    q: "We\u2019ve built our own system.",
    a: "Impressive — many operators build tailored systems. Out of curiosity, what parts are becoming difficult to maintain or expand?",
  },
  {
    q: "We\u2019ll build it ourselves.",
    a: "That\u2019s an option. Before that investment, it\u2019s worth comparing the time, maintenance and ongoing development required against a platform already used by operators across the region.",
  },
  {
    q: "Our operation is unique.",
    a: "Every operator has unique workflows — that\u2019s why we start with discovery instead of assuming one standard solution. Let\u2019s identify what\u2019s truly unique and what can be standardized.",
  },
  {
    q: "We don\u2019t use OTAs.",
    a: "Fine — many customers improve internal operations first. When you\u2019re ready to expand distribution, seatOS already has the connections.",
  },
  {
    q: "We only want one feature.",
    a: "We can focus on exactly that. As your business grows, you\u2019ll have the flexibility to adopt more modules when they create value.",
  },
  {
    q: "Implementation will interrupt our business.",
    a: "Implementation is planned to minimize disruption — we work with your team on preparation, training and rollout before full go-live.",
  },
  {
    q: "Support is important.",
    a: "Agreed. Software is only one part — ongoing support, onboarding and customer success matter just as much for long-term success.",
  },
  {
    q: "What if your company disappears?",
    a: "A reasonable question for a long-term partner. We\u2019re happy to share more about our company, regional presence and the operators who already trust seatOS.",
  },
  {
    q: "Your competitor is cheaper.",
    a: "Don\u2019t attack — ask: besides price, what else is important when choosing your long-term operating platform?",
  },
  {
    q: "We\u2019ll decide next year.",
    a: "Understood. Is there anything we can help you prepare before then, so you\u2019re in a stronger position when the decision is made?",
  },
  {
    q: "We need local support.",
    a: "We support operators across Southeast Asia and work closely with customers through onboarding and daily operations. Let\u2019s discuss the support model that fits your team.",
  },
  {
    q: "Can you guarantee more bookings?",
    a: "Never promise. Say: we can\u2019t guarantee volume — that depends on your routes, pricing and strategy. seatOS provides the technology to reach more channels, improve operations and remove barriers that limit sales.",
  },
  {
    q: "Can you customize everything?",
    a: "We start by understanding the requirement. Often existing workflows already solve it; if not, we evaluate whether it fits the product roadmap or a custom solution.",
  },
];

export const stakeholderValue = [
  {
    dept: "CEO / Owner",
    fg: "#c97f12",
    bg: "#fdf0db",
    cares: "Growth, profitability, scalability",
    points: ["Grow Revenue", "Scale Without Complexity", "Executive Visibility"],
    talk: "\u201CseatOS helps you grow revenue without growing your team. You gain full visibility across your business and can scale confidently.\u201D",
  },
  {
    dept: "Operations",
    fg: "#1aa897",
    bg: "#e4faf6",
    cares: "Efficiency, fewer mistakes, standard processes",
    points: ["Automate Operations", "One Platform", "Standardized Workflows"],
    talk: "\u201CYour team spends less time on manual work and more time serving customers. Everything runs from one system.\u201D",
  },
  {
    dept: "Commercial / Sales",
    fg: "#7C5CFC",
    bg: "#efeafe",
    cares: "More bookings, more channels, pricing agility",
    points: ["Grow Revenue", "Connect Every Channel", "Dynamic Inventory & Pricing"],
    talk: "\u201CSell through more channels without extra work, keep inventory synchronized, and react to market demand instantly.\u201D",
  },
  {
    dept: "Finance",
    fg: "#1f9d57",
    bg: "#eafaf1",
    cares: "Revenue control, reporting, auditability",
    points: ["Complete Visibility", "Reduce Revenue Leakage", "Predictable Revenue"],
    talk: "\u201CKnow exactly where revenue comes from, reduce hidden losses, and simplify reconciliation and reporting.\u201D",
  },
  {
    dept: "Customer Service",
    fg: "#d83a72",
    bg: "#fdeaef",
    cares: "Fewer complaints, faster responses",
    points: ["Automation", "seatOS Notify", "Better Booking Experience"],
    talk: "\u201CPassengers receive timely updates, and your team spends less time answering repetitive questions.\u201D",
  },
  {
    dept: "Station Manager",
    fg: "#c97f12",
    bg: "#fdf0db",
    cares: "Faster ticketing, queue reduction",
    points: ["POS & Kiosk", "Faster Counter Operations"],
    talk: "\u201CReduce waiting times, simplify ticket sales, and make counter staff more productive.\u201D",
  },
  {
    dept: "IT / Digital Team",
    fg: "#7C5CFC",
    bg: "#efeafe",
    cares: "Integration, reliability, maintainability",
    points: ["Centralized Platform", "OTA Integration", "API & Standard Platform"],
    talk: "\u201COne platform integrates with all your sales channels, reducing maintenance and manual integrations.\u201D",
  },
  {
    dept: "Marketing / E-commerce",
    fg: "#d83a72",
    bg: "#fdeaef",
    cares: "Direct sales, campaign execution",
    points: ["Omnichannel Sales", "Direct Booking Growth"],
    talk: "\u201CLaunch promotions faster and grow direct bookings without worrying about inventory synchronization.\u201D",
  },
];

export const goldenMapping = [
  {
    dept: "CEO / Owner",
    fg: "#c97f12",
    bg: "#fdf0db",
    dontShow: "Features",
    show: ["Revenue growth", "Business expansion", "Digital transformation", "Competitive advantage"],
  },
  {
    dept: "Operations",
    fg: "#1aa897",
    bg: "#e4faf6",
    dontShow: "Dashboards first",
    show: [
      "Auto trip open/close",
      "Inventory synchronization",
      "Passenger manifest",
      "Driver workflow",
      "Faster daily operations",
    ],
  },
  {
    dept: "Commercial",
    fg: "#7C5CFC",
    bg: "#efeafe",
    dontShow: "Technical architecture",
    show: [
      "More OTAs",
      "More bookings",
      "More inventory utilization",
      "Faster pricing updates",
      "Sell every available seat",
    ],
  },
  {
    dept: "Finance",
    fg: "#1f9d57",
    bg: "#eafaf1",
    dontShow: "Beautiful UI",
    show: ["Revenue leakage prevention", "Financial reports", "Audit trail", "Commission control", "Refund tracking"],
  },
  {
    dept: "IT",
    fg: "#7C5CFC",
    bg: "#efeafe",
    dontShow: "Business benefits only",
    show: ["APIs", "Security", "Integrations", "Centralized platform", "Reliability"],
  },
];

export const demoFocus = [
  { buyer: "CEO", focus: "Revenue, dashboards, growth, multi-branch control" },
  { buyer: "Operations", focus: "TMS, manifests, trip management, automation" },
  { buyer: "Commercial", focus: "Channel Manager, OTA integrations, pricing, inventory" },
  { buyer: "Finance", focus: "Reports, reconciliation, audit trail, revenue visibility" },
  { buyer: "Station Manager", focus: "POS, Kiosk, check-in, ticketing" },
  { buyer: "IT", focus: "APIs, integrations, architecture, security" },
];

export const DECODE = [
  {
    says: "Too expensive",
    means: "I don\u2019t see enough value.",
    move: "Ask what they\u2019re comparing the investment against. Reconnect the conversation to their business problems before discussing price.",
  },
  {
    says: "Happy with current system",
    means: "I don\u2019t want change.",
    move: "Ask: \u201CIf you could improve one thing about your current system, what would it be?\u201D Find the gap before pitching seatOS.",
  },
  {
    says: "Need management approval",
    means: "I don\u2019t have decision authority.",
    move: "Identify the decision maker, understand their priorities, and equip your champion with the right business case.",
  },
  {
    says: "Need more time",
    means: "I don\u2019t have enough confidence.",
    move: "Ask what information or concern is preventing a decision today. Address that specific concern.",
  },
  {
    says: "We\u2019ll think about it",
    means: "There are unanswered concerns.",
    move: "Ask: \u201CWhat would you like to think about?\u201D Don\u2019t leave until you understand the real hesitation.",
  },
  {
    says: "Send me the proposal",
    means: "I\u2019m not ready to decide yet.",
    move: "Ask what they expect the proposal to answer. Confirm that discovery is complete before preparing it.",
  },
  {
    says: "We don\u2019t have budget",
    means: "It\u2019s not a priority today.",
    move: "Ask whether it\u2019s a budget issue or a value issue. If it\u2019s timing, agree on when budgets are reviewed.",
  },
  {
    says: "We need more features",
    means: "I\u2019m unsure this solves my biggest problem.",
    move: "Ask which workflow they\u2019re trying to improve. Focus on the business problem, not the feature request.",
  },
  {
    says: "We need to discuss internally",
    means: "Internal alignment hasn\u2019t happened yet.",
    move: "Ask who still needs to be involved and offer a meeting with the wider team.",
  },
  {
    says: "Let me talk to my boss",
    means: "I can\u2019t approve this myself.",
    move: "Ask to join the discussion with the decision maker instead of waiting for second-hand feedback.",
  },
  {
    says: "Send me more information",
    means: "I don\u2019t understand the value clearly enough.",
    move: "Ask what information they\u2019re missing. Send only what answers that question.",
  },
  {
    says: "Let us compare with other vendors",
    means: "I haven\u2019t seen enough differentiation.",
    move: "Ask what criteria they\u2019ll use to compare vendors, then focus on those areas.",
  },
  {
    says: "We already have a supplier",
    means: "Switching feels risky.",
    move: "Ask what they like most about the current supplier and what still frustrates them.",
  },
  {
    says: "We don\u2019t have any problems",
    means: "I don\u2019t recognize the hidden cost of my current process.",
    move: "Shift to discovery. Ask about manual work, reporting, pricing changes, OTA management, and daily operations.",
  },
  {
    says: "Our system works fine",
    means: "I don\u2019t know what\u2019s possible beyond today.",
    move: "Ask about future growth plans and whether the current system can support them.",
  },
  {
    says: "We built our own system",
    means: "We\u2019ve invested too much to replace it easily.",
    move: "Respect the investment first, then ask what has become difficult to maintain or improve.",
  },
  {
    says: "Your system looks complicated",
    means: "I\u2019m worried about user adoption.",
    move: "Show one simple workflow that matches their daily operation instead of demonstrating every feature.",
  },
  {
    says: "My staff won\u2019t use it",
    means: "I\u2019m afraid my team will resist change.",
    move: "Explain the onboarding plan and demonstrate how easy the daily workflow is for each role.",
  },
  {
    says: "Training will take too long",
    means: "I\u2019m worried implementation will disrupt operations.",
    move: "Walk through the implementation plan and explain how training is delivered in phases.",
  },
  {
    says: "We don\u2019t have time right now",
    means: "This isn\u2019t my priority today.",
    move: "Ask what is taking priority and agree on a realistic follow-up date.",
  },
  {
    says: "Let\u2019s revisit after high season",
    means: "I don\u2019t want implementation risk now.",
    move: "Discuss planning before peak season or a phased rollout after peak operations.",
  },
  {
    says: "The owner doesn\u2019t like subscriptions",
    means: "The commercial model is the concern.",
    move: "Explore what commercial structure would make them comfortable before negotiating.",
  },
  {
    says: "Your competitor is cheaper",
    means: "I haven\u2019t seen enough value to justify the difference.",
    move: "Ask: \u201CBesides price, what matters most when choosing your long-term platform?\u201D",
  },
  {
    says: "We need this customization first",
    means: "I don\u2019t believe the standard workflow fits our business.",
    move: "Understand the business requirement first. Confirm whether it\u2019s essential or simply a preferred process.",
  },
  {
    says: "Can you guarantee more bookings?",
    means: "I\u2019m buying expected business outcomes, not software.",
    move: "Explain that seatOS enables better distribution and operations but doesn\u2019t control market demand.",
  },
  {
    says: "We only sell through walk-ins",
    means: "I don\u2019t see the value of digital distribution yet.",
    move: "Explore whether they want to increase sales, improve efficiency, or prepare for future growth.",
  },
  {
    says: "We don\u2019t use OTAs",
    means: "I don\u2019t understand the growth opportunity.",
    move: "Discuss future distribution strategy rather than trying to sell OTA integration immediately.",
  },
  {
    says: "Our operation is different",
    means: "I want proof that you understand my business.",
    move: "Pause the demo and spend more time understanding their workflow before recommending a solution.",
  },
  {
    says: "We have poor internet",
    means: "I\u2019m worried about operational reliability.",
    move: "Understand which branches are affected and explain how similar operators manage this situation.",
  },
  {
    says: "Support is very important",
    means: "I\u2019m evaluating your company, not only your product.",
    move: "Explain the implementation process, Customer Success model, SLAs, and ongoing support approach.",
  },
  {
    says: "We\u2019ve had a bad experience with another vendor",
    means: "I need confidence before I trust another provider.",
    move: "Ask what went wrong previously and explain how seatOS handles onboarding, communication, and support differently.",
  },
  {
    says: "Call me again next month",
    means: "I don\u2019t feel enough urgency today.",
    move: "Agree on a specific reason to reconnect and schedule the follow-up before ending the conversation.",
  },
  {
    says: "Email me the details",
    means: "I don\u2019t see enough reason to continue the conversation.",
    move: "Ask what questions they expect the email to answer, then tailor the follow-up accordingly.",
  },
  {
    says: "We don\u2019t want to migrate data",
    means: "I\u2019m afraid of losing information or creating extra work.",
    move: "Explain the migration process, clarify responsibilities, and reduce perceived implementation risk.",
  },
  {
    says: "Our processes are unique",
    means: "I\u2019m worried we\u2019ll have to change the way we work.",
    move: "Map their workflow first and identify which parts can remain unchanged and which can be improved.",
  },
  {
    says: "We need to see a live customer first",
    means: "I need social proof before making a decision.",
    move: "Share relevant customer stories or arrange a reference call if appropriate.",
  },
  {
    says: "We\u2019re waiting for another project to finish",
    means: "This project isn\u2019t getting management attention yet.",
    move: "Understand the timeline and agree on clear follow-up milestones instead of waiting indefinitely.",
  },
  {
    says: "We don\u2019t have enough IT resources",
    means: "I\u2019m worried implementation will consume internal resources.",
    move: "Explain what seatOS handles versus what is required from the customer, and estimate the effort together.",
  },
  {
    says: "We don\u2019t want to lock ourselves into one platform",
    means: "I\u2019m worried about long-term flexibility.",
    move: "Explain how seatOS integrates with partners and supports business growth without limiting future options.",
  },
  {
    says: "We\u2019ve never heard of seatOS before",
    means: "I don\u2019t have enough confidence in your company yet.",
    move: "Build credibility by sharing customer success stories, regional presence, and implementation experience.",
  },
  {
    says: "Can you integrate with our existing systems?",
    means: "I don\u2019t want to create more manual work.",
    move: "Understand the current ecosystem first, then explain relevant integration capabilities and implementation.",
  },
  {
    says: "We don\u2019t want to change before peak season",
    means: "Business continuity matters more than improvement right now.",
    move: "Suggest planning, testing, or preparation now so implementation can begin at the safest time.",
  },
];

export const objectionQuestions = [
  "Why do you feel that?",
  "Compared to what?",
  "Can you tell me more?",
  "What concerns you the most?",
  "If we solved that, would you be comfortable moving forward?",
];

const mkTkBtn = (on) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "1px",
  padding: "9px 15px",
  borderRadius: "11px",
  cursor: "pointer",
  border: "none",
  textAlign: "left",
  transition: "all .15s",
  background: on ? "#1A1A1A" : "transparent",
  color: on ? "#fff" : "#5a5248",
});
const mkTkSub = (on) => ({
  fontSize: "10.5px",
  fontWeight: 600,
  letterSpacing: "0.1px",
  whiteSpace: "nowrap",
  color: on ? "rgba(255,255,255,0.62)" : "#b6a894",
});

const TK_GROUPS = [
  { key: "philosophy", label: "Philosophy", sub: "Rules & principles" },
  { key: "sell", label: "What we sell", sub: "Pillars & points" },
  { key: "room", label: "In the room", sub: "Stakeholder plays" },
  { key: "objections", label: "Objections", sub: "Handle & decode" },
];

// Which sub-tab holds each search anchor.
const ANCHOR_TAB = {
  "tk-rules": "philosophy",
  "tk-pillars": "sell",
  "tk-points": "sell",
  "tk-stakeholder": "room",
  "tk-golden": "room",
  "tk-primary": "room",
  "tk-objections": "objections",
  "tk-decode": "objections",
};

export default function SellingToolkit({ request }) {
  const [tkSub, setTkSub] = useState("philosophy");
  const [objTab, setObjTab] = useState("core");
  const [decodeQ, setDecodeQ] = useState("");
  useEffect(() => {
    const t = request && ANCHOR_TAB[request.anchor];
    if (t) setTkSub(t);
  }, [request]);
  const tkGroups = TK_GROUPS.map((g) => ({
    label: g.label,
    sub: g.sub,
    style: mkTkBtn(tkSub === g.key),
    subStyle: mkTkSub(tkSub === g.key),
    go: () => setTkSub(g.key),
  }));
  const decodeNeedle = decodeQ.trim().toLowerCase();
  const decodeFiltered = decodeNeedle
    ? DECODE.filter((d) => (d.says + " " + d.means + " " + d.move).toLowerCase().includes(decodeNeedle))
    : DECODE;
  const decodeObjections = decodeFiltered;
  const decodeTotal = DECODE.length;
  const tkPhilosophy = tkSub === "philosophy";
  const tkSell = tkSub === "sell";
  const tkRoom = tkSub === "room";
  const tkObjections = tkSub === "objections";
  const valuePillars = [
    {
      fg: "#1f9d57",
      bg: "#eafaf1",
      icon: icon(["M3 17l6-6 4 4 7-7", "M14 8h6v6"], 2.2),
      title: "Grow Revenue",
      desc: "Sell more tickets through every channel.",
    },
    {
      fg: "#7C5CFC",
      bg: "#efeafe",
      icon: icon(["M13 2L3 14h8l-1 8 10-12h-8z"]),
      title: "Automate Operations",
      desc: "Reduce manual work and human error.",
    },
    {
      fg: "#1aa897",
      bg: "#e4faf6",
      icon: icon([
        "M5 12a2 2 0 100-4 2 2 0 000 4z",
        "M19 8a2 2 0 100-4 2 2 0 000 4z",
        "M19 20a2 2 0 100-4 2 2 0 000 4z",
        "M7 11l10-5M7 13l10 5",
      ]),
      title: "Connect Everything",
      desc: "One platform for OTAs, agents, counters, POS, kiosks and direct sales.",
    },
    {
      fg: "#c97f12",
      bg: "#fdf0db",
      icon: icon(["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"], 2.2),
      title: "Gain Visibility",
      desc: "Know where money is made — and where it is leaking.",
    },
    {
      fg: "#d83a72",
      bg: "#fdeaef",
      icon: icon(["M15 3h6v6", "M9 21H3v-6", "M21 3l-7 7", "M3 21l7-7"]),
      title: "Scale Without Complexity",
      desc: "Expand the business without expanding the operational burden.",
    },
  ];
  const showCore = objTab === "core";
  const showQuick = objTab === "quick";
  const setObjCore = () => setObjTab("core");
  const setObjQuick = () => setObjTab("quick");
  const coreBtnStyle = {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "12px",
    fontWeight: 800,
    padding: "7px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    letterSpacing: "-0.1px",
    transition: "all .15s",
    border: "none",
    background: objTab === "core" ? "#1A1A1A" : "#fff",
    color: objTab === "core" ? "#fff" : "#3a3530",
    boxShadow: objTab === "core" ? "none" : "0 1px 2px rgba(26,26,26,.12)",
  };
  const quickBtnStyle = {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "12px",
    fontWeight: 800,
    padding: "7px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    letterSpacing: "-0.1px",
    transition: "all .15s",
    border: "none",
    background: objTab === "quick" ? "#1A1A1A" : "#fff",
    color: objTab === "quick" ? "#fff" : "#3a3530",
    boxShadow: objTab === "quick" ? "none" : "0 1px 2px rgba(26,26,26,.12)",
  };
  const coreBadgeStyle = {
    fontSize: "10px",
    fontWeight: 800,
    padding: "1px 7px",
    borderRadius: "20px",
    background: objTab === "core" ? "rgba(255,255,255,.2)" : "#fdeaef",
    color: objTab === "core" ? "#fff" : "#d83a72",
  };
  const quickBadgeStyle = {
    fontSize: "10px",
    fontWeight: 800,
    padding: "1px 7px",
    borderRadius: "20px",
    background: objTab === "quick" ? "rgba(255,255,255,.2)" : "#fdeaef",
    color: objTab === "quick" ? "#fff" : "#d83a72",
  };
  const onDecodeQ = (e) => setDecodeQ(e.target.value);
  const decodeCount = decodeFiltered.length;
  const decodeEmpty = decodeFiltered.length === 0;
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
        Selling Toolkit
      </div>
      <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.7px", marginBottom: "10px" }}>
        How to win the deal
      </h1>
      <p style={{ fontSize: "15px", color: "#8E8E93", maxWidth: "720px", lineHeight: "1.6" }}>
        The how-to-sell side of the playbook: the philosophy we sell by, the value we lead with, the points that match a
        customer's pain, and the answers to the objections you'll hear most. The Sales Process tab covers{" "}
        <b style={{ color: "#5a5248" }}>what to do in HubSpot</b>; this is{" "}
        <b style={{ color: "#5a5248" }}>how to sell</b>.
      </p>
      <div
        id="tktop"
        style={{
          position: "sticky",
          top: "64px",
          zIndex: "15",
          background: "#F5EFE7",
          margin: "20px -34px 0",
          padding: "8px 34px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "5px",
            background: "#fff",
            border: "1px solid #ece2d2",
            borderRadius: "15px",
            padding: "5px",
            boxShadow: "0 1px 2px rgba(26,26,26,.05),0 10px 26px rgba(26,26,26,.05)",
            maxWidth: "720px",
          }}
        >
          {tkGroups.map((g, _i0) => (
            <button key={_i0} onClick={g.go} style={g.style}>
              <span style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "-0.2px", whiteSpace: "nowrap" }}>
                {g.label}
              </span>{" "}
              <span style={g.subStyle}>{g.sub}</span>
            </button>
          ))}
        </div>
      </div>
      {tkPhilosophy && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "13px", margin: "38px 0 4px" }}>
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
              Toolkit
            </span>{" "}
            <span
              id="tk-rules"
              style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}
            >
              How we sell at seatOS
            </span>{" "}
            <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
          </div>
          <p
            style={{ fontSize: "13.5px", color: "#8E8E93", lineHeight: "1.55", margin: "14px 0 0", maxWidth: "760px" }}
          >
            The philosophy behind every deal. Start with the rules, then the twelve principles that put them into
            practice.
          </p>
          <div
            style={{
              background: "#1A1A1A",
              borderRadius: "20px",
              padding: "30px 32px",
              marginTop: "18px",
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
                background: "radial-gradient(circle,rgba(245,166,35,.34),transparent 70%)",
              }}
            ></div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#F5A623", letterSpacing: "0.3px" }}>
                  ★ Pin these to every deal
                </span>
              </div>
              <h3 style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.4px", marginBottom: "20px" }}>
                The seatOS sales rules
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "13px 28px" }}>
                {salesRules.map((r, _i0) => (
                  <div key={_i0} style={{ display: "flex", gap: "13px", alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "8px",
                        background: "rgba(245,166,35,0.16)",
                        color: "#F5A623",
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "14px", marginTop: "16px" }}>
            {sellingPrinciples.map((sp, _i0) => (
              <div
                key={_i0}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "20px 22px",
                  boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "#fdf0db",
                    color: "#c97f12",
                    fontWeight: "800",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  {sp.n}
                </div>
                <div style={{ minWidth: "0" }}>
                  <div
                    style={{
                      fontSize: "14.5px",
                      fontWeight: "800",
                      color: "#1A1A1A",
                      lineHeight: "1.3",
                      letterSpacing: "-0.2px",
                    }}
                  >
                    {sp.title}
                  </div>
                  <p style={{ fontSize: "12.5px", color: "#6b6356", lineHeight: "1.55", marginTop: "6px" }}>
                    {sp.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {tkSell && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "13px", margin: "38px 0 4px" }}>
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
              Toolkit
            </span>{" "}
            <span
              id="tk-pillars"
              style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}
            >
              What we sell — the five pillars
            </span>{" "}
            <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
          </div>
          <p
            style={{ fontSize: "13.5px", color: "#8E8E93", lineHeight: "1.55", margin: "14px 0 0", maxWidth: "760px" }}
          >
            Lead with the outcome, not the feature list. Every seatOS conversation rolls up to one of these five.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "14px", marginTop: "18px" }}>
            {valuePillars.map((vp, _i0) => (
              <div
                key={_i0}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "20px",
                  boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: vp.bg,
                    color: vp.fg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {vp.icon}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "#1A1A1A",
                    marginTop: "13px",
                    letterSpacing: "-0.2px",
                    lineHeight: "1.2",
                  }}
                >
                  {vp.title}
                </div>
                <p style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.5", marginTop: "5px" }}>{vp.desc}</p>
              </div>
            ))}
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
              Toolkit
            </span>{" "}
            <span
              id="tk-points"
              style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}
            >
              Selling points — match one to their pain
            </span>{" "}
            <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "14px", marginTop: "18px" }}>
            {sellingPoints.map((sp, _i0) => (
              <div
                key={_i0}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "20px 22px",
                  boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "#eafaf1",
                    color: "#1f9d57",
                    fontWeight: "800",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                  }}
                >
                  {sp.n}
                </div>
                <div style={{ minWidth: "0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <div
                      style={{
                        fontSize: "14.5px",
                        fontWeight: "800",
                        color: "#1A1A1A",
                        lineHeight: "1.3",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      {sp.title}
                    </div>
                    {sp.core && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          color: "#1A1A1A",
                          background: "#F5A623",
                          padding: "2px 8px",
                          borderRadius: "20px",
                        }}
                      >
                        ★ Core
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "12.5px", color: "#6b6356", lineHeight: "1.55", marginTop: "6px" }}>
                    {sp.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {tkRoom && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "13px", margin: "38px 0 4px" }}>
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
              Toolkit
            </span>{" "}
            <span
              id="tk-stakeholder"
              style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}
            >
              Sell by stakeholder — value based on who's in the room
            </span>{" "}
            <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
          </div>
          <p
            style={{ fontSize: "13.5px", color: "#8E8E93", lineHeight: "1.55", margin: "14px 0 0", maxWidth: "760px" }}
          >
            Don't present products — present value. Every stakeholder buys seatOS for a different reason, so switch your
            story depending on who's speaking.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "14px", marginTop: "18px" }}>
            {stakeholderValue.map((s, _i0) => (
              <div
                key={_i0}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
                  overflow: "hidden",
                }}
              >
                <div style={{ height: "4px", background: s.fg }}></div>
                <div style={{ padding: "20px 22px" }}>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: s.fg, letterSpacing: "-0.2px" }}>
                    {s.dept}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#8E8E93", lineHeight: "1.4", marginTop: "3px" }}>
                    Cares about: {s.cares}
                  </div>
                  <div style={{ height: "1px", background: "#f3ece1", margin: "14px 0" }}></div>
                  <div
                    style={{
                      fontSize: "9.5px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#b6a894",
                      marginBottom: "8px",
                    }}
                  >
                    Selling points
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                    {s.points.map((pt, _i1) => (
                      <span
                        key={_i1}
                        style={{
                          fontSize: "11.5px",
                          fontWeight: "700",
                          color: s.fg,
                          background: s.bg,
                          padding: "5px 11px",
                          borderRadius: "20px",
                        }}
                      >
                        {pt}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: "9.5px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#b6a894",
                      margin: "14px 0 6px",
                    }}
                  >
                    Talk track
                  </div>
                  <p style={{ fontSize: "13px", color: "#3a3530", lineHeight: "1.5", fontStyle: "italic" }}>{s.talk}</p>
                </div>
              </div>
            ))}
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
              Toolkit
            </span>{" "}
            <span
              id="tk-golden"
              style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}
            >
              The golden mapping — show vs don't show
            </span>{" "}
            <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
          </div>
          <p
            style={{ fontSize: "13.5px", color: "#8E8E93", lineHeight: "1.55", margin: "14px 0 0", maxWidth: "760px" }}
          >
            In the meeting, mentally switch your story to match the person speaking — lead with what they care about,
            and drop what they don't.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginTop: "18px" }}>
            {goldenMapping.map((g, _i0) => (
              <div
                key={_i0}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "20px 22px",
                  boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
                }}
              >
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "800",
                    color: g.fg,
                    letterSpacing: "-0.2px",
                    marginBottom: "12px",
                  }}
                >
                  {g.dept}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    background: "#fdeaef",
                    borderRadius: "10px",
                    padding: "9px 12px",
                    marginBottom: "14px",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#d83a72"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    style={{ flexShrink: "0" }}
                  >
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>{" "}
                  <span style={{ fontSize: "12px", color: "#a32a55", lineHeight: "1.35" }}>
                    <b style={{ fontWeight: "800" }}>Don't show:</b> {g.dontShow}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "9.5px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "#1f9d57",
                    marginBottom: "8px",
                  }}
                >
                  Show
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  {g.show.map((sh, _i1) => (
                    <div
                      key={_i1}
                      style={{
                        display: "flex",
                        gap: "8px",
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
                        stroke="#1f9d57"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: "0", marginTop: "1px" }}
                      >
                        <path d="M3 8.5l3.5 3.5L13 4.5" />
                      </svg>
                      <span>{sh}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
              In HubSpot
            </span>{" "}
            <span
              id="tk-primary"
              style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}
            >
              Primary Buying Department → demo focus
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
            <p
              style={{
                fontSize: "13.5px",
                color: "#6b6356",
                lineHeight: "1.55",
                marginBottom: "18px",
                maxWidth: "760px",
              }}
            >
              After every discovery meeting, set a deal property called{" "}
              <b style={{ color: "#1A1A1A" }}>Primary Buying Department</b> — then tailor the demo to the focus below,
              so you never give the same generic presentation to every operator.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0 24px" }}>
              {demoFocus.map((d, _i0) => (
                <div key={_i0} style={{ display: "contents" }}>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "800",
                      color: "#1A1A1A",
                      padding: "12px 0",
                      borderTop: "1px solid #f3ece1",
                    }}
                  >
                    {d.buyer}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6b6356",
                      padding: "12px 0",
                      borderTop: "1px solid #f3ece1",
                      lineHeight: "1.4",
                    }}
                  >
                    {d.focus}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "18px", background: "#1A1A1A", borderRadius: "14px", padding: "16px 18px" }}>
              <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.78)", lineHeight: "1.55" }}>
                Every demo is tailored to the audience — because seatOS isn't a single product, it's a platform that
                creates different value for different stakeholders.
              </p>
            </div>
          </div>
        </>
      )}
      {tkObjections && (
        <>
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
              Toolkit
            </span>{" "}
            <span
              id="tk-objections"
              style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}
            >
              Handling objections
            </span>{" "}
            <span style={{ flex: "1", height: "1px", background: "#e6dcc6" }}></span>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", flexShrink: "0" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  color: "#b6a894",
                }}
              >
                View
              </span>
              <div style={{ display: "flex", gap: "3px", background: "#f1ead9", borderRadius: "11px", padding: "3px" }}>
                <button onClick={setObjCore} style={coreBtnStyle}>
                  The ones you'll hear most<span style={coreBadgeStyle}>6</span>
                </button>{" "}
                <button onClick={setObjQuick} style={quickBtnStyle}>
                  Quick responses<span style={quickBadgeStyle}>20</span>
                </button>
              </div>
            </div>
          </div>
          <p
            style={{ fontSize: "13.5px", color: "#8E8E93", lineHeight: "1.55", margin: "14px 0 0", maxWidth: "760px" }}
          >
            Don't prove, don't argue — ask. The best objection handling is another discovery question that gets the
            customer talking.
          </p>
          {showCore && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "14px", marginTop: "18px" }}>
              {objections.map((ob, _i0) => (
                <div
                  key={_i0}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    padding: "20px 22px",
                    boxShadow: "0 1px 2px rgba(26,26,26,.05),0 8px 24px rgba(26,26,26,.03)",
                  }}
                >
                  <div style={{ display: "flex", gap: "11px", alignItems: "flex-start", marginBottom: "13px" }}>
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "9px",
                        background: "#fdeaef",
                        color: "#d83a72",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: "0",
                      }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      >
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                    </div>
                    <div
                      style={{
                        fontSize: "14.5px",
                        fontWeight: "800",
                        color: "#1A1A1A",
                        lineHeight: "1.3",
                        letterSpacing: "-0.2px",
                        paddingTop: "5px",
                      }}
                    >
                      {ob.q}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "baseline", marginBottom: "11px" }}>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: "800",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#d83a72",
                        flexShrink: "0",
                      }}
                    >
                      Don't say
                    </span>{" "}
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: "#8E8E93",
                        lineHeight: "1.45",
                        textDecoration: "line-through",
                        textDecorationColor: "#e3b9c7",
                      }}
                    >
                      {ob.dont}
                    </span>
                  </div>
                  <div style={{ background: "#f4f9f4", borderRadius: "11px", padding: "12px 13px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#1f9d57"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.4 8.4 0 01-3.8-.9L3 20l1-4.2a8.4 8.4 0 01-1-4 8.4 8.4 0 018.5-8.3 8.4 8.4 0 019 8.3z" />
                      </svg>{" "}
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#1f9d57",
                        }}
                      >
                        Instead, ask
                      </span>
                    </div>
                    <p style={{ fontSize: "12.5px", color: "#2f5d3a", lineHeight: "1.55" }}>{ob.say}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showQuick && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "14px", marginTop: "18px" }}>
              {extraObjections.map((eo, _i0) => (
                <div
                  key={_i0}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    padding: "18px 20px",
                    boxShadow: "0 1px 2px rgba(26,26,26,.05),0 6px 18px rgba(26,26,26,.03)",
                  }}
                >
                  <div style={{ display: "flex", gap: "9px", alignItems: "flex-start", marginBottom: "7px" }}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="#d83a72"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      style={{ flexShrink: "0", marginTop: "3px" }}
                    >
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                    <div
                      style={{
                        fontSize: "13.5px",
                        fontWeight: "800",
                        color: "#1A1A1A",
                        lineHeight: "1.3",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      {eo.q}
                    </div>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "#6b6356", lineHeight: "1.55", paddingLeft: "23px" }}>
                    {eo.a}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              background: "#1A1A1A",
              borderRadius: "20px",
              padding: "28px 30px",
              marginTop: "16px",
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
                background: "radial-gradient(circle,rgba(124,92,252,.32),transparent 70%)",
              }}
            ></div>
            <div style={{ position: "relative" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.3px" }}>
                Don't prove. Don't argue. Ask.
              </h3>
              <p
                style={{
                  fontSize: "13.5px",
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: "1.55",
                  margin: "8px 0 18px",
                  maxWidth: "620px",
                }}
              >
                You're selling a platform that changes operations — your strongest asset isn't a slide deck, it's
                helping the operator uncover their own pain. The more the customer talks, the less you have to defend.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "9px" }}>
                {objectionQuestions.map((qq, _i0) => (
                  <span
                    key={_i0}
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#fff",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      padding: "9px 14px",
                      borderRadius: "11px",
                    }}
                  >
                    {qq}
                  </span>
                ))}
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
              Principle
            </span>{" "}
            <span
              id="tk-decode"
              style={{ fontSize: "16px", fontWeight: "800", color: "#1A1A1A", letterSpacing: "-0.2px" }}
            >
              Read the real objection first
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
            <p
              style={{
                fontSize: "13.5px",
                color: "#6b6356",
                lineHeight: "1.55",
                marginBottom: "16px",
                maxWidth: "760px",
              }}
            >
              Don't memorise responses — train the team to identify the real objection first. Uncovering the reason{" "}
              <i>behind</i> the objection, before trying to overcome it, is the difference between a product presenter
              and a consultative salesperson.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "6px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  background: "#FBF7F0",
                  borderRadius: "11px",
                  padding: "10px 14px",
                  flex: "1",
                  minWidth: "220px",
                  color: "#b6a894",
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ flexShrink: "0" }}
                >
                  <circle cx="7" cy="7" r="4.3" />
                  <path d="M10.5 10.5L14 14" />
                </svg>{" "}
                <input
                  value={decodeQ}
                  onChange={onDecodeQ}
                  placeholder="Filter objections…"
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "13.5px",
                    color: "#1A1A1A",
                    width: "100%",
                  }}
                />
              </div>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#b6a894", whiteSpace: "nowrap" }}>
                {decodeCount} of {decodeTotal}
              </span>
            </div>
            <div className="ds-scroll" style={{ maxHeight: "540px", overflowY: "auto", marginTop: "8px" }}>
              <div
                style={{ display: "grid", gridTemplateColumns: "0.9fr 1fr 1.4fr", gap: "0 20px", alignItems: "start" }}
              >
                <div
                  style={{
                    position: "sticky",
                    top: "0",
                    background: "#fff",
                    zIndex: "2",
                    fontSize: "9.5px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    color: "#b6a894",
                    padding: "0 0 10px",
                  }}
                >
                  What they say
                </div>
                <div
                  style={{
                    position: "sticky",
                    top: "0",
                    background: "#fff",
                    zIndex: "2",
                    fontSize: "9.5px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    color: "#b6a894",
                    padding: "0 0 10px",
                  }}
                >
                  What it usually means
                </div>
                <div
                  style={{
                    position: "sticky",
                    top: "0",
                    background: "#fff",
                    zIndex: "2",
                    fontSize: "9.5px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    color: "#b6a894",
                    padding: "0 0 10px",
                  }}
                >
                  What to do
                </div>
                {decodeObjections.map((dco, _i0) => (
                  <div key={_i0} style={{ display: "contents" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#1A1A1A",
                        padding: "12px 0",
                        borderTop: "1px solid #f3ece1",
                        lineHeight: "1.4",
                      }}
                    >
                      {dco.says}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "flex-start",
                        fontSize: "12.5px",
                        color: "#8E6a4a",
                        padding: "12px 0",
                        borderTop: "1px solid #f3ece1",
                        lineHeight: "1.4",
                        fontStyle: "italic",
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="#c97f12"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: "0", marginTop: "3px" }}
                      >
                        <path d="M3 8h9M8 4l4 4-4 4" />
                      </svg>
                      <span>{dco.means}</span>
                    </div>
                    <div
                      style={{
                        fontSize: "12.5px",
                        color: "#3a3530",
                        padding: "12px 0",
                        borderTop: "1px solid #f3ece1",
                        lineHeight: "1.45",
                      }}
                    >
                      {dco.move}
                    </div>
                  </div>
                ))}
              </div>
              {decodeEmpty && (
                <div style={{ padding: "24px 4px", fontSize: "13px", color: "#b6a894" }}>
                  No objection matches that filter.
                </div>
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
                marginTop: "18px",
                paddingTop: "16px",
                borderTop: "1px solid #f3ece1",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  color: "#d83a72",
                  background: "#fdeaef",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  letterSpacing: "0.3px",
                }}
              >
                Golden rule
              </span>{" "}
              <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#1A1A1A" }}>
                Don't answer the objection immediately.
              </span>{" "}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#6b6356",
                }}
              >
                1. Understand{" "}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="#c97f12"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 8h9M8 4l4 4-4 4" />
                </svg>{" "}
                2. Clarify{" "}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="#c97f12"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 8h9M8 4l4 4-4 4" />
                </svg>{" "}
                3. Respond
              </span>
            </div>
          </div>
        </>
      )}
      <div
        style={{
          background: "#FBF7F0",
          border: "1px solid #ece2d2",
          borderRadius: "18px",
          padding: "24px 26px",
          marginTop: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "30px",
              height: "30px",
              borderRadius: "9px",
              background: "#fff",
              color: "#b6a894",
              flexShrink: "0",
              boxShadow: "0 1px 2px rgba(26,26,26,.05)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9.5" />
              <path d="M12 11v5M12 7.5h.01" />
            </svg>
          </span>{" "}
          <span style={{ fontSize: "13px", fontWeight: "800", color: "#5a5248", letterSpacing: "-0.2px" }}>
            A note on using this playbook
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "9px", maxWidth: "820px" }}>
          <p style={{ fontSize: "13px", color: "#6b6356", lineHeight: "1.6" }}>
            This playbook is a practical guideline to help the BD team manage opportunities consistently in HubSpot and
            move deals forward with clearer structure.
          </p>
          <p style={{ fontSize: "13px", color: "#6b6356", lineHeight: "1.6" }}>
            Every BD team member is experienced and every operator is different. Use your own judgement, market
            knowledge, and relationship-management skills when applying it.
          </p>
          <p style={{ fontSize: "13px", color: "#6b6356", lineHeight: "1.6" }}>
            The goal is not to replace your experience, but to support it — helping the team qualify better, discover
            real pain points, tailor the demo, handle objections, and keep strong deal momentum.
          </p>
          <p style={{ fontSize: "13px", color: "#3a3530", lineHeight: "1.6", fontWeight: "700" }}>
            Use this as a guide, not a script. The best deals are still won through preparation, good discovery, strong
            relationships, and clear next steps.
          </p>
        </div>
      </div>
    </div>
  );
}
