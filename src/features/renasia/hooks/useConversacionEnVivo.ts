import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type * as ModuloDosVias from '@speechmatics/expo-two-way-audio';

import { getTokenSesion } from '../../../services/http/apiClient';
import { leerEventoEnVivo, urlDeVozEnVivo, type EventoEnVivo } from '../api/vozEnVivo';
import { avisarNivelDelMicrofono } from '../events/nivelDelMicrofono';
import {
  accionDelToque,
  cerrarPorInactividad,
  LoteDeMicrofono,
  MicrofonoPrevio,
  Parlante,
  TarjetasDelTurno,
} from '../utils/audioEnVivo';
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

/**
 * Vaciar lo que el parlante nativo tiene encolado (E-458). Lo agrega el parche de
 * `scripts/arreglar-two-way-audio.js`; un binario sin el parche no lo tiene, y entonces callar solo
 * deja de entregarle audio nuevo: lo ya entregado termina de sonar.
 */
function cargarVaciado(): (() => void) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core') as typeof import('expo-modules-core');
    const nativo = requireOptionalNativeModule<{ clearPlayback?: () => void }>('ExpoTwoWayAudio');
    return typeof nativo?.clearPlayback === 'function' ? () => nativo.clearPlayback?.() : null;
  } catch {
    return null;
  }
}

const DOS_VIAS = cargarDosVias();
const VACIAR_PARLANTE = cargarVaciado();
const escucharAudio: typeof ModuloDosVias.useExpoTwoWayAudioEventListener =
  DOS_VIAS?.useExpoTwoWayAudioEventListener ?? (() => undefined);

/** Cada cuánto se revisa si el orbe terminó de sonar. Solo mueve la fase: el audio no pasa por acá. */
const REVISION_MS = 100;
/**
 * La transcripción se junta y se muestra de a tandas (E-458): llegan decenas de pedazos por
 * respuesta, y cada uno volvía a dibujar Hoy entera mientras el hilo de JavaScript tenía que
 * entregarle el audio al parlante.
 */
const TEXTO_CADA_MS = 150;
/** Volumen del micrófono (0 a 1, del módulo nativo) desde el que se considera que alguien habla. */
const VOLUMEN_DE_VOZ = 0.25;
/** «Pensando» sin que llegue nada este tiempo: vuelve a escuchar (se tocó «ya terminé» sin hablar). */
const PENSANDO_MAX_MS = 10_000;

type Tarjeta = Extract<EventoEnVivo, { tipo: 'propuesta' | 'evidencia' }>;

export type ConversacionEnVivo = ConversacionPorVoz & {
  /** Abre la conversación en vivo. `false` si no se pudo: el orbe usa entonces el flujo de siempre. */
  empezar: () => Promise<boolean>;
  /** Cierra la conversación (mantener presionado el orbe, abrir la cámara). */
  terminar: () => void;
};

/**
 * Conversación por voz en tiempo real (D-162, Gemini Live a través del backend): se habla y el
 * acompañante contesta con voz mientras la genera, con el texto a la par.
 *
 * Protocolo: `docs/arquitectura/PROPUESTA_GEMINI_LIVE.md` §5.ter. El audio va en frames binarios
 * (PCM 16 bits, 16 kHz) y los eventos en JSON.
 *
 * > Corregido 2026-09-24 (E-238). La primera versión repartía el audio al parlante de a poco desde
 * > JavaScript y mandaba el micrófono siempre. Se oía entrecortado (43 `underrun` en el log) y el
 * > orbe se oía a sí mismo y se contestaba en loop. Ahora el audio va entero y enseguida al módulo
 * > nativo, y mientras el orbe habla se manda silencio (semidúplex, ver `Parlante`).
 *
 * > Corregido 2026-09-30 (E-458). Tocar el orbe cerraba la conversación, y el rótulo decía «toca de
 * > nuevo para terminar»: se abría una sesión nueva por pregunta (2 a 4 s de conexión cada vez, y el
 * > modelo sin lo hablado antes). Ahora queda UNA conversación abierta: tocar es «ya terminé» o
 * > «cállate» (`accionDelToque`), y se cierra manteniendo presionado, saliendo de la app o tras 45 s
 * > sin que nadie hable. El micrófono se prende al tocar, no al quedar lista la sesión: lo que se
 * > dice mientras conecta se guarda y se manda al abrir. Las tarjetas (propuesta, foto) esperan a que
 * > el orbe termine de hablar.
 */
