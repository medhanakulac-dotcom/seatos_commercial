import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { BetaRunnableTool } from '@anthropic-ai/sdk/lib/tools/BetaRunnableTool';
import { z } from 'zod/v4';

export type Effort = 'low' | 'medium' | 'high';

/** Which model each kind of work uses. Defaults to Claude Opus 5.5; override with OW_MODEL / OW_MEMORY_MODEL. */
export interface ClaudeConfig {
  readonly model: string;
  readonly memoryModel: string;
}

export function loadClaudeConfig(env: NodeJS.ProcessEnv = process.env): ClaudeConfig | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  const model = env.OW_MODEL || 'claude-opus-5-5';
  return { model, memoryModel: env.OW_MEMORY_MODEL || model };
}

/** A reply that ended on a safety decline (after the server-side fallback also declined). */
export class ClaudeRefusalError extends Error {
  constructor(category: string | null | undefined) {
    super(`Claude declined to answer${category ? ` (${category})` : ''}`);
  }
}

/**
 * The two calls the agent makes, behind a seam so tests run without the API:
 * `structured` returns JSON matching a schema; `converse` runs a tool-using conversation and returns the final text.
 */
export interface ClaudeLike {
  structured<T>(input: { system: string; user: string; schema: z.ZodType<T>; effort: Effort; memory?: boolean }): Promise<T>;
  converse(input: {
    system: string;
    messages: Anthropic.Beta.BetaMessageParam[];
    tools: BetaRunnableTool<any>[];
    effort: Effort;
    maxIterations: number;
  }): Promise<string>;
}

/**
 * Claude over the Messages API. Every request opts into the server-side refusal fallback (a declined request is
 * retried on a fallback model inside the same call) and caches the stable prefix (system prompt + tools).
 */
export class ClaudeClient implements ClaudeLike {
  private readonly client: Anthropic;

  constructor(
    private readonly config: ClaudeConfig,
    client?: Anthropic,
  ) {
    // Long assessments stream-free: a minute per call is plenty, and the SDK retries 429/5xx twice.
    this.client = client ?? new Anthropic({ timeout: 120_000 });
  }

  async structured<T>({ system, user, schema, effort, memory }: { system: string; user: string; schema: z.ZodType<T>; effort: Effort; memory?: boolean }): Promise<T> {
    const response = await this.client.beta.messages.parse({
      model: memory ? this.config.memoryModel : this.config.model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      cache_control: { type: 'ephemeral' },
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort, format: betaZodOutputFormat(schema) },
    });
    if (response.stop_reason === 'refusal') throw new ClaudeRefusalError(response.stop_details?.category);
    if (response.stop_reason === 'max_tokens') throw new Error('Claude ran out of output tokens before finishing');
    if (response.parsed_output == null) throw new Error('Claude returned output that does not match the expected format');
    return response.parsed_output as T;
  }

  async converse({ system, messages, tools, effort, maxIterations }: { system: string; messages: Anthropic.Beta.BetaMessageParam[]; tools: BetaRunnableTool<any>[]; effort: Effort; maxIterations: number }): Promise<string> {
    const runner = this.client.beta.messages.toolRunner({
      model: this.config.model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      cache_control: { type: 'ephemeral' },
      system,
      messages,
      tools,
      output_config: { effort },
      max_iterations: maxIterations,
    });
    // Awaiting the runner drives the loop to the end (`.done()` alone waits for someone else to iterate it).
    const final = await runner;
    if (final.stop_reason === 'refusal') throw new ClaudeRefusalError(final.stop_details?.category);
    const text = final.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (final.stop_reason === 'tool_use') return text || 'I could not finish looking this up within the step limit. Please ask a narrower question.';
    return text;
  }
}
