import { useCallback, useEffect, useRef, useState } from 'react';

import { useDictado } from '../../renasia/hooks/useDictado';
import type { CampoRadar } from '../config/configRadar';

/** El Código Renaser no sesga el reconocedor con nombres de hábitos: son respuestas libres sobre uno mismo. */
const SIN_FRASES: readonly string[] = [];

export type DictadoDelRadar = {
  /** El teléfono tiene reconocimiento de voz. Si es `false`, el formulario no ofrece el micrófono. */
  disponible: boolean;
  /** La pregunta cuyo micrófono está abierto, o `null`. */
  dictandoEn: CampoRadar | null;
  /** Lo que el reconocedor va entendiendo en la pregunta que se está dictando (se muestra, no se registra). */
  parcial: string;
  /** La pregunta donde se tocó el micrófono por última vez y el aviso de por qué falló, o `null`. */
  fallo: { campo: CampoRadar; mensaje: string } | null;
  /** Toca el micrófono de una pregunta: lo abre, lo cierra si ya era ese, o pasa de una pregunta a otra. */
  alternar: (campo: CampoRadar) => void;
  /** Cierra el micrófono sin abrir otro (al registrar, al cerrar el formulario o al empezar a escuchar una pregunta). */
  detener: () => void;
};

/**
 * Dictar las respuestas del Código Renaser (spec 030): UN micrófono para las cuatro preguntas, a la vez que nunca hay dos.
 *
 * Reutiliza `useDictado` (el reconocimiento de voz del teléfono, el mismo del chat de SER). Lo dictado llega a `alDictar`
 * cuando el micrófono se cierra, con la pregunta que lo tenía abierto; quien lo usa lo SUMA al campo (`sumarDictado`) y lo
 * deja editable: nada se registra solo.
 *
 * ## Pasar de una pregunta a otra
 *
 * `stop()` del reconocedor es asíncrono: el texto de la primera pregunta llega en el evento `end`. Abrir la segunda antes
 * mandaría lo dicho al campo equivocado o lo perdería. Por eso, tocar el micrófono de otra pregunta cierra el primero, ESPERA
 * a que entregue su texto y recién entonces abre el segundo (`porAbrir`).
 *
 * ## Si falla
 *
 * Sin permiso, sin red, sin motor en español o con el reconocedor ocupado, `fallo` trae una línea clara bajo la pregunta
 * que se intentaba; lo escrito y lo dictado antes quedan donde están y se puede seguir escribiendo.
 */
export function useDictadoDelRadar(alDictar: (campo: CampoRadar, texto: string) => void): DictadoDelRadar {
  const alDictarRef = useRef(alDictar);
  alDictarRef.current = alDictar;
  /** La pregunta que tiene (o va a tener) el micrófono: a ella va lo que se entregue. */
  const campoRef = useRef<CampoRadar | null>(null);
  const [campo, setCampo] = useState<CampoRadar | null>(null);
  const [porAbrir, setPorAbrir] = useState<CampoRadar | null>(null);

  const dictado = useDictado(
    SIN_FRASES,
    texto => {
      const destino = campoRef.current;
      if (destino) alDictarRef.current(destino, texto);
    },
    { destino: 'respuesta' },
  );
  const { escuchando, empezar, detener: cerrarMicrofono } = dictado;

  const abrir = useCallback(
    (destino: CampoRadar) => {
      campoRef.current = destino;
      setCampo(destino);
      void empezar();
    },
    [empezar],
  );

  // El micrófono se cerró (y ya entregó su texto a la pregunta anterior): si había otra esperando, se abre ahora.
  useEffect(() => {
    if (escuchando || !porAbrir) return;
    setPorAbrir(null);
    abrir(porAbrir);
  }, [escuchando, porAbrir, abrir]);

  const alternar = useCallback(
    (pedida: CampoRadar) => {
      if (!dictado.disponible) return;
      if (!escuchando) {
        abrir(pedida);
        return;
      }
      // Ya hay un micrófono abierto: tocar el mismo lo cierra; tocar otro lo cierra y deja esa pregunta esperando.
      setPorAbrir(campoRef.current === pedida ? null : pedida);
      cerrarMicrofono();
    },
    [dictado.disponible, escuchando, abrir, cerrarMicrofono],
  );

  const detener = useCallback(() => {
    setPorAbrir(null);
    cerrarMicrofono();
  }, [cerrarMicrofono]);

  return {
    disponible: dictado.disponible,
    dictandoEn: escuchando ? campo : null,
    parcial: escuchando ? dictado.parcial : '',
    fallo: dictado.error && campo ? { campo, mensaje: dictado.error } : null,
    alternar,
    detener,
  };
}
