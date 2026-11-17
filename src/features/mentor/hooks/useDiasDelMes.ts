import { useCallback, useEffect, useReducer, useRef } from 'react';

import { obtenerDiasDelAprendiz, type DiaDeColor } from '../api/mentorApi';
import { limitesDelMes } from '../utils/fechasDeLaFicha';

/**
 * El color de cada día del aprendiz (spec 055 FR-011, FR-012 y FR-015), de a un mes por pedido: los 7 círculos de la semana y el
 * mes desplegado salen de la misma lectura (`/dias`), que es la regla de color que el semáforo ya tiene. La app no calcula colores.
 *
 * Un mes ya pedido no se vuelve a pedir mientras la ficha esté abierta. Si el pedido falla, los días quedan sin color (neutro,
 * nunca verde): el color es ayuda para elegir el día, no lo que la ficha necesita para mostrar sus hábitos.
 */
export function useDiasDelMes(grupoId: string | null, aprendizId: string | null) {
  const dias = useRef(new Map<string, DiaDeColor>());
  const meses = useRef(new Set<string>());
  const diaUno = useRef<string | null>(null);
  const vivo = useRef(true);
  const [, redibujar] = useReducer((n: number) => n + 1, 0);

  const asegurarMes = useCallback(
    (fecha: string) => {
      if (!grupoId || !aprendizId) return;
      const { desde, hasta, clave } = limitesDelMes(fecha);
      if (meses.current.has(clave)) return;
      meses.current.add(clave);
      void obtenerDiasDelAprendiz(grupoId, aprendizId, desde, hasta)
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
    [grupoId, aprendizId],
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
  }, [grupoId, aprendizId]);

  return { asegurarMes, diaDe: (fecha: string): DiaDeColor | null => dias.current.get(fecha) ?? null, diaUnoDeLosDias: diaUno.current };
}
