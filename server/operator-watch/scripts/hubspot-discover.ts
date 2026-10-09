/**
 * Read-only HubSpot discovery: shows which properties/pipelines exist and how the workspace would
 * read them, so the HUBSPOT_* mapping in .env can be confirmed. Prints counts only — no token,
 * no record contents. Usage: `npm run hubspot:discover`
 */
import { existsSync } from 'node:fs';
import { HubSpotAccountSource } from '../src/infrastructure/hubspot/hubspot-account.source';
import { HubSpotApiError, HubSpotClient } from '../src/infrastructure/hubspot/hubspot.client';
import { loadHubSpotConfig } from '../src/infrastructure/hubspot/hubspot.config';

if (existsSync('.env')) process.loadEnvFile('.env');

interface HsProperty { name: string; label: string; type: string; fieldType: string; options?: { value: string; label: string }[] }

const INTERESTING = /health|segment|tier|country|region|market|priority|size/i;
const count = <T>(items: T[], key: (t: T) => string) =>
  Object.fromEntries([...items.reduce((m, t) => m.set(key(t), (m.get(key(t)) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]));

async function step<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    const err = e as HubSpotApiError;
    console.log(`  ✗ ${label}: ${err.message}${err.category === 'MISSING_SCOPES' ? '  ← add this scope to the private app' : ''}`);
    return undefined;
  }
}

async function main() {
  const config = loadHubSpotConfig();
  const client = new HubSpotClient(config, fetch);

  console.log('\n== Portal');
  const info = await step('account info', () => client.get<{ portalId: number; uiDomain: string; timeZone: string }>('/account-info/v3/details'));
  if (info) console.log(`  portal ${info.portalId} · ${info.uiDomain} · ${info.timeZone}`);

  for (const object of ['deals', 'companies'] as const) {
    console.log(`\n== ${object} properties that look relevant`);
    const props = await step(`${object} properties`, () => client.get<{ results: HsProperty[] }>(`/crm/v3/properties/${object}`));
    for (const p of props?.results.filter((p) => INTERESTING.test(p.name) || INTERESTING.test(p.label)) ?? []) {
      const opts = p.options?.length ? ` options: ${p.options.map((o) => o.value).join(', ')}` : '';
      console.log(`  ${p.name.padEnd(32)} "${p.label}" (${p.type}/${p.fieldType})${opts}`);
    }
  }

  console.log('\n== Deal pipelines');
  const pipelines = await step('pipelines', () => client.get<{ results: { label: string; stages: { label: string }[] }[] }>('/crm/v3/pipelines/deals'));
  for (const p of pipelines?.results ?? []) console.log(`  ${p.label}: ${p.stages.map((s) => s.label).join(' → ')}`);

  console.log(`\n== Workspace mapping (health=deal.${config.healthProperty}, segment=${config.segmentObject}.${config.segmentProperty}, main pipeline "${config.primaryPipeline}")`);
  const snapshot = await step('snapshot', () => new HubSpotAccountSource(client, config).snapshot());
  if (snapshot) {
    const a = snapshot.accounts;
    console.log(`  accounts: ${a.length} (deals: ${a.reduce((n, x) => n + x.deals.length, 0)})`);
    console.log('  segment:', count([...a], (x) => x.segment));
    console.log('  health: ', count([...a], (x) => x.crmHealth));
    console.log('  country:', count([...a], (x) => x.country ?? '(none)'));
    console.log('  owners: ', Object.keys(count([...a], (x) => x.owner ?? '(unassigned)')).length);
    console.log('  main pipeline:', count([...a], (x) => x.deals[0]?.pipeline ?? '(none)'));
  }
  console.log('');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
