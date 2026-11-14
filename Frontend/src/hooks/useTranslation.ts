import { useSyncExternalStore } from 'react';
import { AppLanguage, translations } from '../i18n/translations';

let currentLanguage: AppLanguage = 'ro';
const listeners = new Set<() => void>();

export function getAppLanguage(): AppLanguage {
  return currentLanguage;
}

export function getTranslations() {
  return translations[currentLanguage];
}

export function setAppLanguage(lang: AppLanguage): void {
  if (currentLanguage === lang) return;
  currentLanguage = lang;
  listeners.forEach((listener) => listener());
}

export function toggleAppLanguage(): void {
  setAppLanguage(currentLanguage === 'ro' ? 'en' : 'ro');
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AppLanguage {
  return currentLanguage;
}

export function useTranslation() {
  const language = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    language,
    setLanguage: setAppLanguage,
    toggleLanguage: toggleAppLanguage,
    t: translations[language],
  };
}
