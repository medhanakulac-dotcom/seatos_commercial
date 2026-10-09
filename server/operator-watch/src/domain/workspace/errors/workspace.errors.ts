export class WorkspaceError extends Error {}

export class AccountNotFoundError extends WorkspaceError {
  constructor(readonly accountId: string) {
    super(`Account ${accountId} was not found`);
  }
}

/** The requested transition is not allowed from the case's current state. */
export class CaseStateError extends WorkspaceError {}
