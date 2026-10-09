import { Inject, Injectable, Logger } from '@nestjs/common';
import { HUBSPOT_CONFIG, HubSpotConfig } from './hubspot.config';

export class HubSpotApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly category?: string,
  ) {
    super(message);
  }
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export const HUBSPOT_FETCH = Symbol('HUBSPOT_FETCH');

const MAX_ATTEMPTS = 4;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Minimal HubSpot REST client: bearer auth, JSON, timeouts, and backoff on 429/5xx. */
@Injectable()
export class HubSpotClient {
  private readonly logger = new Logger(HubSpotClient.name);

  constructor(
    @Inject(HUBSPOT_CONFIG) private readonly config: HubSpotConfig,
    @Inject(HUBSPOT_FETCH) private readonly fetchFn: FetchLike,
  ) {}

  get<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return this.request<T>('GET', qs ? `${path}?${qs}` : path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /** Follows `paging.next.after` for GET list endpoints. */
  async listAll<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T[]> {
    const results: T[] = [];
    let after: string | undefined;
    do {
      const page = await this.get<{ results: T[]; paging?: { next?: { after: string } } }>(path, { limit: 100, ...query, after });
      results.push(...page.results);
      after = page.paging?.next?.after;
    } while (after);
    return results;
  }

  /** Follows `paging.next.after` for CRM search endpoints (100 per page, 10k max per HubSpot). */
  async searchAll<T>(path: string, body: Record<string, unknown>): Promise<T[]> {
    const results: T[] = [];
    let after: string | undefined;
    do {
      const page = await this.post<{ results: T[]; paging?: { next?: { after: string } } }>(path, { limit: 100, ...body, ...(after ? { after } : {}) });
      results.push(...page.results);
      after = page.paging?.next?.after;
    } while (after);
    return results;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      let res: Awaited<ReturnType<FetchLike>>;
      try {
        res = await this.fetchFn(`${this.config.baseUrl}${path}`, {
          method,
          headers: {
            authorization: `Bearer ${this.config.accessToken}`,
            accept: 'application/json',
            ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timer);
        if (attempt >= MAX_ATTEMPTS) throw new HubSpotApiError(0, `HubSpot request failed: ${error instanceof Error ? error.message : String(error)}`);
        await sleep(500 * attempt);
        continue;
      }
      clearTimeout(timer);
      if (res.ok) return (await res.json()) as T;

      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < MAX_ATTEMPTS) {
        const retryAfter = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** (attempt - 1);
        this.logger.warn(`HubSpot ${method} ${path.split('?')[0]} → ${res.status}; retrying in ${wait}ms`);
        await sleep(wait);
        continue;
      }
      let message = `HubSpot ${method} ${path.split('?')[0]} failed with ${res.status}`;
      let category: string | undefined;
      try {
        const data = (await res.json()) as { message?: string; category?: string };
        if (data.message) message += `: ${data.message}`;
        category = data.category;
      } catch {
        /* non-JSON body */
      }
      throw new HubSpotApiError(res.status, message, category);
    }
  }
}
