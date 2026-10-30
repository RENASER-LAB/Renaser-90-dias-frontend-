import { useCallback, useEffect, useRef, useState } from 'react';

import * as habitsApi from '../../habits/api/habitsApi';
import type { PreferenciaHabitoApi } from '../../habits/types/habits.types';
import { obtenerRocasAgendadas } from '../../objetivos/api/objetivosApi';
import type { AccionDeUnDia } from '../utils/itemsDelDia';

const SIN_PREFERENCIAS: ReadonlyMap<string, PreferenciaHabitoApi> = new Map();
const SIN_ACCIONES: AccionDeUnDia[] = [];

/**
 * Lo PLANIFICADO de la semana: las horas de cada día de cada hábito (`GET /habit-preferences`, `weekdays[i]`,
 * spec 008) y las acciones agendadas (`GET /rocks/upcoming`, el mismo que usan «Agendar otro día» y las alarmas).
 *
 * Solo hace falta para los días que NO son hoy, así que no se pide al abrir Training: `cargar()` lo llama el toque
 * en otro día, y es idempotente (una vez por cuenta y semana; un pedido en vuelo se comparte). Si una de las dos
 * lecturas falla, la otra se usa igual: sin horas por día se ve la hora general de cada hábito, y sin acciones, solo
 * hábitos y eventos.
 */
export function usePlanDeLaSemana({ cuentaId, semana }: { cuentaId: string; semana: string }) {
  const [preferencias, setPreferencias] = useState<ReadonlyMap<string, PreferenciaHabitoApi>>(SIN_PREFERENCIAS);
  const [acciones, setAcciones] = useState<AccionDeUnDia[]>(SIN_ACCIONES);
  const [cargando, setCargando] = useState(false);
  const alcance = `${cuentaId}|${semana}`;
  /** Qué alcance ya se pidió (o se está pidiendo): `cargar()` no repite. */
  const pedido = useRef<string | null>(null);
  const alcanceActual = useRef(alcance);
  alcanceActual.current = alcance;

  useEffect(() => {
    pedido.current = null;
    setPreferencias(SIN_PREFERENCIAS);
    setAcciones(SIN_ACCIONES);
    setCargando(false);
  }, [alcance]);

  const cargar = useCallback(() => {
    const mio = alcanceActual.current;
    if (pedido.current === mio) return;
    pedido.current = mio;
    setCargando(true);
    void Promise.allSettled([habitsApi.obtenerPreferencias(), obtenerRocasAgendadas()]).then(([prefs, rocas]) => {
      if (alcanceActual.current !== mio) return;
      if (prefs.status === 'fulfilled') setPreferencias(new Map(prefs.value.map(p => [p.habitId, p])));
      else console.warn('[Training] no se pudieron leer las horas de cada día; se usa la hora general:', prefs.reason);
      if (rocas.status === 'fulfilled') {
        setAcciones(rocas.value.rocas.map(r => ({
          id: r.id,
          fecha: r.fecha,
          titulo: r.titulo,
          horaInicio: r.horaInicio,
          completada: r.completada,
        })));
      } else console.warn('[Training] no se pudieron leer las acciones agendadas:', rocas.reason);
      setCargando(false);
    });
  }, []);

  return { preferencias, acciones, cargando, cargar };
}
