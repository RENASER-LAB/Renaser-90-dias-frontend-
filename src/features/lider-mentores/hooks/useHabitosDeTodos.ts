import { useCallback, useEffect, useRef, useState } from 'react';

import { falloDeLectura } from '../../semaforo/api/semaforoApi';
import type { FalloSemaforo } from '../../semaforo/hooks/useMiSemaforo';
import { obtenerHabitosDeTodos } from '../api/habitosDeTodosApi';
import type { FiltrosDeLosHabitos, HabitosDeTodos } from '../types/habitosDeTodos.types';

/** La llave de una lectura: el día y los filtros. Cambiar cualquiera es OTRA lectura, desde cero. */
export function claveDeLaLectura(filtros: FiltrosDeLosHabitos): string {
  return [filtros.fecha ?? 'hoy', filtros.grupo ?? '*', filtros.formacion ?? '*', filtros.categoria ?? '*'].join('|');
}

interface Lectura {
  clave: string;
  datos: HabitosDeTodos | null;
  fallo: FalloSemaforo | null;
  detalle: string | null;
}

/**
 * «Hábitos de todos» del líder (spec 029): el resumen de UN día con sus filtros.
 *
 * - **Cada lectura toma un turno y solo la última escribe**: la respuesta de un día o de un filtro viejo nunca pisa a la de ahora.
 * - **Al cambiar de día o de filtro no queda a la vista el dato anterior, ni por un instante** (SC-005 de la ficha, mismo criterio): lo
 *   leído lleva la llave de su lectura y se muestra solo si es la de AHORA; en el mismo render del cambio ya es «cargando».
 * - **`recargar`** (el «Reintentar» y el deslizar para actualizar) vuelve a pedir lo mismo sin vaciar lo que se ve; si esa relectura
 *   falla y ya había datos, se queda lo que había (nada parpadea a un error); si no había nada, dice por qué.
 * - **Los límites de la navegación** (hoy y 7 días atrás) se recuerdan entre lecturas: no dependen de los filtros, y así ‹ y › saben
 *   hasta dónde llegar mientras llega el día nuevo.
 * - Es solo lectura: no registra nada y el servidor no deja constancia de consulta.
 */
export function useHabitosDeTodos(filtros: FiltrosDeLosHabitos) {
  const clave = claveDeLaLectura(filtros);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [limites, setLimites] = useState<{ masAntigua: string | null; masReciente: string | null }>({ masAntigua: null, masReciente: null });

  const turno = useRef(0);
  const vigente = useRef({ filtros, clave });
  vigente.current = { filtros, clave };

  const leer = useCallback(async (que: FiltrosDeLosHabitos, laClave: string, enSilencio: boolean) => {
    const mio = ++turno.current;
    if (enSilencio) setRefrescando(true);
    try {
      const datos = await obtenerHabitosDeTodos(que);
      if (mio !== turno.current) return;
      setLectura({ clave: laClave, datos, fallo: null, detalle: null });
      if (datos.masAntigua || datos.masReciente) setLimites({ masAntigua: datos.masAntigua, masReciente: datos.masReciente });
    } catch (e) {
      if (mio !== turno.current) return;
      setLectura(previa => {
        /* Una relectura que falla no borra lo que ya se ve. */
        if (enSilencio && previa?.clave === laClave && previa.datos) return previa;
        return { clave: laClave, datos: null, fallo: falloDeLectura(e), detalle: e instanceof Error ? e.message : null };
      });
    } finally {
      if (mio === turno.current) setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    void leer(vigente.current.filtros, clave, false);
    return () => {
      /* Lo que llegue después de cambiar la llave, o de desmontar, ya no escribe. */
      turno.current++;
    };
  }, [clave, leer]);

  const recargar = useCallback(() => leer(vigente.current.filtros, vigente.current.clave, true), [leer]);

  const actual = lectura?.clave === clave ? lectura : null;
  return {
    datos: actual?.datos ?? null,
    fallo: actual?.fallo ?? null,
    detalleDelFallo: actual?.detalle ?? null,
    /** Todavía no hay respuesta para ESTE día y estos filtros (ni dato ni fallo). */
    cargando: actual === null,
    refrescando,
    limites,
    recargar,
  };
}
