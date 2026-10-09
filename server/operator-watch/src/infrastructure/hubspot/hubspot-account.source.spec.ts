import { groupDeals, HubSpotAccountSource, normaliseHealth, normaliseSegment } from './hubspot-account.source';
import { FetchLike, HubSpotApiError, HubSpotClient } from './hubspot.client';
import { crmSourceMode, HubSpotConfig, loadHubSpotConfig, parseSegmentMap } from './hubspot.config';
import { HubSpotNoteSync, toNoteHtml } from './hubspot-note.sync';

const config: HubSpotConfig = {
  ...loadHubSpotConfig({ HUBSPOT_ACCESS_TOKEN: 'test-token' }),
  baseUrl: 'https://hubspot.test',
};

type Handler = (body: Record<string, unknown> | undefined, url: string) => unknown;

function fakeHubSpot(routes: Record<string, Handler>) {
  const calls: { method: string; url: string; auth?: string; body?: Record<string, unknown> }[] = [];
  const fetchFn: FetchLike = async (url, init) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method, url, auth: init.headers.authorization, body });
    const path = url.replace(config.baseUrl, '').split('?')[0];
    const key = `${init.method} ${path}`;
    const known = key in routes;
    const data = known ? routes[key](body, url) : undefined;
    const status = data instanceof Response ? data.status : known ? 200 : 404;
    return {
      ok: status < 300,
      status,
      headers: { get: (n: string) => (data instanceof Response ? data.headers.get(n) : null) },
      json: async () => (data instanceof Response ? data.json() : data),
      text: async () => JSON.stringify(data),
    };
  };
  return { fetchFn, calls };
}

const deal = (id: string, props: Record<string, string | null>) => ({
  id,
  properties: { dealname: `Deal ${id}`, amount: '1000', pipeline: 'p-client', dealstage: 's-live', createdate: '2024-05-01T03:00:00Z', hs_lastmodifieddate: '2026-09-28T10:00:00Z', notes_last_updated: '2026-09-20T00:00:00Z', hubspot_owner_id: '7', health_status: 'Unhealthy', client_segment: 'High', ...props },
});

const PORTAL: Record<string, Handler> = {
  'GET /account-info/v3/details': () => ({ portalId: 123, uiDomain: 'app-na2.hubspot.com', timeZone: 'Asia/Bangkok' }),
  'GET /crm/v3/pipelines/deals': () => ({
    results: [
      { id: 'p-client', label: 'Client Pipeline', stages: [{ id: 's-live', label: 'Fully Live' }] },
      { id: 'p-adopt', label: 'Customer Adoption Pipeline', stages: [{ id: 's-assess', label: 'Assessment' }] },
    ],
  }),
  'GET /crm/v3/owners': () => ({ results: [{ id: '7', firstName: 'Anong', lastName: 'Srisuk' }] }),
  'POST /crm/v4/associations/deals/companies/batch/read': (body) => ({
    results: (body!.inputs as { id: string }[]).filter((i) => i.id !== 'd4' && i.id !== 'd5').map((i) => ({ from: { id: i.id }, to: [{ toObjectId: i.id === 'd3' ? 902 : 901 }] })),
  }),
  'POST /crm/v4/associations/deals/contacts/batch/read': (body) => ({
    results: (body!.inputs as { id: string }[]).filter((i) => i.id === 'd2').map((i) => ({ from: { id: i.id }, to: [{ toObjectId: 501 }, { toObjectId: 502 }] })),
  }),
  'POST /crm/v3/objects/contacts/batch/read': () => ({
    results: [
      { id: '501', properties: { email: 'ops@andaman.example', firstname: 'Somchai', lastname: 'K.' } },
      { id: '502', properties: { email: null, firstname: 'No', lastname: 'Email' } },
    ],
  }),
  'POST /crm/v3/objects/companies/batch/read': () => ({
    results: [
      { id: '901', properties: { name: 'Andaman Ferry Co.', country: 'Thailand', notes_last_updated: '2026-09-25T00:00:00Z' } },
      { id: '902', properties: { name: 'Hanoi Lantern Bus', country: 'Vietnam' } },
    ],
  }),
};

