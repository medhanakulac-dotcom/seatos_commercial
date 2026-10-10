/**
 * SeatOS weekly usage sync: BigQuery -> Operator Watch (dealsuite.app).
 *
 * Runs two queries as YOU (your Google account already has BigQuery access) for the current week and the previous week
 * (Monday-Sunday, Bangkok time) and posts the results to the site, one row per operator:
 *   - usage: which WAO categories fired and which SeatOS features were used (events, active days);
 *   - tickets: tickets sold that week (dwh.fact_operator_tickets_actual_vs_target).
 * The site replaces those weeks, so running it often is safe.
 *
 * Setup (once), see server/operator-watch/bigquery/README.md:
 *   1. script.google.com -> New project -> paste this file.
 *   2. Services (+) -> add "BigQuery API" (identifier BigQuery).
 *   3. Project Settings -> Script properties -> add INGEST_TOKEN = the WEEKLY_INGEST_TOKEN set on Vercel.
 *      (Optional INGEST_URL = the site's ingest base, default below.)
 *   4. Run syncAll once and accept the permissions, then run installTrigger once (daily at about 06:00).
 *
 * Events -> features: each feature owns an event-name pattern (Feature Event Map, Prab, 9 Oct 2026). WAO categories use the
 * events the map marks as counting toward WAO (tier A/B): >= 3 of 7 categories in a week = an active operator.
 * Cost: the query reads about 10 MB per week.
 */
var PROJECT_ID = 'seatos-tms';
var TZ = 'Asia/Bangkok';
var DEFAULT_URL = 'https://dealsuite.app/api/ow/ingest';

