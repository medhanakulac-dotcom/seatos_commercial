import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

/** Where the site serves this API. vercel.json rewrites /api/ow/* to the function; the prefix is stripped here. */
export const API_PREFIX = '/api/ow';

// The scheduler and send worker run from /internal/tick (pg_cron or Vercel Cron), not from in-process timers.
process.env.WORKSPACE_WORKERS ??= 'false';

/**
 * The API path for a request URL. Vercel may hand the function the original URL (`/api/ow/workspace/accounts?x=1`) or
 * the rewrite target (`/api/ow?path=workspace/accounts&x=1`); both become `/workspace/accounts?x=1`.
 */
export function apiPath(raw: string): string {
  const url = new URL(raw, 'http://internal');
  let path = url.pathname.startsWith(API_PREFIX) ? url.pathname.slice(API_PREFIX.length) : url.pathname;
  if ((path === '' || path === '/') && url.searchParams.has('path')) {
    // The query value arrives decoded; re-encode each segment (an encoded '/' cannot be told apart, but ids never hold one).
    path = `/${(url.searchParams.get('path') ?? '').split('/').map(encodeURIComponent).join('/')}`;
    url.searchParams.delete('path');
  }
  const query = url.searchParams.toString();
  return (path || '/') + (query ? `?${query}` : '');
}

let ready: Promise<NestFastifyApplication> | undefined;

async function boot(): Promise<NestFastifyApplication> {
  // abortOnError off: a failed boot must throw (and be answered below), not exit the function process.
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: true }), { abortOnError: false });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

/** Vercel Node function: one Nest app per instance, reused across invocations. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  ready ??= boot().catch((error) => {
    ready = undefined; // let the next request retry a failed boot (e.g. the database was briefly unreachable)
    throw error;
  });
  let app: NestFastifyApplication;
  try {
    app = await ready;
  } catch (error) {
    // Usually a missing setting (DATABASE_URL, Supabase keys): say which, instead of a bare function crash.
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ statusCode: 503, message: `Operator Watch is not configured: ${error instanceof Error ? error.message : String(error)}` }));
    return;
  }
  req.url = apiPath(req.url ?? '/');
  app.getHttpAdapter().getInstance().server.emit('request', req, res);
}
