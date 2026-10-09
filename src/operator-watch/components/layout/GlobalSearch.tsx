import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccounts } from '../../api/queries';

export function GlobalSearch() {
  const { data: accounts = [] } = useAccounts();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const needle = q.trim().toLowerCase();
  const matches = needle
    ? accounts.filter((a) => `${a.name} ${a.id} ${a.caseId ?? ''} ${a.owner ?? ''}`.toLowerCase().includes(needle))
    : [];

  const go = (id: string) => {
    setQ('');
    setOpen(false);
    window.scrollTo(0, 0);
    navigate(`/accounts/${id}`);
  };

  return (
    <div className="search" ref={box}>
      <input
        id="gsearch"
        placeholder="Search accounts…"
        autoComplete="off"
        aria-label="Search accounts"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(!!e.target.value.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches[0]) go(matches[0].id);
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      <div id="gres" style={{ display: open ? 'block' : 'none' }}>
        {matches.length ? (
          matches.map((a) => (
            <div key={a.id} className="it" onClick={() => go(a.id)}>
              <span>
                <b>{a.name}</b> <span className="d">{a.caseId ?? a.id}</span>
              </span>
              <span className="d">{a.playbook}</span>
            </div>
          ))
        ) : (
          <div className="it d">No accounts found</div>
        )}
      </div>
    </div>
  );
}