/** Event names (lower case) that count toward WAO, with their category: i d r t f a c. */
var WAO_EVENTS = [
  'aa_add_addons:i,aa_edit_addons:i,al_date_range_selected:c,al_exported:c,',
  'al_filter_applied:c,al_opened:c,al_record_viewed:c,al_search_performed:c,',
  'am_accounting_download_excel:c,am_add_new_agent:d,am_add_new_agent_type:d,am_invoices_add_invoice:c,',
  'am_invoices_change_payment_status:c,am_invoices_download:c,am_invoices_email:c,am_invoices_regenerate:c,',
  'am_refund_policy_agent_type:d,bf_operator_booking:r,bf_tour_booking_created:r,bf_vehicle_on_ferry_booking_completed:r,',
  'bl_filter_arrival_station:r,bl_filter_bookingid:r,bl_filter_by_route:r,bl_filter_channel:r,',
  'bl_filter_check_status:r,bl_filter_depart_st:r,bl_filter_depart_time:r,bl_filter_payment_status:r,',
  'bl_filter_payonsite:r,bl_filter_status:r,bl_filter_user:r,bl_filter_vehicle:r,',
  'bl_filters_to_settle_with:r,bl_trip_stat:t,bldr_custom_range:r,bldr_last_month:r,',
  'bldr_next7days:r,bldr_next_month:r,bldr_this_month:r,bldr_today:r,',
  'bldr_tomorrow:r,bldr_yesterday:r,bp_cancel_booking:r,bp_change_price:r,',
  'bp_change_price_faretype:r,bp_download_pdf:r,bp_edit_booking:r,bp_print ticket:r,',
  'bp_print_ticket:r,bp_send_by_email:r,bp_send_by_sms:r,checkin_done_with_print:t,',
  'checkin_done_with_vehicle:t,checkin_qr_scan:t,db_click_booking_status_filter:a,db_click_booking_status_filter_option:a,',
  'db_click_channel_filter:a,db_click_channel_filter_option:a,db_click_customer_segment_filter:a,db_click_customer_segment_filter_option:a,',
  'db_click_date_picker:a,db_click_date_picker_option:a,db_click_lead_time_filter:a,db_click_lead_time_filter_option:a,',
  'db_click_route_filter:a,db_click_route_filter_option:a,db_click_sales_channel_graph_granularity:a,db_click_sales_channel_graph_granularity_option:a,',
  'db_click_tickets_revenue_graph_granulari:a,db_click_tickets_revenue_graph_granularity:a,db_click_tickets_revenue_graph_granularity_option:a,db_click_vehicle_class_filter:a,',
  'db_click_vehicle_class_filter_option:a,db_hover_departure_time_graph_point:a,db_hover_sales_channel_graph_point:a,db_hover_tickets_revenue_graph_point:a,',
  'db_page_view:a,db_scroll_to_channel_table:a,db_scroll_to_departure_time_graph:a,db_scroll_to_route_table:a,',
  'db_scroll_to_vehicle_class_table:a,dm_driver_assigned_to_trip:f,dm_driver_created:f,dm_driver_documents_edited:f,',
  'dm_driver_employment_edited:f,dm_driver_list_opened:f,dm_driver_note_added:f,dm_driver_personal_info_edited:f,',
  'dm_driver_photo_uploaded:f,dm_driver_profile_opened:f,dm_driver_qualifications_edited:f,dm_driver_status_changed:f,',
  'dm_driver_unassigned_from_trip:f,dm_fleet_schedule_opened:f,dm_fleet_schedule_view_toggled:f,dm_rot_plan_applied:f,',
  'dm_rot_plan_created:f,dm_rot_plan_deleted:f,dm_rot_plan_opened:f,dm_rot_schedule_added:f,',
  'drv_app_opened:f,drv_checkin_manual_entry:f,drv_checkin_scanned:f,drv_home_viewed:f,',
  'drv_profile_settings_opened:f,drv_qr_scanner_opened:f,drv_schedule_view_toggled:f,drv_schedule_viewed:f,',
  'drv_trip_detail_opened:f,manifest_printed_with_template:t,manifest_template_created:t,manifest_template_status_changed:t,',
  'manifest_template_updated:t,pdp_arrival_st_filter:t,pdp_create_manifest:t,pdp_departure_st_filter:t,',
  'pdp_departure_time_filter:t,pdp_pickup_drop_off_filter:t,pdp_route_filter:t,pn_open_notification_modal:t,',
  'pn_select_channel_mode:t,pn_select_passengers:t,pn_select_template:t,pn_send_blocked:t,',
  'pn_send_clicked:t,pn_send_initiated:t,rh_date_range_changed:a,rh_daterange_report_created:a,',
  'rh_dynamic_report_created:a,rh_filter_applied:a,rh_report_created:a,rh_report_deleted:a,',
  'rh_report_duplicated:a,rh_report_edited:a,rh_report_exported:a,rh_report_refreshed:a,',
  'rh_report_viewed:a,rm_addon_per_passenger_created:i,rm_seat_override_schedule:i,sr_set_up_rule:i,',
  'tm_activate_trip_bulk_action:t,tm_agent_register:d,tm_create_price_table_for_period:i,tm_deactivate_bulk_action:t,',
  'tm_deactivate_trip_in_popup:t,tm_seat_reassigned:t,tm_trip_stat:t,trip_quota_changed:t,',
  'trip_quota_override_changed:t,trm_total_vehicle_deck_capacity_set:f,trm_vehicle_deck_capacity_set:f,trm_vehicle_on_ferry_option_created:f'
].join('');

