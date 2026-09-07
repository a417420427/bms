// 国际化占位（仅支持中文，预留多语言接入）
import { createContext, useContext, FC, ReactNode } from "react";

interface LocaleContextValue {
  $t: (zh: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export const LocaleProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const $t = (zh: string) => zh;
  return (
    <LocaleContext.Provider value={{ $t }}>{children}</LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
};
