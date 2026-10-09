import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AccountDetail, AccountSummary, WorkspaceMeta } from '../../api/types';
import { UiStateProvider } from '../../app/UiState';
import { ToastProvider } from '../../components/Toast';
import { ApprovalsPage } from './ApprovalsPage';

const summary = (id: string, name: string): AccountSummary => ({
  id, crmId: id, name, caseId: `2026-W40-${id}`, week: '2026-W40', owner: 'Anong Srisuk', country: 'Thailand', segment: 'Low',
  health: 'Unhealthy', crmHealth: 'Unhealthy', dormant: false, playbook: 'Automated Activation', playbookDescription: '', play: 'Retention',
  outbox: 'OUT-1', priority: 20, language: 'en', noSend: false, drafted: true, state: 'pending', signalCount: 1, summary: '', author: 'agent:local',
});
const detail = (s: AccountSummary): AccountDetail => ({
  ...s, next: '', amount: 0, createdAt: '2024-01-01', modifiedAt: '2026-09-28', lastNoteAt: null, closeDate: null, deals: [], events: [], cases: [],
  signals: [{ detector: 'HubSpot health', code: 'CRM-1', text: 'Health status: Unhealthy' }],
  draft: { subject: `Hello ${s.name}`, body: `Body for ${s.name}`, from: "Anong Srisuk's mailbox", to: null, version: 1, hash: 'abcd1234',
    mods: { short: false, warm: false, direct: false }, writer: 'template', author: 'agent:local', qa: 'not_run', tokenTtlHours: 72 },
  contacts: [{ id: 'c1', name: 'Ops', email: `ops@${s.id.toLowerCase()}.example` }], sendJobs: [], run: { id: 'r1', label: '2026-W40', status: 'completed' },
  voidNote: null, rejectReason: null,
});
const meta = {
  week: { current: '2026-W40', previous: '2026-W39' },
  source: { kind: 'mock', portal: 'Test', pulledAt: '2026-09-29', description: '', accountCount: 2 },
  capabilities: { assistant: false, emailRewrite: false, crmNotes: true, drafts: 'template' },
  run: null,
  agent: { mode: 'local' },
  sending: { enabled: false, channels: [{ id: 'smtp', label: 'Email server (SMTP)' }, { id: 'hubspot', label: 'HubSpot' }], defaultChannel: 'smtp', schedule: 'Tue 09:00', redirected: false },
  languages: { en: 'English', th: 'ไทย', vi: 'Tiếng Việt', id: 'Bahasa Indonesia' },
  playbooks: { matrix: {}, dormant: { name: 'Reactive Only', description: '' }, healths: ['Unhealthy', 'Adopted', 'Healthy'] },
} as unknown as WorkspaceMeta;

function stubApi() {
  const accounts = [summary('A1', 'Alpha Ferry'), summary('B2', 'Bravo Bus')];
  const calls: { url: string; body?: unknown }[] = [];
  const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, body });
    if (url.endsWith('/workspace/meta')) return json(meta);
    if (url.endsWith('/workspace/accounts')) return json({ items: accounts });
    const decision = url.match(/accounts\/(\w+)\/decision$/);
    if (decision) {
      const a = accounts.find((x) => x.id === decision[1])!;
      a.state = 'approved';
      return json(detail(a));
    }
    const one = url.match(/accounts\/(\w+)$/);
    if (one) return json(detail(accounts.find((x) => x.id === one[1])!));
    return new Response('{}', { status: 404 });
  });
  return calls;
}

function renderPage(path = '/approvals') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <UiStateProvider>
          <ToastProvider>
            <Routes>
              <Route path="/approvals" element={<ApprovalsPage />} />
            </Routes>
          </ToastProvider>
        </UiStateProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('ApprovalsPage', () => {
  it('shows the first case, approves it through the API and moves to the next pending case', async () => {
    const calls = stubApi();
    renderPage();
    expect(await screen.findByText('Body for Alpha Ferry')).toBeInTheDocument();
    expect(screen.getByText(/Email AI is not connected yet/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Approve to send…' }));
    // Step 2: channel defaults to the admin's default, recipient to the HubSpot contact; the user can change both.
    expect(screen.getByLabelText('Recipient')).toHaveValue('ops@a1.example');
    expect(screen.getByText(/Sending is paused by an admin/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Send via'), 'hubspot');
    await userEvent.clear(screen.getByLabelText('Recipient'));
    await userEvent.type(screen.getByLabelText('Recipient'), 'owner@alpha.example');
    await userEvent.click(screen.getByRole('button', { name: /Confirm approve/ }));

    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/accounts/A1/decision'))).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/decision'))?.body).toEqual({ decision: 'approve', channel: 'hubspot', recipient: 'owner@alpha.example' });
    expect(await screen.findByText('Body for Bravo Bus')).toBeInTheDocument();
    expect(await screen.findByText('Approved · queued to send')).toBeInTheDocument();
  });

  it('requires confirming a rejection and sends the reason', async () => {
    const calls = stubApi();
    renderPage('/approvals?case=B2');
    expect(await screen.findByText('Body for Bravo Bus')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await userEvent.type(screen.getByPlaceholderText('Reason (goes back to SUP-1)'), 'Wrong contact');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm reject' }));
    await waitFor(() => expect(calls.find((c) => c.url.endsWith('/accounts/B2/decision'))?.body).toEqual({ decision: 'reject', reason: 'Wrong contact' }));
  });

  it.each([['Hold', 'hold'], ['Close case', 'close']] as const)('%s asks for an optional reason and sends it', async (label, decision) => {
    const calls = stubApi();
    renderPage('/approvals?case=B2');
    expect(await screen.findByText('Body for Bravo Bus')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: label }));
    const input = screen.getByPlaceholderText('Reason (optional)');
    expect(input).toHaveAttribute('maxLength', '500');
    await userEvent.type(input, ' Waiting on contract ');
    await userEvent.click(screen.getByRole('button', { name: `Confirm ${decision}` }));
    await waitFor(() => expect(calls.find((c) => c.url.endsWith('/accounts/B2/decision'))?.body).toEqual({ decision, reason: 'Waiting on contract' }));
  });

  it('allows Hold without a reason and can be cancelled', async () => {
    const calls = stubApi();
    renderPage('/approvals?case=B2');
    expect(await screen.findByText('Body for Bravo Bus')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hold' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(calls.some((c) => c.url.endsWith('/decision'))).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Hold' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm hold' }));
    await waitFor(() => expect(calls.find((c) => c.url.endsWith('/accounts/B2/decision'))?.body).toEqual({ decision: 'hold' }));
  });
});
