"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Language } from "@/i18n/types";
import { translations, defaultLanguage, getNestedTranslation } from "@/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "ecomonitor-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [mounted, setMounted] = useState(false);

  // Load language from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "ua")) {
      setLanguageState(savedLanguage);
    } else {
      setLanguageState(defaultLanguage);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    // Update HTML lang attribute
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "ua" ? "uk" : "en";
    }
  }, []);

  // Update HTML lang attribute when language changes
  useEffect(() => {
    if (mounted && typeof document !== "undefined") {
      document.documentElement.lang = language === "ua" ? "uk" : "en";
    }
  }, [language, mounted]);

  const t = useCallback(
    (key: string): string => {
      const translation = translations[language];
      return getNestedTranslation(translation, key);
    },
    [language]
  );

  // Always provide the context, even before mounting, to avoid errors
  // The language state will be updated once mounted and localStorage is read
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