export function useConversacionEnVivo(): ConversacionEnVivo {
  const [fase, setFaseEstado] = useState<FaseDeVoz>('reposo');
  const faseRef = useRef<FaseDeVoz>('reposo');
  const [loQueDijiste, setLoQueDijiste] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const propuestasDeVoz = usePropuestasDeVoz();
  const propuestasRef = useRef(propuestasDeVoz);
  propuestasRef.current = propuestasDeVoz;
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const abriendoRef = useRef(false);
  /** El backend mandó `listo`: el micrófono ya va directo al socket. */
  const listoRef = useRef(false);
  const parlanteRef = useRef(new Parlante());
  const loteRef = useRef(new LoteDeMicrofono());
  const previoRef = useRef(new MicrofonoPrevio());
  /** Se tocó «ya terminé» antes de `listo`: se avisa después de mandar lo guardado. */
  const finPendienteRef = useRef(false);
  const turnoNuevoRef = useRef(true);
  /** Hay una respuesta en curso: llegó su audio y todavía no su `turnoCompleto`. */
  const turnoAbiertoRef = useRef(false);
  /** Se lo calló tocando: lo que queda de esta respuesta no se reproduce. */
  const descartandoRef = useRef(false);
  const actividadRef = useRef(0);
  const tarjetasRef = useRef(new TarjetasDelTurno<Tarjeta>());
  const textoRef = useRef<{ oido: string; dicho: string; reloj: ReturnType<typeof setTimeout> | null }>({
    oido: '',
    dicho: '',
    reloj: null,
  });

  /** Solo avisa a React si la fase cambia: el audio llega de a pedazos y cada uno la pedía. */
  const setFase = useCallback((nueva: FaseDeVoz) => {
    if (faseRef.current === nueva) return;
    faseRef.current = nueva;
    setFaseEstado(nueva);
  }, []);

  const volcarTexto = useCallback(() => {
    const texto = textoRef.current;
    if (texto.reloj) clearTimeout(texto.reloj);
    const { oido, dicho } = texto;
    textoRef.current = { oido: '', dicho: '', reloj: null };
    if (oido) setLoQueDijiste(actual => actual + oido);
    if (dicho) setRespuesta(actual => actual + dicho);
  }, []);

  const sumarTexto = useCallback(
    (campo: 'oido' | 'dicho', texto: string) => {
      const pendiente = textoRef.current;
      pendiente[campo] += texto;
      if (!pendiente.reloj) pendiente.reloj = setTimeout(volcarTexto, TEXTO_CADA_MS);
    },
    [volcarTexto]
  );

  const mostrarTarjetas = useCallback((tarjetas: Tarjeta[]) => {
    for (const tarjeta of tarjetas) {
      if (tarjeta.tipo === 'propuesta') propuestasRef.current.agregar(tarjeta);
      else propuestasRef.current.agregarPedidoDeFoto(tarjeta);
    }
  }, []);

  const cerrar = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    listoRef.current = false;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ tipo: 'fin' }));
    socket?.close();
    parlanteRef.current.callar(Date.now());
    loteRef.current.descartar();
    previoRef.current.vaciar();
    finPendienteRef.current = false;
    turnoAbiertoRef.current = false;
    descartandoRef.current = false;
    volcarTexto();
    // Una propuesta nunca se pierde por cerrar: lo que esperaba a que el orbe callara aparece ya.
    mostrarTarjetas(tarjetasRef.current.todas());
    try {
      VACIAR_PARLANTE?.();
      DOS_VIAS?.toggleRecording(false);
      DOS_VIAS?.tearDown();
    } catch {
      // Cerrar el audio nunca puede dejar la pantalla rota.
    }
    setFase('reposo');
  }, [mostrarTarjetas, setFase, volcarTexto]);

  /**
   * El micrófono, ya sin eco, va al backend en lotes de ~100 ms; antes de `listo` se guarda
   * (E-458). Mientras el orbe habla (y un margen después) va silencio en vez del micrófono, así no
   * se oye a sí mismo (semidúplex, E-238).
   *
   * Es estable a propósito (`useCallback` sin dependencias, todo por refs): el módulo se vuelve a
   * suscribir cada vez que cambia la función.
   */
  const alMicrofono = useCallback((evento: { data: Uint8Array }) => {
    const socket = socketRef.current;
    if (!socket) {
      loteRef.current.descartar();
      return;
    }
    // Copia propia: el buffer del evento es del módulo nativo y se reusa.
    const pcm = parlanteRef.current.microfonoAbierto(Date.now())
      ? Uint8Array.from(evento.data)
      : new Uint8Array(evento.data.length);
    const lote = loteRef.current.agregar(pcm);
    if (!lote) return;
    if (listoRef.current && socket.readyState === WebSocket.OPEN) socket.send(lote);
    else previoRef.current.guardar(lote);
  }, []);
  escucharAudio('onMicrophoneData', alMicrofono);

  /** Alguien hablando cerca del teléfono cuenta como actividad, aunque todavía no haya transcripción. */
  const alVolumen = useCallback((evento: { data: number }) => {
    if (!parlanteRef.current.microfonoAbierto(Date.now())) return;
    avisarNivelDelMicrofono(evento.data);
    if (evento.data >= VOLUMEN_DE_VOZ) actividadRef.current = Date.now();
  }, []);
  escucharAudio('onInputVolumeLevelData', alVolumen);

  /** Entero y enseguida al parlante nativo, que lo encola y lo toca de corrido (E-238). */
  const alAudio = useCallback(
    (pcm: Uint8Array) => {
      actividadRef.current = Date.now();
      if (descartandoRef.current) return;
      if (!turnoAbiertoRef.current) {
        turnoAbiertoRef.current = true;
        tarjetasRef.current.empezarTurno();
      }
      DOS_VIAS?.playPCMData(pcm);
      parlanteRef.current.sonar(pcm.length, Date.now());
      setFase('hablando');
    },
    [setFase]
  );

  // Cuando el orbe termina de sonar: vuelve a escuchar, muestra las tarjetas que esperaban y, si
  // nadie habla hace rato, cierra.
  useEffect(() => {
    const reloj = setInterval(() => {
      const ahora = Date.now();
      const sonando = parlanteRef.current.estaSonando(ahora);
      // El audio llega mucho antes de sonar: mientras suena, cuenta como actividad.
      if (sonando) actividadRef.current = ahora;
      const actual = faseRef.current;
      if (actual === 'hablando' && !sonando) setFase('escuchando');
      if (actual === 'pensando' && ahora - actividadRef.current >= PENSANDO_MAX_MS) setFase('escuchando');
      mostrarTarjetas(tarjetasRef.current.listas(sonando, ahora));
      if (listoRef.current && actual === 'escuchando' && cerrarPorInactividad(actividadRef.current, ahora)) {
        cerrar();
      }
    }, REVISION_MS);
    return () => clearInterval(reloj);
  }, [cerrar, mostrarTarjetas, setFase]);

  // En segundo plano el audio nativo se pausa: la conversación no puede quedar abierta cobrando minutos.
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado === 'background' && socketRef.current) cerrar();
    });
    return () => suscripcion.remove();
  }, [cerrar]);

  useEffect(() => cerrar, [cerrar]);

  const alEvento = useCallback(
    (evento: EventoEnVivo) => {
      switch (evento.tipo) {
        case 'oido':
          actividadRef.current = Date.now();
          if (turnoNuevoRef.current) {
            turnoNuevoRef.current = false;
            textoRef.current.oido = '';
            textoRef.current.dicho = '';
            setLoQueDijiste('');
            setRespuesta('');
            propuestasRef.current.podarResueltas();
            tarjetasRef.current.empezarTurno();
          }
          descartandoRef.current = false;
          sumarTexto('oido', evento.texto);
          if (faseRef.current !== 'hablando') setFase('pensando');
          return;
        case 'dicho':
          actividadRef.current = Date.now();
          if (!descartandoRef.current) sumarTexto('dicho', evento.texto);
          return;
        case 'interrumpido':
          // La persona habló encima: lo encolado en el parlante se vacía (si el binario lo permite).
          VACIAR_PARLANTE?.();
          parlanteRef.current.callar(Date.now());
          descartandoRef.current = false;
          setFase('escuchando');
          return;
        case 'turnoCompleto':
          turnoNuevoRef.current = true;
          turnoAbiertoRef.current = false;
          descartandoRef.current = false;
          tarjetasRef.current.terminarTurno();
          volcarTexto();
          return;
        case 'propuesta':
        case 'evidencia':
          tarjetasRef.current.guardar(evento, Date.now());
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
    [cerrar, setFase, sumarTexto, volcarTexto]
  );

  /** Lo dicho mientras se abría, y el «ya terminé» si se tocó antes de `listo`. */
  const enviarLoGuardado = useCallback((socket: WebSocket) => {
    for (const lote of previoRef.current.vaciar()) socket.send(lote);
    if (finPendienteRef.current) {
      finPendienteRef.current = false;
      const resto = loteRef.current.vaciar();
      if (resto) socket.send(resto);
      socket.send(JSON.stringify({ tipo: 'finDeHabla' }));
    }
  }, []);

  const empezar = useCallback(async (): Promise<boolean> => {
    if (!DOS_VIAS || socketRef.current || abriendoRef.current) return false;
    abriendoRef.current = true;
    setError(null);
    const permiso = await DOS_VIAS.requestMicrophonePermissionsAsync().finally(() => {
      abriendoRef.current = false;
    });
    if (!permiso.granted || socketRef.current) return false;
    parlanteRef.current = new Parlante();
    loteRef.current.descartar();
    previoRef.current.vaciar();
    tarjetasRef.current = new TarjetasDelTurno<Tarjeta>();
    finPendienteRef.current = false;
    turnoNuevoRef.current = true;
    turnoAbiertoRef.current = false;
    descartandoRef.current = false;
    actividadRef.current = Date.now();
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
      // E-458: el micrófono se prende ya, mientras la sesión se abre; lo dicho se guarda hasta `listo`.
      const microfono = DOS_VIAS.initialize().then(() => {
        if (socketRef.current === socket) DOS_VIAS.toggleRecording(true);
        // Se cerró mientras el audio arrancaba (el backend rechazó enseguida): no queda prendido.
        else if (socketRef.current === null) DOS_VIAS.tearDown();
      });
      setFase('escuchando');
      socket.onmessage = mensaje => {
        if (typeof mensaje.data !== 'string') {
          alAudio(new Uint8Array(mensaje.data as ArrayBuffer));
          return;
        }
        const evento = leerEventoEnVivo(mensaje.data);
        if (evento?.tipo === 'listo') {
          void microfono.then(() => {
            if (socketRef.current !== socket) return;
            listoRef.current = true;
            actividadRef.current = Date.now();
            enviarLoGuardado(socket);
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
  }, [alAudio, alEvento, cerrar, enviarLoGuardado, setFase]);

  /** «Ya terminé»: el modelo contesta sin esperar el silencio de la detección de voz. */
  const terminoDeHablar = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    descartandoRef.current = false;
    if (listoRef.current && socket.readyState === WebSocket.OPEN) {
      // Lo que quedó a medio lote son las últimas sílabas: van antes del aviso.
      const resto = loteRef.current.vaciar();
      if (resto) socket.send(resto);
      socket.send(JSON.stringify({ tipo: 'finDeHabla' }));
    } else {
      finPendienteRef.current = true;
    }
    setFase('pensando');
  }, [setFase]);

  /** Calla al orbe y sigue escuchando. Sin el vaciado nativo, lo ya entregado termina de sonar. */
  const callar = useCallback(() => {
    descartandoRef.current = turnoAbiertoRef.current;
    volcarTexto();
    if (!VACIAR_PARLANTE) return;
    VACIAR_PARLANTE();
    parlanteRef.current.callar(Date.now());
    setFase('escuchando');
  }, [setFase, volcarTexto]);

  const tocar = useCallback(() => {
    actividadRef.current = Date.now();
    switch (accionDelToque(faseRef.current)) {
      case 'empezar':
        void empezar();
        return;
      case 'finDeHabla':
        terminoDeHablar();
        return;
      case 'callar':
        callar();
        return;
      case 'nada':
        return;
    }
  }, [callar, empezar, terminoDeHablar]);

  return {
    fase,
    disponible: DOS_VIAS !== null,
    loQueDijiste,
    respuesta,
    propuestas: propuestasDeVoz.propuestas,
    confirmarPropuesta: propuestasDeVoz.confirmar,
    cancelarPropuesta: propuestasDeVoz.cancelar,
    pedidosDeFoto: propuestasDeVoz.pedidosDeFoto,
    cambiarPedidoDeFoto: propuestasDeVoz.cambiarPedidoDeFoto,
    error,
    aviso: null,
    tocar,
    empezar,
    terminar: cerrar,
  };
}
