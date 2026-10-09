import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey, timingSafeEqual, verify } from 'crypto';
import { FastifyRequest } from 'fastify';

interface ServiceClaims { iss?: string; aud?: string | string[]; exp?: number; iat?: number; jti?: string; operator_id?: number; }

const MAX_TOKEN_LIFETIME_SECONDS = 3600;

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  private readonly seen = new Map<string, number>();
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest & { serviceClaims?: ServiceClaims }>();
    const mode = this.config.get<string>('SERVICE_TOKEN_MODE', 'production');
    const nodeEnv = this.config.get<string>('NODE_ENV', process.env.NODE_ENV ?? 'production');
    const supplied = request.headers['x-service-token'];
    if (mode === 'mock') return (nodeEnv === 'test' || nodeEnv === 'development') && supplied === 'test-token';
    if (typeof supplied !== 'string' || supplied.length === 0) return false;
    if (supplied.split('.').length === 3) {
      const claims = this.verifyJwt(supplied);
      if (!claims) return false;
      request.serviceClaims = claims;
      return true;
    }
    const configured = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!configured) return false;
    const a = Buffer.from(supplied); const b = Buffer.from(configured);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private verifyJwt(token: string): ServiceClaims | undefined {
    try {
      const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
      const decode = (value: string) => Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      const header = JSON.parse(decode(encodedHeader)) as { alg?: string; kid?: string };
      const claims = JSON.parse(decode(encodedPayload)) as ServiceClaims;
      const now = Math.floor(Date.now() / 1000);
      if (header.alg !== 'EdDSA' || !header.kid || !claims.jti ||
          typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) ||
          typeof claims.iat !== 'number' || !Number.isFinite(claims.iat) ||
          !Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.iat) ||
          claims.exp <= now || claims.exp - claims.iat > MAX_TOKEN_LIFETIME_SECONDS) return undefined;
      const keys = JSON.parse(this.config.get<string>('SERVICE_TOKEN_PUBLIC_KEYS', '{}')) as Record<string, string>;
      const key = keys[header.kid];
      if (!key) return undefined;
      const issuer = this.config.get<string>('SERVICE_TOKEN_ISSUER');
      const audience = this.config.get<string>('SERVICE_TOKEN_AUDIENCE');
      if (issuer && claims.iss !== issuer) return undefined;
      if (audience && !(Array.isArray(claims.aud) ? claims.aud.includes(audience) : claims.aud === audience)) return undefined;
      const maxSkew = this.parsePositiveInteger(this.config.get<string>('SERVICE_TOKEN_CLOCK_SKEW_SECONDS', '30'), 'SERVICE_TOKEN_CLOCK_SKEW_SECONDS');
      if (claims.iat > now + maxSkew) return undefined;
      this.pruneSeen();
      if (this.seen.has(claims.jti)) return undefined;
      const valid = verify(null, Buffer.from(`${encodedHeader}.${encodedPayload}`), createPublicKey({ key: Buffer.from(key, 'base64'), format: 'der', type: 'spki' }), Buffer.from(encodedSignature.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
      if (!valid) return undefined;
      this.seen.set(claims.jti, claims.exp);
      return claims;
    } catch { return undefined; }
  }

  private parsePositiveInteger(value: string | undefined, name: string): number {
    if (!value || !/^\d+$/.test(value.trim())) throw new Error(`${name} must be a positive integer`);
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
    return parsed;
  }

  private pruneSeen(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [jti, expiry] of this.seen) if (expiry <= now || this.seen.size > 10000) this.seen.delete(jti);
  }
}

export { UnauthorizedException };
