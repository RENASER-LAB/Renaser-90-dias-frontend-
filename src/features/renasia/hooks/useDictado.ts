import { useCallback, useEffect, useRef, useState } from 'react';
import type * as ModuloDeVoz from 'expo-speech-recognition';

import { Platform } from 'react-native';

import { ESPERA_SIN_HABLA_MS, mensajeDeErrorDeVoz, SILENCIO_PARA_TERMINAR_MS, sumarTramo } from '../utils/dictado';

/**
 * Español latinoamericano. `es-PE` no está garantizado en todos los motores del sistema; `es-419`
 * sí en el de Google y el de Apple, y reconoce igual el habla peruana.
 */
const IDIOMA = 'es-419';

/**
 * El módulo nativo se carga con `require` dentro de un try, NO con un `import` arriba: el paquete
 * llama a `requireNativeModule` al importarse y, si el binario instalado no lo trae compilado
 * (una build anterior a la voz, o una recarga en caliente sobre el binario viejo), revienta al
 * abrir el chat con "Cannot find native module 'ExpoSpeechRecognition'" (visto el 2026-09-23).
 * Sin el módulo, el chat funciona igual y simplemente no muestra el micrófono.
 */
function cargarModuloDeVoz(): typeof ModuloDeVoz | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-speech-recognition') as typeof ModuloDeVoz;
  } catch {
    return null;
  }
}

const VOZ = cargarModuloDeVoz();

/**
 * Modo continuo donde el motor lo soporta: iOS, y Android 13 (API 33) en adelante. En Android 12
 * o anterior el reconocedor no lo admite y se queda como antes (corta solo en la pausa); el
 * texto igual se entrega completo al cerrarse el micrófono.
 */
const CONTINUO =
  Platform.OS === 'ios' || (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 33);
const modulo = VOZ?.ExpoSpeechRecognitionModule ?? null;
/** Sin módulo, un hook que no escucha nada: los hooks se llaman siempre, en el mismo orden. */
const escucharEvento: typeof ModuloDeVoz.useSpeechRecognitionEvent =
  VOZ?.useSpeechRecognitionEvent ?? (() => undefined);

export type EstadoDictado = {
  /** El micrófono está abierto. */
  escuchando: boolean;
  /** Lo que se va entendiendo mientras la persona habla (se muestra, no se envía). */
  parcial: string;
  /** Texto apto para mostrar si algo falló; `null` si no hay nada que decir. */
  error: string | null;
  /** El teléfono tiene reconocimiento de voz. Si es `false`, no se muestra el botón. */
  disponible: boolean;
  empezar: () => Promise<void>;
  detener: () => void;
};

/**
 * Dictado por voz para el chat del acompañante (plan de IA v2.1 §3.5): push-to-talk, el texto
 * reconocido se SUMA al campo de escritura y la persona lo revisa antes de enviar. Nunca envía solo.
 * El orbe de Hoy lo usa de respaldo de la voz en vivo, y ahí sí se manda al terminar.
 *
 * > Corregido 2026-09-26. Entregaba el PRIMER resultado final del reconocedor, que en Android
 * > llega en la primera pausa corta: a quien habla largo, el orbe le mandaba media frase. Ahora el
 * > reconocedor corre en modo continuo, los tramos se suman, y `alTerminar` recibe todo lo dicho
 * > cuando el micrófono se cierra: tras 1,5 s sin habla nueva o al tocar para detener.
 *
 * `frasesDeContexto` son los nombres de sus hábitos de hoy: sesgan al reconocedor para que "agua"
 * no salga "awa". Es lo que la medición del router (2026-09-23) mostró que hacía falta: el error
 * de voz hay que evitarlo al transcribir, porque después ya es tarde.
 *
 * El audio no se guarda ni se sube por esta vía: el reconocedor del sistema devuelve solo texto.
 */
