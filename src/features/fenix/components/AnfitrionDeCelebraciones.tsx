import React, { useEffect } from 'react';

import { useAuth } from '../../auth/context/AuthContext';
import { alCumplirUnHabito } from '../../habits/eventos/habitoCumplido';
import { obtenerResumenHome } from '../../home/api/homeApi';
import { cerrarMomentoGrande, useMomentoGrande } from '../estado/momentoGrande';
import { ESPERA_TRAS_UN_HABITO_MS, revisarHitosDelDia } from '../estado/revisarHitosDelDia';
import { useAnimoDeSer } from '../hooks/useAnimoDeSer';
import { PantallaDeCelebracion } from './PantallaDeCelebracion';

/**
 * La pantalla completa de los momentos grandes, por ENCIMA del navegador (2026-10-07), como `RenasiaLauncher` y los
 * otros anfitriones de `App.tsx`: así aparece donde ocurra el hito —Training, Hoy o la hoja de evidencia—, no solo en
 * Hoy, y ninguna de las cinco pantallas tiene que dibujarla.
 *
 * Después de cada hábito cumplido (aviso `habitoCumplido`) vuelve a leer `/home` —una petición, cuando el momento chico
 * del hábito ya se vio— y revisa los hitos. Varios hábitos seguidos piden una sola vez. Un hábito suelto que no cierra
 * el día ni lleva la racha a 7 o 30 no muestra nada.
 */
export function AnfitrionDeCelebraciones() {
  const { user, isAuthenticated, isOnboardingCompleted } = useAuth();
  const usuarioId = isAuthenticated && isOnboardingCompleted ? (user?.id ?? null) : null;
  const momento = useMomentoGrande();
  const animo = useAnimoDeSer();

  useEffect(() => {
    if (!usuarioId) return;
    let espera: ReturnType<typeof setTimeout> | null = null;
    const quitar = alCumplirUnHabito(() => {
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => {
        espera = null;
        obtenerResumenHome()
          .then(r => revisarHitosDelDia(usuarioId, { rachaActual: r.rachaActual, habitosHoy: r.habitosHoy, fase: r.fase }))
          .catch(() => undefined);
      }, ESPERA_TRAS_UN_HABITO_MS);
    });
    return () => {
      quitar();
      if (espera) clearTimeout(espera);
    };
  }, [usuarioId]);

  if (!momento || !usuarioId) return null;
  return <PantallaDeCelebracion momento={momento} animo={animo} onCerrar={cerrarMomentoGrande} />;
}
