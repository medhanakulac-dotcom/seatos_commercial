import { BadRequestException, CanActivate, ExecutionContext, Injectable, PipeTransform, UnsupportedMediaTypeException } from '@nestjs/common';
import { LANGUAGES, Language, RewriteMode, SEND_CHANNELS, SendChannel } from '../../../../domain/workspace/entities/workspace.entities';
import { Decision } from '../../../../domain/workspace/services/workspace.service';
import { ChatTurn } from '../../../../domain/workspace/types/repositories/workspace.ports';

const MAX_TEXT = 4000;
const MAX_HISTORY = 40;

type Body = Record<string, unknown>;

function asBody(value: unknown): Body {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new BadRequestException('Request body must be a JSON object');
  return value as Body;
}

function text(body: Body, field: string, { required = true, max = MAX_TEXT } = {}): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) {
    if (required) throw new BadRequestException(`${field} is required`);
    return undefined;
  }
  if (typeof value !== 'string') throw new BadRequestException(`${field} must be a string`);
  const trimmed = value.trim();
  if (required && trimmed.length === 0) throw new BadRequestException(`${field} must not be empty`);
  if (value.length > max) throw new BadRequestException(`${field} must be at most ${max} characters`);
  return value;
}

function oneOf<T extends string>(body: Body, field: string, allowed: readonly T[]): T {
  const value = body[field];
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new BadRequestException(`${field} must be one of: ${allowed.join(', ')}`);
  return value as T;
}

/**
 * Mutations accept JSON only. Browsers cannot send `application/json` cross-site without a CORS
 * preflight, so together with the SameSite=Lax session cookie this blocks form-based CSRF.
 */
@Injectable()
export class JsonRequestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ method: string; headers: Record<string, string | undefined> }>();
    if (req.method === 'GET' || req.method === 'HEAD') return true;
    if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new UnsupportedMediaTypeException('Content-Type must be application/json');
    return true;
  }
}

@Injectable()
export class AccountIdPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw new BadRequestException('Invalid account id');
    return value;
  }
}

@Injectable()
export class RewriteBodyPipe implements PipeTransform<unknown, RewriteMode> {
  transform(value: unknown): RewriteMode {
    return oneOf(asBody(value), 'mode', ['regen', 'shorter', 'warmer', 'direct'] as const);
  }
}

@Injectable()
export class LanguageBodyPipe implements PipeTransform<unknown, Language> {
  transform(value: unknown): Language {
    return oneOf(asBody(value), 'language', LANGUAGES);
  }
}

@Injectable()
export class TmsLinkBodyPipe implements PipeTransform<unknown, number> {
  transform(value: unknown): number {
    const id = asBody(value).tmsOperatorId;
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) throw new BadRequestException('tmsOperatorId must be a positive integer');
    return id;
  }
}

@Injectable()
export class InstructionBodyPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    return (text(asBody(value), 'instruction') as string).trim();
  }
}

@Injectable()
export class NoteBodyPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    return (text(asBody(value), 'text', { max: 2000 }) as string).trim();
  }
}

export interface DecisionRequest {
  readonly decision: Decision;
  readonly reason?: string;
  readonly editedBody?: string;
  /** Approve only: where to send from, and to whom (defaults: settings' default channel, the deal's main contact). */
  readonly channel?: SendChannel;
  readonly recipient?: string;
}

@Injectable()
export class DecisionBodyPipe implements PipeTransform<unknown, DecisionRequest> {
  transform(value: unknown): DecisionRequest {
    const body = asBody(value);
    const decision = oneOf(body, 'decision', ['approve', 'hold', 'reject', 'close', 'reopen'] as const);
    const reason = text(body, 'reason', { required: false, max: 500 });
    const editedBody = text(body, 'editedBody', { required: false, max: 20000 });
    if (editedBody !== undefined && decision !== 'approve') throw new BadRequestException('editedBody is only accepted with approve');
    if (editedBody !== undefined && editedBody.trim().length === 0) throw new BadRequestException('editedBody must not be empty');
    const channel = body.channel === undefined ? undefined : oneOf(body, 'channel', SEND_CHANNELS);
    const recipient = text(body, 'recipient', { required: false, max: 254 })?.trim();
    if ((channel || recipient) && decision !== 'approve') throw new BadRequestException('channel and recipient are only accepted with approve');
    if (recipient && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient)) throw new BadRequestException('recipient must be an email address');
    return { decision, reason, editedBody, channel, recipient };
  }
}

export interface BulkApproveRequest {
  readonly playbook: string;
  /** `undefined` = all owners, `null` = unassigned accounts. */
  readonly owner?: string | null;
  readonly channel?: SendChannel;
}

@Injectable()
export class BulkApproveBodyPipe implements PipeTransform<unknown, BulkApproveRequest> {
  transform(value: unknown): BulkApproveRequest {
    const body = asBody(value);
    const playbook = text(body, 'playbook', { max: 100 }) as string;
    const channel = body.channel === undefined ? undefined : oneOf(body, 'channel', SEND_CHANNELS);
    if (body.owner === null) return { playbook, owner: null, channel };
    return { playbook, owner: text(body, 'owner', { required: false, max: 200 }), channel };
  }
}

export interface AssistantRequest {
  readonly question: string;
  readonly history: readonly ChatTurn[];
}

@Injectable()
export class AssistantBodyPipe implements PipeTransform<unknown, AssistantRequest> {
  transform(value: unknown): AssistantRequest {
    const body = asBody(value);
    const question = (text(body, 'question', { max: 2000 }) as string).trim();
    const raw = body.history ?? []; // accepted for older clients; the shared chat log lives on the server
    if (!Array.isArray(raw) || raw.length > MAX_HISTORY) throw new BadRequestException(`history must be an array of at most ${MAX_HISTORY} turns`);
    const history = raw.map((turn) => {
      const t = asBody(turn);
      return { role: oneOf(t, 'role', ['user', 'assistant'] as const), text: text(t, 'text') as string };
    });
    return { question, history };
  }
}
