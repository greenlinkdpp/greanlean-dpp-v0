"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "en" | "zh";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LanguageContext =
  createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] =
    useState<Locale>("en");

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        "greanlean_locale"
      );

    if (saved === "zh" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  function setLocale(locale: Locale) {
    setLocaleState(locale);

    window.localStorage.setItem(
      "greanlean_locale",
      locale
    );
  }

  const value = useMemo(() => {
    return {
      locale,
      setLocale,
    };
  }, [locale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);

  if (!ctx) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return ctx;
}