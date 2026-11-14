import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { AppLanguage, translations } from '../i18n/translations';

let currentLanguage: AppLanguage = 'ro';
const listeners = new Set<() => void>();
const storageKey = 'begreen.language';

function restoreLanguage() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === 'ro' || saved === 'en') currentLanguage = saved;
  } catch { /* Storage may be unavailable; retain the shared in-memory preference. */ }
}

/** Re-render stored validation/service messages without repeating requests or submissions. */
export function translateMessage(message: string, language: AppLanguage): string {
  for (const source of [translations.ro.svcCarTitlePrefix, translations.en.svcCarTitlePrefix]) {
    if (message.startsWith(`${source} + `)) {
      return translations[language].svcCarTitlePrefix + message.slice(source.length);
    }
  }
  for (const key of Object.keys(translations.ro) as (keyof typeof translations.ro)[]) {
    if (translations.ro[key] === message || translations.en[key] === message) {
      const translated = translations[language][key];
      if (typeof translated === 'string') return translated;
    }
  }
  // Route services can cache our own copy with a station/parking name embedded.
  // Match only known application templates; never change route data or API enums.
  for (const key of Object.keys(translations.ro) as (keyof typeof translations.ro)[]) {
    if (!key.startsWith('svc')) continue;
    const ro = translations.ro[key];
    const en = translations.en[key];
    if (typeof ro !== 'function' || typeof en !== 'function') continue;
    const args = Array.from({ length: ro.length }, (_, index) => `BEGREEN_ARG_${index}_TOKEN`);
    if (!args.length) continue;
    for (const source of [ro, en]) {
      try {
        const sample = (source as (...values: string[]) => string)(...args);
        if (typeof sample !== 'string' || !args.every((arg) => sample.split(arg).length === 2)) continue;
        let pattern = sample.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        args.forEach((arg, index) => { pattern = pattern.replace(arg, `(?<arg${index}>.*?)`); });
        const match = new RegExp(`^${pattern}$`).exec(message);
        if (match?.groups) {
          const target = language === 'ro' ? ro : en;
          return (target as (...values: string[]) => string)(...args.map((_, index) => match.groups![`arg${index}`]));
        }
      } catch { /* Numeric or structured templates are not reversible text templates. */ }
    }
  }
  return message; // User-authored content and unknown server messages remain intact.
}

export function getAppLanguage(): AppLanguage {
  return currentLanguage;
}

export function getTranslations() {
  return translations[currentLanguage];
}

export function setAppLanguage(lang: AppLanguage): void {
  if (currentLanguage === lang) return;
  currentLanguage = lang;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { window.localStorage.setItem(storageKey, lang); } catch { /* In-memory switching still works. */ }
  }
  listeners.forEach((listener) => listener());
}

export function toggleAppLanguage(): void {
  setAppLanguage(currentLanguage === 'ro' ? 'en' : 'ro');
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) restoreLanguage();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AppLanguage {
  return currentLanguage;
}

export function useTranslation() {
  const language = useSyncExternalStore(subscribe, getSnapshot, () => 'ro' as AppLanguage);
  return {
    language,
    setLanguage: setAppLanguage,
    toggleLanguage: toggleAppLanguage,
    t: translations[language],
    translateMessage: (message?: string | null) => message == null ? undefined : translateMessage(message, language),
  };
}
