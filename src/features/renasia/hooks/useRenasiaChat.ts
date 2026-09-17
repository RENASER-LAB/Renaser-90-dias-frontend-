import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import { obtenerHistorialRenasia } from '../api/renasiaApi';
import { enviarMensajeRenasia, RenasiaCuotaExcedidaError } from '../api/renasiaStream';
import { nombreVisible } from '../data/agentes';
import type { AgenteRenasia, MensajeRenasiaApi, RenasiaMensajeUI } from '../types/renasia.types';

let contadorIdLocal = 0;
/** Ids para mensajes que todavía no existen en el servidor (la pregunta optimista, la respuesta en curso). */
function idLocal(prefijo: string): string {
  contadorIdLocal += 1;
  return `${prefijo}-${Date.now()}-${contadorIdLocal}`;
}

/**
 * `m.sourceLessonIds` se descarta a propósito (2026-09-06, E-141): el historial lo sigue trayendo,
 * pero la pantalla ya no muestra las fuentes citadas. Ver `MensajeBurbuja`.
 */
function mapearMensajeApi(m: MensajeRenasiaApi): RenasiaMensajeUI {
  return {
    id: m.id,
    autor: m.role === 'USER' ? 'persona' : 'asistente',
    texto: m.content,
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
 * D-102: con quién se habla. `courseId` y `ambito` solo tienen sentido para `COURSE_TUTOR`
 * (Sparkie): el curso acota el contexto que el backend recupera, y `ambito` ("el curso X, lección
 * Y") va al prompt de sistema en un campo aparte (`scope`, D-100) — la pregunta se guarda tal cual
 * la escribió la persona. El primer intento (D-99) lo concatenaba al texto y el contexto terminaba
 * guardado como mensaje del aprendiz y visible al recargar.
 */
export type OpcionesRenasiaChat = {
  agent: AgenteRenasia;
  courseId?: string | null;
  ambito?: string | null;
};

/**
 * Estado real de un panel de asistente: historial paginado (`GET /api/v1/renasia/mensajes?agent=`)
 * más la conversación en vivo (`POST /api/v1/renasia/mensajes`, streaming). Mismo criterio que
 * `useWallFeed` en `community`: la pantalla no arma llamadas de red sueltas, las pide acá.
 *
 * Cada instancia del hook es de UN agente: el panel del acompañante carga y escribe el historial
 * del acompañante, el de Sparkie el de Sparkie. Nunca se mezclan (D-102).
 *
 * El historial llega del backend con la página más reciente primero — mismo criterio de
 * paginación por cursor que `GET /api/v1/wall` — así que acá se invierte cada página antes de
 * guardarla, para dibujar la conversación de más vieja arriba a más nueva abajo, como se lee un
 * chat.
 *
 * Publica con **UI optimista**, igual que `publicarOptimista` en `useWallFeed`: la pregunta de
 * la persona y una burbuja vacía del asistente aparecen en el instante en que se toca "enviar",
 * antes de que exista respuesta alguna del servidor. El precio, explícito: si el stream falla, la
 * burbuja del asistente se marca con el error en vez de desaparecer — la pregunta de la persona
 * NUNCA se saca de la lista, porque a diferencia de una publicación del Muro, perder de vista lo
 * que uno preguntó sería peor que ver una respuesta fallida.
 */
export function useRenasiaChat(opciones: OpcionesRenasiaChat): EstadoRenasiaChat {
  const { agent } = opciones;
  const courseId = opciones.courseId?.trim() || null;
  const ambito = opciones.ambito?.trim() || null;
  const nombre = nombreVisible(agent);

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
      const pagina = await obtenerHistorialRenasia(agent);
      if (!montadoRef.current) return;
      setMensajes([...pagina.messages].reverse().map(mapearMensajeApi));
      cursorRef.current = pagina.nextCursor;
      setHayMasAntiguos(pagina.hasMore);
    } catch (e) {
      if (!montadoRef.current) return;
      setErrorHistorial(mensajeDeError(e, `No pudimos cargar tu conversación con ${nombre}.`));
    } finally {
      if (montadoRef.current) setCargandoHistorial(false);
    }
  }, [agent, nombre]);

  const cargarMasAntiguos = useCallback(async () => {
    if (!cursorRef.current || cargandoMasAntiguos) return;
    setCargandoMasAntiguos(true);
    try {
      const pagina = await obtenerHistorialRenasia(agent, cursorRef.current);
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
  }, [agent, cargandoMasAntiguos]);

  /** El motor común de "mandar una pregunta y volcar el stream sobre un mensaje ya en la lista". */
  const ejecutarEnvio = useCallback(
    async (idAsistente: string, textoPregunta: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setEnviando(true);

      try {
        await enviarMensajeRenasia(
          textoPregunta,
          { agent, courseId, scope: ambito },
          {
            onTexto: fragmento => {
              if (!montadoRef.current) return;
              setMensajes(prev =>
                prev.map(m => (m.id === idAsistente ? { ...m, texto: m.texto + fragmento } : m))
              );
            },
            onFin: () => {
              if (!montadoRef.current) return;
              setMensajes(prev =>
                prev.map(m => (m.id === idAsistente ? { ...m, enProgreso: false } : m))
              );
            },
            onError: mensaje => {
              // D-100: el modelo fallo del lado del servidor. Se muestra en la burbuja, con
              // reintento, igual que un error de red — antes quedaba una burbuja vacia y muda.
              if (!montadoRef.current) return;
              setMensajes(prev =>
                prev.map(m => (m.id === idAsistente ? { ...m, enProgreso: false, error: mensaje } : m))
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
          `No pudimos obtener respuesta de ${nombre}. Revisa tu conexión e inténtalo de nuevo.`
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
    },
    [agent, courseId, ambito, nombre]
  );

  const enviarPregunta = useCallback(
    async (textoCrudo: string) => {
      const texto = textoCrudo.trim();
      if (!texto || enviando) return;

      const idPersona = idLocal('persona');
      const idAsistente = idLocal('asistente');
      const ahora = new Date().toISOString();

      setMensajes(prev => [
        ...prev,
        { id: idPersona, autor: 'persona', texto, creadoEn: ahora },
        {
          id: idAsistente,
          autor: 'asistente',
          texto: '',
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
