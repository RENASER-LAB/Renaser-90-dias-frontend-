import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import * as onboardingApi from '../api/onboardingApi';

/**
 * El estado real de las etapas del onboarding, para la pantalla "Tu proceso" (YO).
 *
 * Antes esas etapas eran data escrita a mano con `completed: true`: un aprendiz que no había
 * hecho nada veía tildes verdes, y uno que sí había terminado veía exactamente lo mismo. La
 * pantalla mentía en las dos direcciones.
 *
 * Hoy sale de un dato real:
 *
 * - **El Pacto** — `pactSignedAt` de `GET /api/v1/onboarding/state`, el instante real de la firma.
 *
 * > **Corregido 2026-10-31 (spec 026).** Aquí había una segunda etapa, **Mapa de Renacimiento** (`stageCompleted` de
 * > `GET /api/v1/mapa-renacimiento`). El Mapa se retiró de la app: lo reemplaza el diagnóstico, que tiene su propia fila en Yo
 * > («Mi diagnóstico»). Ya no se lee esa ruta.
 *
 * Se mantiene el criterio de siempre: ante la duda, **pendiente**. Un tilde verde falso es peor
 * que ninguno.
 *
 * BUG ENCONTRADO 2026-09-21 ("el progreso no se guarda rápido"): esto leía UNA sola vez, con un
 * `useEffect` de dependencias estables. Y `Yo` es una pestaña de `createBottomTabNavigator`: se
 * monta la primera vez que se la visita y **no se vuelve a desmontar** en toda la sesión. O sea que
 * la barra "X de N etapas completadas" mostraba para siempre la foto del momento en que se abrió
 * `Yo` por primera vez; terminar el Mapa no la movía, y la única forma de verla al día era cerrar
 * la app y volver a abrirla. Parecía un guardado lento y no lo era: el guardado ya era inmediato
 * (`activar()` de `useMapaRenacimiento` espera al servidor antes de devolver), lo que nunca
 * ocurría era la RELECTURA.
 *
 * Ahora se recarga cada vez que la pestaña vuelve al foco, que es el patrón que ya usan
 * `useResumenHome`, `useHabitoDelMomento` y `useUltimaPublicacionMuro`. El foco no alcanza solo:
 * las sub-vistas de `Yo` (el Pacto) cambian con un `useState` interno, sin navegación de
 * por medio, así que no emiten foco — por eso `recargar` sigue expuesto y `YoScreen` lo llama al
 * volver de ellas.
 */

export type EstadoEtapa = 'completada' | 'en_progreso' | 'pendiente' | 'desconocido';

export type EtapasOnboarding = {
  /** Firmó el Pacto. Dato real: `pactSignedAt`. */
  pacto: EstadoEtapa;
  /** Cuándo lo firmó (`pactSignedAt`, ISO), para «Firmado el …» en Yo (2026-10-05). */
  pactoFirmadoEn: string | null;
  /** Cuántas etapas se pueden dar por completadas con datos reales. */
  completadas: number;
};

const SIN_DATOS: EtapasOnboarding = {
  pacto: 'desconocido',
  pactoFirmadoEn: null,
  completadas: 0,
};

export function useEtapasOnboarding() {
  const [etapas, setEtapas] = useState<EtapasOnboarding>(SIN_DATOS);
  const [loading, setLoading] = useState(true);

  const recargar = useCallback(async () => {
    setLoading(true);
    try {
      const estado = await onboardingApi.obtenerEstado().catch(() => null);

      const pacto: EstadoEtapa =
        estado === null ? 'desconocido' : estado.pactSignedAt ? 'completada' : 'pendiente';

      setEtapas({
        pacto,
        pactoFirmadoEn: estado?.pactSignedAt ?? null,
        completadas: [pacto].filter(e => e === 'completada').length,
      });
    } catch {
      setEtapas(SIN_DATOS);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar])
  );

  return { ...etapas, loading, recargar };
}
