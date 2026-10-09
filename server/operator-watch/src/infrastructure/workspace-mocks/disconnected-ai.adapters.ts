import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Actor } from '../../domain/workspace/entities/workspace.entities';
import { AccountAssistant, Clock, EmailRewriter } from '../../domain/workspace/types/repositories/workspace.ports';

/** No model is connected yet. The workspace reports this instead of inventing answers. */
@Injectable()
export class DisconnectedAccountAssistant implements AccountAssistant {
  readonly connected = false;
  readonly author: Actor = { id: 'agent:none', name: 'Assistant' };
  async ask(): Promise<string> {
    throw new ServiceUnavailableException('Account assistant is not connected');
  }
}

@Injectable()
export class DisconnectedEmailRewriter implements EmailRewriter {
  readonly connected = false;
  async compose(): Promise<{ subject: string; body: string }> {
    throw new ServiceUnavailableException('Email AI is not connected');
  }
  async rewrite(): Promise<{ body: string }> {
    throw new ServiceUnavailableException('Email AI is not connected');
  }
}

/** `WORKSPACE_NOW` pins the clock (ISO timestamp) for demos and week-rollover testing. */
@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    const pinned = process.env.WORKSPACE_NOW;
    return pinned ? new Date(pinned) : new Date();
  }
}
