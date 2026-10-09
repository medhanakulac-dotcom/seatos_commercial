# Hermes — operator-watch-ai

The Hermes side of the commercial assistant: the `operator-hindsight` memory plugin and the commercial skills. It is
independent of `backend/`: neither imports the other. The one thing they share is the message header defined in
[`contracts/agent-envelope`](../../../contracts/agent-envelope/README.md) — the backend writes it, the plugin reads it,
and both test against the same `vectors.json`.

| Path | What |
|---|---|
| `plugins/operator-hindsight/` | Memory provider: recall/retain in one Hindsight bank, tagged `operator:<id>`, `kind:<…>`, `seatos:<n>` from the header; headerless messages (Slack) are `scope:unbound` and recall only `scope:global`. |
| `plugins/operator-hindsight/setup_bank.py` | Creates/configures the bank (retain mission, `topic:*` labels). Idempotent. |
| `skills/commercial/operator-watch/` | Operator Watch run for one operator (`[[kind:case]]` only). |
| `skills/commercial/seatos-query/` | Live SeatOS numbers; uses the header's `seatos` id when present. |
| `profile.example.yaml`, `.env.example` | Settings the profile needs (config and secrets stay in the profile). |

## Install / update

```bash
./install.sh                     # symlinks plugin + skills into ~/.hermes/profiles/operator-watch-ai
HINDSIGHT_API_URL=http://localhost:8887 OPERATOR_MEMORY_BANK=operator-watch \
  ~/.hermes/hermes-agent/venv/bin/python plugins/operator-hindsight/setup_bank.py
launchctl kickstart -k gui/$(id -u)/ai.hermes.gateway-operator-watch-ai
```

Because the profile links here, editing a skill or the plugin in this repo is live after a gateway restart.

## Test

```bash
./run_tests.sh                   # plugin tests + contract vectors, with Hermes' own Python
```