export function useDictado(frasesDeContexto: readonly string[], alTerminar: (texto: string) => void): EstadoDictado {
  const [escuchando, setEscuchando] = useState(false);
  const [parcial, setParcial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [disponible] = useState(() => {
    try {
      return modulo?.isRecognitionAvailable() ?? false;
    } catch {
      return false;
    }
  });
  const alTerminarRef = useRef(alTerminar);
  alTerminarRef.current = alTerminar;

  /** Lo ya dicho y cerrado (tramos finales), y el tramo que todavía se está reconociendo. */
  const acumuladoRef = useRef('');
  const tramoRef = useRef('');
  /** Lo dicho se entrega UNA vez por sesión de micrófono, cuando se cierra. */
  const entregadoRef = useRef(true);
  const relojRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limpiarReloj = useCallback(() => {
    if (relojRef.current) clearTimeout(relojRef.current);
    relojRef.current = null;
  }, []);

  /** Cierra el micrófono si en `ms` no llega nada nuevo. Cada resultado lo vuelve a armar. */
  const cerrarSiNadaEn = useCallback(
    (ms: number) => {
      limpiarReloj();
      relojRef.current = setTimeout(() => modulo?.stop(), ms);
    },
    [limpiarReloj]
  );

  const entregar = useCallback(() => {
    limpiarReloj();
    if (entregadoRef.current) return;
    entregadoRef.current = true;
    const texto = sumarTramo(acumuladoRef.current, tramoRef.current);
    acumuladoRef.current = '';
    tramoRef.current = '';
    if (texto) alTerminarRef.current(texto);
  }, [limpiarReloj]);

  escucharEvento('start', () => setEscuchando(true));
  escucharEvento('end', () => {
    // El micrófono se cerró (pausa de 1,5 s, toque para detener o el propio reconocedor): recién
    // ahí se entrega TODO lo dicho, no el primer tramo.
    entregar();
    setEscuchando(false);
    setParcial('');
  });
  escucharEvento('result', evento => {
    const transcripcion = evento.results[0]?.transcript ?? '';
    if (evento.isFinal) {
      acumuladoRef.current = sumarTramo(acumuladoRef.current, transcripcion);
      tramoRef.current = '';
    } else {
      tramoRef.current = transcripcion;
    }
    setParcial(sumarTramo(acumuladoRef.current, tramoRef.current));
    cerrarSiNadaEn(SILENCIO_PARA_TERMINAR_MS);
  });
  escucharEvento('error', evento => {
    setEscuchando(false);
    setParcial('');
    setError(mensajeDeErrorDeVoz(evento.error));
    // Lo que alcanzó a decir antes del error no se tira.
    entregar();
  });

  // Si se cierra el chat con el micrófono abierto, se corta: no queda escuchando en segundo plano,
  // ni se entrega nada a una pantalla que ya no está.
  useEffect(
    () => () => {
      entregadoRef.current = true;
      limpiarReloj();
      modulo?.abort();
    },
    [limpiarReloj]
  );

  const empezar = useCallback(async () => {
    setError(null);
    if (!modulo) return;
    const permiso = await modulo.requestPermissionsAsync();
    if (!permiso.granted) {
      setError(mensajeDeErrorDeVoz('not-allowed'));
      return;
    }
    acumuladoRef.current = '';
    tramoRef.current = '';
    entregadoRef.current = false;
    modulo.start({
      lang: IDIOMA,
      interimResults: true,
      // Continuo: el reconocedor no corta en la primera pausa; el cierre lo decide este hook
      // (1,5 s sin habla nueva, o el toque para detener). Ver `SILENCIO_PARA_TERMINAR_MS`.
      continuous: CONTINUO,
      maxAlternatives: 1,
      addsPunctuation: true,
      contextualStrings: [...frasesDeContexto],
      // Android: que el propio reconocedor tampoco dé por terminado antes de esa misma pausa.
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: SILENCIO_PARA_TERMINAR_MS,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: SILENCIO_PARA_TERMINAR_MS,
      },
    });
    cerrarSiNadaEn(ESPERA_SIN_HABLA_MS);
  }, [frasesDeContexto, cerrarSiNadaEn]);

  const detener = useCallback(() => modulo?.stop(), []);

  return { escuchando, parcial, error, disponible, empezar, detener };
}
