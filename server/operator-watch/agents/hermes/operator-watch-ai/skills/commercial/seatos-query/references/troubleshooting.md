# SeatOS query fallbacks and troubleshooting

## MySQL fallback — `tms_prod_mysql_mysql_query` (parameter is `sql`, not `query`)

Inspect before you query: SeatOS tables are not uniform. `DESCRIBE <table>` first, then the narrowest query.

```sql
SELECT operator_id, operator_name FROM operator WHERE operator_name LIKE '%matcha%' LIMIT 10;
```
- Don't assume `is_active` exists on `operator`.
- Routes: use `sname` (full route label) rather than guessing departure/arrival foreign keys.
- A count of `operator_booking` rows is booking records, not seats/tickets; label which one you report.
- Feature usage: `operator_settings` shows what is enabled, not what is used; back usage claims with activity or
  booking data. Never repeat bank details, credentials or tokens returned with settings.

## Timeouts and connectivity

- mcphub tools can time out under bursts (`ETIMEDOUT`, `fetch failed`); a failure puts mcphub into a ~50s
  cooldown that rejects every mcphub tool, MySQL included. Don't retry rapidly; wait or answer from what you have.
- All SeatOS tools failing: (1) `hermes mcp list` — mcphub enabled? (2) `curl -s -o /dev/null -w "%{http_code}"
  http://localhost:7030/health` → 200? (3) try MySQL `SELECT 1` to separate upstream from MCPHub. (4) MCPHub healthy
  but everything fails → upstream SeatOS unreachable (check VPN). Don't blame Hermes/MCPHub config for upstream.
- Never fill gaps with guessed numbers or web results; say the query failed.
