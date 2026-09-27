import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../../../services/http/apiClient';
import * as eventosApi from '../api/eventosApi';
import {
  cancelarAlarmaDeEvento,
  programarAlarmaDeEvento,
  sincronizarAlarmasDeEventos,
  type ResultadoAlarma,
} from '../notificaciones/alarmasDeEventos';
import type { Asistencia, Ocurrencia } from '../types/eventos.types';

export type FalloDeEventos = 'sin_red' | 'no_disponible' | 'otro';

function falloDe(e: unknown): FalloDeEventos {
  if (e instanceof ApiError && e.status === 0) return 'sin_red';
  if (e instanceof ApiError && (e.status === 404 || e.status === 403)) return 'no_disponible';
  return 'otro';
}

/**
 * Los eventos de los próximos 30 días y el «Voy» / «No voy» de esta persona.
 *
 * Cada lectura también pone al día las alarmas del teléfono (`sincronizarAlarmasDeEventos`): quita
 * la de un evento que se canceló o al que ya no va, y pone la que falte. Así «si el evento se cancela,
 * la alarma se quita» (E-7) no depende de que alguien toque nada: alcanza con abrir la sección.
 *
 * Se pide solo cuando `activo` (la sección Eventos está abierta): Comunidad abre con el Muro y no
 * paga esta lectura si nadie entra (V-3).
 */
export function useEventos(userId: string | null, activo: boolean) {
  const [ocurrencias, setOcurrencias] = useState<Ocurrencia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<FalloDeEventos | null>(null);
  const [yaLeido, setYaLeido] = useState(false);
  const turno = useRef(0);

  const recargar = useCallback(async () => {
    const miTurno = ++turno.current;
    setCargando(true);
    const ahora = Date.now();
    try {
      const lista = await eventosApi.listarProximos(ahora);
      if (miTurno !== turno.current) return;
      setOcurrencias(lista);
      setFallo(null);
      setYaLeido(true);
      if (userId) {
        void sincronizarAlarmasDeEventos(userId, lista, {
          desdeMs: ahora - 60 * 60 * 1000,
          hastaMs: ahora + eventosApi.DIAS_A_LA_VISTA * 24 * 60 * 60 * 1000,
        }).catch(() => {});
      }
    } catch (e) {
      if (miTurno !== turno.current) return;
      setFallo(falloDe(e));
    } finally {
      if (miTurno === turno.current) setCargando(false);
    }
  }, [userId]);

  useEffect(() => {
    if (activo) void recargar();
  }, [activo, recargar]);

  /**
   * «Voy» / «No voy». Optimista: se ve al toque y vuelve atrás si el servidor no lo acepta. La alarma
   * se toca DESPUÉS de que el servidor confirma: una alarma para un «Voy» que no se guardó sonaría
   * para algo a lo que la persona no quedó anotada.
   */
  const responder = useCallback(
    async (oc: Ocurrencia, respuesta: Exclude<Asistencia, null>): Promise<ResultadoAlarma | null> => {
      const esLaMisma = (x: Ocurrencia) =>
        x.evento.id === oc.evento.id && x.inicioOcurrencia === oc.inicioOcurrencia;
      const anterior = oc.asistencia;
      setOcurrencias(prev => prev.map(x => (esLaMisma(x) ? { ...x, asistencia: respuesta } : x)));
      try {
        await eventosApi.responderAsistencia(oc.evento.id, oc.inicioOcurrencia, respuesta);
      } catch (e) {
        setOcurrencias(prev => prev.map(x => (esLaMisma(x) ? { ...x, asistencia: anterior } : x)));
        throw e;
      }
      if (!userId) return null;
      if (respuesta === 'GOING') return programarAlarmaDeEvento(userId, { ...oc, asistencia: 'GOING' });
      await cancelarAlarmaDeEvento(userId, oc.evento.id, oc.inicioOcurrencia);
      return null;
    },
    [userId],
  );

  /** Tras cancelar un evento: sale de la lista y se quita su alarma (de todas sus fechas si `todas`). */
  const quitarDeLaLista = useCallback(
    async (eventoId: string, inicioOcurrencia: string | null) => {
      setOcurrencias(prev =>
        prev.filter(x => x.evento.id !== eventoId || (inicioOcurrencia !== null && x.inicioOcurrencia !== inicioOcurrencia)),
      );
      if (userId) await cancelarAlarmaDeEvento(userId, eventoId, inicioOcurrencia ?? undefined);
    },
    [userId],
  );

  return { ocurrencias, cargando, fallo, yaLeido, recargar, responder, quitarDeLaLista };
}
