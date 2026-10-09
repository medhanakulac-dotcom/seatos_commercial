import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/** Surfaces failed API calls as a dismissible bar instead of leaving them in the console. */
export function ErrorBanner() {
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  useEffect(() => {
    const unsubQueries = qc.getQueryCache().subscribe((e) => {
      if (e.type === 'updated' && e.action.type === 'error' && !e.query.queryKey.includes('auth')) setMessage(e.action.error.message);
    });
    const unsubMutations = qc.getMutationCache().subscribe((e) => {
      if (e.type === 'updated' && e.action.type === 'error') setMessage(e.action.error.message);
    });
    return () => {
      unsubQueries();
      unsubMutations();
    };
  }, [qc]);
  if (!message) return null;
  return (
    <div className="banner" role="alert">
      <span>{message}</span>
      <button aria-label="Dismiss" onClick={() => setMessage('')}>
        ×
      </button>
    </div>
  );
}
