import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../app.module';
import { AUTH_REPOSITORY, InMemoryAuthRepository, Role } from '../../auth/auth.repository';
import { IDENTITY_VERIFIER, StaticIdentityVerifier } from '../../auth/identity.verifier';
import { TMS_DIRECTORY } from '../../domain/workspace/types/repositories/workspace.ports';

type Method = 'GET' | 'POST' | 'PUT';
const AGENT_TOKEN = 'test-agent-token-weekly-0123';
const INGEST_TOKEN = 'test-ingest-token-weekly-4567';

/** Weekly uploads end to end on the in-memory stores and the mock CRM. */
describe('Weekly data HTTP integration', () => {
  let app: NestFastifyApplication;
  const tokens: Partial<Record<Role, string>> = {};
  const saved = { ...process.env };
  let accounts: { id: string; name: string }[];

  const call = (method: Method, url: string, role: Role, payload?: unknown) =>
    app.getHttpAdapter().getInstance().inject({
      method,
      url,
      headers: { authorization: tokens[role], ...(payload !== undefined ? { 'content-type': 'application/json' } : {}) },
      payload: payload === undefined ? undefined : JSON.stringify(payload),
    });
  const ingest = (body: unknown, token: string | null = INGEST_TOKEN, path = 'weekly-usage') =>
    app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: `/ingest/${path}`,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      payload: JSON.stringify(body),
    });
  const mcp = async (name: string, args: Record<string, unknown>) => {
    const res = await app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/mcp',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${AGENT_TOKEN}` },
      payload: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
    });
    return JSON.parse(res.json().result.content[0].text);
  };

  beforeAll(async () => {
    for (const k of ['DATABASE_URL', 'CRM_SOURCE', 'HUBSPOT_ACCESS_TOKEN', 'ANTHROPIC_API_KEY']) delete process.env[k];
    process.env.WORKSPACE_WORKERS = 'false';
    process.env.AGENT_API_TOKEN = AGENT_TOKEN;
    process.env.WEEKLY_INGEST_TOKEN = INGEST_TOKEN;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TMS_DIRECTORY)
      .useValue({ connected: false, findOperators: async () => [] })
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const repo = app.get<InMemoryAuthRepository>(AUTH_REPOSITORY);
    for (const role of ['admin', 'viewer'] as const) {
      const user = await repo.upsertUser({ subject: `${role}-sub`, email: `${role}.user@seatos.com`, role });
      tokens[role] = app.get<StaticIdentityVerifier>(IDENTITY_VERIFIER).add(`${role}-token`, { sub: user.subject, email: user.email });
    }
    accounts = (await call('GET', '/workspace/accounts', 'viewer')).json().items.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }));
  });

  afterAll(async () => {
    await app.close();
    process.env = saved;
  });

  it('uploads the usage table, matches names to accounts and lists the ones it could not match', async () => {
    const [a, b] = accounts;
    const csv = [
      'Week,Operator name,inventory_management,distribution_management,reservation_management,trip_management,fleet_management,analytics,accounting,# Feature count',
      `"Oct 5, 2026",${a.name.toUpperCase()},1,0,1,1,0,0,0,3`,
      `"Oct 5, 2026",${b.name},0,0,1,0,0,0,0,1`,
      '"Oct 5, 2026",Unknown Ferry Co,1,1,1,1,1,1,1,7',
      '"Oct 5, 2026",Demo Account,0,0,1,0,0,0,0,1',
    ].join('\n');
    expect((await call('POST', '/admin/weekly-data', 'viewer', { kind: 'usage', csv })).statusCode).toBe(403);
    const res = await call('POST', '/admin/weekly-data', 'admin', { kind: 'usage', csv });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ kind: 'usage', weeks: ['2026-10-05'], rows: 4, matched: 2 });
    expect(res.json().unmatched.map((u: { name: string }) => u.name)).toEqual(['Unknown Ferry Co', 'Demo Account']);
  });

  it('uploads tickets for a chosen week and rejects a broken file with a clear message', async () => {
    const [a] = accounts;
    const ok = await call('POST', '/admin/weekly-data', 'admin', { kind: 'tickets', week: '2026-10-05', csv: `operator_name,GMV,Tickets Actual\n${a.name},1234.567,321\nUnknown Ferry Co,10,2\n` });
    expect(ok.json()).toMatchObject({ kind: 'tickets', weeks: ['2026-10-05'], rows: 2, matched: 1 });
    const bad = await call('POST', '/admin/weekly-data', 'admin', { kind: 'tickets', csv: 'operator_name,GMV\nX,1\n' });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().message).toMatch(/Tickets Actual/);
    expect((await call('POST', '/admin/weekly-data', 'admin', { kind: 'other', csv: 'x' })).statusCode).toBe(400);
  });

  it('remembers a hand-made match and an "ignore", and applies them to stored rows', async () => {
    const target = accounts[2];
    let summary = (await call('GET', '/admin/weekly-data', 'admin')).json();
    expect(summary.unmatched.map((u: { name: string }) => u.name)).toEqual(['Demo Account', 'Unknown Ferry Co']);
    expect(summary.uploads).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'usage', week: '2026-10-05', rows: 4, matched: 2 })]));

    summary = (await call('PUT', '/admin/weekly-data/links', 'admin', { name: 'Unknown Ferry Co', accountId: target.id })).json();
    summary = (await call('PUT', '/admin/weekly-data/links', 'admin', { name: 'Demo Account', accountId: null })).json();
    expect(summary.unmatched).toEqual([]);
    expect((await call('PUT', '/admin/weekly-data/links', 'admin', { name: 'X', accountId: 'D-nope' })).statusCode).toBe(400);

    const weekly = (await call('GET', `/workspace/accounts/${target.id}/weekly`, 'viewer')).json();
    expect(weekly.usage).toEqual([expect.objectContaining({ week: '2026-10-05', featureCount: 7, operatorName: 'Unknown Ferry Co' })]);
    expect(weekly.tickets).toEqual([expect.objectContaining({ week: '2026-10-05', tickets: 2 })]);

    // Next week the same name matches by itself.
    const next = await call('POST', '/admin/weekly-data', 'admin', { kind: 'tickets', week: '2026-10-12', csv: 'operator_name,GMV,Tickets Actual\nUnknown Ferry Co,20,4\n' });
    expect(next.json()).toMatchObject({ matched: 1, unmatched: [] });
  });

  it('serves the numbers to agents over MCP', async () => {
    const [a] = accounts;
    const found = await mcp('find_operators', { name: a.name.slice(0, 6) });
    expect(found.operators.map((o: { operator_id: string }) => o.operator_id)).toContain(a.id);

    const numbers = await mcp('get_weekly_numbers', { operator_id: a.id });
    expect(numbers.usage[0]).toMatchObject({ week: '2026-10-05', featureCount: 3 });
    expect(numbers.tickets[0]).toMatchObject({ tickets: 321 });
    expect(numbers.tickets[0]).not.toHaveProperty('gmvUsd');

    const week = await mcp('list_weekly_numbers', { kind: 'tickets', week: '2026-10-05' });
    expect(week.rows.map((r: { tickets: number }) => r.tickets)).toEqual([321, 2]);

    const activity = await mcp('get_hubspot_activity', { operator_id: a.id });
    expect(activity).toEqual({ connected: false, items: [] }); // mock CRM: nothing to read
  });
  it('takes the weekly BigQuery sync: needs its token, stores feature usage, matches accounts and serves it to people and agents', async () => {
    const [a, b] = accounts;
    const week = '2026-10-12';
    const body = {
      week,
      rows: [
        { operatorId: 28271, operatorName: a.name.toUpperCase(), categories: ['r', 't', 'i'], features: { bl: { events: 120, days: 5 }, rm: { events: 30, days: 2 }, bf: { events: 12, days: 3 }, zz: { events: 5, days: 1 }, auth: { events: 9, days: 4 } } },
        { operatorId: 28272, operatorName: b.name, categories: [], features: {} },
        { operatorId: 28273, operatorName: 'Unknown Sync Bus', categories: ['r'], features: { bp: { events: 3, days: 1 } } },
      ],
    };
    expect((await ingest(body, null)).statusCode).toBe(401);
    expect((await ingest(body, 'wrong-token')).statusCode).toBe(401);
    expect((await ingest({ ...body, week: '2026-10-13' })).statusCode).toBe(400); // not a Monday
    const res = await ingest(body);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ kind: 'usage', weeks: [week], rows: 3, matched: 2, unknownFeatures: ['zz'], unmatched: [{ name: 'Unknown Sync Bus' }] });

    const weekly = (await call('GET', `/workspace/accounts/${a.id}/weekly`, 'viewer')).json();
    const row = weekly.usage.find((u: { week: string }) => u.week === week);
    expect(row).toMatchObject({ featureCount: 3, operatorId: 28271, features: { reservation_management: true, trip_management: true, inventory_management: true, analytics: false } });
    expect(row.featureUsage).toEqual([
      { code: 'bl', name: 'Booking List', module: 'Reservation Management', events: 120, days: 5 },
      { code: 'rm', name: 'Route Management', module: 'Inventory Management', events: 30, days: 2 },
      { code: 'bf', name: 'Booking Form', module: 'Reservation Management', events: 12, days: 3 }, // login events (system) stay out
    ]);

    const history = (await call('GET', '/admin/weekly-data', 'admin')).json().uploads;
    expect(history).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'usage', week, rows: 3, uploadedBy: 'bigquery-sync' })]));

    const numbers = await mcp('get_weekly_numbers', { operator_id: a.id });
    expect(numbers.usage.find((u: { week: string }) => u.week === week).featureUsage[0]).toMatchObject({ name: 'Booking List', events: 120 });

    const again = await ingest({ week, rows: [body.rows[0]] }); // a re-sync replaces the week
    expect(again.json()).toMatchObject({ rows: 1, matched: 1 });
    const bWeekly = (await call('GET', `/workspace/accounts/${b.id}/weekly`, 'viewer')).json();
    expect(bWeekly.usage.some((u: { week: string }) => u.week === week)).toBe(false);
    expect(bWeekly.usageWeeks).toContain(week); // delivered week, no row for this operator = no tracked activity (the UI shows WAO 0/7)
  });

  it('takes the weekly tickets from the BigQuery sync: token needed, zero-sale operators skipped, week replaced', async () => {
    const [a, b] = accounts;
    const week = '2026-10-19';
    const body = { week, rows: [{ operatorId: 1, operatorName: a.name, tickets: 5593 }, { operatorId: 2, operatorName: b.name, tickets: 0 }, { operatorId: 3, operatorName: 'Unknown Sync Bus', tickets: 12 }] };
    expect((await ingest(body, null, 'weekly-tickets')).statusCode).toBe(401);
    expect((await ingest({ ...body, week: '2026-10-20' }, INGEST_TOKEN, 'weekly-tickets')).statusCode).toBe(400);
    expect((await ingest({ week, rows: [{ operatorName: a.name, tickets: -1 }] }, INGEST_TOKEN, 'weekly-tickets')).statusCode).toBe(400);
    const res = await ingest(body, INGEST_TOKEN, 'weekly-tickets');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ kind: 'tickets', weeks: [week], rows: 2, matched: 1, unmatched: [{ name: 'Unknown Sync Bus' }] });
    const weekly = (await call('GET', `/workspace/accounts/${a.id}/weekly`, 'viewer')).json();
    expect(weekly.tickets.find((t: { week: string }) => t.week === week)).toMatchObject({ tickets: 5593 });
    expect(weekly.tickets[0]).not.toHaveProperty('gmvUsd');
    expect((await call('GET', `/workspace/accounts/${b.id}/weekly`, 'viewer')).json().tickets.some((t: { week: string }) => t.week === week)).toBe(false);
    const history = (await call('GET', '/admin/weekly-data', 'admin')).json().uploads;
    expect(history).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'tickets', week, rows: 2, uploadedBy: 'bigquery-sync' })]));
  });

  it('takes the price comparison from the BigQuery sync: token needed, matched to the account, replaced as a snapshot, served with the weekly numbers', async () => {
    const [a, b] = accounts;
    const seg = { from: 'Phuket', to: 'Phi Phi', vehicleType: 'Speedboat', vehicleClass: 'Standard', tickets: 120, avgPrice: 900, peerAvgPrice: 800, peers: 3, pct: 12.5 };
    const row = { operatorId: 1, operatorName: a.name, currency: 'thb', ticketsCompared: 400, segments: 4, pricePct: 8.123, detail: [seg] };
    const body = { windowDays: 90, rows: [row, { ...row, operatorId: 3, operatorName: 'Unknown Sync Bus' }] };
    expect((await ingest(body, null, 'pricing')).statusCode).toBe(401);
    expect((await ingest({ ...body, windowDays: 0 }, INGEST_TOKEN, 'pricing')).statusCode).toBe(400);
    expect((await ingest({ windowDays: 90, rows: [{ ...row, pricePct: 'x' }] }, INGEST_TOKEN, 'pricing')).statusCode).toBe(400);
    const res = await ingest(body, INGEST_TOKEN, 'pricing');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ rows: 2, matched: 1 });
    const weekly = (await call('GET', `/workspace/accounts/${a.id}/weekly`, 'viewer')).json();
    expect(weekly.pricing).toEqual([expect.objectContaining({ currency: 'THB', pricePct: 8.12, segments: 4, ticketsCompared: 400, windowDays: 90, detail: [seg] })]);
    expect((await call('GET', `/workspace/accounts/${b.id}/weekly`, 'viewer')).json().pricing).toEqual([]);
    expect((await mcp('get_weekly_numbers', { operator_id: a.id })).pricing).toHaveLength(1);
    // A later sync replaces the whole snapshot.
    expect((await ingest({ windowDays: 90, rows: [] }, INGEST_TOKEN, 'pricing')).statusCode).toBe(200);
    expect((await call('GET', `/workspace/accounts/${a.id}/weekly`, 'viewer')).json().pricing).toEqual([]);
  });

  it('keeps the sync off until its token is set', async () => {
    const keep = process.env.WEEKLY_INGEST_TOKEN;
    delete process.env.WEEKLY_INGEST_TOKEN;
    expect((await ingest({ week: '2026-10-12', rows: [] })).statusCode).toBe(503);
    process.env.WEEKLY_INGEST_TOKEN = keep;
  });
});
