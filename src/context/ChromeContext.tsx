import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

interface ChromeContextValue {
  tabBarHidden: boolean;
  setTabBarHidden: (hidden: boolean) => void;
}

const ChromeContext = createContext<ChromeContextValue | null>(null);

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [tabBarHidden, setTabBarHiddenState] = useState(false);

  const setTabBarHidden = useCallback((hidden: boolean) => {
    setTabBarHiddenState(hidden);
  }, []);

  const value = useMemo(
    () => ({ tabBarHidden, setTabBarHidden }),
    [tabBarHidden, setTabBarHidden]
  );

  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function useChrome(): ChromeContextValue {
  const ctx = useContext(ChromeContext);
  if (!ctx) {
    throw new Error("useChrome must be used within ChromeProvider");
  }
  return ctx;
}
