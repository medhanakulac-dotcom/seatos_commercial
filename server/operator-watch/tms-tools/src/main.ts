import './telemetry/instrumentation';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { parsePositiveFiniteInteger } from './config-validation';
import { OtelLogger } from './telemetry/otel.logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: new OtelLogger() },
  );
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(parsePositiveFiniteInteger(process.env.PORT, 'PORT', 3000), process.env.HOST ?? '0.0.0.0');
}

void bootstrap();
