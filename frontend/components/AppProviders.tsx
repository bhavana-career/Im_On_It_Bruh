'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import ThemeProvider from './ThemeProvider';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
