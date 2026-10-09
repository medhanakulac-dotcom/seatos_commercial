import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TmsLink } from '../../api/types';
import { TmsLinkRow } from './TmsLinkRow';

const base: TmsLink = { status: 'unresolved', tmsOperatorId: null, tmsOperatorName: null, source: null, candidates: [], confirmedBy: null };
const picking: TmsLink = {
  ...base,
  status: 'needs_confirmation',
  candidates: [
    { tmsOperatorId: 11, name: 'Alpha Ferry', active: true, domain: 'alpha.example' },
    { tmsOperatorId: 22, name: 'Alpha Old', active: false, domain: null },
  ],
};

function setup(link: TmsLink | undefined, role: 'analyst' | 'viewer' = 'analyst') {
  const calls: { url: string; body?: unknown }[] = [];
  const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url.endsWith('/auth/me')) return json({ id: 'u1', name: 'Rik', role, permissions: role === 'viewer' ? ['workspace:read'] : ['workspace:read', 'workspace:review'], allOperators: true });
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return json({ id: 'D-1' });
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <div className="prop">
        <TmsLinkRow accountId="D-1" link={link} />
      </div>
    </QueryClientProvider>,
  );
  return calls;
}

describe('TmsLinkRow', () => {
  it('shows the linked operator with who confirmed it', async () => {
    setup({ ...base, status: 'linked', tmsOperatorId: 11, tmsOperatorName: 'Alpha Ferry', source: 'human', confirmedBy: 'Anong', candidates: picking.candidates.slice(0, 1) });
    expect(screen.getByText(/Alpha Ferry · #11/)).toBeTruthy();
    expect(screen.getByText('(confirmed by Anong)')).toBeTruthy();
    expect(screen.getByText('alpha.example')).toBeTruthy();
  });

  it('renders nothing for an older backend without tmsLink', () => {
    setup(undefined);
    expect(screen.queryByText('SeatOS')).toBeNull();
  });

  it('confirms a candidate from the picker', async () => {
    const user = userEvent.setup();
    const calls = setup(picking);
    await user.click(await screen.findByRole('button', { name: 'Confirm SeatOS operator' }));
    expect(screen.getByText('(inactive)')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Confirm Alpha Ferry' }));
    await waitFor(() => expect(calls).toContainEqual({ url: expect.stringContaining('/workspace/accounts/D-1/tms-link'), body: { tmsOperatorId: 11 } }));
  });

  it('looks up again for an unlinked account', async () => {
    const user = userEvent.setup();
    const calls = setup({ ...base, status: 'not_found' });
    expect(screen.getByText('Not linked')).toBeTruthy();
    await user.click(await screen.findByRole('button', { name: 'Look up again' }));
    await waitFor(() => expect(calls).toContainEqual({ url: expect.stringContaining('/workspace/accounts/D-1/tms-link/resolve'), body: {} }));
  });

  it('hides the buttons from viewers', async () => {
    setup(picking, 'viewer');
    await waitFor(() => expect(screen.getByText('Needs confirmation')).toBeTruthy());
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('hides Look up again from viewers', async () => {
    setup({ ...base, status: 'not_found' }, 'viewer');
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('Not linked')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
