export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFIG_ERROR"
  | "API_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly status: number;
  readonly code: AppErrorCode;
  readonly success = false;

  constructor(
    message: string,
    status: number,
    code: AppErrorCode,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }

  toJSON() {
    return {
      success: this.success,
      message: this.message,
      code: this.code,
    };
  }
}
