import { Injectable } from '@nestjs/common';
import { FEATURE_NAMES } from '../../domain/workspace/services/playbook.rules';
import { DraftRequest, DraftWriter, RenderedDraft } from '../../domain/workspace/types/repositories/workspace.ports';
import { FEATURE_DESCRIPTIONS, GENERIC, PHRASES } from './draft.templates';

/** Deterministic, template-based email drafts. Stands in for the LLM writer in the POC. */
@Injectable()
export class TemplateDraftWriter implements DraftWriter {
  readonly kind = 'template' as const;

  render(r: DraftRequest): RenderedDraft {
    const template = GENERIC[r.language];
    const phrases = PHRASES[r.language];
    const { short, warm, direct } = r.mods;
    const greet = template.greet(r.accountName) + (warm ? ` ${phrases.warm}` : '');
    const allPoints = template.points[r.health];
    const points = (short ? allPoints.slice(0, 1) : allPoints).map((p) => `• ${p}`).join('\n');
    const features = short ? r.features.slice(0, 1) : r.features;
    const recommendations = features
      .map((k, i) => `${i + 1}. ${FEATURE_NAMES[k]} — ${FEATURE_DESCRIPTIONS[r.language][k]}`)
      .join('\n');
    const asksForCall = r.playbook === 'Rescue';
    const ask = direct ? (asksForCall ? phrases.directMeet : phrases.direct) : asksForCall ? phrases.meet : phrases.close;
    const sign = warm ? phrases.warmSign : r.variant ? phrases.signs[r.variant % 3] : template.sign;
    const body = [greet, template.intro, points, `${phrases.recoHead}\n${recommendations}`, ask, sign].join('\n\n');
    return { subject: template.subject, body };
  }
}
