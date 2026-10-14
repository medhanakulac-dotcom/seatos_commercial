# Mariah, the SeatOS assistant in Slack

The same assistant as the chat on an account page, in Slack: colleagues ask in a DM or @mention it in a channel, it looks
up the operator (WAO, tickets and year on year, price and cut-off vs market, HubSpot activity) and answers in the thread.
Read-only: it never writes to HubSpot, sends email or changes anything.

Only people whose Slack email is on the site's allowed users list get answers; anyone else is told to ask an admin.

## Set up (once, about 5 minutes)

1. https://api.slack.com/apps -> Create New App -> From a manifest -> pick the workspace -> paste `app-manifest.yaml`.
   Slack checks the request URL (`https://dealsuite.app/api/ow/slack/events`) when you save: the site must already
   run this code and have both secrets below, or the check fails (save again after adding them).
2. Basic Information -> App Credentials -> copy the **Signing Secret**.
3. Install App -> Install to Workspace -> copy the **Bot User OAuth Token** (`xoxb-...`).
4. Vercel -> the project -> Settings -> Environment Variables (Production): add
   `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN`, then redeploy.
5. In Slack: DM Mariah, or `/invite @Mariah` in a channel and @mention it.

Questions to try: "how is Than Car doing?", "top 10 operators by tickets this week", "which accounts are at risk and
why?", "what did we last discuss with Bali Magir Trans?".

## Notes
- The reply goes in a thread; follow-up questions in the same thread keep the context (@mention it again in channels).
- Slack needs an answer within 3 seconds: the request is acknowledged at once and the answer is posted when ready
  (a "Looking into it..." message is replaced by the answer).
- Settings that make it work are the same as the web chat: `ANTHROPIC_API_KEY` must be set.
