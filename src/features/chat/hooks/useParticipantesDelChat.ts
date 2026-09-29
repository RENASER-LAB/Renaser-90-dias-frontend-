import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import { obtenerParticipantes } from '../api/chatApi';
import type { WireParticipante } from '../types/chat.types';

/** Cuántos trae cada pedido. La comunidad son cientos: se piden de a 50 y el resto con «Ver más». */
export const TAMANO_DE_PAGINA = 50;

/** La búsqueda espera a que se deje de escribir: un pedido por letra saturaría la lista. */
const ESPERA_DE_LA_BUSQUEDA_MS = 350;

/**
 * Suma una página a lo ya mostrado sin repetir a nadie: si entra alguien mientras se pagina, el corrimiento
 * de una página a otra no debe dibujar dos veces a la misma persona (la clave de la fila es su id).
 */
export function juntarPaginas(actuales: readonly WireParticipante[], nuevas: readonly WireParticipante[]): WireParticipante[] {
  const vistos = new Set(actuales.map(p => p.userId));
  return [...actuales, ...nuevas.filter(p => !vistos.has(p.userId))];
}

/**
 * Los integrantes de una conversación, de a páginas y con búsqueda por nombre (`GET
 * /conversations/{id}/participants`). Es la fuente ÚNICA de la lista de la info del chat, para cualquier
 * tipo de conversación y cualquier rol.
 *
 * `conversationId` en `null` no pide nada: la info está cerrada, o la conversación no tiene lista. Los
 * integrantes se piden recién al abrir la info, no al abrir el chat.
 *
 * **Las carreras.** Cambiar la búsqueda o de chat con un pedido en vuelo deja a ese pedido sin efecto
 * (`version`): si no, la respuesta lenta de «ana» pisaría a la de «ana p» y la de otro chat, a la de este.
 *
 * `totalSinBuscar` es el total del chat entero (el «N integrantes» del título); mientras se busca, `total`
 * es el de la búsqueda.
 */
export function useParticipantesDelChat(conversationId: string | null, busqueda: string) {
  const [filas, setFilas] = useState<WireParticipante[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [totalSinBuscar, setTotalSinBuscar] = useState<number | null>(null);
  const [pagina, setPagina] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);

  useEffect(() => {
    const mia = ++version.current;
    setFilas([]);
    setPagina(0);
    setError(null);
    if (!conversationId) {
      setTotal(null);
      setTotalSinBuscar(null);
      setCargando(false);
      return;
    }
    const q = busqueda.trim();
    setCargando(true);
    const espera = setTimeout(
      () => {
        obtenerParticipantes(conversationId, { q, size: TAMANO_DE_PAGINA })
          .then(respuesta => {
            if (version.current !== mia) return;
            setFilas(respuesta.participants);
            setTotal(respuesta.total);
            if (!q) setTotalSinBuscar(respuesta.total);
          })
          .catch(e => {
            if (version.current !== mia) return;
            setError(mensajeDeError(e, 'No pudimos cargar los integrantes. Revisa tu conexión e inténtalo de nuevo.'));
          })
          .finally(() => {
            if (version.current === mia) setCargando(false);
          });
      },
      q ? ESPERA_DE_LA_BUSQUEDA_MS : 0
    );
    return () => clearTimeout(espera);
  }, [conversationId, busqueda]);

  const verMas = useCallback(() => {
    if (!conversationId || cargando || cargandoMas) return;
    const mia = version.current;
    const siguiente = pagina + 1;
    setCargandoMas(true);
    obtenerParticipantes(conversationId, { q: busqueda, page: siguiente, size: TAMANO_DE_PAGINA })
      .then(respuesta => {
        if (version.current !== mia) return;
        setFilas(actuales => juntarPaginas(actuales, respuesta.participants));
        setPagina(siguiente);
        setTotal(respuesta.total);
      })
      .catch(e => {
        if (version.current === mia) setError(mensajeDeError(e, 'No pudimos cargar más integrantes.'));
      })
      .finally(() => {
        if (version.current === mia) setCargandoMas(false);
      });
  }, [conversationId, busqueda, pagina, cargando, cargandoMas]);

  const hayMas = total !== null && filas.length < total;
  return { filas, total, totalSinBuscar, cargando, cargandoMas, error, hayMas, verMas };
}
