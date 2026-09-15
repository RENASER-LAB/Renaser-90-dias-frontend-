import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import { obtenerBandejaDeTickets } from '../api/ticketsApi';
import type { WireTicketMentor } from '../types/tickets.types';
import { ordenarBandeja, resumenDeBandeja } from '../utils/bandeja';

/**
 * Todos los tickets de mentoría de la plataforma, para quien tiene permiso de verlos.
 *
 * **No es `useTicketsMentor`.** Ese pide `GET /api/v1/tickets` —los tickets PROPIOS de quien
 * llama— y sabe abrir uno nuevo. Este pide `GET /api/v1/admin/tickets`, que es la bandeja
 * completa y es de solo lectura. Dos preguntas distintas, dos hooks; meterlas en uno haría que
 * la pantalla tuviera que acordarse de cuál de los dos comportamientos pidió.
 *
 * `sinPermiso` se distingue del resto de los fallos porque se arregla distinto: no hay nada que
 * reintentar, y ofrecer un botón que va a volver a dar 403 es peor que no ofrecerlo.
 */
export type FalloBandeja = 'sin_permiso' | 'sin_red' | 'error';

export function useBandejaDeTickets(activo: boolean) {
  const [tickets, setTickets] = useState<WireTicketMentor[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(activo);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [fallo, setFallo] = useState<FalloBandeja | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);

  /* Una petición en vuelo por vez. Sin esto, dos toques seguidos en "Ver más" piden la MISMA
     página dos veces y la lista queda con cada ticket repetido. */
  const enVuelo = useRef(false);

  const pedir = useCallback(
    async (desde: string | null) => {
      if (!activo || enVuelo.current) return;
      enVuelo.current = true;
      if (desde === null) setCargando(true);
      else setCargandoMas(true);
      setFallo(null);
      setDetalle(null);
      try {
        const pagina = await obtenerBandejaDeTickets(desde);
        /* Se acumula por id y no por concatenación a secas: si el servidor devolviera un ticket
           en dos páginas —cursor por fecha, y dos con la misma fecha— la lista lo mostraría dos
           veces y las cifras de arriba contarían de más. */
        setTickets(previos => (desde === null ? pagina.tickets : unirSinRepetir(previos, pagina.tickets)));
        setCursor(pagina.nextCursor ?? null);
      } catch (e) {
        if (desde === null) setTickets([]);
        setCursor(null);
        setFallo(
          e instanceof ApiError && e.esProhibido ? 'sin_permiso'
          : e instanceof ApiError && e.esDeRed ? 'sin_red'
          : 'error',
        );
        setDetalle(mensajeDeError(e, 'No se pudo cargar la bandeja de tickets.'));
      } finally {
        enVuelo.current = false;
        setCargando(false);
        setCargandoMas(false);
      }
    },
    [activo],
  );

  useEffect(() => {
    if (!activo) return;
    void pedir(null);
  }, [activo, pedir]);

  const recargar = useCallback(() => {
    void pedir(null);
  }, [pedir]);

  const verMas = useCallback(() => {
    if (cursor) void pedir(cursor);
  }, [cursor, pedir]);

  /* Orden y cifras se DERIVAN de la lista, nunca se guardan: un estado paralelo es lo que hace
     que la cabecera diga 4 sin responder y la lista muestre 3. */
  const ordenados = useMemo(() => ordenarBandeja(tickets), [tickets]);
  const resumen = useMemo(() => resumenDeBandeja(tickets), [tickets]);

  return {
    tickets: ordenados,
    resumen,
    cargando,
    cargandoMas,
    hayMas: cursor !== null,
    fallo,
    detalle,
    recargar,
    verMas,
  };
}

function unirSinRepetir(previos: WireTicketMentor[], nuevos: WireTicketMentor[]): WireTicketMentor[] {
  const vistos = new Set(previos.map(t => t.id));
  return [...previos, ...nuevos.filter(t => !vistos.has(t.id))];
}
