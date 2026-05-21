export interface ErrorEnvelope {
  error: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly aborted: boolean;

  constructor(message: string, status: number, aborted: boolean = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.aborted = aborted;
    // Restore prototype chain for instanceof in older transpile targets.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
