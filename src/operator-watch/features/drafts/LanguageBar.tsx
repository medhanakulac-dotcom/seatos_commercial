import { useMeta } from '../../api/queries';
import type { Language } from '../../api/types';

export function LanguageBar({ value, disabled, onChange }: { value: Language; disabled?: boolean; onChange: (lang: Language) => void }) {
  const { data: meta } = useMeta();
  if (!meta) return null;
  return (
    <div className="langbar">
      <span className="lb">Email language</span>
      {(Object.entries(meta.languages) as [Language, string][]).map(([code, label]) => (
        <button key={code} className={`b ${code === value ? 'on' : ''}`} disabled={disabled} onClick={() => code !== value && onChange(code)}>
          {label}
        </button>
      ))}
    </div>
  );
}
