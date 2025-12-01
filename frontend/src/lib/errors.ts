export class AppError extends Error {
  statusCode?: number;
  details?: unknown;

  constructor(
    message: string,
    statusCode?: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Erro inesperado. Tente novamente.';
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('fetch');
  }
  return false;
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.statusCode === 401;
  }
  return false;
}

export function isRateLimitError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.statusCode === 429;
  }
  return false;
}
