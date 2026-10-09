import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { CrmActivity } from '../../api/types';
import { workspaceApi } from '../../api/workspace';
import { formatEventTime } from '../../lib/format';

const LABEL: Record<CrmActivity['type'], string> = { note: 'Note', meeting: 'Meeting', call: 'Call', email: 'Email', task: 'Task', message: 'Message' };
const PREVIEW = 280;

function Item({ item }: { item: CrmActivity }) {
  const [open, setOpen] = useState(false);
  const long = (item.body?.length ?? 0) > PREVIEW;
  const body = item.body && (open || !long ? item.body : `${item.body.slice(0, PREVIEW)}…`);
  return (
    <div className="ev">
      <div className="t">
        {formatEventTime(item.at)} · <b>{LABEL[item.type]}</b>
        {item.detail ? ` · ${item.detail}` : ''}
        {item.owner ? ` · ${item.owner}` : ''}
      </div>
      {item.title && <b>{item.title}</b>}
      {body && <div style={{ whiteSpace: 'pre-wrap' }}>{body}</div>}
      {long && (
        <button className="b tlb" style={{ marginTop: 4 }} onClick={() => setOpen((v) => !v)}>
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

/** Everything logged with the operator in HubSpot (read live): what the AI reads too. */
export function HubSpotActivity({ accountId }: { accountId: string }) {
  const { data, isPending, error } = useQuery({ queryKey: ['workspace', 'crm-activity', accountId], queryFn: () => workspaceApi.crmActivity(accountId), staleTime: 60_000 });
  return (
    <div className="card">
      <h2 className="st">
        <span>HubSpot activity</span>
        <span className="d">{data?.connected ? `${data.items.length} newest` : ''}</span>
      </h2>
      {isPending && <div className="d">Loading notes, meetings, calls and emails from HubSpot…</div>}
      {error && <div className="d">HubSpot activity could not be loaded: {error.message}</div>}
      {data && !data.connected && <div className="d">HubSpot is not connected (sample data).</div>}
      {data?.connected && !data.items.length && <div className="d">Nothing logged in HubSpot for this operator yet.</div>}
      {data?.connected && data.items.length > 0 && (
        <div className="tl">
          {data.items.map((i) => (
            <Item key={i.id} item={i} />
          ))}
        </div>
      )}
    </div>
  );
}
