// Playbook navigation: the sidebar groups and the page each item opens.
// To add or rename a page: add its component in ./sections, register it in SECTIONS,
// then list it in NAV. Tool items open an app from src/apps instead of a Playbook page.
import {
  icHome, icSales, icToolkit, icOnboarding, icTraining, icCS, icCSTools,
  icPricing, icCalc, icProposal, icContract, icTemplates, icAdmin,
  icOwHome, icOwAccounts, icOwSettings,
} from "./ui.jsx";
import Home from "./sections/Home.jsx";
import SalesProcess from "./sections/SalesProcess.jsx";
import SellingToolkit from "./sections/SellingToolkit.jsx";
import Onboarding from "./sections/Onboarding.jsx";
import TrainingStructure from "./sections/TrainingStructure.jsx";
import CustomerSuccess from "./sections/CustomerSuccess.jsx";
import CSToolkit from "./sections/CSToolkit.jsx";
import Pricing from "./sections/Pricing.jsx";
import Templates from "./sections/Templates.jsx";

// key → page title (shown in the header breadcrumb and search results) and component.
export const SECTIONS = {
  home: { title: "Home", component: Home },
  sales: { title: "Sales Process", component: SalesProcess },
  toolkit: { title: "Selling Toolkit", component: SellingToolkit },
  onboarding: { title: "Onboarding", component: Onboarding },
  training: { title: "Training Structure", component: TrainingStructure },
  cs: { title: "Customer Success", component: CustomerSuccess },
  cstk: { title: "CS Toolkit", component: CSToolkit },
  pricing: { title: "Pricing & Packages", component: Pricing },
  templates: { title: "Templates & Docs", component: Templates },
};

// Tools live in src/apps and open over the content area.
export const TOOLS = {
  calculator: { title: "Deal Calculator" },
  proposal: { title: "Proposal Builder" },
  contract: { title: "Contract Builder" },
  admin: { title: "Admin" },
  // CS Operator Watch (src/operator-watch): one app, each item opens one of its pages.
  "ow-home": { title: "Operator Watch" },
  "ow-accounts": { title: "Operator Watch · Accounts" },
  "ow-settings": { title: "Operator Watch · Settings" },
};

const Q3 = { text: "Q3", bg: "#F5A623" };

// Sidebar. `accent` colours the active bar; `iconAccent` overrides the active icon colour.
export const NAV = [
  {
    group: "Workspace",
    items: [{ section: "home", label: "Home", icon: icHome, accent: "#F5A623" }],
  },
  {
    group: "Playbook",
    items: [
      { section: "sales", label: "Sales Process", icon: icSales, accent: "#7C5CFC" },
      { section: "toolkit", label: "Selling Toolkit", icon: icToolkit, accent: "#E84C88" },
      { section: "onboarding", label: "Onboarding", icon: icOnboarding, accent: "#F5A623" },
      { section: "training", label: "Training Structure", icon: icTraining, accent: "#F5A623", badge: Q3 },
      { section: "cs", label: "Customer Success", icon: icCS, accent: "#2DD4BF" },
      { section: "cstk", label: "CS Toolkit", icon: icCSTools, accent: "#1aa897", iconAccent: "#2DD4BF" },
      { section: "pricing", label: "Pricing & Packages", icon: icPricing, accent: "#E84C88" },
    ],
  },
  {
    group: "Operator Watch",
    items: [
      { tool: "ow-home", label: "Overview", icon: icOwHome, accent: "#2DD4BF" },
      { tool: "ow-accounts", label: "Accounts", icon: icOwAccounts, accent: "#2DD4BF" },
      { tool: "ow-settings", label: "Settings", icon: icOwSettings, accent: "#2DD4BF" },
    ],
  },
  {
    group: "Tools",
    items: [
      { tool: "calculator", label: "Deal Calculator", icon: icCalc, accent: "#2ECC71" },
      { tool: "proposal", label: "Proposal Builder", icon: icProposal, accent: "#F5A623" },
      { tool: "contract", label: "Contract Builder", icon: icContract, accent: "#1aa897" },
      { section: "templates", label: "Templates & Docs", icon: icTemplates, accent: "#7C5CFC", badge: { text: "This week", bg: "#2DD4BF" } },
      { tool: "admin", label: "Admin", icon: icAdmin, accent: "#7C5CFC", adminOnly: true },
    ],
  },
];
