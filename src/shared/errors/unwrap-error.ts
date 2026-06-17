import { AppError } from "./app-error";


export function unwrapError(error: unknown): unknown {
  if (error instanceof AppError) return error;

  if (error && typeof error === "object") {
    const wrapped = error as Record<string, unknown>;
    if (wrapped.error) return unwrapError(wrapped.error);
    if (wrapped.value) return unwrapError(wrapped.value);
    if (wrapped.cause) return unwrapError(wrapped.cause);
  }

  return error;
}

export function isAppError(error: unknown): error is AppError {
  const e = unwrapError(error);
  return (
    e instanceof AppError ||
    (e instanceof Error &&
      e.name === "AppError" &&
      "status" in e &&
      typeof (e as AppError).status === "number")
  );
}

export function toAppError(error: unknown): AppError | null {
  const e = unwrapError(error);
  return isAppError(e) ? (e as AppError) : null;
}
