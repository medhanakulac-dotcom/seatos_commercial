# Authentication and authorization

## Sign-in

`GoogleOidcProvider` performs Google discovery, authorization-code exchange and JWKS-backed RS256 ID-token verification through an injected `HttpClient`; tests mock that boundary. `OidcClaimsValidator` is the trust boundary for a callback: it enforces issuer, audience, nonce, `email_verified`, a non-empty immutable `sub` and a verified `@seatos.com` email. `SignInService` then turns the identity into a stored user (see Roles).

`SessionService` creates opaque server-side sessions (not JWTs, fixed 8 h expiry) and emits a Secure, HttpOnly, SameSite=Lax cookie. Sessions are still process-local (`InMemorySessionStore`).

## Roles

Every user has exactly **one role**: `admin`, `analyst` or `viewer`. It is stored on the user row (`auth_users.role`, `migrations/003_auth.sql`) and read from the database on every request, so a change or deactivation takes effect immediately. No browser-provided role or operator is trusted.

- **First sign-in:** `AUTH_DEFAULT_ROLE` (default `viewer`, never `admin`), or `admin` if the email is in `AUTH_ADMIN_EMAILS`. That list is how the first administrator appears. It also recovers the system: a listed email is promoted at sign-in if no active administrator exists.
- **Later sign-ins** keep the stored role.
- **Changing roles** is an admin action (`admin:manage_users`), audited with the acting admin. The last active administrator can never be demoted or deactivated (`LastAdminError`, enforced under row locks in Postgres).
- Deactivated users are rejected at sign-in and on their very next request.

## Local development sign-in

With `AUTH_DEV_LOGIN=true` (never in production) browsers on **localhost** get a "Local dev sign-in" button that signs in a mocked user, `developer@seatos.test`, with the role from `AUTH_DEV_ROLE`. It is not offered, and `POST /auth/dev-login` returns 404, when the browser reached the app through any other hostname (a zrok share, a LAN address), judged from `X-Forwarded-Host`/`Host`. The mocked address can never collide with a real account because Google sign-in only admits verified `@seatos.com` emails. Keep `changeOrigin` off in the Vite `/api` proxy so the real host reaches the backend.

## Permissions (RBAC)

`permissions.ts` lists every `Permission` and its scope:

| scope | meaning |
| --- | --- |
| `team` | the role alone grants it (`workspace:*`, `admin:*`) |
| `operator` | the role grants it **and** the user has access to that operator (`dashboard:*`); roles that span all operators (admin) skip the check |

`role.policy.ts` holds the **role → permission policy** behind the `RolePolicy` interface. `StaticRolePolicy` is the default matrix. `RbacService` only asks the policy, so a database-backed or admin-editable policy is one rebinding of `ROLE_POLICY` in `AuthModule` — nothing else changes. Adding a permission means adding it to `PERMISSION_SCOPES` and to the roles that should have it; guard a route with `@RequirePermission('…')` after `SessionGuard, RbacGuard`. Adding a role also needs `ROLES`, the matrix, and the `check` constraint in a new migration.

Operator access is set per user by an admin: `PUT /admin/users/:id/operators` with `{ "operatorIds": [...] }`.

## Endpoints

| | |
| --- | --- |
| `GET /auth/me` | current user, `role`, `permissions`, `allOperators` |
| `GET /admin/users` | users with role, status, last login, operators |
| `PUT /admin/users/:id/role` `{role}` | change a role |
| `PUT /admin/users/:id/active` `{active}` | deactivate / reactivate |
| `PUT /admin/users/:id/operators` `{operatorIds}` | replace operator access |
| `GET /admin/rbac` | the active policy (roles → permissions, scopes) |

The `/admin/*` routes need `admin:manage_users`; mutations must be `application/json` (CSRF guard).

## Persistence

`AUTH_REPOSITORY` is `PgAuthRepository` whenever `DATABASE_URL` is set (users, operator memberships, append-only audit trail; the Google subject is unique and immutable). Without a database, non-production runs use `InMemoryAuthRepository` (dev/test only); production refuses to start without `DATABASE_URL`.

## Still required for production

- Google OAuth client ID, redirect URI (`…/api/auth/callback` behind the proxy) and client secret managed outside tests.
- A shared session store for multi-instance deployment (users and roles are durable; sessions are not).
- Bind the OIDC state to the browser (state cookie) and make logout a POST.
- HTTPS.
