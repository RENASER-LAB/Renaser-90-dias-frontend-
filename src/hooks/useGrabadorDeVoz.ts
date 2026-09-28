import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
  type RecordingOptions,
} from 'expo-audio';

/**
 * Un grabador de notas de voz que se crea recién cuando la persona toca «grabar», y nunca al montar
 * la pantalla.
 *
 * POR QUÉ EXISTE (E-424 del backend, 28/09). `useAudioRecorder` de expo-audio crea el grabador
 * nativo en el primer render. En Android ese constructor pide la Activity actual
 * (`appContext.throwingActivity`) y, si en ese instante no hay ninguna, rechaza:
 * `Call to function 'AudioRecorder.constructor' has been rejected. → Caused by: The current activity
 * is no longer available`. El rechazo sale del render, así que tumbaba `ComunidadScreen` entera
 * (pantalla roja en desarrollo, Comunidad en blanco en la app instalada). Pasa porque «atrás» en la
 * pantalla principal cierra la Activity pero NO el JS: el árbol viejo sigue montado sin Activity, y
 * cualquier montaje en ese hueco (o al volver, antes de que la Activity nueva quede registrada)
 * cae en el rechazo.
 *
 * Tocar «grabar» exige una Activity viva (hay un dedo en la pantalla), así que crear el grabador ahí
 * elimina el hueco. Y si aun así falla, lo que falla es el botón —devuelve `'no-disponible'` y quien
 * llama muestra un aviso corto—, nunca la pantalla. Cada grabación usa un grabador nuevo y lo libera
 * al terminar: uno guardado entre Activities es justo el objeto atado a una Activity muerta.
 */

const INTERVALO_MS = 250;

/** Lo que `createRecordingOptions` (interno de expo-audio, no exportado) arma para el nativo. */
export function opcionesNativas(opciones: RecordingOptions): Partial<RecordingOptions> {
  const comunes = {
    extension: opciones.extension,
    sampleRate: opciones.sampleRate,
    numberOfChannels: opciones.numberOfChannels,
    bitRate: opciones.bitRate,
    isMeteringEnabled: opciones.isMeteringEnabled ?? false,
  };
  if (Platform.OS === 'ios') return { ...comunes, directory: opciones.directory, ...opciones.ios };
  if (Platform.OS === 'android') {
    return { ...comunes, directory: opciones.directory, ...opciones.android };
  }
  return { ...comunes, ...opciones.web };
}

/** `null` si el módulo nativo rechaza crearlo (sin Activity, micrófono ocupado, lo que sea). */
function crearGrabador(): AudioRecorder | null {
  try {
    return new AudioModule.AudioRecorder(opcionesNativas(RecordingPresets.HIGH_QUALITY));
  } catch {
    return null;
  }
}

function liberar(grabador: AudioRecorder | null) {
  try {
    grabador?.release();
  } catch {
    // Ya liberado o con el módulo caído: no hay nada más que soltar.
  }
}

export type InicioDeGrabacion = 'grabando' | 'sin-permiso' | 'no-disponible';
export interface GrabacionTerminada { uri: string | null; durationMillis: number }

export function useGrabadorDeVoz() {
  const grabadorRef = useRef<AudioRecorder | null>(null);
  const [grabando, setGrabando] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);

  // El cronómetro solo corre mientras hay grabación: sin grabador no hay nada que consultar.
  useEffect(() => {
    if (!grabando) return undefined;
    const id = setInterval(() => {
      try {
        const estado = grabadorRef.current?.getStatus();
        if (estado) setDurationMillis(estado.durationMillis);
      } catch {
        // Un tick perdido no importa; el siguiente vuelve a intentar.
      }
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [grabando]);

  // Salir de la pantalla a mitad de una grabación no deja el micrófono tomado.
  useEffect(() => () => {
    const grabador = grabadorRef.current;
    grabadorRef.current = null;
    if (grabador) grabador.stop().catch(() => undefined).finally(() => liberar(grabador));
  }, []);

  const empezar = useCallback(async (): Promise<InicioDeGrabacion> => {
    const permiso = await requestRecordingPermissionsAsync();
    if (!permiso.granted) return 'sin-permiso';
    // `allowsRecording` es obligatorio en iOS: sin él, `record()` no captura nada y el archivo
    // sale mudo sin que ninguna API avise.
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    const grabador = crearGrabador();
    if (!grabador) return 'no-disponible';
    try {
      await grabador.prepareToRecordAsync();
      grabador.record();
    } catch {
      liberar(grabador);
      return 'no-disponible';
    }
    grabadorRef.current = grabador;
    setDurationMillis(0);
    setGrabando(true);
    return 'grabando';
  }, []);

  /** Corta la grabación y devuelve el archivo; `null` si no había ninguna en curso. */
  const terminar = useCallback(async (): Promise<GrabacionTerminada | null> => {
    const grabador = grabadorRef.current;
    if (!grabador) return null;
    grabadorRef.current = null;
    setGrabando(false);
    // La duración se lee ANTES de `stop()`: al cortar, el nativo se reinicia y vuelve a 0.
    let duracion = durationMillis;
    try {
      duracion = grabador.getStatus().durationMillis || duracion;
      await grabador.stop();
      return { uri: grabador.uri, durationMillis: duracion };
    } catch {
      return { uri: null, durationMillis: duracion };
    } finally {
      liberar(grabador);
    }
  }, [durationMillis]);

  /** Descartar lo grabado sin usarlo. */
  const descartar = useCallback(async () => {
    await terminar();
  }, [terminar]);

  return useMemo(
    () => ({ grabando, durationMillis, empezar, terminar, descartar }),
    [grabando, durationMillis, empezar, terminar, descartar],
  );
}
