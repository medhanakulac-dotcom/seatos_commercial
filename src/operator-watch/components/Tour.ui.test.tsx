import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tour, type TourStep } from './Tour';

const steps: TourStep[] = [
  { target: '[data-tour="a"]', title: 'First part', body: 'Explains the first part.' },
  { target: '[data-tour="missing"]', title: 'Second part', body: 'Target not on the page: the card is centred.' },
];

function page(ready = true) {
  return render(
    <div>
      <div data-tour="a">A</div>
      <Tour id="t1" steps={steps} ready={ready} />
    </div>,
  );
}

describe('Tour', () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('starts by itself the first time, walks the steps and does not come back after Done', async () => {
    const user = userEvent.setup();
    page();
    expect(await screen.findByText('First part', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Second part')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('First part')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem('ow-tour-t1-seen')).toBe('1');
  });

  it('can be skipped, and is replayed with the Take tour button', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText('First part', {}, { timeout: 2000 });
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Take tour' }));
    expect(screen.getByText('First part')).toBeInTheDocument();
  });

  it('stays closed on later visits and waits until the page is ready', async () => {
    localStorage.setItem('ow-tour-t1-seen', '1');
    page();
    await new Promise((r) => setTimeout(r, 900));
    expect(screen.queryByRole('dialog')).toBeNull();
    localStorage.clear();
    page(false);
    await new Promise((r) => setTimeout(r, 900));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
