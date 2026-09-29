import React, { createContext, useState, useEffect, useContext } from 'react';
import { translations, translateDynamic } from '../constants/translations';

export const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('mplads_lang') || 'en';
  });

  const setLanguage = (lang) => {
    const validLang = lang === 'hi' ? 'hi' : 'en';
    setLanguageState(validLang);
    localStorage.setItem('mplads_lang', validLang);
    document.documentElement.lang = validLang;
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  /**
   * Key-based translation helper
   * @param {string} key - Dictionary key
   * @param {string} [fallback] - Fallback text if key not found
   * @returns {string} Translated text
   */
  const t = (key, fallback) => {
    if (!key) return '';
    const currentDict = translations[language] || translations.en;
    if (currentDict && currentDict[key] !== undefined) {
      return currentDict[key];
    }
    // Check fallback in English dictionary
    if (translations.en && translations.en[key] !== undefined) {
      return language === 'hi' ? translateDynamic(translations.en[key], 'hi') : translations.en[key];
    }
    const defVal = fallback !== undefined ? fallback : key;
    return language === 'hi' ? translateDynamic(defVal, 'hi') : defVal;
  };

  /**
   * Universal dynamic text translation helper
   * @param {string} text - Any raw string (status, category, state, column header, etc.)
   * @returns {string} Translated string in current language
   */
  const tr = (text) => {
    return translateDynamic(text, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
