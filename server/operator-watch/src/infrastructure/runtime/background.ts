import { Logger } from '@nestjs/common';
import { waitUntil } from '@vercel/functions';

const logger = new Logger('Background');

/**
 * Runs work after the response without blocking it. On Vercel the function is kept alive until the promise settles
 * (waitUntil); elsewhere the promise simply runs on. Errors are logged, never thrown.
 */
export function background(what: string, work: Promise<unknown>): void {
  const settled = work.catch((error) => logger.warn(`${what} failed: ${error instanceof Error ? error.message : String(error)}`));
  try {
    waitUntil(settled);
  } catch {
    /* outside a Vercel request: nothing to extend */
  }
}
