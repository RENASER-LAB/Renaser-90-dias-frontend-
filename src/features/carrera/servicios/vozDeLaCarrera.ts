import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import type { EstadoDeLaCarrera } from '../types/carrera.types';
import { activoMs, ritmoActualSegPorKm, tramosDe } from '../utils/motorDeCarrera';
import { fraseDelAviso, tocaAviso } from '../utils/textosDeLaCarrera';
import { preferenciasActuales, type Efectos } from './carreraEnVivo';

/**
 * La voz y los pitidos de la carrera (FR-003, FR-010). La voz es el texto a voz del teléfono (decisión del dueño, supuesto 9): los
 * números cambian en cada aviso y no se pueden grabar. El pitido es la campana de Renaser, corta. Nunca lanzan: sin voz o sin audio
 * la carrera sigue igual.
 */

const IDIOMA = 'es-419';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PITIDO = require('../../../../assets/sonidos/campana_renaser.wav');
let reproductor: AudioPlayer | null = null;

export function decir(texto: string): void {
  if (!texto || Platform.OS === 'web') return;
  try {
    Speech.stop();
    Speech.speak(texto, { language: IDIOMA, rate: 1.0 });
  } catch {
    // Sin motor de voz.
  }
}

export function pitar(): void {
  if (!preferenciasActuales().pitidos) return;
  try {
    if (!reproductor) {
      reproductor = createAudioPlayer(PITIDO);
      reproductor.volume = 0.7;
    }
    void reproductor.seekTo(0);
    reproductor.play();
  } catch {
    // Sin audio.
  }
}

/** El efecto que se enchufa a la carrera: un aviso de voz cada km o cada 5 min, según lo elegido. */
export const efectoDeVoz: NonNullable<Efectos['alCambiar']> = (antes, despues, ahora) => {
  if (!antes || !despues || antes.carreraId !== despues.carreraId || despues.fase !== 'corriendo') return;
  const prefs = preferenciasActuales();
  const a = { metros: antes.distanciaM, activoMs: activoMs(antes, ahora) };
  const d = { metros: despues.distanciaM, activoMs: activoMs(despues, ahora) };
  if (!tocaAviso(prefs, a, d)) return;
  pitar();
  decir(fraseDelAviso(prefs, { ...d, ritmoSeg: ritmoActualSegPorKm(despues, ahora), ritmoUltimoKmSeg: ritmoDelUltimoKm(despues, ahora) }));
};

function ritmoDelUltimoKm(e: EstadoDeLaCarrera, ahora: number): number | null {
  const completos = tramosDe(e, ahora).filter(t => !t.parcial);
  return completos.length > 0 ? completos[completos.length - 1].segundos : null;
}
