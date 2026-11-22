import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { EngineOverview } from '../../api/types';
import { EnginePage } from './EnginePage';

const data: EngineOverview = {
  run: { label: 'W47', status: 'completed', trigger: 'schedule', agent: 'claude', startedAt: '2026-11-16T19:00:00Z', completedAt: '2026-11-16T19:04:00Z' },
  kpis: { scanned: 120, flagged: 14, filtered: 106, pending: 9, approved: 3, closed: 1, rejected: 1, hold: 0, sentTotal: 40 },
  wao: { week: '2026-11-16', active: 39, withUsage: 96 },
  agents: [
    { key: 'scout', name: 'SCOUT', job: 'Flags operators going quiet', data: 'x', status: 'live', count: 14, countLabel: 'flagged this run' },
    { key: 'voice', name: 'VOICE', job: 'Monthly feedback brief', data: 'y', status: 'needs_data', count: null, countLabel: null },
  ],
  queue: [{ accountId: 'A1', name: 'Alpha Ferry', owner: 'Ann', playbook: 'Rescue', play: 'Retention', health: 'Unhealthy', summary: 's', signals: ['No login for 9 days'], drafted: true }],
  milestones: { week: '2026-11-16', buckets: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ categories: n, operators: n === 2 ? 47 : 5 })), stuckAtTwo: [{ accountId: 'B2', name: 'Beta Boats' }] },
  log: [{ id: 'e1', at: '2026-11-16', kind: 'ai', origin: 'agent', accountId: 'A1', name: 'Alpha Ferry', text: 'Case opened' }],
};

vi.mock('../../api/workspace', () => ({
  authApi: { me: async () => ({}) },
  workspaceApi: { engine: async () => data },
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/engine']}>
        <Routes>
          <Route path="/engine" element={<EnginePage />} />
          <Route path="/accounts/:id" element={<div>account page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EnginePage', () => {
  it('shows the run numbers, agents, queue and the operators one category short of WAO', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Customer Success Engine' })).toBeInTheDocument();
    expect(screen.getByText('106 of 120 handled without waking an agent (88%)')).toBeInTheDocument();
    expect(screen.getByText('SCOUT')).toBeInTheDocument();
    expect(screen.getByText('Needs data')).toBeInTheDocument();
    expect(screen.getByText('No login for 9 days')).toBeInTheDocument();
    expect(screen.getAllByText('47')).toHaveLength(2); // the 2-category bar and the "one short of WAO" callout
    expect(screen.getByRole('button', { name: 'Beta Boats' })).toBeInTheDocument();
  });

  it('opens the account when a queue row is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Alpha Ferry.*Review/ }));
    expect(screen.getByText('account page')).toBeInTheDocument();
  });
});
