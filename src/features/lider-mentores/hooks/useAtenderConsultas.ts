import { useCallback, useEffect, useRef, useState } from 'react';

import { Alert } from '../../../components/Alerta';
import { mensajeDeError } from '../../../services/http/apiClient';
import { responderTicketMentor } from '../../tickets/api/ticketsApi';
import { recordarConsulta } from '../api/accionesDelLiderApi';
import { nuevaClaveDeOperacion } from '../utils/personaParaLaFicha';

/**
 * Lo que el líder hace con una consulta sin responder (spec 056 FR-029, FR-030). **Un toque, un pedido por consulta**: mientras uno viaja, otro sobre la misma
 * no sale (un `ref` cubre dos toques en el mismo cuadro). «Recordar» lleva una clave por consulta —la misma en un reintento— para que el servidor no mande dos
 * mensajes; si falla, se dice el motivo del servidor. «Responder» devuelve `true` si salió; con `false`, quien llama conserva el texto.
 */
export function useAtenderConsultas() {
  const [ocupadas, setOcupadas] = useState<ReadonlySet<string>>(new Set());
  const enVuelo = useRef(new Set<string>());
  const claves = useRef(new Map<string, string>());
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const correr = useCallback(async (ticketId: string, accion: () => Promise<void>, titulo: string, porDefecto: string): Promise<boolean> => {
    if (enVuelo.current.has(ticketId)) return false;
    enVuelo.current.add(ticketId);
    setOcupadas(new Set(enVuelo.current));
    try {
      await accion();
      return true;
    } catch (e) {
      Alert.alert(titulo, mensajeDeError(e, porDefecto));
      return false;
    } finally {
      enVuelo.current.delete(ticketId);
      if (vivo.current) setOcupadas(new Set(enVuelo.current));
    }
  }, []);

  const recordar = useCallback(
    async (ticketId: string): Promise<boolean> => {
      const clave = claves.current.get(ticketId) ?? nuevaClaveDeOperacion('recordar');
      claves.current.set(ticketId, clave);
      const salio = await correr(ticketId, () => recordarConsulta(ticketId, clave), 'No se pudo recordar', 'Revisa tu conexión e inténtalo de nuevo.');
      if (salio) claves.current.delete(ticketId);
      return salio;
    },
    [correr],
  );

  const responder = useCallback(
    (ticketId: string, texto: string) =>
      correr(ticketId, async () => void (await responderTicketMentor(ticketId, texto)), 'No se pudo responder', 'Revisa tu conexión e inténtalo de nuevo. Lo que escribiste sigue aquí.'),
    [correr],
  );

  return { ocupadas, recordar, responder };
}
