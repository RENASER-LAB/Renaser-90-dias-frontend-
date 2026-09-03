import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import { obtenerHistorialRenasia } from '../api/renasiaApi';
import { enviarMensajeRenasia, RenasiaCuotaExcedidaError } from '../api/renasiaStream';
import type { MensajeRenasiaApi, RenasiaMensajeUI } from '../types/renasia.types';

let contadorIdLocal = 0;
/** Ids para mensajes que todavía no existen en el servidor (la pregunta optimista, la respuesta en curso). */
function idLocal(prefijo: string): string {
  contadorIdLocal += 1;
  return `${prefijo}-${Date.now()}-${contadorIdLocal}`;
}

function mapearMensajeApi(m: MensajeRenasiaApi): RenasiaMensajeUI {
  return {
    id: m.id,
    autor: m.role === 'USER' ? 'persona' : 'asistente',
    texto: m.content,
    lecciones: m.sourceLessonIds && m.sourceLessonIds.length > 0 ? m.sourceLessonIds : null,
    creadoEn: m.createdAt,
  };
}

export type EstadoRenasiaChat = {
  mensajes: RenasiaMensajeUI[];
  cargandoHistorial: boolean;
  errorHistorial: string | null;
  cargandoMasAntiguos: boolean;
  hayMasAntiguos: boolean;
  /** Hay una pregunta en vuelo — el input se deshabilita para no mandar dos a la vez. */
  enviando: boolean;
  cargarHistorialInicial: () => Promise<void>;
  cargarMasAntiguos: () => Promise<void>;
  enviarPregunta: (texto: string) => Promise<void>;
  reintentarMensaje: (idMensajeAsistente: string) => Promise<void>;
};

/**
 * Estado real del panel de RENASIA: historial paginado (`GET /api/v1/renasia/mensajes`) más la
 * conversación en vivo (`POST /api/v1/renasia/mensajes`, streaming). Mismo criterio que
 * `useWallFeed` en `community`: la pantalla no arma llamadas de red sueltas, las pide acá.
 *
 * El historial llega del backend con la página más reciente primero — mismo criterio de
 * paginación por cursor que `GET /api/v1/wall` — así que acá se invierte cada página antes de
 * guardarla, para dibujar la conversación de más vieja arriba a más nueva abajo, como se lee un
 * chat. Si el backend en realidad pagina al revés, lo único que se ve mal es el orden de los
 * mensajes (no hay ningún crash ni pérdida de datos), pero vale la pena confirmarlo contra el
 * backend real.
 *
 * Publica con **UI optimista**, igual que `publicarOptimista` en `useWallFeed`: la pregunta de
 * la persona y una burbuja vacía del asistente aparecen en el instante en que se toca "enviar",
 * antes de que exista respuesta alguna del servidor. El precio, explícito: si el stream falla, la
 * burbuja del asistente se marca con el error en vez de desaparecer — la pregunta de la persona
 * NUNCA se saca de la lista, porque a diferencia de una publicación del Muro, perder de vista lo
 * que uno preguntó sería peor que ver una respuesta fallida.
 */
