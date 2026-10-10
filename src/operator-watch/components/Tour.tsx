import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface TourStep {
  /** CSS selector of the element to highlight (usually [data-tour="…"]); when it is missing the card is centred. */
  target?: string;
  title: string;
  body: string;
}

const storageKey = (id: string) => `ow-tour-${id}-seen`;
const seen = (id: string): boolean => {
  try {
    return localStorage.getItem(storageKey(id)) === '1';
  } catch {
    return false;
  }
};
const markSeen = (id: string): void => {
  try {
    localStorage.setItem(storageKey(id), '1');
  } catch {
    /* private window or blocked storage: the tour simply shows again next time */
  }
};

const PAD = 8;
const CARD_W = 340;
type Box = { top: number; left: number; width: number; height: number };

/**
 * A short guided tour for people who see a page for the first time. It opens by itself once per browser (when `ready`)
 * and can be replayed with the "Take tour" button. Each step highlights one part of the page and explains it.
 */
export function Tour({ id, steps, ready = true }: { id: string; steps: TourStep[]; ready?: boolean }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(180);

  const start = useCallback(() => {
    setIndex(0);
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    markSeen(id);
    setOpen(false);
  }, [id]);

  // First visit: start once the page content is there.
  useEffect(() => {
    if (!ready || seen(id)) return;
    const t = setTimeout(start, 700);
    return () => clearTimeout(t);
  }, [ready, id, start]);

  const step = steps[index];

  // Follow the highlighted element while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!open || !step) return;
    const measure = () => {
      const el = step.target ? document.querySelector(step.target) : null;
      if (!el) return setBox(null);
      const r = el.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const el = step.target ? document.querySelector(step.target) : null;
    el?.scrollIntoView({ block: 'center', behavior: 'auto' });
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step, index]);

  useLayoutEffect(() => {
    if (open && card.current) setCardH(card.current.offsetHeight);
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') setIndex((i) => (i < steps.length - 1 ? i + 1 : (close(), i)));
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, steps.length, close]);

  const button = (
    <button type="button" className="b tlb" onClick={start}>
      Take tour
    </button>
  );
  if (!open || !step) return button;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(CARD_W, vw - 24);
  // Below the highlight when there is room, otherwise above it; centred when nothing is highlighted.
  let top = vh / 2 - cardH / 2;
  let left = vw / 2 - w / 2;
  if (box) {
    const below = box.top + box.height + PAD + 12;
    top = below + cardH <= vh - 12 ? below : Math.max(12, box.top - PAD - 12 - cardH);
    left = Math.min(Math.max(12, box.left), vw - w - 12);
    if (top < 12) top = Math.min(vh - cardH - 12, Math.max(12, box.top + 16)); // a tall highlight: sit inside it
  }
  const last = index === steps.length - 1;

  return (
    <>
      {button}
      {createPortal(
        <div role="dialog" aria-modal="true" aria-label="Page tour" style={{ position: 'fixed', inset: 0, zIndex: 100000 }}>
          <div style={{ position: 'fixed', inset: 0 }} onClick={close} />
          {box ? (
            <div
              style={{
                position: 'fixed',
                top: box.top - PAD,
                left: box.left - PAD,
                width: box.width + PAD * 2,
                height: box.height + PAD * 2,
                borderRadius: 16,
                boxShadow: '0 0 0 9999px rgba(26,26,26,.55)',
                border: '2px solid #F5A623',
                pointerEvents: 'none',
                transition: 'all .2s ease',
              }}
            />
          ) : (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,26,.55)', pointerEvents: 'none' }} />
          )}
          <div
            ref={card}
            style={{
              position: 'fixed',
              top,
              left,
              width: w,
              background: '#fff',
              color: '#1A1A1A',
              borderRadius: 18,
              padding: '18px 20px 16px',
              boxShadow: '0 18px 50px rgba(0,0,0,.3)',
              font: '14px/1.55 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', color: '#8E8E93', textTransform: 'uppercase', marginBottom: 6 }}>
              Step {index + 1} of {steps.length}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{step.title}</div>
            <div style={{ color: '#555', marginBottom: 16 }}>{step.body}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={close} style={{ background: 'none', border: 0, color: '#8E8E93', cursor: 'pointer', font: 'inherit', padding: 0 }}>
                Skip
              </button>
              <span style={{ flex: 1 }} />
              {index > 0 && (
                <button type="button" className="b" onClick={() => setIndex((i) => i - 1)}>
                  Back
                </button>
              )}
              <button type="button" className="b pri" autoFocus onClick={() => (last ? close() : setIndex((i) => i + 1))}>
                {last ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
