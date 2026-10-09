import type { AccountSummary } from '../api/types';
import { ownerKey, ownerName, ownersByLoad } from '../lib/format';

/**
 * "Owner: all" plus every owner with accounts in `list` (and the current selection),
 * ordered by overall load, each with its count in `list`.
 */
export function OwnerSelect({ all, list, value, onChange }: { all: AccountSummary[]; list: AccountSummary[]; value: string; onChange: (v: string) => void }) {
  const options = ownersByLoad(all)
    .map((o) => ({ key: ownerKey(o), label: ownerName(o), n: list.filter((a) => a.owner === o).length }))
    .filter((o) => o.n || o.key === value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Owner">
      <option value="All">Owner: all</option>
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label} ({o.n})
        </option>
      ))}
    </select>
  );
}
