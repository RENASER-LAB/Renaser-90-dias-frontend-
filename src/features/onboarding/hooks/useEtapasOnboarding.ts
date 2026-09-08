import { useCallback, useEffect, useState } from 'react';

import * as onboardingApi from '../api/onboardingApi';

/**
 * El estado real de las 2 etapas actuales del onboarding, para la pantalla "Tu proceso completo" (YO).
 *
 * Antes esas cinco etapas eran data escrita a mano con `completed: true` en tres de ellas: un
 * aprendiz que no había hecho nada veía tres tildes verdes, y uno que sí había terminado veía
 * exactamente lo mismo. La pantalla mentía en las dos direcciones, y además no servía para saber
 * si había que seguir o ya estaba.
 *
 * Hoy solo **El Pacto** se puede responder con certeza: `GET /api/v1/onboarding/state` devuelve
 * `pactSignedAt`, que es el instante real de la firma. El backend todavía no tiene una marca
 * específica para "terminó el Mapa de Renacimiento".
 *
 * Por eso la segunda etapa se muestra como pendiente o en progreso en vez de completada: **preferimos
 * decir "no sé" antes que decir "listo" sin dato** (es el mismo criterio con el que el backend deja
 * `streak` en `null` en `GetLogrosUseCase` en vez de fabricarlo).
 *
 * Queda pendiente una marca específica de finalización del Mapa de Renacimiento en el backend.
 */

export type EstadoEtapa = 'completada' | 'en_progreso' | 'pendiente' | 'desconocido';

export type EtapasOnboarding = {
  /** Firmó el Pacto. Dato real: `pactSignedAt`. */
  pacto: EstadoEtapa;
  /** Cuestionario Profundo. `en_progreso` si el cursor está ahí; nunca `completada` (no hay marca). */
  cuestionarioProfundo: EstadoEtapa;
  /** Cuántas etapas se pueden dar por completadas con datos reales. */
  completadas: number;
};

const SIN_DATOS: EtapasOnboarding = {
  pacto: 'desconocido',
  cuestionarioProfundo: 'desconocido',
  completadas: 0,
};

export function useEtapasOnboarding() {
  const [etapas, setEtapas] = useState<EtapasOnboarding>(SIN_DATOS);
  const [loading, setLoading] = useState(true);

  const recargar = useCallback(async () => {
    setLoading(true);
    try {
      const estado = await onboardingApi.obtenerEstado();
      const pacto: EstadoEtapa = estado.pactSignedAt ? 'completada' : 'pendiente';
      const cuestionarioProfundo: EstadoEtapa =
        estado.currentFlow === 'cuestionario_profundo' ? 'en_progreso' : 'pendiente';
      setEtapas({
        pacto,
        cuestionarioProfundo,
        completadas: pacto === 'completada' ? 1 : 0,
      });
    } catch {
      // Sin respuesta se deja "desconocido", que la pantalla pinta como pendiente. Nunca dar una
      // etapa por completada porque falló la red: un tilde verde falso es peor que ninguno.
      setEtapas(SIN_DATOS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { ...etapas, loading, recargar };
}
