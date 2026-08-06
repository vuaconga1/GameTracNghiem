export class DrillProcessingError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    code: string,
    message = 'Speaking practice could not be assessed safely. Please try again.',
    status = 503,
  ) {
    super(message);
    this.name = 'DrillProcessingError';
    this.code = code;
    this.status = status;
  }
}

export class DrillAttemptError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status = 409,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'DrillAttemptError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
