import { create } from 'zustand';

interface ThemeState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const STORAGE_KEY = 'begreen_high_contrast_dark';

function getInitialDarkMode(): boolean {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === 'true';
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
  }
  return false;
}

function applyThemeToDom(isDark: boolean) {
  if (typeof document !== 'undefined') {
    if (isDark) {
      document.documentElement.classList.add('high-contrast-dark');
      document.documentElement.setAttribute('data-theme', 'high-contrast-dark');
      if (document.body) {
        document.body.classList.add('high-contrast-dark');
      }
    } else {
      document.documentElement.classList.remove('high-contrast-dark');
      document.documentElement.removeAttribute('data-theme');
      if (document.body) {
        document.body.classList.remove('high-contrast-dark');
      }
    }
  }
}

export const useThemeMode = create<ThemeState>((set, get) => {
  const initial = getInitialDarkMode();
  applyThemeToDom(initial);

  return {
    isDarkMode: initial,
    toggleDarkMode: () => {
      const next = !get().isDarkMode;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      }
      applyThemeToDom(next);
      set({ isDarkMode: next });
    },
    setDarkMode: (enabled: boolean) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, String(enabled));
      }
      applyThemeToDom(enabled);
      set({ isDarkMode: enabled });
    },
  };
});
