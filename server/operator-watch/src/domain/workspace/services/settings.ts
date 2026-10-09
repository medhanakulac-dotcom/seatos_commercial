import { SEND_CHANNELS, SendChannel } from '../entities/workspace.entities';
import { WorkspaceError } from '../errors/workspace.errors';

/** Admin-only configuration. Secrets (tokens, passwords, HMAC keys) live in env, never here. */
export interface WorkspaceSettings {
  pipeline: {
    /** When off, runs only start from "Run now". */
    enabled: boolean;
    cadence: 'daily' | 'weekly';
    /** 0 = Sunday … 6 = Saturday; used when cadence is weekly. */
    weekday: number;
    /** HH:mm in `timezone`. */
    time: string;
    timezone: string;
  };
  agent: {
    /**
     * `claude`: Claude assesses every operator inside the API (queued, worked off by the scheduler tick).
     * `hermes`: trigger the Hermes webhook and wait for MCP submissions. `local`: built-in rule-based playbook.
     */
    mode: 'claude' | 'hermes' | 'local';
    webhookUrl: string;
    /** Label recorded on every case, e.g. the Hermes skill/playbook revision. */
    playbookVersion: string;
  };
  sending: {
    /** Master switch. Approved emails wait in the queue while this is off. */
    enabled: boolean;
    defaultChannel: SendChannel;
    smtp: { enabled: boolean; fromName: string; fromAddress: string };
    hubspot: { enabled: boolean; emailId: string };
    schedule: { mode: 'immediate' | 'slot'; weekday: number; time: string };
    /** Replies go here instead of the shared From address (SMTP channel; HubSpot uses the transactional email's own setting). Blank = replies go to From. */
    replyTo: string;
    /** Safety net: when set, every email is delivered here instead of the customer. */
    redirectAllTo: string;
  };
  guards: {
    /** Never send proactive email to Dormant accounts, whatever the agent proposes. */
    blockDormant: boolean;
    /** Never send proactive email to Healthy accounts. */
    blockHealthy: boolean;
  };
}

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  pipeline: { enabled: false, cadence: 'weekly', weekday: 1, time: '05:00', timezone: 'Asia/Bangkok' },
  agent: { mode: 'local', webhookUrl: '', playbookVersion: '' },
  sending: {
    enabled: false,
    defaultChannel: 'smtp',
    smtp: { enabled: true, fromName: 'SeatOS Customer Success', fromAddress: '' },
    hubspot: { enabled: false, emailId: '' },
    schedule: { mode: 'slot', weekday: 2, time: '09:00' },
    replyTo: '',
    redirectAllTo: '',
  },
  guards: { blockDormant: true, blockHealthy: true },
};

export class SettingsValidationError extends WorkspaceError {}

