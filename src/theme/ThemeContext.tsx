import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { light, dark, Palette, type as typo, space } from './tokens';
import { modoDeArranque, type ModoDeTema } from './modoDeTema';
import { preferenciaDeTema } from './preferenciaDeTema';

type Mode = ModoDeTema;
type Ctx = { mode: Mode; c: Palette; t: typeof typo; space: typeof space; toggle: () => void; setMode: (m: Mode) => void };

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children, initial = 'light' }: { children: React.ReactNode; initial?: Mode }) {
  /* `initial` sigue siendo el tema del sistema (`App.tsx` lo saca de `useColorScheme()`). Es el
     punto de partida, no la última palabra: si la persona ya eligió a mano, la hidratación de abajo
     lo corrige. Ver `preferenciaDeTema.ts` para por qué la elección explícita le gana al sistema. */
  const [mode, setModeInterno] = useState<Mode>(initial);

  useEffect(() => {
    /* Se lee una sola vez, al montar. El `vigente` evita escribir estado sobre un proveedor ya
       desmontado si la lectura vuelve tarde (pasa en las pruebas y en un recargado en caliente). */
    let vigente = true;
    preferenciaDeTema.leer().then(crudo => {
      /* `initial` se lee del cierre a propósito: la decisión es la del ARRANQUE, con el tema que
         tenía el sistema al montar. Si nadie eligió a mano, esto devuelve ese mismo `initial` y el
         `setState` no cambia nada. */
      if (vigente) setModeInterno(modoDeArranque(crudo, initial));
    });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Consecuencia honesta de leer el almacenamiento en un efecto, para que no se reporte como bug:
     quien eligió un modo distinto al de su teléfono puede ver el tema del sistema durante el primer
     cuadro del arranque, hasta que llega la lectura (~milisegundos). Se eligió eso antes que no
     dibujar nada hasta tener la respuesta: un `AsyncStorage` que no conteste dejaría la app en
     blanco y sin salida, y un parpadeo se arregla solo. */

  /* Único camino por el que el modo se guarda: un cambio hecho a mano. Si esto se disparara también
     con la hidratación o con el valor inicial, el primer arranque grabaría el tema del sistema como
     si fuera una elección y el teléfono no volvería a mandar nunca más. */
  const setMode = useCallback((m: Mode) => {
    setModeInterno(m);
    void preferenciaDeTema.guardar(m);
  }, []);

  const toggle = useCallback(() => setMode(mode === 'light' ? 'dark' : 'light'), [mode, setMode]);

  const value = useMemo(() => ({ mode, c: mode === 'light' ? light : dark, t: typo, space, toggle, setMode }), [mode, toggle, setMode]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return v;
}