describe('HubSpotAccountSource', () => {
  it('makes one account per Client Pipeline deal and attaches adoption deals to it', async () => {
    let page = 0;
    const { fetchFn, calls } = fakeHubSpot({
      ...PORTAL,
      // Two pages of search results to exercise paging.
      'POST /crm/v3/objects/deals/search': () =>
        ++page === 1
          ? {
              results: [deal('d1', { dealname: 'Andaman Ferry - adoption', pipeline: 'p-adopt', dealstage: 's-assess', health_status: 'Watchlist' }), deal('d2', { dealname: ' Andaman Ferry ', country: 'Thailand' })],
              paging: { next: { after: '2' } },
            }
          : {
              results: [
                deal('d3', { dealname: 'Hanoi Lantern Bus', health_status: 'watchlist', client_segment: 'mid', hubspot_owner_id: null }),
                deal('d4', { dealname: 'Koh Lipe Star', client_segment: 'Enterprise' }),
                // Adoption deal with no company: attached by name.
                deal('d5', { dealname: 'Koh Lipe Star adoption plan', pipeline: 'p-adopt', dealstage: 's-assess' }),
              ],
            },
    });
    const { meta, accounts } = await new HubSpotAccountSource(new HubSpotClient(config, fetchFn), config).snapshot();

    expect(meta).toMatchObject({ kind: 'hubspot', portal: 'SeatOS', description: 'HubSpot deals with health_status' });
    expect(accounts.map((a) => a.id)).toEqual(['D-d2', 'D-d3', 'D-d4']);
    const andaman = accounts[0];
    expect(andaman).toMatchObject({
      name: 'Andaman Ferry', // deal name, trimmed — not the company name
      crmId: 'd2',
      segment: 'High',
      crmHealth: 'Unhealthy',
      country: 'Thailand', // deal country beats the company's free text
      owner: 'Anong Srisuk',
      amount: 1000,
      createdAt: '2024-05-01',
      lastNoteAt: '2026-09-25',
    });
    expect(andaman.deals.map((d) => [d.id, d.pipeline, d.stage, d.health])).toEqual([
      ['d2', 'Client Pipeline', 'Fully Live', 'Unhealthy'],
      ['d1', 'Customer Adoption Pipeline', 'Assessment', 'Watchlist'],
    ]);
    expect(andaman.deals[0].url).toBe('https://app-na2.hubspot.com/contacts/123/record/0-3/d2');
    // Contacts with an email become recipients; ones without are dropped.
    expect(andaman.contacts).toEqual([{ id: '501', name: 'Somchai K.', email: 'ops@andaman.example' }]);
    expect(accounts[1]).toMatchObject({ segment: 'Mid', crmHealth: 'Watchlist', owner: null, country: 'Vietnam' });
    // No company → no country; unknown segment → Dormant (no outreach); adoption attached by name.
    expect(accounts[2]).toMatchObject({ name: 'Koh Lipe Star', segment: 'Dormant', country: null });
    expect(accounts[2].deals.map((d) => d.id)).toEqual(['d4', 'd5']);

    const search = calls.filter((c) => c.url.endsWith('/deals/search'));
    expect(search[0].body).toMatchObject({ filterGroups: [{ filters: [{ propertyName: 'health_status', operator: 'HAS_PROPERTY' }] }], limit: 100 });
    expect(search[1].body).toMatchObject({ after: '2' });
    expect(calls.every((c) => c.auth === 'Bearer test-token')).toBe(true);
    expect(calls.every((c) => c.method === 'GET' || c.url.includes('search') || c.url.includes('batch/read'))).toBe(true); // read-only
  });

  it('keeps several operators under one company as separate accounts', () => {
    const primaries = [deal('a', { dealname: 'Alpha Boat' }), deal('b', { dealname: 'Bravo Van' })];
    const adoption = deal('x', { dealname: 'Bravo Van - adoption', pipeline: 'p-adopt' });
    const company = new Map([['a', '1'], ['b', '1'], ['x', '1']]);
    const groups = groupDeals(primaries, [adoption], company);
    expect(groups.map((g) => g.map((d) => d.id))).toEqual([['a'], ['b', 'x']]);
    // Ambiguous by company and by name → stands alone rather than guessing.
    expect(groupDeals(primaries, [deal('y', { dealname: 'Project', pipeline: 'p-adopt' })], company).at(-1)!.map((d) => d.id)).toEqual(['y']);
  });

  it('reads the segment from the company when configured', async () => {
    const companyConfig = { ...config, segmentObject: 'company' as const, segmentProperty: 'tier' };
    const { fetchFn, calls } = fakeHubSpot({
      ...PORTAL,
      'POST /crm/v3/objects/deals/search': () => ({ results: [deal('d2', { client_segment: null })] }),
      'POST /crm/v3/objects/companies/batch/read': () => ({ results: [{ id: '901', properties: { name: 'Andaman Ferry Co.', tier: 'Low' } }] }),
    });
    const { accounts } = await new HubSpotAccountSource(new HubSpotClient(companyConfig, fetchFn), companyConfig).snapshot();
    expect(accounts[0].segment).toBe('Low');
    expect(calls.find((c) => c.url.includes('/objects/companies/batch'))?.body?.properties).toContain('tier');
  });

  it('still loads accounts when the token cannot read contacts', async () => {
    const { fetchFn } = fakeHubSpot({
      ...PORTAL,
      'POST /crm/v3/objects/deals/search': () => ({ results: [deal('d2', {})] }),
      'POST /crm/v4/associations/deals/contacts/batch/read': () => new Response(JSON.stringify({ category: 'MISSING_SCOPES', message: 'missing scope' }), { status: 403 }),
    });
    const { accounts } = await new HubSpotAccountSource(new HubSpotClient(config, fetchFn), config).snapshot();
    expect(accounts[0].contacts).toEqual([]);
  });
});

