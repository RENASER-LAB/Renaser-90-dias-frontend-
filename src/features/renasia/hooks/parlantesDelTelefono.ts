import type * as ModuloDeAudio from 'expo-audio';

import { sintetizarVoz, type VozSintetizada } from '../api/renasiaVoz';
import type { Parlantes } from '../utils/locutor';

/**
 * El módulo nativo se carga opcional, como la voz en `useDictado`: si el binario instalado no lo
 * trae, Hoy abre igual y la respuesta se muestra escrita.
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

/**
 * Cuánto debería durar una oración dicha (~14 caracteres por segundo) más margen. Si el reproductor
 * nunca avisa que terminó, la conversación no se queda colgada.
 */
function plazoMs(oracion: string): number {
  return (oracion.length / 14) * 1000 + 8000;
}

/** Lo máximo que se espera a que el audio de una oración termine de bajar. */
const ESPERA_DESCARGA_MS = 20_000;

function conPlazo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const reloj = setTimeout(() => rechazar(new Error('plazo vencido')), ms);
    promesa.then(
      valor => {
        clearTimeout(reloj);
        resolver(valor);
      },
      error => {
        clearTimeout(reloj);
        rechazar(error);
      }
    );
  });
}

/**
 * Pide la oración y la BAJA ENTERA a memoria antes de darla por lista (E-231).
 *
 * > Corregido 2026-09-24: antes el reproductor tocaba el WAV mientras bajaba. El ExoPlayer de
 * > expo-audio espera 2,5 s de audio antes de arrancar y, si el audio se atrasa, se frena y
 * > espera 5 s más; como Gemini manda el audio a tirones, se oía entrecortado y con pausas largas.
 * > Bajado entero suena parejo, y mientras suena una oración la siguiente ya se está bajando.
 */
async function sintetizarYBajar(texto: string, signal: AbortSignal): Promise<VozSintetizada> {
  const voz = await sintetizarVoz(texto, signal);
  if (voz.tipo !== 'audio' || !AUDIO) return voz;
  const fuente = { uri: voz.uri, headers: voz.headers };
  try {
    await conPlazo(AUDIO.preload(fuente), ESPERA_DESCARGA_MS);
    return voz;
  } catch {
    AUDIO.clearPreloadedSource(fuente).catch(() => undefined);
    return { tipo: 'fallo' };
  }
}

function reproducir(voz: Extract<VozSintetizada, { tipo: 'audio' }>, oracion: string): Promise<boolean> {
  const player = obtenerReproductor();
  if (!player) return Promise.resolve(false);
  const fuente = { uri: voz.uri, headers: voz.headers };
  return new Promise(resolver => {
    const plazo = setTimeout(() => terminar(true), plazoMs(oracion));
    const suscripcion = player.addListener('playbackStatusUpdate', estado => {
      if (estado.didJustFinish) terminar(true);
      // Sin ningún audio reproducido: que la diga la voz del teléfono.
      else if (estado.error) terminar(estado.currentTime > 0.5);
    });
    function terminar(sono: boolean) {
      clearTimeout(plazo);
      suscripcion.remove();
      cortarLoQueSuena = null;
      AUDIO?.clearPreloadedSource(fuente).catch(() => undefined);
      resolver(sono);
    }
    cortarLoQueSuena = () => {
      player.pause();
      terminar(true);
    };
    // Ya está entero en memoria (sintetizarYBajar): suena de corrido, sin esperar la red.
    player.replace(fuente);
    player.play();
  });
}

/**
 * La voz del acompañante en este teléfono: la del servidor (Gemini, voz Kore, D-159) bajada entera y
 * reproducida con expo-audio. Si no hay, no suena otra voz (D-164): el `Locutor` avisa y la respuesta
 * queda escrita. Si algún día la voz corre dentro de la
 * app (Piper con sherpa-onnx), se cambia solo `sintetizar`.
 */
export const PARLANTES_DEL_TELEFONO: Parlantes = {
  sintetizar: (texto, signal) =>
    obtenerReproductor() ? sintetizarYBajar(texto, signal) : Promise.resolve({ tipo: 'sin-voz' as const }),
  reproducir,
  detener: () => cortarLoQueSuena?.(),
};

/** Hay con qué reproducir la voz del servidor. Si no, el orbe responde solo por escrito. */
export const PUEDE_HABLAR = AUDIO !== null;
