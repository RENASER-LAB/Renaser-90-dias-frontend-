import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { obtenerDiasDelAprendiz, type DiaDeColor } from '../api/mentorApi';
import { limitesDelMes } from '../utils/fechasDeLaFicha';
import type { CargarDiasDeLaFicha } from '../utils/lecturasDeLaFicha';

/**
 * El color de cada día del aprendiz (spec 055 FR-011, FR-012 y FR-015), de a un mes por pedido: los 7 círculos de la semana y el
 * mes desplegado salen de la misma lectura (`/dias`), que es la regla de color que el semáforo ya tiene. La app no calcula colores.
 *
 * Un mes ya pedido no se vuelve a pedir mientras la ficha esté abierta. Si el pedido falla, los días quedan sin color (neutro,
 * nunca verde): el color es ayuda para elegir el día, no lo que la ficha necesita para mostrar sus hábitos.
 *
 * **De dónde lee** (spec 056): la ficha compartida le pasa su función `cargar` (la puerta del mentor o la del líder), estable por
 * persona; la forma `(grupoId, aprendizId)` sigue valiendo para el mentor. Si cambia la función, se descarta lo guardado; `null` = nada
 * que pedir.
 */
export function useDiasDelMes(fuente: string | null | CargarDiasDeLaFicha, aprendizId: string | null) {
  const cargarDias = useMemo<CargarDiasDeLaFicha | null>(() => {
    if (typeof fuente === 'function') return fuente;
    return fuente && aprendizId ? (desde, hasta) => obtenerDiasDelAprendiz(fuente, aprendizId, desde, hasta) : null;
  }, [fuente, aprendizId]);
  const dias = useRef(new Map<string, DiaDeColor>());
  const meses = useRef(new Set<string>());
  const diaUno = useRef<string | null>(null);
  const vivo = useRef(true);
  const [, redibujar] = useReducer((n: number) => n + 1, 0);

  const asegurarMes = useCallback(
    (fecha: string) => {
      if (!cargarDias) return;
      const { desde, hasta, clave } = limitesDelMes(fecha);
      if (meses.current.has(clave)) return;
      meses.current.add(clave);
      void cargarDias(desde, hasta)
        .then(respuesta => {
          if (!vivo.current) return;
          for (const d of respuesta.dias) dias.current.set(d.fecha, d);
          if (respuesta.diaUno) diaUno.current = respuesta.diaUno;
          redibujar();
        })
        .catch(() => {
          /* Se podrá reintentar al volver a elegir ese mes. */
          meses.current.delete(clave);
        });
    },
    [cargarDias],
  );

  useEffect(() => {
    vivo.current = true;
    const mapa = dias.current;
    const conjunto = meses.current;
    return () => {
      vivo.current = false;
      mapa.clear();
      conjunto.clear();
    };
  }, [cargarDias]);

  return { asegurarMes, diaDe: (fecha: string): DiaDeColor | null => dias.current.get(fecha) ?? null, diaUnoDeLosDias: diaUno.current };
}
