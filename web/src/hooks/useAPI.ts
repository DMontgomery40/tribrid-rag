import { useCallback, useMemo } from 'react';
import { apiClient, apiUrl } from '@/api/client';

/**
 * useAPI Hook
 * Manages API base URL configuration with support for query parameter overrides
 * Converts core-utils.js and api-base-override.js functionality to React
 */
/**
 * ---agentspec
 * what: |
 *   React hook that resolves the API base URL for HTTP requests, with support for query parameter override and Vite dev server detection.
 *   Takes no parameters. Returns a string representing the API base URL (trailing slashes removed).
 *   Checks for 'api' query parameter first; if present, uses that value after stripping trailing slash.
 *   Falls back to detecting Vite dev server ports (5170-5179) and routes to backend on port 8012.
 *   No side effects beyond reading window.location and URLSearchParams; wrapped in try-catch for safety.
 *
 * why: |
 *   Centralizes API endpoint resolution logic so all components use consistent routing.
 *   Query parameter override enables testing against different backends without code changes.
 *   Vite dev server detection solves the common development workflow where frontend and backend run on different ports.
 *   Try-catch prevents crashes if window.location is unavailable (e.g., SSR contexts).
 *
 * guardrails:
 *   - DO NOT hardcode API URLs in components; always use this hook to maintain single source of truth
 *   - ALWAYS strip trailing slashes from override URLs to prevent double-slash bugs in fetch calls
 *   - NOTE: Vite dev server port range (5170-5179) is hardcoded; update if dev server configuration changes
 *   - ASK USER: Confirm the backend port (8012) is correct for your development environment before deploying
 *   - DO NOT use this hook during server-side rendering without checking window availability first
 * ---/agentspec
 */
export function useAPI() {
  // Single HTTP boundary: `api/client.ts` owns baseURL resolution.
  const apiBase = useMemo(() => String(apiClient.defaults.baseURL || ''), []);

  // Helper to build full API URLs for `fetch(...)` call sites.
  const api = useCallback((path: string = ''): string => apiUrl(path), []);

  return {
    apiBase,
    api
  };
}