/** Feature code -> pattern on the lower-cased event_name, checked in this order (first match wins). */
var FEATURE_PATTERNS = [
  ['exp', '^(tm_expense_|tm_fixedcost|tm_trip_expenses|tm_trip_cost|tm_trip_margin|drv_expense_)'],
  ['dbai', '^db_insight_'],
  ['bf', '^(bf_|booking_created$)'],
  ['bp', '^bp_'],
  ['bl', '^(bl_filter|bldr_)'],
  ['tp', '^tp_'],
  ['pos', '^pos_'],
  ['cg', '^(cg_|ib_)'],
  ['trip', '^(tm_activate_trip|tm_deactivate|tm_trip_stat$|bl_trip_stat$|trip_quota|trip_select_individual|tm_seat_reassigned)'],
  ['pdp', '^pdp_'],
  ['manifest', '^manifest_'],
  ['checkin', '^checkin_'],
  ['pn', '^pn_'],
  ['inc', '^(tm_incident_|tm_fuel_)'],
  ['rm', '^rm_'],
  ['price', '^(sr_|tm_create_price_table|route_price_change$)'],
  ['aa', '^aa_'],
  ['st', '^st_'],
  ['tr', '^tr_'],
  ['cc', '^cc_'],
  ['am', '^(am_add_new_agent|am_refund_policy|am_agent_)'],
  ['ap', '^ap_'],
  ['trm', '^(trm_|fm_vr_)'],
  ['fmm', '^fm_(mtn|cpi)_'],
  ['dm', '^dm_(driver|fleet)_'],
  ['rot', '^dm_rot_'],
  ['dp', '^dm_dp_'],
  ['drv', '^drv_'],
  ['db', '^db_'],
  ['rh', '^rh_'],
  ['srp', '^srp_'],
  ['ei', '^ei_'],
  ['inv', '^(am_invoices_|am_accounting_|am_history_|invoice_paid$)'],
  ['al', '^al_'],
  ['ga4', '^(page_view|scroll|user_engagement|session_start|first_visit|form_start|form_submit|file_download|click|view_search_results)$'],
  ['auth', '^tm_(manager|agent|booker|steward)_login$|^tm_agent_register$|^/login'],
  ['ff', '^ff_'],
  ['pin', '^(pin_filters_|filter_pinned|filter_unpinned)'],
  ['settings', '^(settings_saved|us_|profile_|pay_gateway|import_|website_)']
];

/** Features that are not product usage: GA4 automatic events and the reserved pinned-filter events. */
var SKIP_FEATURES = ['ga4', 'pin'];

function syncAll() {
  syncWeek_(0); // this week so far
  syncWeek_(1); // last week, final
  syncPricing(); // price vs other operators (own error handling: a failure here must not hide the weekly sync)
}

// Price comparison: each operator's average ticket price vs the other operators selling the SAME route (from/to station),
// vehicle type and vehicle class, in the same currency. Confirmed bookings of the last PRICE_WINDOW_DAYS days.
var PRICE_WINDOW_DAYS = 90;
var PRICE_MIN_PEER_TICKETS = 10;   // the others must have sold at least this many tickets in the segment
var PRICE_MIN_OWN_TICKETS = 5;     // and the operator itself at least this many
var PRICE_MIN_OPERATOR_TICKETS = 100; // an operator needs this many compared tickets overall to be reported
var PRICE_DETAIL_SEGMENTS = 8;

function syncPricing() {
  var rows = runQuery_(pricingSql_()).map(function (r) {
    return {
      operatorId: Number(r[0]), operatorName: r[1], currency: r[2], from: r[3], to: r[4], vehicleType: r[5], vehicleClass: r[6],
      tickets: Number(r[7]), avgPrice: Number(r[8]), peerAvgPrice: Number(r[9]), peers: Number(r[10]),
    };
  });
  var byOperator = {};
  rows.forEach(function (s) {
    var key = s.operatorId + '|' + s.currency;
    var o = byOperator[key] || (byOperator[key] = { operatorId: s.operatorId, operatorName: s.operatorName, currency: s.currency, ticketsCompared: 0, segments: 0, own: 0, peer: 0, segs: [] });
    o.ticketsCompared += s.tickets;
    o.segments += 1;
    o.own += s.tickets * s.avgPrice;
    o.peer += s.tickets * s.peerAvgPrice; // what the same tickets would have cost at the others' average price
    o.segs.push({ from: s.from, to: s.to, vehicleType: s.vehicleType, vehicleClass: s.vehicleClass, tickets: s.tickets, avgPrice: round_(s.avgPrice, 2), peerAvgPrice: round_(s.peerAvgPrice, 2), peers: s.peers, pct: round_(100 * (s.avgPrice / s.peerAvgPrice - 1), 1) });
  });
  var out = Object.keys(byOperator).map(function (k) { return byOperator[k]; })
    .filter(function (o) { return o.ticketsCompared >= PRICE_MIN_OPERATOR_TICKETS && o.peer > 0; })
    .map(function (o) {
      o.segs.sort(function (a, b) { return Math.abs(b.pct) * b.tickets - Math.abs(a.pct) * a.tickets; });
      return { operatorId: o.operatorId, operatorName: o.operatorName, currency: o.currency, ticketsCompared: o.ticketsCompared, segments: o.segments, pricePct: round_(100 * (o.own / o.peer - 1), 1), detail: o.segs.slice(0, PRICE_DETAIL_SEGMENTS) };
    });
  return post_('pricing', { windowDays: PRICE_WINDOW_DAYS, rows: out });
}

