import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { SeverityNumber, logs } from '@opentelemetry/api-logs';

const SEVERITY: Record<LogLevel, SeverityNumber> = {
  verbose: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  log: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
  fatal: SeverityNumber.FATAL,
};

/**
 * Nest's console logger that also emits every line as an OpenTelemetry log record. The record is created in the active
 * span's context, so OpenObserve links it to the trace. Without a started SDK the emit is a no-op.
 */
export class OtelLogger extends ConsoleLogger {
  private readonly otel = logs.getLogger('nestjs');

  override verbose(message: unknown, ...params: unknown[]): void {
    super.verbose(message, ...params);
    this.emit('verbose', message, params);
  }

  override debug(message: unknown, ...params: unknown[]): void {
    super.debug(message, ...params);
    this.emit('debug', message, params);
  }

  override log(message: unknown, ...params: unknown[]): void {
    super.log(message, ...params);
    this.emit('log', message, params);
  }

  override warn(message: unknown, ...params: unknown[]): void {
    super.warn(message, ...params);
    this.emit('warn', message, params);
  }

  override error(message: unknown, ...params: unknown[]): void {
    super.error(message, ...params);
    this.emit('error', message, params);
  }

  override fatal(message: unknown, ...params: unknown[]): void {
    super.fatal(message, ...params);
    this.emit('fatal', message, params);
  }

  private emit(level: LogLevel, message: unknown, params: unknown[]): void {
    if (!this.isLevelEnabled(level)) return;
    // Nest passes the context as the last string argument; error() may put a stack trace before it.
    const last = params[params.length - 1];
    const context = typeof last === 'string' ? last : this.context;
    const attributes: Record<string, string> = {};
    if (context) attributes['nestjs.context'] = context;
    if (level === 'error' && typeof params[0] === 'string' && params.length > 1) {
      attributes['exception.stacktrace'] = params[0];
    }
    this.otel.emit({
      severityNumber: SEVERITY[level],
      severityText: level.toUpperCase(),
      body: typeof message === 'string' ? message : this.stringify(message),
      attributes,
    });
  }

  private stringify(value: unknown): string {
    if (value instanceof Error) return value.stack ?? value.message;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
