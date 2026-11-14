import { create } from 'zustand';

interface ThemeState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const STORAGE_KEY = 'begreen_high_contrast_dark';

export const darkGreenTheme = {
  background: '#103B2C',
  surface: '#164D3B',
  surfaceMuted: '#1E5E48',
  border: '#D3EF6A',
  borderLight: '#E8F3EB',
  textPrimary: '#FFFFFF',
  textSecondary: '#E8F3EB',
  iconColor: '#FFFFFF',
  accent: '#D3EF6A',
};

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
    const styleId = 'begreen-dark-theme-override';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;

    if (isDark) {
      document.documentElement.classList.add('high-contrast-dark');
      document.documentElement.setAttribute('data-theme', 'high-contrast-dark');
      if (document.body) {
        document.body.classList.add('high-contrast-dark');
      }

      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = `
        html.high-contrast-dark,
        html.high-contrast-dark body,
        html.high-contrast-dark #root,
        html.high-contrast-dark [data-theme="high-contrast-dark"] {
          background-color: #103B2C !important;
          color: #FFFFFF !important;
        }
        html.high-contrast-dark .r-backgroundColor-1cc5qph,
        html.high-contrast-dark div[style*="background-color: rgb(247, 249, 243)"],
        html.high-contrast-dark [style*="background-color:#F7F9F3"],
        html.high-contrast-dark [style*="background-color: #F7F9F3"],
        html.high-contrast-dark div[class*="css-view"][style*="background-color: rgb(247, 249, 243)"] {
          background-color: #103B2C !important;
        }
        html.high-contrast-dark .r-backgroundColor-14lw9ot,
        html.high-contrast-dark div[style*="background-color: rgb(255, 255, 255)"],
        html.high-contrast-dark [style*="background-color:#FFFFFF"],
        html.high-contrast-dark [style*="background-color: #ffffff"],
        html.high-contrast-dark [style*="background-color: #FFFFFF"] {
          background-color: #164D3B !important;
          border: 1.5px solid #D3EF6A !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45) !important;
        }
        html.high-contrast-dark .r-backgroundColor-1j7585a,
        html.high-contrast-dark div[style*="background-color: rgb(232, 243, 235)"],
        html.high-contrast-dark [style*="background-color:#E8F3EB"],
        html.high-contrast-dark [style*="background-color: #E8F3EB"] {
          background-color: #1E5E48 !important;
          border-color: #D3EF6A !important;
        }
        html.high-contrast-dark .r-color-936s07,
        html.high-contrast-dark div[style*="color: rgb(22, 77, 59)"],
        html.high-contrast-dark [style*="color:#164D3B"],
        html.high-contrast-dark [style*="color: #164D3B"] {
          color: #FFFFFF !important;
        }
        html.high-contrast-dark .r-color-tc0cx2,
        html.high-contrast-dark div[style*="color: rgb(82, 102, 91)"],
        html.high-contrast-dark [style*="color:#52665B"],
        html.high-contrast-dark [style*="color: #52665B"] {
          color: #E8F3EB !important;
        }
        html.high-contrast-dark .r-borderColor-1df40nh,
        html.high-contrast-dark div[style*="border-color: rgb(181, 200, 187)"],
        html.high-contrast-dark [style*="border-color:#B5C8BB"],
        html.high-contrast-dark [style*="border-color:#6B8174"] {
          border-color: #D3EF6A !important;
        }
        html.high-contrast-dark .r-color-1do22b7,
        html.high-contrast-dark div[style*="color: rgb(35, 122, 80)"],
        html.high-contrast-dark [style*="color:#237A50"] {
          color: #D3EF6A !important;
        }
        html.high-contrast-dark header,
        html.high-contrast-dark .r-backgroundColor-14lw9ot.r-borderBottomColor-1df40nh {
          background-color: #103B2C !important;
          border-bottom: 2px solid #D3EF6A !important;
        }
        html.high-contrast-dark [style*="background-color: rgb(35, 122, 80)"],
        html.high-contrast-dark [style*="background-color:#237A50"] {
          background-color: #164D3B !important;
          border: 2px solid #D3EF6A !important;
        }
        html.high-contrast-dark [style*="background-color: rgb(211, 239, 106)"],
        html.high-contrast-dark [style*="background-color:#D3EF6A"] {
          background-color: #D3EF6A !important;
          color: #103B2C !important;
        }
        html.high-contrast-dark input,
        html.high-contrast-dark textarea {
          background-color: #164D3B !important;
          color: #FFFFFF !important;
          border: 1.5px solid #D3EF6A !important;
        }
        html.high-contrast-dark input:focus,
        html.high-contrast-dark textarea:focus {
          border-color: #FFFFFF !important;
          box-shadow: 0 0 0 3px rgba(211, 239, 106, 0.4) !important;
        }
      `;
    } else {
      document.documentElement.classList.remove('high-contrast-dark');
      document.documentElement.removeAttribute('data-theme');
      if (document.body) {
        document.body.classList.remove('high-contrast-dark');
      }
      if (styleTag) {
        styleTag.remove();
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
