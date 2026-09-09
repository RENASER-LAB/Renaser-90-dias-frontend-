import { useCallback, useEffect, useState } from 'react';

import { consultarMapa } from '../../mapa-renacimiento/api/mapaApi';
import * as onboardingApi from '../api/onboardingApi';

/**
 * El estado real de las 2 etapas del onboarding, para la pantalla "Tu proceso completo" (YO).
 *
 * Antes esas etapas eran data escrita a mano con `completed: true`: un aprendiz que no había
 * hecho nada veía tildes verdes, y uno que sí había terminado veía exactamente lo mismo. La
 * pantalla mentía en las dos direcciones.
 *
 * Las dos salen ahora de datos reales:
 *
 * - **El Pacto** — `pactSignedAt` de `GET /api/v1/onboarding/state`, el instante real de la firma.
 * - **Mapa de Renacimiento** — `stageCompleted` de `GET /api/v1/mapa-renacimiento`.
 *
 * La segunda estaba mal conectada: la fila decía "Mapa de Renacimiento" pero leía el estado del
 * **Cuestionario Profundo**, que es otro flujo y que por como estaba escrito no podia dar
 * "completada" nunca. Asi que alguien que ya habia terminado su mapa seguia viendo "1 de 2".
 * El comentario de este archivo decia que el backend no tenia marca para el mapa; si la tiene
 * (`etapas_onboarding_completadas`, flujo `mapa_dia7`), solo no se estaba consultando.
 *
 * Se mantiene el criterio de siempre: ante la duda, **pendiente**. Un tilde verde falso es peor
 * que ninguno.
 */

export type EstadoEtapa = 'completada' | 'en_progreso' | 'pendiente' | 'desconocido';

export type EtapasOnboarding = {
  /** Firmó el Pacto. Dato real: `pactSignedAt`. */
  pacto: EstadoEtapa;
  /** Terminó el Mapa de Renacimiento. Dato real: `stageCompleted`. */
  mapaRenacimiento: EstadoEtapa;
  /** Cuántas etapas se pueden dar por completadas con datos reales. */
  completadas: number;
};

const SIN_DATOS: EtapasOnboarding = {
  pacto: 'desconocido',
  mapaRenacimiento: 'desconocido',
  completadas: 0,
};

export function useEtapasOnboarding() {
  const [etapas, setEtapas] = useState<EtapasOnboarding>(SIN_DATOS);
  const [loading, setLoading] = useState(true);

  const recargar = useCallback(async () => {
    setLoading(true);
    try {
      /* Las dos lecturas van en paralelo y se resuelven por separado: que el mapa falle no debe
         borrar el tilde del Pacto, ni al revés. */
      const [estado, mapa] = await Promise.all([
        onboardingApi.obtenerEstado().catch(() => null),
        consultarMapa().catch(() => null),
      ]);

      const pacto: EstadoEtapa =
        estado === null ? 'desconocido' : estado.pactSignedAt ? 'completada' : 'pendiente';

      const mapaRenacimiento: EstadoEtapa =
        mapa === null
          ? 'desconocido'
          : mapa.stageCompleted
            ? 'completada'
            : estado?.currentFlow === 'mapa_dia7'
              ? 'en_progreso'
              : 'pendiente';

      setEtapas({
        pacto,
        mapaRenacimiento,
        completadas: [pacto, mapaRenacimiento].filter(e => e === 'completada').length,
      });
    } catch {
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
