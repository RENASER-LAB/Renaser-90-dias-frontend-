import { useCallback, useEffect, useRef, useState } from 'react';
import type * as ModuloDeVoz from 'expo-speech-recognition';

import { mensajeDeErrorDeVoz } from '../utils/dictado';

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

  escucharEvento('start', () => setEscuchando(true));
  escucharEvento('end', () => {
    setEscuchando(false);
    setParcial('');
  });
  escucharEvento('result', evento => {
    const transcripcion = evento.results[0]?.transcript ?? '';
    if (evento.isFinal) {
      setParcial('');
      alTerminarRef.current(transcripcion);
    } else {
      setParcial(transcripcion);
    }
  });
  escucharEvento('error', evento => {
    setEscuchando(false);
    setParcial('');
    setError(mensajeDeErrorDeVoz(evento.error));
  });

  // Si se cierra el chat con el micrófono abierto, se corta: no queda escuchando en segundo plano.
  useEffect(() => () => modulo?.abort(), []);

  const empezar = useCallback(async () => {
    setError(null);
    if (!modulo) return;
    const permiso = await modulo.requestPermissionsAsync();
    if (!permiso.granted) {
      setError(mensajeDeErrorDeVoz('not-allowed'));
      return;
    }
    modulo.start({
      lang: IDIOMA,
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      addsPunctuation: true,
      contextualStrings: [...frasesDeContexto],
    });
  }, [frasesDeContexto]);

  const detener = useCallback(() => modulo?.stop(), []);

  return { escuchando, parcial, error, disponible, empezar, detener };
}