describe('HubSpotClient', () => {
  it('backs off on 429 using Retry-After', async () => {
    let n = 0;
    const { fetchFn } = fakeHubSpot({
      'GET /account-info/v3/details': () => (++n === 1 ? new Response('{}', { status: 429, headers: { 'retry-after': '0.01' } }) : { portalId: 1 }),
    });
    await expect(new HubSpotClient(config, fetchFn).get('/account-info/v3/details')).resolves.toEqual({ portalId: 1 });
    expect(n).toBe(2);
  });

  it('surfaces HubSpot errors with their category and never echoes the token', async () => {
    const { fetchFn } = fakeHubSpot({
      'GET /crm/v3/owners': () => new Response(JSON.stringify({ message: 'This app hasn\'t been granted all required scopes', category: 'MISSING_SCOPES' }), { status: 403 }),
    });
    const error = (await new HubSpotClient(config, fetchFn).get('/crm/v3/owners').catch((e) => e)) as HubSpotApiError;
    expect(error).toBeInstanceOf(HubSpotApiError);
    expect(error).toMatchObject({ status: 403, category: 'MISSING_SCOPES' });
    expect(error.message).not.toContain('test-token');
  });
});

describe('HubSpot config and notes', () => {
  it('requires a token only in hubspot mode', () => {
    expect(crmSourceMode({})).toBe('mock');
    expect(crmSourceMode({ CRM_SOURCE: 'HubSpot' })).toBe('hubspot');
    expect(() => crmSourceMode({ CRM_SOURCE: 'salesforce' })).toThrow();
    expect(() => loadHubSpotConfig({})).toThrow('HUBSPOT_ACCESS_TOKEN is required');
    expect(loadHubSpotConfig({ HUBSPOT_ACCESS_TOKEN: 'x' }).notesEnabled).toBe(false);
  });

  it('normalises segment and health values from HubSpot options', () => {
    expect(normaliseSegment(' HIGH ')).toBe('High');
    expect(normaliseSegment('medium')).toBe('Mid');
    expect(normaliseSegment('Enterprise')).toBeNull();
    expect(normaliseSegment('Medium High', parseSegmentMap('Medium High=High; At Risk=Dormant'))).toBe('High');
    expect(() => parseSegmentMap('Medium High=Gold')).toThrow('HUBSPOT_SEGMENT_MAP');
    expect(normaliseHealth('watch_list')).toBe('Watchlist');
    expect(normaliseHealth('')).toBeNull();
  });

  it('writes notes to the deal only when enabled, as escaped HTML', async () => {
    const { fetchFn, calls } = fakeHubSpot({ 'POST /crm/v3/objects/notes': () => ({ id: 'n1' }) });
    const off = new HubSpotNoteSync(new HubSpotClient(config, fetchFn), config);
    expect(off.connected).toBe(false);
    const on = new HubSpotNoteSync(new HubSpotClient({ ...config, notesEnabled: true }, fetchFn), { ...config, notesEnabled: true });
    await on.pushNote({ dealId: 'd2', note: 'Call <ops>\n— Chris', at: '2026-09-30T04:00:00Z' });
    expect(calls[0].body).toEqual({
      properties: { hs_timestamp: '2026-09-30T04:00:00Z', hs_note_body: 'Call &lt;ops&gt;<br>— Chris' },
      associations: [{ to: { id: 'd2' }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }] }],
    });
    expect(toNoteHtml('a & b')).toBe('a &amp; b');
  });
});
