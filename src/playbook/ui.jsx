// Shared building blocks for the Playbook sections.
import { createElement, useState } from "react";

// Renders `as` (button, div, …) and layers the `hover` style on while the pointer is over it.
export function Hover({ as = "div", style, hover, children, ...rest }) {
  const [on, setOn] = useState(false);
  return createElement(
    as,
    {
      ...rest,
      style: on ? { ...style, ...hover } : style,
      onMouseEnter: () => setOn(true),
      onMouseLeave: () => setOn(false),
    },
    children,
  );
}

// Feather-style stroke icon built from SVG path strings.
export function icon(paths, sw) {
  return (
    <svg
      width={19}
      height={19}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export const icHome = icon(["M3 9.5L12 3l9 6.5", "M5 9.5V20a1 1 0 001 1h12a1 1 0 001-1V9.5"]);
export const icSales = icon(["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"], 2);
export const icCS = icon([
  "M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z",
]);
export const icPricing = icon([
  "M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7-7A2 2 0 013 12V4a1 1 0 011-1h8a2 2 0 011.4.6l7.2 7.2a2 2 0 010 2.6z",
  "M7.5 7.5h.01",
]);
export const icCalc = icon([
  "M5 2.5h14a1 1 0 011 1v17a1 1 0 01-1 1H5a1 1 0 01-1-1v-17a1 1 0 011-1z",
  "M8 6.5h8",
  "M8 11h0M12 11h0M16 11h0M8 15h0M12 15h0M16 15h0",
]);
export const icProposal = icon([
  "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z",
  "M14 2v6h6",
  "M9 13h6M9 17h4",
]);
export const icContract = icon(["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", "M14 2v6h6", "M9 14l2 2 4-4"]);
export const icAdmin = icon(["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"]);
export const icTemplates = icon([
  "M5 7h8a1 1 0 011 1v11a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1z",
  "M9 4h9a1 1 0 011 1v11",
]);
export const icOnboarding = icon([
  "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z",
  "M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z",
  "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0",
  "M15 9V4s3.03.55 4 2c1.08 1.62 0 5 0 5",
]);
export const icTraining = icon([
  "M12 3L2 8l10 5 10-5-10-5z",
  "M6 10.5V16c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5.5",
  "M22 8v5",
]);
export const icToolkit = icon([
  "M12 2a10 10 0 100 20 10 10 0 000-20z",
  "M12 7a5 5 0 100 10 5 5 0 000-10z",
  "M12 11a1 1 0 100 2 1 1 0 000-2z",
]);
export const icCSTools = icon([
  "M12 2a10 10 0 100 20 10 10 0 000-20z",
  "M12 8a4 4 0 100 8 4 4 0 000-8z",
  "M4.9 4.9l3.5 3.5",
  "M15.6 15.6l3.5 3.5",
  "M19.1 4.9l-3.5 3.5",
  "M8.4 15.6l-3.5 3.5",
]);
export const icCSAuto = icon([
  "M12 2v4",
  "M12 18v4",
  "M4.9 4.9l2.8 2.8",
  "M16.3 16.3l2.8 2.8",
  "M2 12h4",
  "M18 12h4",
  "M4.9 19.1l2.8-2.8",
  "M16.3 7.7l2.8-2.8",
]);
