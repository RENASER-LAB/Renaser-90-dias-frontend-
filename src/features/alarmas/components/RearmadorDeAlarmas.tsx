import { useEffect } from 'react';
import { AppState } from 'react-native';

import { rearmarAlarmasProgramadas } from '../rearmarAlarmas';

/**
 * Re-arma las alarmas locales ya programadas al abrir la app y cada vez que vuelve a primer plano
 * (con el intervalo mínimo de `rearmarAlarmas.ts`): así, las que se programaron antes de activar
 * «Alarmas y recordatorios» pasan a ser exactas sin que la persona toque nada.
 *
 * Vive en `App.tsx`, por encima del navegador, como `AbridorDeEventos`: ninguna pestaña cambia.
 * No pinta nada.
 */
export function RearmadorDeAlarmas(): null {
  useEffect(() => {
    void rearmarAlarmasProgramadas().catch(() => {});
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado === 'active') void rearmarAlarmasProgramadas().catch(() => {});
    });
    return () => suscripcion.remove();
  }, []);
  return null;
}
