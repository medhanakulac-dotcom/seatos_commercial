import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { AccountNotFoundError, CaseStateError, WorkspaceError } from '../../../domain/workspace/errors/workspace.errors';

interface ReplyLike { status(code: number): ReplyLike; send(body: unknown): void }

/** Maps typed domain errors to HTTP statuses. */
@Catch(WorkspaceError)
export class WorkspaceErrorFilter implements ExceptionFilter {
  catch(error: WorkspaceError, host: ArgumentsHost): void {
    const status = error instanceof AccountNotFoundError ? HttpStatus.NOT_FOUND : error instanceof CaseStateError ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST;
    host.switchToHttp().getResponse<ReplyLike>().status(status).send({ statusCode: status, message: error.message });
  }
}
