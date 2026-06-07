import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: true, // Default to dark mode (pure black/orange) as per blueprint
  toggleTheme: () => set((state) => {
    const nextDark = !state.isDark;
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', nextDark ? 'dark' : 'light');
      if (nextDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    return { isDark: nextDark };
  }),
  setTheme: (isDark: boolean) => set(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    return { isDark };
  }),
}));
