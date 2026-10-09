import { Inject, Injectable, Logger } from '@nestjs/common';
import { Actor, OperatorLink, TmsOperatorMatch } from '../entities/workspace.entities';
import { WorkspaceError } from '../errors/workspace.errors';
import { Clock, TMS_DIRECTORY, TmsDirectory, WORKSPACE_CLOCK, WORKSPACE_STORE, WorkspaceStore } from '../types/repositories/workspace.ports';

export interface LinkSubject {
  readonly id: string;
  readonly name: string;
}

/** A link that is not `linked` is trusted for this long before the directory is asked again. */
const RETRY_AFTER_MS = 24 * 36e5;
const MAX_CANDIDATES = 10;
const EPOCH = new Date(0).toISOString();

export const normalizeName = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Resolves which SeatOS operator a workspace account is, once, so agents are handed the id instead of looking it up
 * by name. A single exact name match links automatically; anything else waits for a person to confirm.
 */
@Injectable()
export class OperatorLinkService {
  private readonly logger = new Logger(OperatorLinkService.name);
  private readonly inFlight = new Map<string, Promise<OperatorLink | null>>();

  constructor(
    @Inject(WORKSPACE_STORE) private readonly store: WorkspaceStore,
    @Inject(TMS_DIRECTORY) private readonly directory: TmsDirectory,
    @Inject(WORKSPACE_CLOCK) private readonly clock: Clock,
  ) {}

  get(accountId: string): Promise<OperatorLink | undefined> {
    return this.store.getOperatorLink(accountId);
  }

  /** SeatOS ids of the accounts that are linked, from the store only (no lookups). */
  async linkedIds(accountIds: readonly string[]): Promise<Map<string, number>> {
    const links = await this.store.listOperatorLinks(accountIds);
    return new Map(links.flatMap((l) => (l.status === 'linked' && l.tmsOperatorId != null ? [[l.accountId, l.tmsOperatorId] as [string, number]] : [])));
  }

  /** The stored link, refreshed when it is missing or an unlinked one is older than 24h (`force` ignores the age). Never throws. */
  resolve(account: LinkSubject, force = false): Promise<OperatorLink | null> {
    const key = `${force ? 'f' : 'n'}:${account.id}`;
    let pending = this.inFlight.get(key);
    if (!pending) {
      pending = this.doResolve(account, force).finally(() => this.inFlight.delete(key));
      this.inFlight.set(key, pending);
    }
    return pending;
  }

  /** Resolves every account that has no link yet, `concurrency` at a time. */
  async resolveAll(accounts: readonly LinkSubject[], concurrency = 3): Promise<void> {
    if (!this.directory.connected) return;
    const known = new Set((await this.store.listOperatorLinks(accounts.map((a) => a.id))).map((l) => l.accountId));
    const queue = accounts.filter((a) => !known.has(a.id));
    const worker = async () => {
      for (let a = queue.shift(); a; a = queue.shift()) await this.resolve(a);
    };
    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  }

  /** A person picks the operator: it must be a stored candidate or show up in a fresh lookup of the account name. */
  async confirm(account: LinkSubject, tmsOperatorId: number, actor: Actor): Promise<OperatorLink> {
    const existing = await this.store.getOperatorLink(account.id);
    let match = existing?.candidates.find((c) => c.tmsOperatorId === tmsOperatorId);
    let candidates = existing?.candidates ?? [];
    if (!match) {
      let fresh: TmsOperatorMatch[];
      try {
        fresh = await this.directory.findOperators(account.name);
      } catch (error) {
        throw new WorkspaceError(`SeatOS operators could not be checked: ${errorText(error)}`);
      }
      match = fresh.find((c) => c.tmsOperatorId === tmsOperatorId);
      candidates = fresh.slice(0, MAX_CANDIDATES);
    }
    if (!match) throw new WorkspaceError(`SeatOS operator ${tmsOperatorId} is not a match for ${account.name}`);
    const link: OperatorLink = {
      accountId: account.id,
      status: 'linked',
      tmsOperatorId: match.tmsOperatorId,
      tmsOperatorName: match.name,
      source: 'human',
      candidates,
      resolvedAt: this.clock.now().toISOString(),
      confirmedBy: actor.name,
    };
    await this.store.saveOperatorLink(link);
    return link;
  }

  /** Drops the link and looks the account up again (so it may link itself again by an exact name match). */
  async unlink(account: LinkSubject, actor: Actor): Promise<OperatorLink | null> {
    const existing = await this.store.getOperatorLink(account.id);
    if (!existing) return null;
    this.logger.log(`${actor.name} unlinked ${account.id} from SeatOS operator ${existing.tmsOperatorId}`);
    await this.store.saveOperatorLink({
      accountId: account.id,
      status: 'needs_confirmation',
      tmsOperatorId: null,
      tmsOperatorName: null,
      source: null,
      candidates: existing.candidates,
      resolvedAt: EPOCH,
      confirmedBy: null,
    });
    return this.resolve(account, true);
  }

  private async doResolve(account: LinkSubject, force: boolean): Promise<OperatorLink | null> {
    let existing: OperatorLink | undefined;
    try {
      existing = await this.store.getOperatorLink(account.id);
      if (existing?.status === 'linked') return existing;
      if (existing && !force && this.clock.now().getTime() - Date.parse(existing.resolvedAt) < RETRY_AFTER_MS) return existing;
      if (!this.directory.connected) {
        this.logger.debug(`SeatOS directory not connected; ${account.id} stays unresolved`);
        return existing ?? null;
      }
      const matches = await this.directory.findOperators(account.name);
      const link = this.decide(account, matches);
      await this.store.saveOperatorLink(link);
      return link;
    } catch (error) {
      this.logger.warn(`SeatOS operator lookup for ${account.id} failed: ${errorText(error)}`);
      return existing ?? null;
    }
  }

  private decide(account: LinkSubject, matches: readonly TmsOperatorMatch[]): OperatorLink {
    const base = { accountId: account.id, resolvedAt: this.clock.now().toISOString(), confirmedBy: null };
    const wanted = normalizeName(account.name);
    const exact = matches.filter((m) => normalizeName(m.name) === wanted);
    if (exact.length === 1) {
      const [m] = exact;
      return { ...base, status: 'linked', tmsOperatorId: m.tmsOperatorId, tmsOperatorName: m.name, source: 'lookup', candidates: matches.slice(0, MAX_CANDIDATES) };
    }
    const none = { tmsOperatorId: null, tmsOperatorName: null, source: null };
    if (matches.length) return { ...base, ...none, status: 'needs_confirmation', candidates: matches.slice(0, MAX_CANDIDATES) };
    return { ...base, ...none, status: 'not_found', candidates: [] };
  }
}

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));
