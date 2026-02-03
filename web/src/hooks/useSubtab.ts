import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRouteByPath } from '@/config/routes';

export type UseSubtabOptions<T extends string = string> = {
  /**
   * The current top-level route path (e.g. "/rag", "/dashboard").
   * Used to derive allowed subtabs from `config/routes.ts` unless `allowedSubtabs` is provided.
   */
  routePath: string;
  /** Default subtab id (must be a member of allowed subtabs). */
  defaultSubtab: T;
  /** Query parameter name. Defaults to "subtab". */
  param?: string;
  /**
   * Optional explicit allowlist override. If omitted, the hook uses `routes.ts` subtabs for `routePath`.
   */
  allowedSubtabs?: readonly T[];
  /**
   * When the URL is missing/invalid, write the default subtab into the URL.
   * Uses `replace: true` to avoid polluting history.
   */
  ensureInUrl?: boolean;
  /**
   * When the user changes subtabs via `setSubtab`, should navigation replace history?
   * Default: false (so browser back/forward can traverse subtab changes).
   */
  replaceOnChange?: boolean;
};

export function useSubtab<T extends string = string>({
  routePath,
  defaultSubtab,
  param = 'subtab',
  allowedSubtabs,
  ensureInUrl = true,
  replaceOnChange = false,
}: UseSubtabOptions<T>) {
  const location = useLocation();
  const navigate = useNavigate();

  const allowed = useMemo<readonly T[]>(() => {
    if (allowedSubtabs && allowedSubtabs.length) return allowedSubtabs;
    const route = getRouteByPath(routePath);
    const ids = (route?.subtabs ?? []).map((s) => s.id);
    return ids as unknown as readonly T[];
  }, [allowedSubtabs, routePath]);

  const allowedSet = useMemo(() => new Set<string>((allowed as readonly unknown[]).map(String)), [allowed]);

  const params = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
  const raw = params.get(param);
  const isValid = Boolean(raw && allowedSet.has(raw));

  const activeSubtab = (isValid ? raw : defaultSubtab) as T;

  const setSubtab = useCallback(
    (nextSubtab: T, opts?: { replace?: boolean }) => {
      if (!allowed.length) return;
      const next = allowedSet.has(String(nextSubtab)) ? String(nextSubtab) : String(defaultSubtab);
      const nextParams = new URLSearchParams(location.search || '');
      nextParams.set(param, next);
      navigate(
        { pathname: location.pathname, search: `?${nextParams.toString()}` },
        { replace: opts?.replace ?? replaceOnChange }
      );
    },
    [allowed.length, allowedSet, defaultSubtab, location.pathname, location.search, navigate, param, replaceOnChange]
  );

  // Ensure the URL always contains a valid ?subtab=... for deep-linking.
  useEffect(() => {
    if (!ensureInUrl) return;
    if (!allowed.length) return;
    if (isValid) return;
    const nextParams = new URLSearchParams(location.search || '');
    nextParams.set(param, String(defaultSubtab));
    navigate({ pathname: location.pathname, search: `?${nextParams.toString()}` }, { replace: true });
  }, [allowed.length, defaultSubtab, ensureInUrl, isValid, location.pathname, location.search, navigate, param]);

  return {
    activeSubtab,
    setSubtab,
    allowedSubtabs: allowed,
    rawSubtab: raw,
  };
}

