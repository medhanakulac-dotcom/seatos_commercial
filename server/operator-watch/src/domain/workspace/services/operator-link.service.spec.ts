import { TmsOperatorMatch } from '../entities/workspace.entities';
import { WorkspaceError } from '../errors/workspace.errors';
import { InMemoryWorkspaceStore } from '../../../infrastructure/workspace-mocks/in-memory-workspace.store';
import { TmsDirectory } from '../types/repositories/workspace.ports';
import { OperatorLinkService } from './operator-link.service';

const match = (id: number, name: string): TmsOperatorMatch => ({ tmsOperatorId: id, name, active: true, domain: null });
const ACME = { id: 'D-1', name: 'Acme  Bus ' };
const ann = { id: 'u1', name: 'Ann' };

function setup(results: TmsOperatorMatch[] | Error, connected = true) {
  let now = new Date('2026-10-01T00:00:00Z');
  const state = { results, calls: 0 };
  const directory: TmsDirectory = {
    connected,
    findOperators: async () => {
      state.calls++;
      if (state.results instanceof Error) throw state.results;
      return state.results;
    },
  };
  const store = new InMemoryWorkspaceStore();
  const service = new OperatorLinkService(store, directory, { now: () => now });
  return { service, store, state, advance: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

describe('OperatorLinkService', () => {
  it('links a single exact name match (normalized)', async () => {
    const { service, store } = setup([match(7, 'acme bus'), match(8, 'Acme Bus Tours')]);
    const link = await service.resolve(ACME);
    expect(link).toMatchObject({ status: 'linked', tmsOperatorId: 7, tmsOperatorName: 'acme bus', source: 'lookup', confirmedBy: null });
    expect(await store.getOperatorLink('D-1')).toMatchObject({ status: 'linked' });
  });

  it('asks for confirmation when matches are ambiguous or inexact, capping candidates at 10', async () => {
    const many = Array.from({ length: 12 }, (_, i) => match(i + 1, `Acme Bus ${i}`));
    const { service } = setup(many);
    const link = await service.resolve(ACME);
    expect(link).toMatchObject({ status: 'needs_confirmation', tmsOperatorId: null });
    expect(link!.candidates).toHaveLength(10);
    const dup = setup([match(1, 'Acme Bus'), match(2, 'ACME BUS')]);
    expect((await dup.service.resolve(ACME))!.status).toBe('needs_confirmation');
  });

  it('records not_found when nothing matches', async () => {
    expect(await setup([]).service.resolve(ACME)).toMatchObject({ status: 'not_found', candidates: [] });
  });

  it('never throws when the directory fails or is not connected', async () => {
    const down = setup(new Error('boom'));
    expect(await down.service.resolve(ACME)).toBeNull();
    const off = setup([match(7, 'Acme Bus')], false);
    expect(await off.service.resolve(ACME)).toBeNull();
    expect(off.state.calls).toBe(0);
    // keeps the existing link when a refresh fails
    const { service, state, advance } = setup([]);
    await service.resolve(ACME);
    state.results = new Error('down');
    advance(25 * 36e5);
    expect((await service.resolve(ACME))!.status).toBe('not_found');
  });

  it('caches non-linked links for 24h, always keeps linked ones, and force bypasses the age', async () => {
    const { service, state, advance } = setup([]);
    await service.resolve(ACME);
    await service.resolve(ACME);
    expect(state.calls).toBe(1);
    advance(23 * 36e5);
    await service.resolve(ACME);
    expect(state.calls).toBe(1);
    await service.resolve(ACME, true);
    expect(state.calls).toBe(2);
    advance(25 * 36e5);
    state.results = [match(7, 'Acme Bus')];
    expect((await service.resolve(ACME))!.status).toBe('linked');
    advance(48 * 36e5);
    await service.resolve(ACME, true);
    expect(state.calls).toBe(3);
  });

  it('confirm accepts stored candidates or a fresh lookup hit, and rejects anything else', async () => {
    const { service, state } = setup([match(1, 'Acme Bus North'), match(2, 'Acme Bus South')]);
    await service.resolve(ACME);
    expect(await service.confirm(ACME, 2, ann)).toMatchObject({ status: 'linked', source: 'human', confirmedBy: 'Ann', tmsOperatorId: 2, tmsOperatorName: 'Acme Bus South' });
    expect(state.calls).toBe(1); // came from the stored candidates

    const fresh = setup([]);
    await fresh.service.resolve(ACME);
    fresh.state.results = [match(9, 'Acme Bus Group')];
    expect((await fresh.service.confirm(ACME, 9, ann)).tmsOperatorId).toBe(9);
    await expect(fresh.service.confirm({ id: 'D-2', name: 'Other' }, 5, ann)).rejects.toBeInstanceOf(WorkspaceError);
    fresh.state.results = new Error('down');
    await expect(fresh.service.confirm({ id: 'D-3', name: 'Third' }, 5, ann)).rejects.toBeInstanceOf(WorkspaceError);
  });

  it('unlink clears a human link and looks the account up again', async () => {
    const { service, state } = setup([match(1, 'Acme Bus North'), match(2, 'Acme Bus South')]);
    await service.resolve(ACME);
    await service.confirm(ACME, 1, ann);
    const link = await service.unlink(ACME, ann);
    expect(link).toMatchObject({ status: 'needs_confirmation', tmsOperatorId: null, source: null });
    expect(state.calls).toBe(2);
  });

  it('resolveAll only looks up accounts without a link', async () => {
    const { service, state } = setup([match(7, 'A')]);
    await service.resolve({ id: 'D-9', name: 'A' });
    state.calls = 0;
    await service.resolveAll([{ id: 'D-9', name: 'A' }, { id: 'D-10', name: 'B' }, { id: 'D-11', name: 'C' }], 2);
    expect(state.calls).toBe(2);
    expect([...(await service.linkedIds(['D-9', 'D-10']))]).toEqual([['D-9', 7]]);
  });
});
