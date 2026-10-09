import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CaseEvent, EventKind, EventOrigin, Language } from '../entities/workspace.entities';
import { WORKSPACE_STORE, WorkspaceStore } from '../types/repositories/workspace.ports';
import { validateSettings, withDefaults, WorkspaceSettings } from './settings';

export const newId = (): string => randomUUID();
export const newToken = (): string => randomBytes(8).toString('hex');

/** Content hash an approval is bound to: any change to subject or body produces a new hash. */
export const draftHash = (caseRef: string, subject: string, body: string): string =>
  createHash('sha256').update(`${caseRef}\n${subject}\n${body}`).digest('hex').slice(0, 12);

export function newEvent(input: {
  operatorId: string;
  caseId?: string | null;
  kind: EventKind;
  origin: EventOrigin;
  text: string;
  at: string;
  note?: string;
}): CaseEvent {
  return { id: newId(), caseId: input.caseId ?? null, operatorId: input.operatorId, at: input.at, kind: input.kind, origin: input.origin, text: input.text, note: input.note ?? null };
}

export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  en: 'English',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
};

export const CHANNEL_NAMES = { smtp: 'Email server (SMTP)', hubspot: 'HubSpot' } as const;

export const ownerName = (owner: string | null): string => owner ?? 'Unassigned';

/** Admin-only workspace configuration, stored in the database and merged over defaults. */
@Injectable()
export class SettingsService {
  constructor(@Inject(WORKSPACE_STORE) private readonly store: WorkspaceStore) {}

  async get(): Promise<WorkspaceSettings> {
    return withDefaults(await this.store.getSettings());
  }

  async save(input: unknown, updatedBy: string): Promise<WorkspaceSettings> {
    const settings = validateSettings(input, { smtpFromFallback: !!process.env.SMTP_FROM_ADDRESS?.trim() });
    await this.store.saveSettings(settings, updatedBy);
    return settings;
  }
}
