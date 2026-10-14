import { Controller, Headers, Inject, HttpCode, Post, Req, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { SlackBotService, SlackEventPayload } from './slack.service';
import { verifySlackSignature } from '../../infrastructure/slack/slack.format';

/**
 * Slack's Events API calls this (`/api/ow/slack/events`). It is public, so the only way in is Slack's signature over the raw body,
 * made with SLACK_SIGNING_SECRET. 503 until the Slack settings exist.
 */
@Controller('slack')
export class SlackController {
  constructor(@Inject(SlackBotService) private readonly bot: SlackBotService | null) {}

  @Post('events')
  @HttpCode(200)
  events(
    @Req() req: { rawBody?: Buffer | string; body?: unknown },
    @Headers('x-slack-request-timestamp') timestamp: string | undefined,
    @Headers('x-slack-signature') signature: string | undefined,
    @Headers('x-slack-retry-num') retryNum: string | undefined,
  ) {
    const secret = process.env.SLACK_SIGNING_SECRET;
    if (!this.bot || !secret) throw new ServiceUnavailableException('Slack is not set up');
    const raw = typeof req.rawBody === 'string' ? req.rawBody : (req.rawBody?.toString('utf8') ?? '');
    if (!verifySlackSignature(secret, raw, timestamp, signature)) throw new UnauthorizedException();
    return this.bot.handle((req.body ?? {}) as SlackEventPayload, retryNum);
  }
}
