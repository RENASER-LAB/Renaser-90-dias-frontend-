import type * as ModuloDeAudio from 'expo-audio';
import type * as ModuloDeHabla from 'expo-speech';

import { sintetizarVoz } from '../api/renasiaVoz';
import type { Parlantes } from '../utils/locutor';
import { elegirIdiomaDeVoz } from '../utils/voz';

/**
 * Los dos módulos nativos se cargan opcionales, como la voz en `useDictado`: si el binario
 * instalado no los trae, Hoy abre igual. Sin expo-audio queda la voz del teléfono; sin ninguno, la
 * respuesta se muestra escrita.
 */
function cargar<T>(cargador: () => T): T | null {
  try {
    return cargador();
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AUDIO = cargar(() => require('expo-audio') as typeof ModuloDeAudio);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HABLA = cargar(() => require('expo-speech') as typeof ModuloDeHabla);

/** `es-US` es la voz latinoamericana más común en Android; se cambia por la mejor instalada. */
let idioma: string | null = 'es-US';
HABLA?.getAvailableVoicesAsync()
  .then(voces => {
    if (voces.length > 0) idioma = elegirIdiomaDeVoz(voces.map(voz => voz.language));
  })
  .catch(() => undefined);

let reproductor: ModuloDeAudio.AudioPlayer | null = null;
/** Corta lo que esté sonando y suelta a quien espera que termine. */
let cortarLoQueSuena: (() => void) | null = null;

function obtenerReproductor(): ModuloDeAudio.AudioPlayer | null {
  if (!AUDIO) return null;
  if (!reproductor) {
    reproductor = cargar(() => AUDIO.createAudioPlayer(null));
    AUDIO.setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }
  return reproductor;
}

function reproducir(uri: string, segundos: number): Promise<void> {
  const player = obtenerReproductor();
  if (!player) return Promise.reject(new Error('sin reproductor'));
  return new Promise(resolver => {
    // Si el reproductor nunca avisa que terminó, no se queda la conversación colgada.
    const plazo = setTimeout(terminar, segundos * 1000 + 2000);
    const suscripcion = player.addListener('playbackStatusUpdate', estado => {
      if (estado.didJustFinish) terminar();
    });
    function terminar() {
      clearTimeout(plazo);
      suscripcion.remove();
      cortarLoQueSuena = null;
      resolver();
    }
    cortarLoQueSuena = () => {
      player.pause();
      terminar();
    };
    player.replace({ uri });
    player.play();
  });
}

function hablarConSistema(texto: string): Promise<void> {
  if (!HABLA || !idioma) return Promise.resolve();
  return new Promise(resolver => {
    const listo = () => resolver();
    HABLA.speak(texto, { language: idioma ?? 'es-US', onDone: listo, onStopped: listo, onError: listo });
  });
}

/**
 * La voz del acompañante en este teléfono: la natural del servidor (D-157) reproducida con
 * expo-audio y, si no hay, la del sistema. Si algún día la voz corre dentro de la app (Piper con
 * sherpa-onnx), se cambia solo `sintetizar`.
 */
export const PARLANTES_DEL_TELEFONO: Parlantes = {
  sintetizar: (texto, signal) =>
    obtenerReproductor() ? sintetizarVoz(texto, signal) : Promise.resolve({ tipo: 'sin-voz' as const }),
  reproducir,
  hablarConSistema,
  detener: () => {
    cortarLoQueSuena?.();
    HABLA?.stop();
  },
};

/** El teléfono puede hablar de alguna forma. Si no, el orbe responde solo por escrito. */
export const PUEDE_HABLAR = AUDIO !== null || HABLA !== null;
