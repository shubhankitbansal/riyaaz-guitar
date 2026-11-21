import { createContext, useContext, useEffect, useMemo } from 'react';
import { useLocalStorage } from './hooks';
import en from './locales/en';
import hi from './locales/hi';
import bn from './locales/bn';
import mr from './locales/mr';
import ta from './locales/ta';
import te from './locales/te';

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
];

export const DICTIONARIES = { en, hi, bn, mr, ta, te };

/** Build a translate function: t('key', { var: value }). Missing keys fall back to English. */
export function makeT(lang) {
  const dict = DICTIONARIES[lang] || en;
  return (key, vars) => {
    let s = dict[key] ?? en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
    return s;
  };
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useLocalStorage('riyaaz.lang', 'en');
  const value = useMemo(() => ({ lang, setLang, t: makeT(lang) }), [lang, setLang]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

const fallback = { lang: 'en', setLang: () => {}, t: makeT('en') };
export const useI18n = () => useContext(I18nContext) || fallback;
export const useT = () => useI18n().t;
