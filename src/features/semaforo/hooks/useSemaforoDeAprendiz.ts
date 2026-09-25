import { useCallback, useEffect, useRef, useState } from 'react';

import {
  SEMANAS_POR_DEFECTO,
  falloDeLectura,
  obtenerSemaforoDeAprendiz,
  type OrigenDelAprendiz,
} from '../api/semaforoApi';
import type { DetalleDelSemaforo } from '../types/semaforo.types';
import type { FalloSemaforo } from './useMiSemaforo';

export type EstadoSemaforoDeAprendiz = ReturnType<typeof useSemaforoDeAprendiz>;

function claveDe(origen: OrigenDelAprendiz | null): string | null {
  if (!origen) return null;
  return origen.quien === 'mentor' ? `mentor:${origen.grupoId}:${origen.aprendizId}` : `admin:${origen.aprendizId}`;
}

/**
 * El semáforo de OTRA persona (§4.1): el mentor mirando a un aprendiz de su grupo, o administración
 * mirando a cualquiera. Mismo formato que el propio, sin pausa: quien mira no puede pausar a nadie.
 *
 * `origen` `null` = no hay a quién preguntarle (el mentor todavía sin grupo): no se pide nada y no
 * queda un "cargando" colgado — una sección que dice "cargando" para siempre miente.
 *
 * Una lectura al montar y al cambiar de persona; "Reintentar" relee. Sin foco: vive dentro de la
 * ficha, que se abre y se cierra.
 */
export function useSemaforoDeAprendiz(origen: OrigenDelAprendiz | null, semanas: number = SEMANAS_POR_DEFECTO) {
  const clave = claveDe(origen);
  const origenActual = useRef(origen);
  origenActual.current = origen;

  const [detalle, setDetalle] = useState<DetalleDelSemaforo | null>(null);
  const [cargando, setCargando] = useState(clave !== null);
  const [fallo, setFallo] = useState<FalloSemaforo | null>(null);
  const [detalleDelFallo, setDetalleDelFallo] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const turno = useRef(0);
  const claveCargada = useRef<string | null>(null);

  useEffect(() => {
    const quien = origenActual.current;
    /* Otra persona: lo de la anterior no se deja a la vista mientras llega lo nuevo. */
    if (claveCargada.current !== clave) {
      claveCargada.current = clave;
      setDetalle(null);
      setFallo(null);
    }
    if (!quien) {
      setCargando(false);
      return;
    }
    const miTurno = ++turno.current;
    setCargando(true);
    obtenerSemaforoDeAprendiz(quien, semanas)
      .then(nuevo => {
        if (miTurno !== turno.current) return;
        setDetalle(nuevo);
        setFallo(null);
        setDetalleDelFallo(null);
      })
      .catch((e: unknown) => {
        if (miTurno !== turno.current) return;
        setDetalle(null);
        setFallo(falloDeLectura(e));
        setDetalleDelFallo(e instanceof Error ? e.message : null);
      })
      .finally(() => {
        if (miTurno === turno.current) setCargando(false);
      });
    return () => {
      turno.current++;
    };
  }, [clave, semanas, vuelta]);

  const recargar = useCallback(() => setVuelta(v => v + 1), []);

  return { detalle, cargando, fallo, detalleDelFallo, recargar };
}
