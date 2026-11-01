import type { AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CampoRadar } from '../config/configRadar';
import { VOZ_DE_LA_PREGUNTA } from '../config/vozDelRadar';

/**
 * `expo-audio` se carga al primer toque en «Escuchar», no al abrir la app ni al montar el formulario: el formulario se monta en
 * varios lugares, casi nadie escucha, y así el módulo nativo de audio no pesa en el arranque ni en las pantallas que solo
 * importan el formulario.
 */
function cargarAudio(): typeof import('expo-audio') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-audio') as typeof import('expo-audio');
}

export type EscucharPregunta = {
  /** La pregunta que se está leyendo, o `null`. */
  leyendo: CampoRadar | null;
  /** Lee la pregunta; si ya se estaba leyendo esa, la detiene; si era otra, pasa a esta. */
  alternar: (campo: CampoRadar) => void;
  /** Detiene la lectura (al abrir el micrófono, al registrar o al cerrar el formulario). */
  detener: () => void;
};

/**
 * Escuchar las preguntas del Código Renaser (spec 030): la voz Dora grabada, desde el paquete de la app, sin red (cuatro MP3 en
 * `assets/sonidos/`). UNA voz a la vez: un solo reproductor que cambia de archivo, así dos preguntas nunca suenan encimadas.
 *
 * ## El reproductor nace con el primer toque, no con el formulario
 *
 * El formulario se monta en varios lugares (Hoy, Mi Radar, la pantalla obligatoria) y casi nadie toca «Escuchar»; un
 * reproductor nativo por cada formulario montado sería gastar memoria por nada. Se crea al primer toque y se libera al
 * desmontarse.
 *
 * ## Cuándo se detiene
 *
 * Al terminar, al tocar «Escuchar» de nuevo, al cambiar a otra pregunta, al abrir el micrófono (quien lo usa llama a
 * `detener()` ANTES de pedirlo, para que el micrófono no capte la voz de la app) y al desmontarse. Nunca lanza: una voz que no
 * sale no puede impedir completar el formulario.
 */
export function useEscucharPregunta(): EscucharPregunta {
  const reproductor = useRef<AudioPlayer | null>(null);
  const baja = useRef<{ remove: () => void } | null>(null);
  const [leyendo, setLeyendo] = useState<CampoRadar | null>(null);

  const obtener = useCallback((): AudioPlayer => {
    if (!reproductor.current) {
      const nuevo = cargarAudio().createAudioPlayer(null);
      // Al terminar de leer, el botón vuelve a «Escuchar». Solo cambia el estado al terminar: sin sondeo, el formulario no se
      // vuelve a dibujar mientras suena.
      baja.current = nuevo.addListener('playbackStatusUpdate', estado => {
        if (estado.didJustFinish) setLeyendo(null);
      });
      reproductor.current = nuevo;
    }
    return reproductor.current;
  }, []);

  const detener = useCallback(() => {
    setLeyendo(null);
    try {
      reproductor.current?.pause();
    } catch {
      // Sin audio disponible: no hay nada que detener.
    }
  }, []);

  const alternar = useCallback(
    (campo: CampoRadar) => {
      if (leyendo === campo) {
        detener();
        return;
      }
      try {
        const voz = obtener();
        voz.pause();
        voz.replace(VOZ_DE_LA_PREGUNTA[campo]);
        voz.play();
        setLeyendo(campo);
      } catch {
        setLeyendo(null);
      }
    },
    [leyendo, detener, obtener],
  );

  useEffect(
    () => () => {
      try {
        baja.current?.remove();
        reproductor.current?.remove();
      } catch {
        // Ya estaba liberado.
      }
      baja.current = null;
      reproductor.current = null;
    },
    [],
  );

  return { leyendo, alternar, detener };
}
