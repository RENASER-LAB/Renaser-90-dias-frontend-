import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { light, dark, Palette, type as typo, space } from './tokens';

type Mode = 'light' | 'dark';
type Ctx = { mode: Mode; c: Palette; t: typeof typo; space: typeof space; toggle: () => void; setMode: (m: Mode) => void };

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children, initial = 'light' }: { children: React.ReactNode; initial?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);
  const toggle = useCallback(() => setMode(m => (m === 'light' ? 'dark' : 'light')), []);
  const value = useMemo(() => ({ mode, c: mode === 'light' ? light : dark, t: typo, space, toggle, setMode }), [mode, toggle]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return v;
}