/**
 * SeatOS features (Feature Event Map by Prab, 9 Oct 2026; draft taxonomy, to be signed off by Product). `code` is the
 * key used in the weekly BigQuery sync: bigquery/weekly-sync.gs maps each event_name to a code by the same patterns.
 */
export interface SeatosFeature {
  readonly code: string;
  readonly name: string;
  readonly module: string;
}

export const SEATOS_FEATURES: readonly SeatosFeature[] = [
  { code: 'bf', name: 'Booking Form', module: 'Reservation Management' },
  { code: 'bp', name: 'Booking Panel (booking popup)', module: 'Reservation Management' },
  { code: 'bl', name: 'Booking List', module: 'Reservation Management' },
  { code: 'tp', name: 'Tour Products', module: 'Reservation Management' },
  { code: 'pos', name: 'POS Mode', module: 'Reservation Management' },
  { code: 'cg', name: 'Concierge (AI inbox)', module: 'Reservation Management' },
  { code: 'trip', name: 'Trip Management', module: 'Trip Management' },
  { code: 'pdp', name: 'Passenger Manifest (Pickup / Drop-off)', module: 'Trip Management' },
  { code: 'manifest', name: 'Manifest Templates', module: 'Trip Management' },
  { code: 'checkin', name: 'Check-in (QR / kiosk)', module: 'Trip Management' },
  { code: 'pn', name: 'Passenger Notifications', module: 'Trip Management' },
  { code: 'exp', name: 'Trip Expenses', module: 'Trip Management' },
  { code: 'inc', name: 'Incidents & Fuel Log', module: 'Trip Management' },
  { code: 'rm', name: 'Route Management', module: 'Inventory Management' },
  { code: 'price', name: 'Pricing', module: 'Inventory Management' },
  { code: 'aa', name: 'Add-ons', module: 'Inventory Management' },
  { code: 'st', name: 'Stations & POIs', module: 'Inventory Management' },
  { code: 'tr', name: 'Tour Management', module: 'Inventory Management' },
  { code: 'cc', name: 'Command Center', module: 'Inventory Management' },
  { code: 'am', name: 'Agent Management', module: 'Distribution Management' },
  { code: 'ap', name: 'Agent Portal (connections)', module: 'Distribution Management' },
  { code: 'trm', name: 'Vehicles & Transport', module: 'Fleet Management' },
  { code: 'fmm', name: 'Fleet Maintenance & Compliance', module: 'Fleet Management' },
  { code: 'dm', name: 'Driver Management', module: 'Fleet Management' },
  { code: 'rot', name: 'Driver Rotation (Rota plans)', module: 'Fleet Management' },
  { code: 'dp', name: 'Dispatch', module: 'Fleet Management' },
  { code: 'drv', name: 'Driver App', module: 'Fleet Management' },
  { code: 'db', name: 'Sales Dashboard', module: 'Analytics' },
  { code: 'dbai', name: 'AI Insights (Sales Dashboard)', module: 'Analytics' },
  { code: 'rh', name: 'Reporting Hub', module: 'Analytics' },
  { code: 'srp', name: 'Sales Report', module: 'Analytics' },
  { code: 'ei', name: 'Expense Insights', module: 'Analytics' },
  { code: 'inv', name: 'Agent Invoicing & Accounting', module: 'Accounting' },
  { code: 'al', name: 'Audit Log', module: 'Accounting' },
  { code: 'ga4', name: 'GA4 automatic events', module: 'System / Platform' },
  { code: 'auth', name: 'Login & Registration', module: 'System / Platform' },
  { code: 'ff', name: 'Feature Flags', module: 'System / Platform' },
  { code: 'pin', name: 'Pinned Filters (reserved)', module: 'System / Platform' },
  { code: 'settings', name: 'Settings & Admin', module: 'System / Platform' },
];

const BY_CODE = new Map(SEATOS_FEATURES.map((f) => [f.code, f]));

export const featureByCode = (code: string): SeatosFeature | undefined => BY_CODE.get(code);

/** The sync's short category codes → the seven WAO categories (as stored in weekly_usage). */
export const CATEGORY_CODES = {
  i: 'inventory_management',
  d: 'distribution_management',
  r: 'reservation_management',
  t: 'trip_management',
  f: 'fleet_management',
  a: 'analytics',
  c: 'accounting',
} as const;
