import { useCallback, useEffect, useRef, useState } from 'react';
import type * as ModuloDosVias from '@speechmatics/expo-two-way-audio';

import { getTokenSesion } from '../../../services/http/apiClient';
import { leerEventoEnVivo, urlDeVozEnVivo, type EventoEnVivo } from '../api/vozEnVivo';
import { LoteDeMicrofono, Parlante } from '../utils/audioEnVivo';
import type { ConversacionPorVoz, FaseDeVoz } from './useConversacionPorVoz';
import { usePropuestasDeVoz } from './usePropuestasDeVoz';

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

/** Cada cuánto se revisa si el orbe terminó de sonar. Solo mueve la fase: el audio no pasa por acá. */
const REVISION_MS = 100;

export type ConversacionEnVivo = ConversacionPorVoz & {
  /** Abre la conversación en vivo. `false` si no se pudo: el orbe usa entonces el flujo de siempre. */
  empezar: () => Promise<boolean>;
};

/**
 * Conversación por voz en tiempo real (D-162, Gemini Live a través del backend): se habla y el
 * acompañante contesta con voz mientras la genera, con el texto a la par. El micrófono queda
 * abierto con cancelación de eco hasta que se toca el orbe de nuevo.
 *
 * Protocolo: `docs/arquitectura/PROPUESTA_GEMINI_LIVE.md` §5.ter. El audio va en frames binarios
 * (PCM 16 bits, 16 kHz) y los eventos en JSON.
 *
 * > Corregido 2026-09-24 (E-238). La primera versión repartía el audio al parlante de a poco desde
 * > JavaScript y mandaba el micrófono siempre. Se oía entrecortado (43 `underrun` en el log) y el
 * > orbe se oía a sí mismo y se contestaba en loop. Ahora el audio va entero y enseguida al módulo
 * > nativo, y mientras el orbe habla se manda silencio (semidúplex, ver `Parlante`). La
 * > interrupción hablando queda para cuando haya cancelación de eco de verdad: hoy se corta tocando.
 */
export function useConversacionEnVivo(): ConversacionEnVivo {
  const [fase, setFase] = useState<FaseDeVoz>('reposo');
  const [loQueDijiste, setLoQueDijiste] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const propuestasDeVoz = usePropuestasDeVoz();
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const parlanteRef = useRef(new Parlante());
  const loteRef = useRef(new LoteDeMicrofono());
  const turnoNuevoRef = useRef(true);

  const cerrar = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ tipo: 'fin' }));
    socket?.close();
    parlanteRef.current.callar(Date.now());
    loteRef.current.descartar();
    try {
      DOS_VIAS?.toggleRecording(false);
      DOS_VIAS?.tearDown();
    } catch {
      // Cerrar el audio nunca puede dejar la pantalla rota.
    }
    setFase('reposo');
  }, []);

  /**
   * El micrófono, ya sin eco, va al backend en lotes de ~100 ms. Mientras el orbe habla (y un margen
   * después) va silencio en vez del micrófono, así no se oye a sí mismo (semidúplex, E-238).
   *
   * Es estable a propósito (`useCallback` sin dependencias, todo por refs): el módulo se vuelve a
   * suscribir cada vez que cambia la función, y con la transcripción llegando 25 veces por segundo
   * eso era una suscripción nueva por render.
   */
  const alMicrofono = useCallback((evento: { data: Uint8Array }) => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) {
      loteRef.current.descartar();
      return;
    }
    // Copia propia: el buffer del evento es del módulo nativo y se reusa.
    const pcm = parlanteRef.current.microfonoAbierto(Date.now())
      ? Uint8Array.from(evento.data)
      : new Uint8Array(evento.data.length);
    const lote = loteRef.current.agregar(pcm);
    if (lote) socket.send(lote);
  }, []);
  escucharAudio('onMicrophoneData', alMicrofono);

  /** Entero y enseguida al parlante nativo, que lo encola y lo toca de corrido (E-238). */
  const alAudio = useCallback((pcm: Uint8Array) => {
    DOS_VIAS?.playPCMData(pcm);
    parlanteRef.current.sonar(pcm.length, Date.now());
    setFase('hablando');
  }, []);

  // Cuando el orbe termina de sonar, vuelve a escuchar.
  useEffect(() => {
    const reloj = setInterval(() => {
      if (!parlanteRef.current.estaSonando(Date.now())) {
        setFase(actual => (actual === 'hablando' ? 'escuchando' : actual));
      }
    }, REVISION_MS);
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
            propuestasDeVoz.podarResueltas();
          }
          setLoQueDijiste(actual => actual + evento.texto);
          setFase(actual => (actual === 'hablando' ? actual : 'pensando'));
          return;
        case 'dicho':
          setRespuesta(actual => actual + evento.texto);
          return;
        case 'interrumpido':
          // Lo que ya se le entregó al módulo nativo no se puede sacar de su cola; con el micrófono
          // en silencio mientras habla, esto casi no llega. Solo se acomoda la fase.
          parlanteRef.current.callar(Date.now());
          setFase('escuchando');
          return;
        case 'turnoCompleto':
          turnoNuevoRef.current = true;
          return;
        case 'propuesta':
          propuestasDeVoz.agregar(evento);
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
    [cerrar, propuestasDeVoz]
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
          alAudio(new Uint8Array(mensaje.data as ArrayBuffer));
          return;
        }
        const evento = leerEventoEnVivo(mensaje.data);
        if (evento?.tipo === 'listo') {
          void DOS_VIAS.initialize().then(() => {
            parlanteRef.current = new Parlante();
            loteRef.current.descartar();
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
      socket.onclose = cierre => {
        // Solo en desarrollo: el código dice por qué se cerró (1000 normal, 1013 no disponible, 1011 error).
        if (__DEV__) console.log(`[voz en vivo] cerrado ${cierre.code} ${cierre.reason ?? ''}`);
        terminar(false);
        if (socketRef.current === socket) cerrar();
      };
    });
  }, [alAudio, alEvento, cerrar]);

  const tocar = useCallback(() => {
    if (socketRef.current) cerrar();
    else void empezar();
  }, [cerrar, empezar]);

  return {
    fase,
    disponible: DOS_VIAS !== null,
    loQueDijiste,
    respuesta,
    propuestas: propuestasDeVoz.propuestas,
    confirmarPropuesta: propuestasDeVoz.confirmar,
    cancelarPropuesta: propuestasDeVoz.cancelar,
    error,
    aviso: null,
    tocar,
    empezar,
  };
}
