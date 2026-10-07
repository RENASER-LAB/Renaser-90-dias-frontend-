import { useEffect } from 'react';

import { revisarHitosDelDia, type ResumenParaCelebrar } from '../estado/revisarHitosDelDia';

/**
 * Hoy mira los hitos del día con lo que acaba de leer de `/home` (al abrir la app, al volver a Hoy). Si hay uno libre
 * hoy, la pantalla completa la dibuja el anfitrión de `App.tsx`; este hook no dibuja nada. Lo que se cumple en otra
 * pestaña (Training) lo revisa el anfitrión al cumplirse cada hábito.
 */
export function useCelebracionDelDia(usuarioId: string | null | undefined, datos: ResumenParaCelebrar | null): void {
  const racha = datos?.rachaActual ?? null;
  const completados = datos?.habitosHoy?.completados ?? null;
  const total = datos?.habitosHoy?.total ?? null;
  const fase = datos?.fase ?? null;

  useEffect(() => {
    if (!usuarioId || (racha === null && total === null && fase === null)) return;
    const habitosHoy = completados === null || total === null ? null : { completados, total };
    void revisarHitosDelDia(usuarioId, { rachaActual: racha, habitosHoy, fase });
  }, [usuarioId, racha, completados, total, fase]);
}
