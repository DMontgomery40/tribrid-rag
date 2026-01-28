import { createContext, useContext, type ReactNode } from 'react';

interface CoreContextValue {
  apiBaseUrl: string;
}

const CoreContext = createContext<CoreContextValue | null>(null);

export function CoreContextProvider({ children }: { children: ReactNode }) {
  const value: CoreContextValue = {
    apiBaseUrl: '/api',
  };

  return <CoreContext.Provider value={value}>{children}</CoreContext.Provider>;
}

export function useCoreContext() {
  const context = useContext(CoreContext);
  if (!context) {
    throw new Error('useCoreContext must be used within CoreContextProvider');
  }
  return context;
}

export { CoreContext };
