import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';

import type { ChatConversation } from '../../../screens/ComunidadScreen';
import { mensajeDeError } from '../../../services/http/apiClient';
// Solo se LEE (no se toca `features/eventos/`): la misma relectura compartida que ya usa la lista
// de Eventos, con sus pruebas. Mismo criterio que `objetivos` con `eventos/utils/zonaHoraria`.
import { crearLecturaVigente, type LecturaVigente } from '../../eventos/utils/lecturaVigente';
import * as chatApi from '../api/chatApi';
import { alLlegarMensajeDeOtroChat } from '../avisos/mensajesEnVivo';
import {
  conversacionConHistorial,
  mapearMensaje,
  mapearResumenConversacion,
  resumenDelUltimoMensaje,
} from '../api/chatMappers';
import type { WireConversacionResumen, WireMensaje, WireMiembro } from '../types/chat.types';
import { fusionarConLoQueHabia } from '../utils/refrescoDeLaLista';

/** Marca de "todavía no se pidió para nadie" (distinta de `null`, que es un actor posible). */
const SIN_PEDIR = Symbol('sin-pedir');

/** Lo que trae una lectura de la lista, con la persona para la que se pidió. */
type LecturaDeLaLista = {
  quien: string | null | undefined;
  resumenes: WireConversacionResumen[];
  directorio: Record<string, WireMiembro>;
};

/**
 * Estado real de Atención Personalizada (chats) contra el backend Java, en un solo lugar — mismo
 * criterio que `useWallFeed`/`useCursos`.
 *
 * `directorio` se pide UNA vez (no por conversación — evita N+1) para poder resolverle un nombre
 * real a las conversaciones DIRECT que el propio backend no nombra (ver el porqué en
 * `chatMappers.resolverOtroParticipante`). `limit=100` es un techo pragmático de una sola página:
 * si el cohorte de usuarios activos supera eso, algunas conversaciones DIRECT sin mensaje propio
 * más reciente quedan con el título genérico "Conversación directa" hasta que se abren.
 *
 * **La lista se refresca sola (2026-09-27, «tipo WhatsApp»).** Antes se pedía una sola vez: el
 * orden por último mensaje y los no leídos se quedaban viejos. Ahora la pantalla llama a
 * `recargar` al volver de una conversación, al volver a la pestaña o a Tribu y deslizando, y:
 * - **los disparos juntos comparten un pedido** y **una respuesta vieja no pisa una nueva**
 *   (`eventos/utils/lecturaVigente`, el mismo mecanismo de la lista de Eventos);
 * - **es en silencio si ya hay lista**: «Cargando tus conversaciones...» solo la primera vez; si
 *   un refresco falla, la lista se queda y el error se dice;
 * - **un cambio hecho acá descarta la lectura en vuelo** (abrir un chat, mandar un mensaje, o
 *   cualquier `setConversations` de la pantalla): esa lectura salió antes del cambio y lo pisaría
 *   con la vista previa o los no leídos de antes;
 * - **espera a que terminen de marcarse como leídas** las conversaciones recién abiertas: si el
 *   pedido saliera antes, volvería con el contador de no leídos del chat que se acaba de leer;
 * - **se conserva el historial ya cargado** de cada conversación (`fusionarConLoQueHabia`).
 */
