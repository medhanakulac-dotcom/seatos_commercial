import { CrmAccount } from '../entities/workspace.entities';
import { DraftWriter } from '../types/repositories/workspace.ports';
import { analyseAccount, AUTO_DRAFT_PLAYBOOKS, languageForCountry, playbookFor, RECOMMENDED_FEATURES } from './playbook.rules';
import type { CaseSubmission } from './run.service';

/**
 * Built-in stand-in for Hermes (agent mode `local`): the team's segment × health playbook as rules.
 * Outreach for every non-Dormant, non-Healthy operator; drafts written up front only for playbooks
 * that auto-draft (others wait for "Generate"). Submits through the same path as Hermes.
 */
export function assessAccount(account: CrmAccount, referenceDate: string, writer: DraftWriter): CaseSubmission {
  const insight = analyseAccount(account, referenceDate);
  const playbook = playbookFor(account.segment, insight.health).name;
  const needsOutreach = !insight.dormant && insight.health !== 'Healthy';
  const language = languageForCountry(account.country);
  const draft =
    needsOutreach && AUTO_DRAFT_PLAYBOOKS.includes(playbook)
      ? writer.render({
          accountName: account.name,
          health: insight.health,
          playbook,
          language,
          mods: { short: false, warm: false, direct: false, variant: 0 },
          variant: 0,
          features: RECOMMENDED_FEATURES[insight.health],
        })
      : undefined;
  return {
    operatorId: account.id,
    needsOutreach,
    analysis: insight.why,
    nextStep: insight.next,
    reason: needsOutreach ? undefined : insight.next,
    playbook,
    playType: insight.play,
    language,
    signals: insight.signals,
    draft,
  };
}