function round_(n, digits) {
  var f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

function pricingSql_() {
  return 'WITH b AS (SELECT t.operator_id, t.operator_name, t.currency, f.from_station, f.to_station, f.vehicle_type, f.vehicle_class, t.tickets, t.total_price ' +
    'FROM `' + PROJECT_ID + '.raw_tables.tc_export_bookings_table` t JOIN `' + PROJECT_ID + '.dwh.fact_booking` f USING (book_id) ' +
    'WHERE t.status = \'CONFIRMED\' AND t.booked_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ' + PRICE_WINDOW_DAYS + ' DAY) AND t.tickets > 0 AND t.total_price > 0), ' +
    'seg AS (SELECT operator_id, ANY_VALUE(operator_name) AS operator_name, currency, from_station, to_station, vehicle_type, vehicle_class, SUM(tickets) AS tickets, SUM(total_price) AS total ' +
    'FROM b WHERE from_station IS NOT NULL AND to_station IS NOT NULL AND vehicle_type IS NOT NULL AND vehicle_class IS NOT NULL ' +
    'GROUP BY operator_id, currency, from_station, to_station, vehicle_type, vehicle_class), ' +
    'cmp AS (SELECT *, SUM(total) OVER w - total AS peer_total, SUM(tickets) OVER w - tickets AS peer_tickets, COUNT(*) OVER w - 1 AS peers FROM seg ' +
    'WINDOW w AS (PARTITION BY currency, from_station, to_station, vehicle_type, vehicle_class)) ' +
    'SELECT operator_id, operator_name, currency, from_station, to_station, vehicle_type, vehicle_class, tickets, total / tickets AS avg_price, peer_total / peer_tickets AS peer_avg_price, peers ' +
    'FROM cmp WHERE peers >= 1 AND peer_tickets >= ' + PRICE_MIN_PEER_TICKETS + ' AND tickets >= ' + PRICE_MIN_OWN_TICKETS;
}

/** Backfill: syncBack(12) sends the last 12 weeks, oldest first. */
function syncBack(weeks) {
  for (var back = weeks; back >= 0; back--) syncWeek_(back);
}

function syncWeek_(weeksBack) {
  var monday = mondayOf_(weeksBack);
  var start = monday + ' 00:00:00+07:00';
  var end = addDays_(monday, 7) + ' 00:00:00+07:00';
  var names = {};
  runQuery_('SELECT operator_id, operator_name FROM `' + PROJECT_ID + '.dwh.dim_operator`').forEach(function (r) {
    names[r[0]] = r[1];
  });
  var operators = {};
  runQuery_(usageSql_(start, end)).forEach(function (r) {
    var id = Number(r[0]);
    var op = operators[id] || (operators[id] = { operatorId: id, operatorName: names[id] || 'Operator ' + id, categories: [], features: {} });
    if (r[1] === 'category') op.categories.push(r[2]);
    else op.features[r[2]] = { events: Number(r[3]), days: Number(r[4]) };
  });
  var rows = Object.keys(operators).map(function (k) { return operators[k]; });
  var result = post_('weekly-usage', { week: monday, rows: rows });
  Logger.log('Usage, week of %s: %s operators sent -> %s', monday, rows.length, JSON.stringify(result));

  var tickets = runQuery_(ticketsSql_(monday, addDays_(monday, 6))).map(function (r) {
    return { operatorId: Number(r[0]), operatorName: r[1] || names[r[0]] || 'Operator ' + r[0], tickets: Number(r[2]) };
  });
  var ticketResult = post_('weekly-tickets', { week: monday, rows: tickets });
  Logger.log('Tickets, week of %s: %s operators sent -> %s', monday, tickets.length, JSON.stringify(ticketResult));
}

/** Tickets sold per operator in the week (dates inclusive); operators with no sales are left out. */
function ticketsSql_(firstDate, lastDate) {
  return 'SELECT operator_id, ANY_VALUE(operator_name) AS operator_name, SUM(daily_actual_tickets) AS tickets FROM `' + PROJECT_ID +
    '.dwh.fact_operator_tickets_actual_vs_target` WHERE date BETWEEN \'' + firstDate + '\' AND \'' + lastDate + '\' GROUP BY 1 HAVING SUM(daily_actual_tickets) > 0';
}

function usageSql_(start, end) {
  var events = '(SELECT event_timestamp, user_pseudo_id, LOWER(event_name) AS n, ep_operator_id AS op, DATE(timestamp, \'' + TZ + '\') AS d FROM `' + PROJECT_ID + '.raw_tables.TABLE` ' +
    'WHERE timestamp >= TIMESTAMP(\'' + start + '\') AND timestamp < TIMESTAMP(\'' + end + '\') AND ep_operator_id IS NOT NULL)';
  var whens = FEATURE_PATTERNS.map(function (p) { return 'WHEN REGEXP_CONTAINS(n, r\'' + p[1] + '\') THEN \'' + p[0] + '\''; }).join(' ');
  return 'WITH ev AS (' + events.replace('TABLE', 'events_flatten') + ' UNION DISTINCT ' + events.replace('TABLE', 'events_flatten_intraday') + '), ' +
    'w AS (SELECT SPLIT(x, \':\')[OFFSET(0)] AS n, SPLIT(x, \':\')[OFFSET(1)] AS c FROM UNNEST(SPLIT(\'' + WAO_EVENTS + '\', \',\')) AS x), ' +
    'f AS (SELECT op, d, CASE ' + whens + ' END AS code FROM ev), ' +
    'c AS (SELECT ev.op, ev.d, w.c AS code FROM ev JOIN w USING (n)) ' +
    'SELECT op, \'feature\' AS kind, code, COUNT(*) AS events, COUNT(DISTINCT d) AS days FROM f WHERE code IS NOT NULL AND code NOT IN (' +
    SKIP_FEATURES.map(function (s) { return '\'' + s + '\''; }).join(', ') + ') GROUP BY 1, 2, 3 ' +
    'UNION ALL SELECT op, \'category\', code, COUNT(*), COUNT(DISTINCT d) FROM c GROUP BY 1, 2, 3';
}

/** Runs a standard-SQL query and returns every row as an array of strings. */
function runQuery_(sql) {
  var job = BigQuery.Jobs.query({ query: sql, useLegacySql: false, timeoutMs: 120000 }, PROJECT_ID);
  var jobId = job.jobReference.jobId;
  var location = job.jobReference.location;
  while (!job.jobComplete) {
    Utilities.sleep(1000);
    job = BigQuery.Jobs.getQueryResults(PROJECT_ID, jobId, { location: location });
  }
  var rows = [];
  var page = job;
  while (true) {
    (page.rows || []).forEach(function (r) {
      rows.push(r.f.map(function (c) { return c.v; }));
    });
    if (!page.pageToken) break;
    page = BigQuery.Jobs.getQueryResults(PROJECT_ID, jobId, { location: location, pageToken: page.pageToken });
  }
  return rows;
}

function post_(path, payload) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('INGEST_TOKEN');
  if (!token) throw new Error('Add the script property INGEST_TOKEN (the WEEKLY_INGEST_TOKEN set on Vercel).');
  var res = UrlFetchApp.fetch((props.getProperty('INGEST_URL') || DEFAULT_URL).replace(/\/$/, '') + '/' + path, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('Operator Watch answered ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
  var body = JSON.parse(res.getContentText());
  delete body.unmatched; // names to match by hand live on the site (Settings -> Weekly data)
  return body;
}

/** Monday (YYYY-MM-DD) of the week `weeksBack` weeks ago, in Bangkok time. */
function mondayOf_(weeksBack) {
  var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var date = new Date(today + 'T12:00:00Z');
  var sinceMonday = (date.getUTCDay() + 6) % 7;
  return addDays_(today, -sinceMonday - 7 * weeksBack);
}

function addDays_(iso, days) {
  var d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Run once: syncs every day at about 06:00 (script time zone) so the site is fresh each morning. */
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncAll') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncAll').timeBased().everyDays(1).atHour(6).create();
}
