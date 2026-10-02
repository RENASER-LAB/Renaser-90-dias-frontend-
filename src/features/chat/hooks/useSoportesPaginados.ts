import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChatConversation } from '../../../screens/ComunidadScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
import * as chatApi from '../api/chatApi';
import { mapearResumenConversacion } from '../api/chatMappers';
import { agregarPagina, ESPERA_DE_BUSQUEDA_MS, TAMANO_DE_PAGINA } from '../utils/seccionDeSoportes';

/**
 * Los chats de soporte de quien atiende, de a una página (D-249, `GET /chat/support-conversations`).
 *
 * - **Primera página al activarse** (Admin o Alquimista en Tribu), aunque la sección esté plegada: trae el
 *   total y los no leídos de la cabecera. Son 25 filas, no las 300.
 * - **`pedirMas`** sigue desde el cursor; no hace nada si ya no hay más o si hay un pedido en vuelo.
 * - **Búsqueda en el servidor** con espera de 300 ms desde la última tecla. Cada búsqueda o relectura
 *   empieza un turno nuevo: la respuesta de un turno viejo (otra búsqueda, una página pedida antes) se
 *   descarta, así nunca se mezclan resultados de dos textos.
 * - **`recargar`** vuelve a la primera página con el texto vigente (deslizar hacia abajo, volver a Tribu).
 */
export function useSoportesPaginados(activo: boolean, actorId: string | null | undefined) {
  const [filas, setFilas] = useState<ChatConversation[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [totalSinBusqueda, setTotalSinBusqueda] = useState<number | null>(null);
  const [conNoLeidos, setConNoLeidos] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [textoAplicado, setTextoAplicado] = useState('');

  const actor = useRef(actorId);
  actor.current = actorId;
  const turno = useRef(0);
  const enVuelo = useRef(false);
  const vigente = useRef({ cursor, hayMas, textoAplicado });
  vigente.current = { cursor, hayMas, textoAplicado };

  const pedirPrimera = useCallback(async (buscado: string) => {
    const mio = ++turno.current;
    enVuelo.current = true;
    setCargando(true);
    // Una página pedida antes de esta búsqueda ya no cuenta: su «Cargando más…» tampoco.
    setCargandoMas(false);
    try {
      const pagina = await chatApi.obtenerSoportes({ texto: buscado, tamano: TAMANO_DE_PAGINA });
      if (mio !== turno.current) return;
      setFilas(agregarPagina([], pagina.conversations.map(r => mapearResumenConversacion(r, actor.current, {}))));
      setCursor(pagina.nextCursor);
      setHayMas(pagina.hasMore);
      setTotal(pagina.totalCount ?? null);
      if (!buscado.trim()) {
        setTotalSinBusqueda(pagina.totalCount ?? null);
        setConNoLeidos(pagina.unreadConversations ?? null);
      }
      setError(null);
    } catch (e) {
      if (mio === turno.current) setError(mensajeDeError(e, 'No pudimos cargar los chats de soporte.'));
    } finally {
      if (mio === turno.current) {
        enVuelo.current = false;
        setCargando(false);
      }
    }
  }, []);

  const pedirMas = useCallback(async () => {
    const { cursor: desde, hayMas: quedan, textoAplicado: buscado } = vigente.current;
    if (!quedan || !desde || enVuelo.current) return;
    const mio = turno.current;
    enVuelo.current = true;
    setCargandoMas(true);
    try {
      const pagina = await chatApi.obtenerSoportes({ texto: buscado, cursor: desde, tamano: TAMANO_DE_PAGINA });
      if (mio !== turno.current) return;
      setFilas(previas => agregarPagina(previas, pagina.conversations.map(r => mapearResumenConversacion(r, actor.current, {}))));
      setCursor(pagina.nextCursor);
      setHayMas(pagina.hasMore);
      setError(null);
    } catch (e) {
      if (mio === turno.current) setError(mensajeDeError(e, 'No pudimos cargar más chats de soporte.'));
    } finally {
      if (mio === turno.current) {
        enVuelo.current = false;
        setCargandoMas(false);
      }
    }
  }, []);

  const recargar = useCallback(() => pedirPrimera(vigente.current.textoAplicado), [pedirPrimera]);

  // La espera de la búsqueda: solo el último texto, 300 ms después de la última tecla.
  useEffect(() => {
    const id = setTimeout(() => setTextoAplicado(texto.trim()), ESPERA_DE_BUSQUEDA_MS);
    return () => clearTimeout(id);
  }, [texto]);

  useEffect(() => {
    if (!activo) return;
    void pedirPrimera(textoAplicado);
  }, [activo, textoAplicado, pedirPrimera]);

  return {
    filas,
    hayMas,
    total,
    totalSinBusqueda,
    conNoLeidos,
    cargando,
    cargandoMas,
    error,
    texto,
    buscando: textoAplicado !== '',
    setTexto,
    pedirMas,
    recargar,
  };
}
