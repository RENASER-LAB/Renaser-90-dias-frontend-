import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BotonDeVoz } from './BotonDeVoz';

/**
 * Los dos íconos de voz de UNA pregunta del Código Renaser (spec 030, rehecha el 2026-11-03): el parlante para «Escuchar» la
 * pregunta y el micrófono para «Dictar» la respuesta. Van a la derecha, EN el renglón del enunciado, como íconos sutiles (ver
 * `BotonDeVoz`); ya no hay una fila de botones grandes debajo de cada pregunta. Es el mismo par en las cuatro preguntas y en las
 * cuatro entradas al formulario (la pantalla obligatoria de los días 1 a 7, Hoy, Mi Radar y el aviso del teléfono: todas abren
 * `CodigoRenaserModal`).
 *
 * - Sin reconocimiento de voz en el teléfono (`puedeDictar` falso) no hay micrófono, pero el parlante sí: la voz es una grabación.
 * - Las líneas que explican lo que pasa mientras suena o se dicta, y el aviso si el micrófono falla, las dibuja
 *   `PreguntaDelRadar` debajo del enunciado.
 * - **No agrandan el renglón.** Cada ícono tiene 44 de área táctil pero el par se acuesta con márgenes negativos: el renglón
 *   mide lo que mide el enunciado, y con dos líneas de enunciado los íconos quedan arriba a la derecha, a la altura de la primera.
 */
export function VozDeLaPregunta({
  pregunta,
  puedeDictar,
  leyendo,
  dictando,
  deshabilitado,
  alEscuchar,
  alDictar,
}: {
  /** El enunciado, para el nombre accesible: «Escuchar la pregunta ¿Qué estoy sintiendo?». */
  pregunta: string;
  puedeDictar: boolean;
  leyendo: boolean;
  dictando: boolean;
  deshabilitado?: boolean;
  alEscuchar: () => void;
  alDictar: () => void;
}) {
  return (
    <View style={estilos.par}>
      <BotonDeVoz
        icono="volume"
        iconoActivo="pause"
        activo={leyendo}
        nombreAccesible={`Escuchar la pregunta ${pregunta}`}
        nombreAccesibleActivo={`Detener la lectura de la pregunta ${pregunta}`}
        deshabilitado={deshabilitado}
        alPresionar={alEscuchar}
      />
      {puedeDictar ? (
        <BotonDeVoz
          icono="mic"
          iconoActivo="mic"
          activo={dictando}
          pulso
          nombreAccesible={`Dictar la respuesta a ${pregunta}`}
          nombreAccesibleActivo={`Parar de dictar la respuesta a ${pregunta}`}
          deshabilitado={deshabilitado}
          alPresionar={alDictar}
        />
      ) : null}
    </View>
  );
}

/** Mitad del alto del área táctil (44) menos mitad del renglón del enunciado (22): el ícono queda a la altura de la primera línea. */
const SOBRA_ARRIBA_Y_ABAJO = -11;

const estilos = StyleSheet.create({
  par: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: SOBRA_ARRIBA_Y_ABAJO,
    marginBottom: SOBRA_ARRIBA_Y_ABAJO,
    // El ícono de 20 queda a 12 del borde del área; con -8 su orilla queda a 4 de la orilla del campo de abajo.
    marginRight: -8,
  },
});
