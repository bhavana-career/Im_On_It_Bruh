'use client';

import React, { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark, setTheme } = useThemeStore();

  useEffect(() => {
    // Read theme preference from localStorage on mount
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = savedTheme ? savedTheme === 'dark' : true; // default to true
    
    setTheme(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [setTheme]);

  return <>{children}</>;
}
