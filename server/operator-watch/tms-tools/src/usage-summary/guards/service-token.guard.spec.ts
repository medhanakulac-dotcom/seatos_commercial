import { ExecutionContext } from '@nestjs/common';
import { ServiceTokenGuard } from './service-token.guard';

const context = (headers: Record<string, string>): ExecutionContext => ({
  switchToHttp: () => ({ getRequest: () => ({ headers }) }),
} as unknown as ExecutionContext);

const config = (values: Record<string, string | undefined>) => ({
  get: (key: string, fallback?: string) => values[key] ?? fallback,
} as never);

describe('ServiceTokenGuard', () => {
  it('fails closed when production token configuration is absent', () => {
    expect(new ServiceTokenGuard(config({ NODE_ENV: 'production' })).canActivate(context({ 'x-service-token': 'anything' }))).toBe(false);
  });

  it('allows only the explicit mock token in test mode', () => {
    const guard = new ServiceTokenGuard(config({ SERVICE_TOKEN_MODE: 'mock', NODE_ENV: 'test' }));
    expect(guard.canActivate(context({ 'x-service-token': 'test-token' }))).toBe(true);
    expect(guard.canActivate(context({ 'x-service-token': 'wrong' }))).toBe(false);
  });

  it('rejects mock mode outside test and development', () => {
    for (const nodeEnv of ['production', 'staging', '']) {
      const guard = new ServiceTokenGuard(config({ SERVICE_TOKEN_MODE: 'mock', NODE_ENV: nodeEnv }));
      expect(guard.canActivate(context({ 'x-service-token': 'test-token' }))).toBe(false);
    }
    expect(new ServiceTokenGuard(config({ SERVICE_TOKEN_MODE: 'mock', NODE_ENV: 'development' })).canActivate(context({ 'x-service-token': 'test-token' }))).toBe(true);
  });

  it('rejects JWTs with non-numeric or excessively long lifetimes', () => {
    const { generateKeyPairSync, sign } = require('crypto');
    const pair = generateKeyPairSync('ed25519');
    const b64 = (value: Buffer) => value.toString('base64url');
    const header = b64(Buffer.from(JSON.stringify({ alg: 'EdDSA', kid: 'current' })));
    const key = pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
    const guard = new ServiceTokenGuard(config({ NODE_ENV: 'production', SERVICE_TOKEN_PUBLIC_KEYS: JSON.stringify({ current: key }) }));
    for (const claims of [{ exp: 'future', iat: Math.floor(Date.now() / 1000) }, { exp: Math.floor(Date.now() / 1000) + 7200, iat: Math.floor(Date.now() / 1000) }]) {
      const payload = b64(Buffer.from(JSON.stringify({ ...claims, jti: String(claims.exp) })));
      const input = `${header}.${payload}`;
      const token = `${input}.${b64(sign(null, Buffer.from(input), pair.privateKey))}`;
      expect(guard.canActivate(context({ 'x-service-token': token }))).toBe(false);
    }
  });

  it('validates an Ed25519 JWT and rejects replay', () => {
    const { generateKeyPairSync, sign } = require('crypto');
    const pair = generateKeyPairSync('ed25519');
    const b64 = (value: Buffer) => value.toString('base64');
    const header = b64(Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: 'current' }))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payload = b64(Buffer.from(JSON.stringify({ iss: 'reporting', aud: 'tms-tools', sub: 'web', exp: Math.floor(Date.now() / 1000) + 60, iat: Math.floor(Date.now() / 1000), jti: 'one' }))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const input = `${header}.${payload}`;
    const token = `${input}.${b64(sign(null, Buffer.from(input), pair.privateKey)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
    const publicKey = pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
    const guard = new ServiceTokenGuard(config({ NODE_ENV: 'production', SERVICE_TOKEN_PUBLIC_KEYS: JSON.stringify({ current: publicKey }), SERVICE_TOKEN_ISSUER: 'reporting', SERVICE_TOKEN_AUDIENCE: 'tms-tools' }));
    expect(guard.canActivate(context({ 'x-service-token': token }))).toBe(true);
    expect(guard.canActivate(context({ 'x-service-token': token }))).toBe(false);
  });
});
