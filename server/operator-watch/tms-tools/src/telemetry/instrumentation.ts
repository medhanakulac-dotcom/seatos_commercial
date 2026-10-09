// Side-effect module: main.ts imports it before anything else so the instrumentations can patch http, fastify and mysql2
// before the app loads them. Telemetry stays off unless OTEL_EXPORTER_OTLP_ENDPOINT is set (tests, CI, production).
import { existsSync } from 'node:fs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { MySQL2Instrumentation } from '@opentelemetry/instrumentation-mysql2';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';

// Host runs keep settings in a gitignored .env; real env vars (Docker) take precedence.
if (existsSync('.env')) process.loadEnvFile('.env');

export const telemetryEnabled =
  Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()) && process.env.OTEL_SDK_DISABLED !== 'true';

if (telemetryEnabled) {
  process.env.OTEL_SERVICE_NAME ??= 'tms-tools';

  const sdk = new NodeSDK({
    // Exporters read OTEL_EXPORTER_OTLP_ENDPOINT / _HEADERS and append /v1/{traces,metrics,logs} themselves.
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [
      new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter(), exportIntervalMillis: 15_000 }),
    ],
    logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
    instrumentations: [
      new HttpInstrumentation({
        // Liveness probes would drown the real traffic.
        ignoreIncomingRequestHook: (req) => /^\/(api\/)?health(\?|$)/.test(req.url ?? ''),
      }),
      new FastifyInstrumentation(),
      new NestInstrumentation(),
      new MySQL2Instrumentation(),
      new UndiciInstrumentation(),
      new RuntimeNodeInstrumentation(),
    ],
  });
  sdk.start();

  const shutdown = (): void => {
    void sdk.shutdown().catch(() => undefined);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
