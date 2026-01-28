import { useEffect, useState } from 'react';
import { useUIStore } from '../stores';

export function useTheme() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const resolve = () => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme;
    };
    setResolvedTheme(resolve());

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') setResolvedTheme(resolve());
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  return { theme, resolvedTheme, setTheme };
}
