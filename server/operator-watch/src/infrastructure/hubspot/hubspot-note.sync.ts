import { Inject, Injectable } from '@nestjs/common';
import { CrmNoteSync } from '../../domain/workspace/types/repositories/workspace.ports';
import { HubSpotClient } from './hubspot.client';
import { HUBSPOT_CONFIG, HubSpotConfig } from './hubspot.config';

/** HubSpot-defined association type: note → deal. */
const NOTE_TO_DEAL = 214;

/** `hs_note_body` is rendered as HTML: escape the text and keep line breaks. */
export const toNoteHtml = (text: string): string =>
  text.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] as string).replace(/\n/g, '<br>');

/**
 * Writes workspace notes to the account's main deal. Opt-in (`HUBSPOT_NOTES_ENABLED=true`) because it
 * changes the production CRM; needs a notes write scope on the private app.
 */
@Injectable()
export class HubSpotNoteSync implements CrmNoteSync {
  constructor(
    private readonly hubspot: HubSpotClient,
    @Inject(HUBSPOT_CONFIG) private readonly config: HubSpotConfig,
  ) {}

  get connected(): boolean {
    return this.config.notesEnabled;
  }

  async pushNote(input: { dealId: string; note: string; at: string }): Promise<void> {
    await this.hubspot.post('/crm/v3/objects/notes', {
      properties: { hs_timestamp: input.at, hs_note_body: toNoteHtml(input.note) },
      associations: [{ to: { id: input.dealId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: NOTE_TO_DEAL }] }],
    });
  }
}