export function useRenasiaChat(): EstadoRenasiaChat {
  const [mensajes, setMensajes] = useState<RenasiaMensajeUI[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);
  const [cargandoMasAntiguos, setCargandoMasAntiguos] = useState(false);
  const [hayMasAntiguos, setHayMasAntiguos] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const montadoRef = useRef(true);
  const mensajesRef = useRef<RenasiaMensajeUI[]>([]);
  mensajesRef.current = mensajes;

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      // Cortar el stream en curso si el panel se cierra a mitad de una respuesta — no tiene
      // sentido seguir leyendo fragmentos para una pantalla que ya nadie mira.
      abortRef.current?.abort();
    };
  }, []);

  const cargarHistorialInicial = useCallback(async () => {
    setCargandoHistorial(true);
    setErrorHistorial(null);
    try {
      const pagina = await obtenerHistorialRenasia();
      if (!montadoRef.current) return;
      setMensajes([...pagina.messages].reverse().map(mapearMensajeApi));
      cursorRef.current = pagina.nextCursor;
      setHayMasAntiguos(pagina.hasMore);
    } catch (e) {
      if (!montadoRef.current) return;
      setErrorHistorial(mensajeDeError(e, 'No pudimos cargar tu conversación con RENASIA.'));
    } finally {
      if (montadoRef.current) setCargandoHistorial(false);
    }
  }, []);

  const cargarMasAntiguos = useCallback(async () => {
    if (!cursorRef.current || cargandoMasAntiguos) return;
    setCargandoMasAntiguos(true);
    try {
      const pagina = await obtenerHistorialRenasia(cursorRef.current);
      if (!montadoRef.current) return;
      setMensajes(prev => [...[...pagina.messages].reverse().map(mapearMensajeApi), ...prev]);
      cursorRef.current = pagina.nextCursor;
      setHayMasAntiguos(pagina.hasMore);
    } catch {
      // Silencioso a propósito, mismo criterio que `cargarComentarios` en `useWallFeed`: cargar
      // historial viejo se reintenta con un toque más, no amerita interrumpir con una alerta a
      // alguien que está en medio de una conversación activa.
    } finally {
      if (montadoRef.current) setCargandoMasAntiguos(false);
    }
  }, [cargandoMasAntiguos]);

  /** El motor común de "mandar una pregunta y volcar el stream sobre un mensaje ya en la lista". */
  const ejecutarEnvio = useCallback(async (idAsistente: string, textoPregunta: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setEnviando(true);

    try {
      await enviarMensajeRenasia(
        textoPregunta,
        {
          onTexto: fragmento => {
            if (!montadoRef.current) return;
            setMensajes(prev =>
              prev.map(m => (m.id === idAsistente ? { ...m, texto: m.texto + fragmento } : m))
            );
          },
          onFuentes: lecciones => {
            if (!montadoRef.current) return;
            setMensajes(prev => prev.map(m => (m.id === idAsistente ? { ...m, lecciones } : m)));
          },
          onFin: () => {
            if (!montadoRef.current) return;
            setMensajes(prev =>
              prev.map(m => (m.id === idAsistente ? { ...m, enProgreso: false } : m))
            );
          },
        },
        controller.signal
      );
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      if (!montadoRef.current) return;
      const esCuota = e instanceof RenasiaCuotaExcedidaError;
      const mensajeError = mensajeDeError(
        e,
        'No pudimos obtener respuesta de RENASIA. Revisá tu conexión e intentá de nuevo.'
      );
      setMensajes(prev =>
        prev.map(m =>
          m.id === idAsistente
            ? { ...m, enProgreso: false, error: mensajeError, cuotaAgotada: esCuota }
            : m
        )
      );
    } finally {
      if (montadoRef.current) setEnviando(false);
      abortRef.current = null;
    }
  }, []);

  const enviarPregunta = useCallback(
    async (textoCrudo: string) => {
      const texto = textoCrudo.trim();
      if (!texto || enviando) return;

      const idPersona = idLocal('persona');
      const idAsistente = idLocal('asistente');
      const ahora = new Date().toISOString();

      setMensajes(prev => [
        ...prev,
        { id: idPersona, autor: 'persona', texto, lecciones: null, creadoEn: ahora },
        {
          id: idAsistente,
          autor: 'asistente',
          texto: '',
          lecciones: null,
          creadoEn: ahora,
          enProgreso: true,
          preguntaOriginal: texto,
        },
      ]);

      await ejecutarEnvio(idAsistente, texto);
    },
    [enviando, ejecutarEnvio]
  );

  const reintentarMensaje = useCallback(
    async (idMensajeAsistente: string) => {
      if (enviando) return;
      const mensaje = mensajesRef.current.find(m => m.id === idMensajeAsistente);
      if (!mensaje?.preguntaOriginal) return;

      setMensajes(prev =>
        prev.map(m =>
          m.id === idMensajeAsistente
            ? { ...m, texto: '', enProgreso: true, error: null, cuotaAgotada: false }
            : m
        )
      );

      await ejecutarEnvio(idMensajeAsistente, mensaje.preguntaOriginal);
    },
    [enviando, ejecutarEnvio]
  );

  return {
    mensajes,
    cargandoHistorial,
    errorHistorial,
    cargandoMasAntiguos,
    hayMasAntiguos,
    enviando,
    cargarHistorialInicial,
    cargarMasAntiguos,
    enviarPregunta,
    reintentarMensaje,
  };
}
