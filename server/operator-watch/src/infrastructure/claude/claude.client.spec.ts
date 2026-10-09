import * as http from 'node:http';
import { AddressInfo } from 'node:net';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import { ClaudeClient, ClaudeRefusalError } from './claude.client';

type Sent = { headers: http.IncomingHttpHeaders; body: Record<string, any> };

/** A local stand-in for POST /v1/messages that replays scripted responses and records each request. */
async function fakeApi(replies: ((body: Record<string, any>) => Record<string, unknown>)[]) {
  const sent: Sent[] = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = JSON.parse(raw);
      sent.push({ headers: req.headers, body });
      const reply = replies.shift();
      res.writeHead(reply ? 200 : 500, { 'content-type': 'application/json' });
      res.end(JSON.stringify(reply ? { id: `msg_${sent.length}`, type: 'message', role: 'assistant', model: body.model, usage: { input_tokens: 1, output_tokens: 1 }, stop_details: null, ...reply(body) } : { type: 'error', error: { type: 'api_error', message: 'no more replies' } }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const client = new Anthropic({ apiKey: 'test-key', baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, maxRetries: 0 });
  return { sent, client, close: () => new Promise((r) => server.close(r)) };
}

const config = { model: 'claude-opus-5-5', memoryModel: 'claude-opus-5-5' };

describe('ClaudeClient against the Messages API shape', () => {
  it('asks for structured output with the refusal fallback, caching and effort, and parses the JSON', async () => {
    const api = await fakeApi([() => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"subject":"Hi","body":"Hello"}' }] })]);
    try {
      const out = await new ClaudeClient(config, api.client).structured({ system: 'SYS', user: 'USER', schema: z.object({ subject: z.string(), body: z.string() }), effort: 'low' });
      expect(out).toEqual({ subject: 'Hi', body: 'Hello' });
      const { headers, body } = api.sent[0];
      expect(headers['anthropic-beta']).toContain('server-side-fallback-2026-07-01');
      expect(body).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default', cache_control: { type: 'ephemeral' }, system: 'SYS', messages: [{ role: 'user', content: 'USER' }] });
      expect(body.output_config).toMatchObject({ effort: 'low', format: { type: 'json_schema' } });
      expect(body.thinking).toBeUndefined();
    } finally {
      await api.close();
    }
  });

  it('runs the tool loop to the final answer', async () => {
    const api = await fakeApi([
      () => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'toolu_1', name: 'get_operator_context', input: {} }] }),
      (body) => {
        const last = body.messages.at(-1);
        expect(last.content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ctx for D-1' });
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'They are fine.' }] };
      },
    ]);
    try {
      const tool = betaZodTool({ name: 'get_operator_context', description: 'ctx', inputSchema: z.object({ operator_id: z.string().optional() }), run: async () => 'ctx for D-1' });
      const answer = await new ClaudeClient(config, api.client).converse({ system: 'CHAT', messages: [{ role: 'user', content: 'How are they?' }], tools: [tool], effort: 'medium', maxIterations: 4 });
      expect(answer).toBe('They are fine.');
      expect(api.sent).toHaveLength(2);
      expect(api.sent[0].body.tools[0]).toMatchObject({ name: 'get_operator_context' });
      expect(api.sent[0].body.output_config).toEqual({ effort: 'medium' });
    } finally {
      await api.close();
    }
  });

  it('turns a refusal into an error instead of empty output', async () => {
    const api = await fakeApi([() => ({ stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'cyber', explanation: null }, content: [] })]);
    try {
      await expect(new ClaudeClient(config, api.client).converse({ system: 'S', messages: [{ role: 'user', content: 'x' }], tools: [], effort: 'low', maxIterations: 2 })).rejects.toBeInstanceOf(ClaudeRefusalError);
    } finally {
      await api.close();
    }
  });

  it('surfaces API errors (e.g. a bad key) instead of hanging', async () => {
    const api = await fakeApi([]);
    try {
      await expect(new ClaudeClient(config, api.client).converse({ system: 'S', messages: [{ role: 'user', content: 'x' }], tools: [], effort: 'low', maxIterations: 2 })).rejects.toThrow(/no more replies/);
    } finally {
      await api.close();
    }
  });
});
