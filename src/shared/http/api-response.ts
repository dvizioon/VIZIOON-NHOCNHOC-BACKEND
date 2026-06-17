export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data?: T;
  token?: string;
  user?: unknown;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
}

export function success<T>(
  message: string,
  payload?: { data?: T; token?: string; user?: unknown; meta?: Record<string, unknown> },
): ApiSuccessResponse<T> {
  return {
    success: true,
    message,
    ...payload,
  };
}
