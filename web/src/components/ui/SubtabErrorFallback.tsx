interface SubtabErrorFallbackProps {
  error: Error;
  resetError?: () => void;
}

export function SubtabErrorFallback({ error, resetError }: SubtabErrorFallbackProps) {
  return (
    <div className="p-6 text-center">
      <div className="text-red-500 mb-2">
        <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Something went wrong</h3>
      <p className="text-sm text-gray-500 mt-1">{error.message}</p>
      {resetError && (
        <button
          className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={resetError}
        >
          Try again
        </button>
      )}
    </div>
  );
}
