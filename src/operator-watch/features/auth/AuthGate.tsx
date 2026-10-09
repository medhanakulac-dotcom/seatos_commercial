import { ApiError } from '../../api/http';
import { useMe } from '../../api/queries';

/**
 * Renders Operator Watch once the API knows the user. Sign-in itself happens on the site (Supabase); a 401 here means
 * the account is not allowed in Operator Watch (not on the allowed list, or deactivated by an Operator Watch admin).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const me = useMe();

  if (me.isPending) return <div className="gate loading">Loading…</div>;
  if (me.data) return <>{children}</>;

  const denied = me.error instanceof ApiError && (me.error.status === 401 || me.error.status === 403);
  return (
    <div className="gate">
      <div className="card">
        <div className="brand">
          Operator Watch<small>customer success</small>
        </div>
        <p className="d" style={{ marginTop: 16 }}>
          {denied
            ? `Your account does not have access to Operator Watch${me.error?.message && me.error.message !== 'Unauthorized' ? ` (${me.error.message})` : ''}. Ask an admin.`
            : `The Operator Watch API is unavailable: ${me.error?.message ?? 'unknown error'}`}
        </p>
        <div className="row">
          <button className="b" onClick={() => void me.refetch()}>
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
