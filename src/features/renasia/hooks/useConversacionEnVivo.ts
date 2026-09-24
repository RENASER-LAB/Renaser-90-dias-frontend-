import { useCallback, useEffect, useRef, useState } from 'react';
import type * as ModuloDosVias from '@speechmatics/expo-two-way-audio';

import { getTokenSesion } from '../../../services/http/apiClient';
import { leerEventoEnVivo, urlDeVozEnVivo, type EventoEnVivo } from '../api/vozEnVivo';
import { Dosificador } from '../utils/dosificador';
import type { ConversacionPorVoz, FaseDeVoz } from './useConversacionPorVoz';

/**
 * El módulo nativo se carga opcional, como la voz en `useDictado`: un binario anterior no lo
 * trae, y la app no se actualiza por aire. Sin él, el orbe usa el flujo de siempre.
 */
function cargarDosVias(): typeof ModuloDosVias | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@speechmatics/expo-two-way-audio') as typeof ModuloDosVias;
  } catch {
    return null;
  }
}

const DOS_VIAS = cargarDosVias();
const escucharAudio: typeof ModuloDosVias.useExpoTwoWayAudioEventListener =
  DOS_VIAS?.useExpoTwoWayAudioEventListener ?? (() => undefined);

/** Cada cuánto se le entrega audio al reproductor (ver `Dosificador`). */
const TICK_MS = 40;

export type ConversacionEnVivo = ConversacionPorVoz & {
  /** Abre la conversación en vivo. `false` si no se pudo: el orbe usa entonces el flujo de siempre. */
  empezar: () => Promise<boolean>;
};

/**
 * Conversación por voz en tiempo real (D-162, Gemini Live a través del backend): se habla y el
 * acompañante contesta con voz mientras la genera, con el texto a la par. Se lo puede interrumpir
 * hablando. El micrófono queda abierto con cancelación de eco hasta que se toca el orbe de nuevo.
 *
 * Protocolo: `docs/arquitectura/PROPUESTA_GEMINI_LIVE.md` §5.ter. El audio va en frames binarios
 * (PCM 16 bits, 16 kHz) y los eventos en JSON.
 */
export function useConversacionEnVivo(): ConversacionEnVivo {
  const [fase, setFase] = useState<FaseDeVoz>('reposo');
  const [loQueDijiste, setLoQueDijiste] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [propuestas, setPropuestas] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const dosificadorRef = useRef(new Dosificador());
  const turnoNuevoRef = useRef(true);

  const cerrar = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ tipo: 'fin' }));
    socket?.close();
    dosificadorRef.current.vaciar(Date.now());
    try {
      DOS_VIAS?.toggleRecording(false);
      DOS_VIAS?.tearDown();
    } catch {
      // Cerrar el audio nunca puede dejar la pantalla rota.
    }
    setFase('reposo');
  }, []);

  // El micrófono, ya sin eco, va directo al backend.
  escucharAudio('onMicrophoneData', evento => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return;
    // Copia propia: el buffer del evento es del módulo nativo y se reusa.
    socket.send(Uint8Array.from(evento.data));
  });

  // Entrega el audio de a poco y marca cuándo terminó de hablar.
  useEffect(() => {
    const reloj = setInterval(() => {
      const ahora = Date.now();
      dosificadorRef.current.entregar(ahora).forEach(pedazo => DOS_VIAS?.playPCMData(pedazo));
      if (!dosificadorRef.current.estaSonando(ahora)) {
        setFase(actual => (actual === 'hablando' ? 'escuchando' : actual));
      }
    }, TICK_MS);
    return () => clearInterval(reloj);
  }, []);

  useEffect(() => cerrar, [cerrar]);

  const alEvento = useCallback(
    (evento: EventoEnVivo) => {
      switch (evento.tipo) {
        case 'oido':
          if (turnoNuevoRef.current) {
            turnoNuevoRef.current = false;
            setLoQueDijiste('');
            setRespuesta('');
            setPropuestas(0);
          }
          setLoQueDijiste(actual => actual + evento.texto);
          setFase(actual => (actual === 'hablando' ? actual : 'pensando'));
          return;
        case 'dicho':
          setRespuesta(actual => actual + evento.texto);
          return;
        case 'interrumpido':
          dosificadorRef.current.vaciar(Date.now());
          setFase('escuchando');
          return;
        case 'turnoCompleto':
          turnoNuevoRef.current = true;
          return;
        case 'propuesta':
          setPropuestas(actual => actual + 1);
          return;
        case 'cuotaAgotada':
          setError('Por hoy ya usaste tu tiempo de voz en vivo. Sigo contigo por el modo de siempre.');
          cerrar();
          return;
        case 'error':
          setError(evento.valor);
          cerrar();
          return;
        case 'listo':
          return;
      }
    },
    [cerrar]
  );

  const empezar = useCallback(async (): Promise<boolean> => {
    if (!DOS_VIAS) return false;
    setError(null);
    const permiso = await DOS_VIAS.requestMicrophonePermissionsAsync();
    if (!permiso.granted) return false;
    setFase('pensando');
    const token = getTokenSesion();
    return new Promise<boolean>(resolver => {
      let resuelto = false;
      const terminar = (ok: boolean) => {
        if (!resuelto) {
          resuelto = true;
          resolver(ok);
        }
      };
      // React Native acepta headers en el handshake; así viaja la misma sesión que en el resto de la API.
      const opciones = { headers: token ? { 'X-Auth-Token': token } : {} };
      const socket = new (WebSocket as unknown as new (url: string, p: undefined, o: typeof opciones) => WebSocket)(
        urlDeVozEnVivo(),
        undefined,
        opciones
      );
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;
      socket.onmessage = mensaje => {
        if (typeof mensaje.data !== 'string') {
          dosificadorRef.current.agregar(new Uint8Array(mensaje.data as ArrayBuffer));
          setFase('hablando');
          return;
        }
        const evento = leerEventoEnVivo(mensaje.data);
        if (evento?.tipo === 'listo') {
          void DOS_VIAS.initialize().then(() => {
            DOS_VIAS.toggleRecording(true);
            turnoNuevoRef.current = true;
            setFase('escuchando');
            terminar(true);
          });
        } else if (evento) {
          alEvento(evento);
        }
      };
      socket.onerror = () => {
        terminar(false);
        if (socketRef.current === socket) cerrar();
      };
      socket.onclose = () => {
        terminar(false);
        if (socketRef.current === socket) cerrar();
      };
    });
  }, [alEvento, cerrar]);

  const tocar = useCallback(() => {
    if (socketRef.current) cerrar();
    else void empezar();
  }, [cerrar, empezar]);

  return { fase, disponible: DOS_VIAS !== null, loQueDijiste, respuesta, propuestas, error, tocar, empezar };
}
