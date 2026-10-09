# tms-tools

Minimal NestJS/Fastify internal service boundary.

## Endpoints

- `GET /api/health`
- `POST /api/v1/internal/usage-summary`

The usage-summary route requires `x-service-token`. Production supports a legacy constant token (`INTERNAL_SERVICE_TOKEN`) and preferred Ed25519 JWTs (`SERVICE_TOKEN_PUBLIC_KEYS`, keyed by `kid`). JWTs require numeric finite `iat` and `exp`, `exp` in the future, `jti`, and a maximum one-hour lifetime; they validate issuer/audience when configured and are single-use per process. Rotate keys by publishing multiple `kid` entries and removing retired keys after token expiry.

`SERVICE_TOKEN_MODE=mock` is permitted only when `NODE_ENV` is `test` or `development`, and accepts only `test-token`.

## Database configuration

Outside mock mode, the service creates a read-only MySQL pool using `TMS_DB_*` settings. The adapter issues one fixed, parameterized query against the verified `ai_usage_log` schema (`operator_id`, `feature`, `created_at`), always scopes by `TMS_DB_OPERATOR_ID`, and caps results at 1,000. The contract also requires `id` (bigint unsigned primary key), `user_id` (int unsigned NOT NULL), `model` (varchar(50) NOT NULL), `prompt_tokens` and `completion_tokens` (int unsigned NOT NULL), `estimated_cost_usd` (decimal(10,6) NOT NULL), nullable `session_id` (bigint unsigned), and `created_at` (timestamp). These column names and types are documented from the shared schema reference but require independent production verification before deployment. Use a dedicated MySQL account with SELECT-only privileges, TLS enabled (`TMS_DB_SSL=true` outside test/development), and do not point it at production until schema, credentials, and this contract are explicitly provisioned. No arbitrary SQL is accepted.
