import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LANGUAGES,
  TRANSLATIONS,
  detectLanguageFromLocation,
  type LanguageOption,
  type SupportedLanguage,
} from "../i18n/translations";
import { readStored, writeStored } from "../utils/storage";

const LANGUAGE_KEY = "kisanplan:language";

type LanguageContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  autoSetLanguageFromLocation: (locationText: string) => void;
  t: (key: string, fallback?: string) => string;
  languages: LanguageOption[];
  currentLanguageOption: LanguageOption;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void readStored<SupportedLanguage>(LANGUAGE_KEY).then((saved) => {
      if (saved && TRANSLATIONS[saved]) {
        setLanguageState(saved);
      }
      setHydrated(true);
    });
  }, []);

  const setLanguage = useCallback((next: SupportedLanguage) => {
    setLanguageState(next);
    void writeStored(LANGUAGE_KEY, next);
  }, []);

  const autoSetLanguageFromLocation = useCallback((locationText: string) => {
    const detected = detectLanguageFromLocation(locationText);
    if (detected && detected !== "en") {
      setLanguageState(detected);
      void writeStored(LANGUAGE_KEY, detected);
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const currentMap = TRANSLATIONS[language];
      if (currentMap && currentMap[key]) {
        return currentMap[key];
      }
      const englishMap = TRANSLATIONS.en;
      if (englishMap && englishMap[key]) {
        return englishMap[key];
      }
      return fallback ?? key;
    },
    [language],
  );

  const currentLanguageOption = useMemo(
    () => LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0],
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      autoSetLanguageFromLocation,
      t,
      languages: LANGUAGES,
      currentLanguageOption,
    }),
    [
      language,
      setLanguage,
      autoSetLanguageFromLocation,
      t,
      currentLanguageOption,
    ],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
