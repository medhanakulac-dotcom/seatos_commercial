import { CrmAccount } from '../../domain/workspace/entities/workspace.entities';
import { HubSpotActivitySource, plainText } from './hubspot-activity.source';
import { HubSpotApiError, HubSpotClient } from './hubspot.client';

const account: CrmAccount = {
  id: 'D-d1',
  crmId: 'd1',
  name: 'Andaman Ferry',
  segment: 'High',
  crmHealth: 'Unhealthy',
  country: 'Thailand',
  owner: 'Anong Srisuk',
  amount: 1000,
  createdAt: '2024-05-01',
  modifiedAt: '2026-09-28',
  lastNoteAt: '2026-09-20',
  companyId: 'c9',
  deals: [
    { id: 'd1', pipeline: 'Client Pipeline', stage: 'Fully Live', amount: 1000, health: 'Unhealthy', url: null },
    { id: 'd2', pipeline: 'Customer Adoption Pipeline', stage: 'Assessment', amount: null, health: 'Watchlist', url: null },
  ],
};

/** A HubSpot stand-in: associations per (from, to) and objects per type; `denied` types answer 403. */
function fakeHubSpot(denied: string[] = []) {
  const posts: { path: string; body: any }[] = [];
  const assoc: Record<string, Record<string, string[]>> = {
    'deals/notes': { d1: ['101'], d2: ['102'] },
    'companies/notes': { c9: ['101', '103'] }, // 101 is on both the deal and the company: listed once
    'deals/meetings': { d1: ['201'] },
    'deals/calls': {},
    'deals/emails': { d1: ['401'] },
  };
  const objects: Record<string, Record<string, Record<string, string | null>>> = {
    notes: {
      '101': { hs_note_body: '<p>Owner wants <b>LINE</b> integration&nbsp;by Q4</p><ul><li>call back Friday</li></ul>', hs_timestamp: '2026-09-20T03:00:00Z', hubspot_owner_id: '7' },
      '102': { hs_note_body: 'Adoption kickoff done', hs_timestamp: '2026-08-01T03:00:00Z', hubspot_owner_id: null },
      '103': { hs_note_body: 'Company note', hs_timestamp: '2026-09-25T03:00:00Z', hubspot_owner_id: '7' },
    },
    meetings: { '201': { hs_meeting_title: 'QBR', hs_meeting_body: 'Agenda', hs_internal_meeting_notes: 'They complained about refunds', hs_meeting_start_time: '2026-09-22T07:00:00Z', hs_meeting_outcome: 'COMPLETED', hs_timestamp: null, hubspot_owner_id: '7' } },
    emails: { '401': { hs_email_subject: 'Re: pricing', hs_email_text: 'Thanks, we will review.', hs_email_html: null, hs_email_direction: 'INCOMING_EMAIL', hs_timestamp: '2026-09-23T01:00:00Z', hubspot_owner_id: null } },
  };
  const client = {
    get: async () => ({ portalId: 123, uiDomain: 'app-na2.hubspot.com' }),
    listAll: async () => [{ id: '7', firstName: 'Anong', lastName: 'Srisuk' }],
    post: async (path: string, body: any) => {
      posts.push({ path, body });
      const a = path.match(/^\/crm\/v4\/associations\/(\w+)\/(\w+)\/batch\/read$/);
      if (a) {
        if (denied.includes(a[2])) throw new HubSpotApiError(403, 'missing scope');
        const table = assoc[`${a[1]}/${a[2]}`] ?? {};
        return { results: body.inputs.filter((i: { id: string }) => table[i.id]).map((i: { id: string }) => ({ from: { id: i.id }, to: table[i.id].map((t) => ({ toObjectId: t })) })) };
      }
      const o = path.match(/^\/crm\/v3\/objects\/(\w+)\/batch\/read$/)!;
      return { results: body.inputs.map((i: { id: string }) => ({ id: i.id, properties: objects[o[1]][i.id] })) };
    },
  } as unknown as HubSpotClient;
  return { client, posts };
}

describe('HubSpotActivitySource', () => {
  it('reads notes, meetings and emails from the deals and the company, newest first, as plain text', async () => {
    const { client } = fakeHubSpot();
    const items = await new HubSpotActivitySource(client).activity(account, 10);
    expect(items.map((i) => [i.type, i.at.slice(0, 10)])).toEqual([
      ['note', '2026-09-25'],
      ['email', '2026-09-23'],
      ['meeting', '2026-09-22'],
      ['note', '2026-09-20'],
      ['note', '2026-08-01'],
    ]);
    const meeting = items.find((i) => i.type === 'meeting')!;
    expect(meeting).toMatchObject({ title: 'QBR', body: 'Agenda\n\nThey complained about refunds', detail: 'COMPLETED', owner: 'Anong Srisuk', url: 'https://app-na2.hubspot.com/contacts/123/record/0-3/d1' });
    expect(items.find((i) => i.id === 'note-101')!.body).toBe('Owner wants LINE integration by Q4\n- call back Friday');
    expect(items.find((i) => i.type === 'email')).toMatchObject({ title: 'Re: pricing', detail: 'INCOMING_EMAIL', owner: null });
    expect(await new HubSpotActivitySource(client).activity(account, 2)).toHaveLength(2);
  });

  it('skips a kind the token may not read instead of failing', async () => {
    const { client } = fakeHubSpot(['meetings']);
    const items = await new HubSpotActivitySource(client).activity(account, 10);
    expect(items.some((i) => i.type === 'meeting')).toBe(false);
    expect(items.filter((i) => i.type === 'note')).toHaveLength(3);
  });

  it('turns HubSpot rich text into readable plain text and clips it', () => {
    expect(plainText('<div>Hi&nbsp;there</div><div>Line 2 &amp; more</div>')).toBe('Hi there\nLine 2 & more');
    expect(plainText('<p></p>')).toBeNull();
    expect(plainText('x'.repeat(20), 10)).toBe(`${'x'.repeat(10)}…`);
  });
});
