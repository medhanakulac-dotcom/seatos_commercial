import { Logger } from '@nestjs/common';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import type { BetaRunnableTool } from '@anthropic-ai/sdk/lib/tools/BetaRunnableTool';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const CALL_TIMEOUT_MS = 20_000;
const MAX_RESULT_CHARS = 20_000;
/** Tools that write or expose raw SQL are never handed to the chat. */
const BLOCKED = /mysql|sql_query|write|update|delete|create|insert/i;

/** Claude tool names allow [a-zA-Z0-9_-]{1,64}; MCP names may contain ':' or '.'. */
export const claudeToolName = (mcpName: string) => mcpName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);

const textOf = (content: unknown): string =>
  (Array.isArray(content) ? content : [])
    .filter((c): c is { type: 'text'; text: string } => c?.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n');

/**
 * Live SeatOS data for the chat (bookings, routes, agents, trips — what the seatos-query skill used through MCPHub):
 * the read-only tools of the SeatOS MCP server at TMS_TOOLS_MCP_URL, offered to Claude as client tools. The server must
 * be reachable from Vercel; TMS_TOOLS_MCP_TOKEN, when set, is sent as a bearer token. Unset = no live numbers.
 */
export class SeatosTools {
  private readonly logger = new Logger(SeatosTools.name);
  private cached?: { at: number; tools: BetaRunnableTool[] };

  constructor(
    private readonly url: string | undefined = process.env.TMS_TOOLS_MCP_URL || undefined,
    private readonly token: string | undefined = process.env.TMS_TOOLS_MCP_TOKEN || undefined,
  ) {}

  get configured(): boolean {
    return !!this.url;
  }

  /** The tool list, refreshed every 10 minutes. Never throws: without SeatOS the chat still answers from the workspace. */
  async tools(): Promise<BetaRunnableTool[]> {
    if (!this.url) return [];
    if (this.cached && Date.now() - this.cached.at < 600_000) return this.cached.tools;
    try {
      const client = await this.connect();
      try {
        const { tools } = await client.listTools(undefined, { timeout: CALL_TIMEOUT_MS });
        const runnable = tools
          .filter((t) => !BLOCKED.test(t.name) && !t.annotations?.destructiveHint)
          .map((t) =>
            betaTool({
              name: claudeToolName(t.name),
              description: `SeatOS (live): ${t.description ?? t.name}`.slice(0, 1024),
              inputSchema: (t.inputSchema ?? { type: 'object', properties: {} }) as { type: 'object' },
              run: (args) => this.call(t.name, args as Record<string, unknown>),
            }),
          );
        this.cached = { at: Date.now(), tools: runnable };
        return runnable;
      } finally {
        await client.close().catch(() => undefined);
      }
    } catch (error) {
      this.logger.warn(`SeatOS tools unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private async call(name: string, args: Record<string, unknown>): Promise<string> {
    const client = await this.connect();
    try {
      const result = (await client.callTool({ name, arguments: args }, undefined, { timeout: CALL_TIMEOUT_MS })) as { isError?: boolean; content?: unknown };
      const text = textOf(result.content) || '(no data returned)';
      const clipped = text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}\n… (truncated)` : text;
      return result.isError ? `The SeatOS tool failed: ${clipped}` : clipped;
    } catch (error) {
      return `The SeatOS tool failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      await client.close().catch(() => undefined);
    }
  }

  private async connect(): Promise<Client> {
    const client = new Client({ name: 'operator-watch', version: '1.0.0' });
    const headers: Record<string, string> = this.token ? { authorization: `Bearer ${this.token}` } : {};
    await client.connect(new StreamableHTTPClientTransport(new URL(this.url!), { requestInit: { headers } }), { timeout: CALL_TIMEOUT_MS });
    return client;
  }
}
