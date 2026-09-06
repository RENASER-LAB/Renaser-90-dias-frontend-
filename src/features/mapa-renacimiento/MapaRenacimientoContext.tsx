import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Si el Mapa de Renacimiento está abierto a pantalla completa. El flujo reemplaza al navegador
 * de pestañas entero (manual §3 V01: "No mostrar navegación inferior durante el flujo"; AC-01),
 * igual que hace el onboarding inicial — por eso no es una ruta del `Tab.Navigator`, es un
 * estado que `RootNavigator` consulta antes de dibujarlo.
 */
type Ctx = { abierto: boolean; abrir: () => void; cerrar: () => void };

const MapaRenacimientoCtx = createContext<Ctx | null>(null);

export function MapaRenacimientoProvider({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);
  const valor = useMemo(() => ({ abierto, abrir, cerrar }), [abierto, abrir, cerrar]);
  return <MapaRenacimientoCtx.Provider value={valor}>{children}</MapaRenacimientoCtx.Provider>;
}

export function useMapaRenacimientoAbierto(): Ctx {
  const v = useContext(MapaRenacimientoCtx);
  if (!v) throw new Error('useMapaRenacimientoAbierto debe usarse dentro de MapaRenacimientoProvider');
  return v;
}
