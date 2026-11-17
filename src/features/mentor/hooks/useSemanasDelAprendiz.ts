import { useCallback, useEffect, useReducer, useRef } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import { useRecargarAlVolverLaSenal } from '../../sinRed/useRecargarAlVolverLaSenal';
import { mensajeDeCargaEnLinea } from '../../sinRed/utils/sinSenal';
import { sumarDiasIso } from '../../eventos/utils/zonaHoraria';
import { obtenerSemanaDelAprendiz, type SemanaDelAprendiz } from '../api/mentorApi';
import { viernesDeLaSemana } from '../utils/fechasDeLaFicha';

/** Por qué no se pudo cargar una semana. `sin_red` pide conexión; `servidor` trae el motivo que dio el servidor. */
export interface FalloDeSemana {
  tipo: 'sin_red' | 'servidor';
  mensaje: string;
}

export type EstadoDeSemana = 'lista' | 'cargando' | 'fallo' | 'sin_pedir';

const SIN_RED = 'Hace falta conexión para ver esta semana. Lo que ya cargaste se sigue viendo.';
const CODIGO_NO_ACOMPANA = 'NO_ACOMPANA';

/**
 * Las semanas de un aprendiz mientras su ficha está abierta (spec 055 FR-016, SC-004): una caché por semana (el viernes que la cierra)
 * y el adelanto de la semana anterior.
 *
 * - Al elegir una fecha se pide SU semana y, además, la anterior (si el programa ya había empezado), para que el paso hacia atrás
 *   se vea al instante. El adelanto es silencioso: si falla, se pedirá de nuevo cuando de verdad se elija.
 * - Volver a una semana ya vista no pide nada. Una semana que viaja no se pide dos veces.
 * - La caché vive en este hook: al cerrar la ficha se descarta (nada de datos de otro aprendiz ni de otro día).
 * - Sin internet, una semana no cargada dice que hace falta conexión; lo cargado se sigue viendo.
 * - Si el servidor responde `NO_ACOMPANA` (ya no lo acompaña), se vacía todo y se avisa con su motivo: sin datos viejos.
 */
export function useSemanasDelAprendiz(grupoId: string | null, aprendizId: string | null, onYaNoAcompana?: (motivo: string) => void) {
  const cache = useRef(new Map<string, SemanaDelAprendiz>());
  const enVuelo = useRef(new Set<string>());
  const fallos = useRef(new Map<string, FalloDeSemana>());
  const enCurso = useRef<string | null>(null);
  const vivo = useRef(true);
  const aviso = useRef(onYaNoAcompana);
  aviso.current = onYaNoAcompana;
  const [, redibujar] = useReducer((n: number) => n + 1, 0);

  /** La semana anterior existe si su viernes no es anterior al viernes de la primera semana del programa. */
  const adelantarLaAnterior = useCallback((semana: SemanaDelAprendiz) => {
    if (!semana.primeraSemana) return;
    const anterior = sumarDiasIso(semana.hasta, -7);
    if (anterior >= viernesDeLaSemana(semana.primeraSemana)) cargarRef.current?.(anterior, false, true);
  }, []);
  const cargarRef = useRef<((v: string | null, a: boolean, s?: boolean) => void) | null>(null);

  const cargar = useCallback(
    (viernes: string | null, adelantar: boolean, silencioso = false) => {
      if (!grupoId || !aprendizId) return;
      const clave = viernes ?? 'en-curso';
      /* Ya la tiene: no la pide de nuevo, pero la anterior sí se adelanta si todavía no está. */
      const yaVista = viernes !== null ? cache.current.get(viernes) : undefined;
      if (yaVista) {
        if (adelantar) adelantarLaAnterior(yaVista);
        return;
      }
      if (enVuelo.current.has(clave)) return;
      if (viernes === null && enCurso.current && cache.current.has(enCurso.current)) return;
      enVuelo.current.add(clave);
      if (!silencioso) fallos.current.delete(clave);
      void obtenerSemanaDelAprendiz(grupoId, aprendizId, viernes)
        .then(semana => {
          if (!vivo.current) return;
          cache.current.set(semana.hasta, semana);
          if (viernes === null) enCurso.current = semana.hasta;
          if (adelantar) adelantarLaAnterior(semana);
        })
        .catch((e: unknown) => {
          if (!vivo.current || silencioso) return;
          if (e instanceof ApiError && e.status === 403 && e.codigo === CODIGO_NO_ACOMPANA) {
            cache.current.clear();
            enCurso.current = null;
            aviso.current?.(e.message);
            return;
          }
          fallos.current.set(clave, e instanceof ApiError && e.status === 0 ? { tipo: 'sin_red', mensaje: SIN_RED } : { tipo: 'servidor', mensaje: mensajeDeCargaEnLinea(e, 'No se pudo cargar la semana.') });
        })
        .finally(() => {
          enVuelo.current.delete(clave);
          if (vivo.current) redibujar();
        });
      if (!silencioso) redibujar();
    },
    [grupoId, aprendizId, adelantarLaAnterior],
  );
  cargarRef.current = cargar;

  /* Al abrir: la semana en curso (el servidor la decide en la zona del aprendiz) y la anterior adelantada. */
  useEffect(() => {
    vivo.current = true;
    cargar(null, true);
    const mapa = cache.current;
    return () => {
      vivo.current = false;
      mapa.clear();
    };
  }, [cargar]);

  /* Spec 048 (FR-005): lo que falló sin señal se pide de nuevo solo cuando vuelve; lo ya cargado no se toca. */
  useRecargarAlVolverLaSenal(() => {
    for (const clave of Array.from(fallos.current.keys())) {
      fallos.current.delete(clave);
      cargar(clave === 'en-curso' ? null : clave, true);
    }
  }, fallos.current.size > 0);

  const semanaDe = useCallback((viernes: string | null): SemanaDelAprendiz | null => (viernes ? cache.current.get(viernes) ?? null : null), []);
  const estadoDe = (viernes: string): EstadoDeSemana =>
    cache.current.has(viernes) ? 'lista' : enVuelo.current.has(viernes) ? 'cargando' : fallos.current.has(viernes) ? 'fallo' : 'sin_pedir';

  /** El mentor eligió una fecha: se pide su semana (si no está) y se adelanta la anterior. */
  const pedirFecha = useCallback((fecha: string) => cargar(viernesDeLaSemana(fecha), true), [cargar]);
  const reintentar = useCallback(
    (viernes: string) => {
      fallos.current.delete(viernes);
      cargar(viernes, true);
    },
    [cargar],
  );

  return {
    semanaEnCurso: enCurso.current ? cache.current.get(enCurso.current) ?? null : null,
    semanaDe,
    estadoDe,
    falloDe: (viernes: string): FalloDeSemana | null => fallos.current.get(viernes) ?? null,
    falloDeLaPrimera: fallos.current.get('en-curso') ?? null,
    cargandoLaPrimera: enVuelo.current.has('en-curso'),
    pedirFecha,
    reintentar,
    reintentarLaPrimera: () => {
      fallos.current.delete('en-curso');
      cargar(null, true);
    },
  };
}
