import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

/**
 * El «pop» corto que suena DENTRO de la app cuando llega un mensaje a otro chat (D-221, 2026-09-29).
 * Es el mismo archivo del canal de Android `mensajes-chat` (`scripts/sonidos/sintetizar_mensaje.py`),
 * a volumen moderado (0,6): avisa sin sobresaltar a quien está usando la app.
 *
 * Un solo reproductor para toda la app, creado al primer uso. Si dos mensajes llegan juntos, el
 * segundo reinicia el mismo sonido en vez de encimar dos. Nunca lanza: un sonido que no sale no
 * puede tumbar la llegada del mensaje.
 */
const VOLUMEN = 0.6;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SONIDO = require('../../../../assets/sonidos/mensaje_burbuja.wav');

let reproductor: AudioPlayer | null = null;

export function sonarMensajeEnLaApp(): void {
  try {
    if (!reproductor) {
      reproductor = createAudioPlayer(SONIDO);
      reproductor.volume = VOLUMEN;
    }
    void reproductor.seekTo(0);
    reproductor.play();
  } catch {
    // Sin audio disponible (web sin interacción previa, emulador sin salida): se sigue sin sonido.
  }
}