export function useChatConversaciones(actorId: string | null | undefined, activo = true) {
  // `activo` (V-3, 26/09/2026): Comunidad lo pasa en `false` hasta que se abre la sección que
  // usa esto, para que no compita con el Muro al abrir. Una vez pedido no se vuelve a pedir solo.
  // Para quién se pidió la última vez. Un `recargar()` explícito (la entrada desde "Escribirle")
  // también lo anota, así que activar la sección justo después no repide lo mismo.
  const pedidoPara = useRef<string | null | undefined | typeof SIN_PEDIR>(SIN_PEDIR);
  const actor = useRef(actorId);
  actor.current = actorId;
  const [conversations, setConversacionesCrudas] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajesCargando, setMensajesCargando] = useState(false);
  const hayDatos = useRef(false);
  /** De quién son las conversaciones en pantalla: las de otra persona no se fusionan. */
  const datosDe = useRef<string | null | undefined | typeof SIN_PEDIR>(SIN_PEDIR);
  /** Las marcas de «leída» todavía en vuelo; la próxima lectura de la lista las espera. */
  const marcasEnVuelo = useRef(new Set<Promise<unknown>>());

  const lectura = useRef<LecturaVigente | null>(null);
  if (lectura.current === null) {
    lectura.current = crearLecturaVigente<LecturaDeLaLista>(
      async () => {
        const quien = actor.current;
        await Promise.allSettled([...marcasEnVuelo.current]);
        const [resumenes, directorioPagina] = await Promise.all([
          chatApi.obtenerConversaciones(),
          chatApi.obtenerDirectorioMiembros(undefined, undefined).catch(() => ({ members: [], nextCursor: null })),
        ]);
        const directorio: Record<string, WireMiembro> = Object.fromEntries(
          directorioPagina.members.map(m => [m.id, m])
        );
        return { quien, resumenes, directorio };
      },
      resultado => {
        if (!resultado.ok) {
          setError(
            mensajeDeError(resultado.error, 'No pudimos cargar tus conversaciones. Revisa tu conexión e inténtalo de nuevo.')
          );
          return;
        }
        const { quien, resumenes, directorio } = resultado.valor;
        const nuevas = resumenes.map(r => mapearResumenConversacion(r, quien, directorio));
        const mismaPersona = datosDe.current === quien;
        datosDe.current = quien;
        hayDatos.current = true;
        setError(null);
        setConversacionesCrudas(previas => (mismaPersona ? fusionarConLoQueHabia(previas, nuevas) : nuevas));
      }
    );
  }

  /**
   * Relee la lista. `forzar`: aunque haya una lectura en vuelo (una conversación recién creada que
   * esa lectura no trae). `deslizando`: prende el indicador del pull-to-refresh mientras dura.
   */
  const recargar = useCallback(async (opciones: { forzar?: boolean; deslizando?: boolean } = {}) => {
    const lector = lectura.current as LecturaVigente;
    pedidoPara.current = actor.current;
    if (!hayDatos.current) setLoading(true);
    if (opciones.deslizando) setRefrescando(true);
    try {
      await lector.leer({ forzar: opciones.forzar });
    } finally {
      if (!lector.ocupada()) setLoading(false);
      if (opciones.deslizando) setRefrescando(false);
    }
  }, []);

  /**
   * Un cambio hecho en el teléfono descarta la lectura en vuelo (ver arriba). Es lo que recibe la
   * pantalla como `setConversations`, y lo que usan abrir un chat y mandar un mensaje.
   */
  const setConversations = useCallback((cambio: SetStateAction<ChatConversation[]>) => {
    lectura.current?.invalidar();
    setConversacionesCrudas(cambio);
  }, []);

  // D-221 (2026-09-29): un mensaje que llega a OTRO chat con la app abierta (aviso en primer plano o
  // mensaje del service worker en la web) relee la lista: orden por último mensaje y no leídos al día.
  useEffect(() => {
    if (!activo) return;
    return alLlegarMensajeDeOtroChat(() => {
      void recargar({ forzar: true });
    });
  }, [activo, recargar]);

  // Se repide si cambia la persona (igual que antes), pero solo con la sección activa. Otra persona
  // descarta lo que estuviera en vuelo para la anterior.
  useEffect(() => {
    if (!activo || pedidoPara.current === actorId) return;
    void recargar({ forzar: pedidoPara.current !== SIN_PEDIR });
  }, [activo, actorId, recargar]);

  /**
   * Trae el historial real de una conversación (`GET .../messages`, orden más reciente primero
   * — se da vuelta acá para pintar de más vieja a más nueva, como espera el `.map` del diseño) y
   * la marca como leída. Devuelve la conversación ya con `messages` cargados y, si es un DIRECT
   * sin título resuelto, con el nombre real si algún mensaje enriquecido lo trae.
   *
   * También pone al día la fila de la lista con el último mensaje (2026-09-27): es lo que la
   * ordena, y un mensaje que llegaba en vivo no la movía. Ver `chatMappers.conversacionConHistorial`.
   */
  const abrirConversacion = useCallback(
    async (conversacion: ChatConversation): Promise<ChatConversation> => {
      setMensajesCargando(true);
      try {
        const pagina = await chatApi.obtenerMensajes(conversacion.id);
        const actualizada = conversacionConHistorial(conversacion, pagina.messages, actorId);

        setConversations(prev => prev.map(c => (c.id === conversacion.id ? { ...actualizada, unreadCount: 0 } : c)));

        // Best-effort: si falla, la conversación se abre igual y el conteo de no leídos se
        // reintenta la próxima vez que se abra (mismo criterio que `cargarComentarios`). La
        // próxima lectura de la lista espera a que termine (ver arriba).
        const marca = chatApi.marcarConversacionLeida(conversacion.id).catch(() => undefined);
        marcasEnVuelo.current.add(marca);
        void marca.finally(() => marcasEnVuelo.current.delete(marca));

        return { ...actualizada, unreadCount: 0 };
      } finally {
        setMensajesCargando(false);
      }
    },
    [actorId, setConversations]
  );

  /**
   * Refleja en memoria un mensaje que el backend ACABA de crear en esta conversación: lo agrega al
   * final del historial y actualiza la vista previa del listado. El backend es la fuente de verdad
   * del `id`/`createdAt`, así que nada se agrega de forma optimista antes de su respuesta.
   *
   * Se extrajo de `enviarMensajeTexto` (2026-09-14) al aparecer el segundo camino de envío
   * — compartir una publicación del Muro —: las dos hacen exactamente lo mismo con la respuesta,
   * lo único que cambia es qué endpoint la produjo. Duplicar el merge dejaba dos lugares donde
   * olvidarse de actualizar `lastMessage`.
   */
  const registrarMensajeCreado = useCallback(
    (conversacion: ChatConversation, creado: WireMensaje): ChatConversation => {
      const mensaje = mapearMensaje(creado, actorId);
      const actualizada: ChatConversation = {
        ...conversacion,
        messages: [...conversacion.messages, mensaje],
        ...resumenDelUltimoMensaje(creado, actorId),
      };
      setConversations(prev => prev.map(c => (c.id === conversacion.id ? actualizada : c)));
      return actualizada;
    },
    [actorId, setConversations]
  );

  /** Envía un mensaje de TEXTO real. Para foto o audio va `useEnvioMediaChat`. */
  const enviarMensajeTexto = useCallback(
    async (conversacion: ChatConversation, texto: string): Promise<ChatConversation> => {
      const creado = await chatApi.enviarMensajeTexto(conversacion.id, texto);
      return registrarMensajeCreado(conversacion, creado);
    },
    [registrarMensajeCreado]
  );

  /**
   * Comparte una publicación del Muro en esta conversación. Solo viaja el `postId`: el texto y la
   * foto los arma el SERVIDOR, para que la foto no quede pegada como una URL firmada que vence a
   * los 15 minutos — el porqué completo está en `chatApi.compartirPublicacionDelMuro`.
   */
  const compartirPublicacionDelMuro = useCallback(
    async (conversacion: ChatConversation, postId: string): Promise<ChatConversation> => {
      const creado = await chatApi.compartirPublicacionDelMuro(conversacion.id, postId);
      return registrarMensajeCreado(conversacion, creado);
    },
    [registrarMensajeCreado]
  );

  return {
    conversations,
    setConversations,
    loading,
    /** El pull-to-refresh de la lista está en curso. */
    refrescando,
    error,
    mensajesCargando,
    recargar,
    abrirConversacion,
    enviarMensajeTexto,
    compartirPublicacionDelMuro,
  };
}
