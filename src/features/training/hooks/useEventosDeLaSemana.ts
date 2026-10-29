import { useEffect, useState } from 'react';

import { listarEventos } from '../../eventos/api/eventosApi';
import type { Ocurrencia } from '../../eventos/types/eventos.types';
import { sumarDiasIso } from '../../eventos/utils/zonaHoraria';

const SIN_EVENTOS: Ocurrencia[] = [];

/**
 * Cuánto vale una lectura de los eventos de la semana antes de volver a pedirla. Corregido 2026-10-29, en el E2E: la
 * lectura se repetía cada vez que Training recuperaba el foco (51 pedidos en una hora). El dueño pidió que ningún
 * endpoint «se ejecute 1000 veces». Cinco minutos alcanzan para que un evento nuevo aparezca sin cerrar la app.
 */
export const VIGENCIA_DE_LOS_EVENTOS_MS = 5 * 60 * 1000;

/** Lo último leído por cuenta y semana, y el pedido en vuelo, para que dos montajes seguidos compartan uno. */
const memoria = new Map<string, { lista: Ocurrencia[]; leidaEn: number }>();
const enVuelo = new Map<string, Promise<Ocurrencia[]>>();

/** Solo para las pruebas. */
export function olvidarEventosDeLaSemana(): void {
  memoria.clear();
  enVuelo.clear();
}

/** Medianoche local de `YYYY-MM-DD` (hora del teléfono), para pedir el rango de la semana. */
function inicioDelDia(fechaIso: string): Date {
  const [a, m, d] = fechaIso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

/**
 * Los eventos de la semana de Training (lunes a domingo): una sola lectura de `GET /calendar/events?from&to`, la misma
 * de la sección Eventos, para mostrarlos en la lista de cada día.
 *
 * Se pide al entrar a Training y cuando cambia la semana, en silencio y sin bloquear nada: si falla, o si Eventos
 * está apagado (`habilitado: false`), la lista sigue con hábitos y acciones. Volver a la pestaña usa lo leído
 * mientras tenga menos de {@link VIGENCIA_DE_LOS_EVENTOS_MS}. No toca alarmas: eso es de `useEventos`.
 */
export function useEventosDeLaSemana({
  cuentaId,
  activa,
  habilitado,
  lunes,
  leer = listarEventos,
}: {
  cuentaId: string;
  activa: boolean;
  habilitado: boolean;
  /** `YYYY-MM-DD` del lunes de la semana. */
  lunes: string;
  /** Inyectable para las pruebas. */
  leer?: typeof listarEventos;
}): Ocurrencia[] {
  const clave = `${cuentaId}|${lunes}`;
  const [ocurrencias, setOcurrencias] = useState<Ocurrencia[]>(() => memoria.get(clave)?.lista ?? SIN_EVENTOS);

  useEffect(() => {
    if (!activa || !habilitado) return;
    let vigente = true;
    const guardada = memoria.get(clave);
    if (guardada) setOcurrencias(guardada.lista);
    if (guardada && Date.now() - guardada.leidaEn < VIGENCIA_DE_LOS_EVENTOS_MS) return;
    let pedido = enVuelo.get(clave);
    if (!pedido) {
      pedido = leer(inicioDelDia(lunes), inicioDelDia(sumarDiasIso(lunes, 7)));
      enVuelo.set(clave, pedido);
      pedido
        .then(lista => memoria.set(clave, { lista, leidaEn: Date.now() }))
        .catch(() => undefined)
        .finally(() => enVuelo.delete(clave));
    }
    pedido
      .then(lista => {
        if (vigente) setOcurrencias(lista);
      })
      .catch(error => console.warn('[Training] no se pudieron leer los eventos de la semana:', error));
    return () => {
      vigente = false;
    };
  }, [activa, habilitado, clave, lunes, leer]);

  return ocurrencias;
}
