import { useCallback, useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import { mensajeDeErrorDeVoz } from '../utils/dictado';

/**
 * Español latinoamericano. `es-PE` no está garantizado en todos los motores del sistema; `es-419`
 * sí en el de Google y el de Apple, y reconoce igual el habla peruana.
 */
const IDIOMA = 'es-419';

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
      return ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      return false;
    }
  });
  const alTerminarRef = useRef(alTerminar);
  alTerminarRef.current = alTerminar;

  useSpeechRecognitionEvent('start', () => setEscuchando(true));
  useSpeechRecognitionEvent('end', () => {
    setEscuchando(false);
    setParcial('');
  });
  useSpeechRecognitionEvent('result', evento => {
    const transcripcion = evento.results[0]?.transcript ?? '';
    if (evento.isFinal) {
      setParcial('');
      alTerminarRef.current(transcripcion);
    } else {
      setParcial(transcripcion);
    }
  });
  useSpeechRecognitionEvent('error', evento => {
    setEscuchando(false);
    setParcial('');
    setError(mensajeDeErrorDeVoz(evento.error));
  });

  // Si se cierra el chat con el micrófono abierto, se corta: no queda escuchando en segundo plano.
  useEffect(() => () => ExpoSpeechRecognitionModule.abort(), []);

  const empezar = useCallback(async () => {
    setError(null);
    const permiso = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permiso.granted) {
      setError(mensajeDeErrorDeVoz('not-allowed'));
      return;
    }
    ExpoSpeechRecognitionModule.start({
      lang: IDIOMA,
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      addsPunctuation: true,
      contextualStrings: [...frasesDeContexto],
    });
  }, [frasesDeContexto]);

  const detener = useCallback(() => ExpoSpeechRecognitionModule.stop(), []);

  return { escuchando, parcial, error, disponible, empezar, detener };
}
