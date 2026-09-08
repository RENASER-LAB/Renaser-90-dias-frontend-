import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import * as objetivosApi from '../api/objetivosApi';
import type {
  CierreRocaSemanal,
  EdicionRocaSemanal,
  EjeObjetivo,
  ItemPlanSemanal,
  RocaMaestraApi,
  RocaSemanalApi,
} from '../types/objetivos.types';

/**
 * El plan de la semana: las tres rocas semanales del aprendiz, una por eje.
 *
 * **Por qué esto existe.** La tarjeta "OBJETIVO SEMANAL" del Plan era una lista de tildes en
 * `useState`, y el `Alert` decía "Los cambios han sido guardados en tu plan" — era falso: se perdía
 * al recargar. Esto la conecta al modelo real, que no es una lista de tareas sino **un ciclo que se
 * abre y se cierra**: se abre con tres rocas y tres acciones críticas cada una, y se cierra con una
 * autoevaluación, el bloqueo principal y la corrección.
 *
 * **Por qué recibe las maestras en vez de pedirlas.** `RocaSemanalResponse` no trae el eje: trae
 * `rocaMaestraId`. Sin las maestras no hay forma de saber cuál de las tres rocas es la de CUERPO.
 * Pedirlas acá también significaría dos llamadas a `/rocks/master` en la misma pantalla, porque
 * `useRocasMaestras` ya está montado arriba.
 */

/** En qué estado está la semana. Cada uno pide una pantalla distinta, no un mensaje distinto. */
export type EstadoSemana =
  /** Todavía no se sabe. */
  | 'cargando'
  /** Faltan las 3 Rocas Maestras: el backend cierra todo con 403 ROCKS_LOCKED. */
  | 'bloqueada'
  /** Hay maestras pero esta semana no se abrió: toca el formulario. */
  | 'sin_planificar'
  /** La semana está abierta y en curso. */
  | 'planificada'
  /** La semana ya se revisó: las tres tienen autoevaluación final. */
  | 'cerrada';

export interface RocaSemanalDeEje {
  eje: EjeObjetivo;
  roca: RocaSemanalApi;
}

export function useRocasSemanales(maestras: RocaMaestraApi[], semana?: number) {
  const [rocas, setRocas] = useState<RocaSemanalApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [bloqueada, setBloqueada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setRocas(await objetivosApi.obtenerRocasSemanales(semana));
      setBloqueada(false);
    } catch (e) {
      // Un 403 acá no es "algo falló": es el estado normal de quien todavía no definió sus tres
      // objetivos de 90 días. Mostrarlo como error rojo mandaría a la persona a soporte en vez de
      // al Mapa, que es lo que le falta hacer.
      if (e instanceof ApiError && e.esProhibido) {
        setBloqueada(true);
        setRocas([]);
      } else {
        setError(mensajeDeError(e, 'No pudimos cargar tu plan de la semana.'));
      }
    } finally {
      setCargando(false);
    }
  }, [semana]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** El eje de cada roca, resuelto contra las maestras. Sin maestras cargadas, lista vacía. */
  const porEje = useMemo<RocaSemanalDeEje[]>(() => {
    const ejePorMaestra = new Map(maestras.map(m => [m.id, m.eje]));
    return rocas
      .map(roca => {
        const eje = ejePorMaestra.get(roca.rocaMaestraId);
        return eje ? { eje, roca } : null;
      })
      .filter((x): x is RocaSemanalDeEje => x !== null);
  }, [rocas, maestras]);

  const deEje = useCallback(
    (eje: EjeObjetivo) => porEje.find(x => x.eje === eje)?.roca ?? null,
    [porEje]
  );

  const estado: EstadoSemana = useMemo(() => {
    if (cargando) return 'cargando';
    if (bloqueada || maestras.length < 3) return 'bloqueada';
    if (rocas.length === 0) return 'sin_planificar';
    // Se considera cerrada solo con las tres revisadas: media semana revisada sigue en curso.
    return rocas.every(r => r.autoevaluacionFin != null) ? 'cerrada' : 'planificada';
  }, [cargando, bloqueada, maestras.length, rocas]);

  /**
   * Abre la semana con el trío completo.
   *
   * Devuelve `motivo` además del mensaje para que la pantalla pueda reaccionar distinto: ante
   * `ya_planificada` no tiene sentido mostrar un error — hay que recargar y mostrar la semana que
   * ya existe, porque el usuario la abrió desde otro dispositivo o con doble toque.
   */
  const planificar = useCallback(async (items: ItemPlanSemanal[]) => {
    setGuardando(true);
    try {
      setRocas(await objetivosApi.crearPlanSemanal(items));
      setBloqueada(false);
      return { ok: true as const };
    } catch (e) {
      if (e instanceof ApiError && e.esConflicto) {
        await cargar();
        return { ok: false as const, motivo: 'ya_planificada' as const, mensaje: 'Esta semana ya estaba planificada.' };
      }
      if (e instanceof ApiError && e.esProhibido) {
        setBloqueada(true);
        return {
          ok: false as const,
          motivo: 'sin_objetivos' as const,
          mensaje: 'Primero define tus tres objetivos de 90 días.',
        };
      }
      return {
        ok: false as const,
        motivo: 'error' as const,
        mensaje: mensajeDeError(e, 'No pudimos guardar tu plan de la semana.'),
      };
    } finally {
      setGuardando(false);
    }
  }, [cargar]);

  const reemplazar = useCallback((guardada: RocaSemanalApi) => {
    setRocas(previas => previas.map(r => (r.id === guardada.id ? guardada : r)));
  }, []);

  /** Corrige una roca abierta. Un 403 acá significa ventana cerrada, no falta de permiso. */
  const editar = useCallback(async (id: string, edicion: EdicionRocaSemanal) => {
    setGuardando(true);
    try {
      reemplazar(await objetivosApi.editarRocaSemanal(id, edicion));
      return { ok: true as const };
    } catch (e) {
      if (e instanceof ApiError && e.esProhibido) {
        return {
          ok: false as const,
          motivo: 'ventana_cerrada' as const,
          mensaje: 'La ventana para corregir esta semana ya cerró. Vas a poder replanificar el domingo.',
        };
      }
      return { ok: false as const, motivo: 'error' as const, mensaje: mensajeDeError(e, 'No pudimos guardar el cambio.') };
    } finally {
      setGuardando(false);
    }
  }, [reemplazar]);

  /** Cierra una roca con su revisión. Sin ventana horaria: se revisa cuando la persona pueda. */
  const cerrar = useCallback(async (id: string, cierre: CierreRocaSemanal) => {
    setGuardando(true);
    try {
      reemplazar(await objetivosApi.cerrarSemana(id, cierre));
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, mensaje: mensajeDeError(e, 'No pudimos guardar tu revisión.') };
    } finally {
      setGuardando(false);
    }
  }, [reemplazar]);

  return { rocas, porEje, deEje, estado, cargando, error, guardando, planificar, editar, cerrar, recargar: cargar };
}
