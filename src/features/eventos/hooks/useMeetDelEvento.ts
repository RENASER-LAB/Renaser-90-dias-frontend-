import { useCallback, useEffect, useRef, useState } from 'react';

import * as eventosApi from '../api/eventosApi';
import { reintentarLaSala } from '../api/meetApi';
import type { Evento } from '../types/eventos.types';

/**
 * Cómo va la sala de Meet de un evento, para quien administra (spec 040, FR-008, FR-019). El listado no trae `meet`; el detalle del evento
 * (`GET /events/{id}`) sí, solo a ADMIN y ALCHEMIST, así que se lee una vez al abrir el detalle y solo si el evento es de Meet.
 *
 * - `evento`: la lectura fresca (la que el formulario de edición necesita para saber si el evento ya usa el enlace automático).
 * - `reintentar()`: «Reintentar» a mano; devuelve `true` si el servidor lo aceptó (el detalle relee la lista para ver el enlace nuevo).
 * - `lectura`: mientras no está `lista`, el detalle no deja editar: sin saber si el evento usa el enlace automático, el formulario lo trataría
 *   como un link pegado y el servidor borraría sus salas.
 */
export function useMeetDelEvento(eventoId: string, activo: boolean) {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [lectura, setLectura] = useState<'cargando' | 'lista' | 'fallo'>('cargando');
  const [reintentando, setReintentando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const enVuelo = useRef(false);

  useEffect(() => {
    setEvento(null);
    setFallo(false);
    setLectura('cargando');
    if (!activo) return;
    let vivo = true;
    eventosApi
      .obtenerEvento(eventoId)
      .then(e => {
        if (!vivo) return;
        setEvento(e);
        setLectura('lista');
      })
      .catch(() => vivo && setLectura('fallo'));
    return () => {
      vivo = false;
    };
  }, [eventoId, activo]);

  const reintentar = useCallback(async (): Promise<boolean> => {
    if (enVuelo.current) return false;
    enVuelo.current = true;
    setReintentando(true);
    setFallo(false);
    try {
      setEvento(await reintentarLaSala(eventoId));
      return true;
    } catch {
      setFallo(true);
      return false;
    } finally {
      enVuelo.current = false;
      setReintentando(false);
    }
  }, [eventoId]);

  /* Sin `activo` no hay nada que leer: la lectura cuenta como lista (el evento no es de Meet o quien mira no administra). */
  return { evento, lectura: activo ? lectura : ('lista' as const), reintentando, fallo, reintentar };
}
