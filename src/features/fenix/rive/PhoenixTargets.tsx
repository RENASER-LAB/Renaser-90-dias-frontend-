/**
 * Registro de "objetivos" de UI que el fénix puede mirar, señalar o visitar (CTA, indicador de hábito, tarjetas…).
 *
 *   <PhoenixTargetsProvider> … </PhoenixTargetsProvider>   // una vez, alrededor de la pantalla / app
 *   const cta = usePhoenixTarget('cta');                    // en el componente del botón
 *   <Pressable {...cta}>Continuar</Pressable>
 *
 * Luego: mascotRef.current?.lookAt('cta') · pointTo('cta') · stageRef.current?.moveTo('cta')
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import type { View } from 'react-native';

export type WindowRect = { x: number; y: number; width: number; height: number };
type Measurer = () => Promise<WindowRect | null>;

export type PhoenixTargetsRegistry = {
  register: (name: string, m: Measurer) => () => void;
  measure: (name: string) => Promise<WindowRect | null>;
};

const Ctx = createContext<PhoenixTargetsRegistry | null>(null);

export function PhoenixTargetsProvider({ children }: { children?: React.ReactNode }) {
  const map = useRef(new Map<string, Measurer>());
  const value = useMemo<PhoenixTargetsRegistry>(() => ({
    register: (name, m) => {
      map.current.set(name, m);
      return () => { if (map.current.get(name) === m) map.current.delete(name); };
    },
    measure: async name => {
      const m = map.current.get(name);
      return m ? m() : null;
    },
  }), []);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePhoenixTargets(): PhoenixTargetsRegistry | null {
  return useContext(Ctx);
}

/** Mide una vista en coordenadas de ventana (null si no está montada). */
export function measureView(view: View | null): Promise<WindowRect | null> {
  return new Promise(resolve => {
    if (!view || typeof view.measureInWindow !== 'function') return resolve(null);
    view.measureInWindow((x, y, width, height) => resolve(width || height ? { x, y, width, height } : null));
  });
}

/** Props para la vista objetivo: `{...usePhoenixTarget('cta')}`. */
export function usePhoenixTarget(name: string) {
  const reg = usePhoenixTargets();
  const viewRef = useRef<View | null>(null);
  useEffect(() => (reg ? reg.register(name, () => measureView(viewRef.current)) : undefined), [reg, name]);
  const ref = useCallback((v: View | null) => { viewRef.current = v; }, []);
  return { ref, collapsable: false as const };
}
