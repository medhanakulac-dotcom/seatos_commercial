import { timingSafeEqual } from 'node:crypto';
import { All, Controller, Inject, Logger, Optional, Req, Res } from '@nestjs/common';
import { WeeklyDataService } from '../../domain/workspace/services/weekly-data.service';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { RunService } from '../../domain/workspace/services/run.service';
import { AGENT_HARNESS, AgentHarness, CRM_ACTIVITY, CrmActivitySource, WORKSPACE_STORE, WorkspaceStore } from '../../domain/workspace/types/repositories/workspace.ports';
import { buildMcpServer } from './mcp.tools';

interface FastifyLikeRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  raw: IncomingMessage;
}
interface FastifyLikeReply {
  hijack(): void;
  raw: ServerResponse;
  status(code: number): FastifyLikeReply;
  send(body: unknown): void;
}

/** Constant-time bearer check against AGENT_API_TOKEN. */
export function agentAuthorized(header: string | string[] | undefined, token = process.env.AGENT_API_TOKEN): boolean {
  if (!token || typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice(7));
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * MCP endpoint (Streamable HTTP, stateless) for agents — Hermes, or Claude Desktop/Code as a connector:
 * `POST /mcp` with `Authorization: Bearer <AGENT_API_TOKEN>`. On the site it is `/api/ow/mcp`. Disabled (503) until
 * AGENT_API_TOKEN is set.
 */
@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(
    private readonly runs: RunService,
    @Inject(WORKSPACE_STORE) private readonly store: WorkspaceStore,
    @Inject(AGENT_HARNESS) private readonly harness: AgentHarness,
    @Optional() private readonly weekly?: WeeklyDataService,
    @Optional() @Inject(CRM_ACTIVITY) private readonly crmActivity?: CrmActivitySource,
  ) {}

  @All()
  async handle(@Req() req: FastifyLikeRequest, @Res() reply: FastifyLikeReply): Promise<void> {
    if (!process.env.AGENT_API_TOKEN) return reply.status(503).send({ error: 'Agent API is disabled (AGENT_API_TOKEN not set)' });
    if (!agentAuthorized(req.headers.authorization)) return reply.status(401).send({ error: 'Unauthorized' });
    if (req.method !== 'POST') return reply.status(405).send({ error: 'Use POST (stateless MCP)' });

    const server = buildMcpServer(this.runs, this.store, this.harness.author.id, { weekly: this.weekly, crmActivity: this.crmActivity });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    reply.hijack();
    reply.raw.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req.raw, reply.raw, req.body);
    } catch (error) {
      this.logger.error(`MCP request failed: ${error instanceof Error ? error.message : String(error)}`);
      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { 'content-type': 'application/json' });
        reply.raw.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null }));
      }
    }
  }
}