type Obj = Record<string, unknown>;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function obj(v: unknown, path: string): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SettingsValidationError(`${path} must be an object`);
  return v as Obj;
}
function bool(o: Obj, k: string, path: string): boolean {
  if (typeof o[k] !== 'boolean') throw new SettingsValidationError(`${path}.${k} must be true or false`);
  return o[k] as boolean;
}
function str(o: Obj, k: string, path: string, max = 500): string {
  const v = o[k] ?? '';
  if (typeof v !== 'string' || v.length > max) throw new SettingsValidationError(`${path}.${k} must be text (max ${max} chars)`);
  return v.trim();
}
function oneOf<T extends string>(o: Obj, k: string, allowed: readonly T[], path: string): T {
  if (!allowed.includes(o[k] as T)) throw new SettingsValidationError(`${path}.${k} must be one of ${allowed.join(', ')}`);
  return o[k] as T;
}
function weekday(o: Obj, k: string, path: string): number {
  const v = o[k];
  if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > 6) throw new SettingsValidationError(`${path}.${k} must be 0 (Sunday) to 6 (Saturday)`);
  return v as number;
}
function time(o: Obj, k: string, path: string): string {
  const v = str(o, k, path, 5);
  if (!TIME.test(v)) throw new SettingsValidationError(`${path}.${k} must be HH:mm`);
  return v;
}
function email(o: Obj, k: string, path: string): string {
  const v = str(o, k, path, 254);
  if (v && !EMAIL.test(v)) throw new SettingsValidationError(`${path}.${k} must be an email address`);
  return v;
}
function timezone(o: Obj, k: string, path: string): string {
  const v = str(o, k, path, 64);
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: v });
  } catch {
    throw new SettingsValidationError(`${path}.${k} must be an IANA timezone such as Asia/Bangkok`);
  }
  return v;
}
function url(o: Obj, k: string, path: string): string {
  const v = str(o, k, path, 2000);
  if (!v) return v;
  let parsed: URL;
  try {
    parsed = new URL(v);
  } catch {
    throw new SettingsValidationError(`${path}.${k} must be a URL`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new SettingsValidationError(`${path}.${k} must be http(s)`);
  return v;
}

export interface ValidateOptions {
  /** The server has a default SMTP From address (SMTP_FROM_ADDRESS), so the settings one may be blank. */
  smtpFromFallback?: boolean;
}

/** Parses an admin's full settings document. Throws SettingsValidationError with a field path. */
export function validateSettings(input: unknown, options: ValidateOptions = {}): WorkspaceSettings {
  const root = obj(input, 'settings');
  const p = obj(root.pipeline, 'pipeline');
  const a = obj(root.agent, 'agent');
  const s = obj(root.sending, 'sending');
  const smtp = obj(s.smtp, 'sending.smtp');
  const hubspot = obj(s.hubspot, 'sending.hubspot');
  const schedule = obj(s.schedule, 'sending.schedule');
  const g = obj(root.guards, 'guards');
  const settings: WorkspaceSettings = {
    pipeline: {
      enabled: bool(p, 'enabled', 'pipeline'),
      cadence: oneOf(p, 'cadence', ['daily', 'weekly'] as const, 'pipeline'),
      weekday: weekday(p, 'weekday', 'pipeline'),
      time: time(p, 'time', 'pipeline'),
      timezone: timezone(p, 'timezone', 'pipeline'),
    },
    agent: {
      mode: oneOf(a, 'mode', ['claude', 'hermes', 'local'] as const, 'agent'),
      webhookUrl: url(a, 'webhookUrl', 'agent'),
      playbookVersion: str(a, 'playbookVersion', 'agent', 100),
    },
    sending: {
      enabled: bool(s, 'enabled', 'sending'),
      defaultChannel: oneOf(s, 'defaultChannel', SEND_CHANNELS, 'sending'),
      smtp: { enabled: bool(smtp, 'enabled', 'sending.smtp'), fromName: str(smtp, 'fromName', 'sending.smtp', 100), fromAddress: email(smtp, 'fromAddress', 'sending.smtp') },
      hubspot: { enabled: bool(hubspot, 'enabled', 'sending.hubspot'), emailId: str(hubspot, 'emailId', 'sending.hubspot', 40) },
      schedule: {
        mode: oneOf(schedule, 'mode', ['immediate', 'slot'] as const, 'sending.schedule'),
        weekday: weekday(schedule, 'weekday', 'sending.schedule'),
        time: time(schedule, 'time', 'sending.schedule'),
      },
      replyTo: email(s, 'replyTo', 'sending'),
      redirectAllTo: email(s, 'redirectAllTo', 'sending'),
    },
    guards: { blockDormant: bool(g, 'blockDormant', 'guards'), blockHealthy: bool(g, 'blockHealthy', 'guards') },
  };
  if (settings.agent.mode === 'hermes' && !settings.agent.webhookUrl) throw new SettingsValidationError('agent.webhookUrl is required when agent.mode is hermes');
  if (settings.sending.hubspot.enabled && !/^\d+$/.test(settings.sending.hubspot.emailId)) throw new SettingsValidationError('sending.hubspot.emailId must be the numeric ID of the HubSpot transactional email');
  if (settings.sending.smtp.enabled && settings.sending.enabled && !settings.sending.smtp.fromAddress && !options.smtpFromFallback) throw new SettingsValidationError('sending.smtp.fromAddress is required to send via SMTP');
  if (!settings.sending[settings.sending.defaultChannel].enabled) throw new SettingsValidationError('sending.defaultChannel must be an enabled channel');
  return settings;
}

/** Stored settings merged over defaults, so new fields get sane values after upgrades. */
export function withDefaults(stored: Partial<WorkspaceSettings> | undefined): WorkspaceSettings {
  const d = DEFAULT_SETTINGS;
  const s = stored ?? {};
  return {
    pipeline: { ...d.pipeline, ...s.pipeline },
    agent: { ...d.agent, ...s.agent },
    sending: {
      ...d.sending,
      ...s.sending,
      smtp: { ...d.sending.smtp, ...s.sending?.smtp },
      hubspot: { ...d.sending.hubspot, ...s.sending?.hubspot },
      schedule: { ...d.sending.schedule, ...s.sending?.schedule },
    },
    guards: { ...d.guards, ...s.guards },
  };
}

export const enabledChannels = (s: WorkspaceSettings): SendChannel[] => SEND_CHANNELS.filter((c) => s.sending[c].enabled);
