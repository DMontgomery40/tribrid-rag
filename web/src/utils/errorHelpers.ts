export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message === 'Failed to fetch';
}

export function formatApiError(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Unable to connect to the server. Please check if the backend is running.';
  }
  return getErrorMessage(error);
}
