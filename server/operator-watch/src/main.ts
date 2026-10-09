import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

// Local run outside Vercel (`npm run ow:start`). Secrets live in a gitignored .env; real env vars take precedence.
if (existsSync('.env')) process.loadEnvFile('.env');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000, '0.0.0.0');
}

void bootstrap();
