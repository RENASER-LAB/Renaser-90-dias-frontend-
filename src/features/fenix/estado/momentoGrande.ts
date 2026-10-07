import { useSyncExternalStore } from 'react';

import type { AnimalParaLaTarjeta } from '../../yo/utils/animalConfigurado';
import type { CelebracionDeHoy } from './celebracionDelDia';

/**
 * La pantalla completa de celebración que está a la vista, para toda la app (2026-10-07). La decide
 * `revisarHitosDelDia` y la dibuja UN anfitrión montado sobre el navegador (`AnfitrionDeCelebraciones`). El fénix del
 * centro de Hoy lee esto para pasar a la foto fija mientras dura: un solo lienzo Rive a la vez.
 *
 * Solo el estado, sin almacenamiento ni red: lo puede leer cualquier componente sin arrastrar AsyncStorage.
 */
export type FaseDelMomento = { numero: number; nombre: string; animal: AnimalParaLaTarjeta };

export type MomentoGrande = CelebracionDeHoy & {
  rachaActual: number | null;
  /** Suma de los puntos que el servidor pagó por los hábitos de hoy; `null` si no se pudo leer. */
  puntosHoy: number | null;
  fase: FaseDelMomento | null;
};

let actual: MomentoGrande | null = null;
const oyentes = new Set<() => void>();

export function publicarMomentoGrande(nuevo: MomentoGrande | null) {
  actual = nuevo;
  for (const oyente of [...oyentes]) oyente();
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function momentoGrandeActual(): MomentoGrande | null {
  return actual;
}

/** La pantalla a la vista, o `null`. */
export function useMomentoGrande(): MomentoGrande | null {
  return useSyncExternalStore(suscribir, momentoGrandeActual, momentoGrandeActual);
}

export function cerrarMomentoGrande(): void {
  publicarMomentoGrande(null);
}

/** Solo para pruebas. */
export function reiniciarMomentoGrandeParaPruebas(): void {
  actual = null;
  oyentes.clear();
}
