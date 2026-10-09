import { McpTmsDirectory, parseOperatorMatches, TMS_TOOLS, ToolClient, ToolResult } from './mcp-tms.directory';

const payload = JSON.stringify({ total: 1, results: [{ operator_id: 26281, operator_name: 'Bangkok Travel Plus', is_active: true, domain: 'travelplus.seatos.com' }] });
const ok = (text: string): ToolResult => ({ content: [{ type: 'text', text }] });

const fake = (results: (ToolResult | Error)[]) => {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  let connects = 0;
  const connect = async (): Promise<ToolClient> => {
    connects++;
    return {
      call: async (name, args) => {
        calls.push({ name, args });
        const next = results.shift()!;
        if (next instanceof Error) throw next;
        return next;
      },
      close: async () => undefined,
    };
  };
  return { calls, connect, connects: () => connects };
};

describe('McpTmsDirectory', () => {
  it('maps tool results to matches and calls the canonical tool', async () => {
    const f = fake([ok(payload)]);
    const dir = new McpTmsDirectory('http://x/mcp', f.connect);
    expect(dir.connected).toBe(true);
    expect(await dir.findOperators('Bangkok Travel Plus')).toEqual([{ tmsOperatorId: 26281, name: 'Bangkok Travel Plus', active: true, domain: 'travelplus.seatos.com' }]);
    expect(f.calls[0].name).toBe(TMS_TOOLS.lookupOperator);
    expect(f.calls[0].args.name).toBe('Bangkok Travel Plus');
  });

  it('is disconnected and returns nothing without a URL', async () => {
    const f = fake([]);
    const dir = new McpTmsDirectory(undefined, f.connect);
    expect(dir.connected).toBe(false);
    expect(await dir.findOperators('x')).toEqual([]);
    expect(f.connects()).toBe(0);
  });

  it('throws on tool errors and malformed output', async () => {
    const f = fake([{ isError: true, content: [{ type: 'text', text: 'boom' }] }, ok('not json')]);
    const dir = new McpTmsDirectory('http://x/mcp', f.connect);
    await expect(dir.findOperators('a')).rejects.toThrow(/boom/);
    await expect(dir.findOperators('a')).rejects.toThrow(/non-JSON/);
  });

  it('reuses the client and reconnects after a transport failure', async () => {
    const f = fake([ok(payload), new Error('socket closed'), ok(payload)]);
    const dir = new McpTmsDirectory('http://x/mcp', f.connect);
    await dir.findOperators('a');
    await dir.findOperators('a').catch(() => undefined);
    expect(f.connects()).toBe(1);
    await dir.findOperators('a');
    expect(f.connects()).toBe(2);
  });
});

describe('parseOperatorMatches', () => {
  it('skips malformed rows and defaults domain to null', () => {
    const text = JSON.stringify({ results: [{ operator_id: 1, operator_name: 'A', is_active: false }, { operator_name: 'no id' }, { operator_id: 'x', operator_name: 'bad' }] });
    expect(parseOperatorMatches(text)).toEqual([{ tmsOperatorId: 1, name: 'A', active: false, domain: null }]);
  });
});
