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
    useState<Locale>(() => {
      if (typeof window === "undefined") return "zh";

      try {
        const queryLocale = new URLSearchParams(window.location.search).get("lang");
        if (queryLocale === "zh" || queryLocale === "en") return queryLocale;
      } catch {
        return "zh";
      }

      return "zh";
    });

  useEffect(() => {
    let saved: string | null = null;

    try {
      const queryLocale = new URLSearchParams(window.location.search).get("lang");
      if (queryLocale === "zh" || queryLocale === "en") {
        saved = queryLocale;
      }

      saved = saved || "zh";
    } catch {
      saved = null;
    }

    if (saved === "zh" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(locale: Locale) {
    setLocaleState(locale);

    try {
      window.localStorage?.setItem(
        "greanlean_locale",
        locale
      );
    } catch {
      // Some preview/browser environments do not expose localStorage.
    }
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
