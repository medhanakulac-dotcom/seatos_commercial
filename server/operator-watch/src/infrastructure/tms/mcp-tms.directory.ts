import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { TmsOperatorMatch } from '../../domain/workspace/entities/workspace.entities';
import { TmsDirectory } from '../../domain/workspace/types/repositories/workspace.ports';

/** The only place SeatOS tool names live. */
export const TMS_TOOLS = { lookupOperator: 'tms:lookupOperator' } as const;

const CALL_TIMEOUT_MS = 8000;
const LOOKUP_LIMIT = 20;

export interface ToolResult {
  readonly isError?: boolean;
  readonly content?: unknown;
}

/** Seam over the MCP client so parsing can be tested without a server. */
export interface ToolClient {
  call(name: string, args: Record<string, unknown>, timeoutMs: number): Promise<ToolResult>;
  close(): Promise<void>;
}

async function connectMcp(url: string): Promise<ToolClient> {
  const client = new Client({ name: 'commercial-workspace', version: '1.0.0' });
  // A server reachable from the internet (e.g. for Vercel) should require TMS_TOOLS_MCP_TOKEN as a bearer token.
  const token = process.env.TMS_TOOLS_MCP_TOKEN;
  const requestInit = token ? { headers: { authorization: `Bearer ${token}` } } : undefined;
  await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit }), { timeout: CALL_TIMEOUT_MS });
  return {
    call: async (name, args, timeout) => (await client.callTool({ name, arguments: args }, undefined, { timeout })) as ToolResult,
    close: () => client.close(),
  };
}

const textOf = (content: unknown): string =>
  (Array.isArray(content) ? content : [])
    .filter((c): c is { type: 'text'; text: string } => c?.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n');

/** `{ results: [{ operator_id, operator_name, is_active, domain }] }` → matches. Rows without an id or name are skipped. */
export function parseOperatorMatches(text: string): TmsOperatorMatch[] {
  let data: { results?: unknown };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`TMS lookup returned non-JSON: ${text.slice(0, 120)}`);
  }
  if (!Array.isArray(data?.results)) throw new Error('TMS lookup response has no results array');
  return data.results.flatMap((r: Record<string, unknown>) => {
    const id = Number(r?.operator_id);
    if (!Number.isInteger(id) || typeof r.operator_name !== 'string') return [];
    return [{ tmsOperatorId: id, name: r.operator_name, active: r.is_active !== false, domain: typeof r.domain === 'string' && r.domain ? r.domain : null }];
  });
}

/** SeatOS operator directory served by an MCP server (Streamable HTTP) at `TMS_TOOLS_MCP_URL`. Unset = not connected. */
export class McpTmsDirectory implements TmsDirectory {
  private client?: Promise<ToolClient>;

  constructor(
    private readonly url: string | undefined = process.env.TMS_TOOLS_MCP_URL || undefined,
    private readonly connect: (url: string) => Promise<ToolClient> = connectMcp,
  ) {}

  get connected(): boolean {
    return !!this.url;
  }

  async findOperators(name: string): Promise<TmsOperatorMatch[]> {
    if (!this.url) return [];
    const client = await this.ensure(this.url);
    let result: ToolResult;
    try {
      result = await client.call(TMS_TOOLS.lookupOperator, { name, limit: LOOKUP_LIMIT }, CALL_TIMEOUT_MS);
    } catch (error) {
      this.reset(); // reconnect on the next call
      throw error;
    }
    const text = textOf(result.content);
    if (result.isError) throw new Error(`TMS lookup failed: ${text.slice(0, 200)}`);
    return parseOperatorMatches(text);
  }

  private ensure(url: string): Promise<ToolClient> {
    this.client ??= this.connect(url).catch((error) => {
      this.client = undefined;
      throw error;
    });
    return this.client;
  }

  private reset(): void {
    const stale = this.client;
    this.client = undefined;
    void stale?.then((c) => c.close()).catch(() => undefined);
  }
}
