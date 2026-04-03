import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations } from '@/i18n/translations';

export type Language = 'pt' | 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const STORAGE_KEY = 'hubengine-language';

function detectLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'pt' || saved === 'en' || saved === 'es') return saved;
  const nav = navigator.language || '';
  return 'en';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>(detectLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback((key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry['pt'] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
