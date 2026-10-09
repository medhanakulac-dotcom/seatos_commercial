import type { Draft } from '../../api/types';

export function MailHeader({ draft, style }: { draft: Draft; style?: React.CSSProperties }) {
  return (
    <div className="mail" style={style}>
      From: {draft.from}
      <br />
      To: {draft.to ?? <i>no contact with an email in HubSpot — enter one when approving</i>}
      <br />
      Subject: {draft.subject}
    </div>
  );
}

const agentName = (author: string) => author.replace(/^agent:/, '').replace(/^\w/, (c) => c.toUpperCase());

/** Who wrote the current version: the agent (e.g. Hermes), the built-in template, or a person. */
export const draftBadge = (draft: Draft) =>
  draft.writer === 'agent'
    ? `✦ Written by ${agentName(draft.author).startsWith('User') ? 'AI' : agentName(draft.author)} · v${draft.version}`
    : draft.writer === 'human'
      ? `Edited by hand · v${draft.version}`
      : `Template draft · v${draft.version}`;
export const qaLabel = (draft: Draft) => (draft.qa === 'not_run' ? 'QA not run' : draft.qa === 'pass' ? 'QA pass' : 'QA failed');
