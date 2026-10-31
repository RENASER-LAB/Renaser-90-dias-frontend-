import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { BotonDeVoz } from './BotonDeVoz';

/**
 * La voz de UNA pregunta del Código Renaser (spec 030): «Escuchar» la pregunta y «Dictar» la respuesta, más las dos líneas
 * que explican lo que pasa. Es el mismo bloque en las cuatro preguntas y en las cuatro entradas al formulario (la pantalla
 * obligatoria de los días 1 a 7, Hoy, Mi Radar y el aviso del teléfono: todas abren `CodigoRenaserModal`).
 *
 * - Sin reconocimiento de voz en el teléfono (`puedeDictar` falso) no hay «Dictar», pero «Escuchar» sí: la voz es una grabación.
 * - Mientras se dicta, una línea (anunciada al lector de pantalla) dice que el micrófono está abierto y cómo cerrarlo.
 * - Mientras suena la pregunta, una línea dice qué hacer si no se oye: el teléfono no le cuenta su volumen a la app.
 * - Si el micrófono falla, una línea dice por qué y que se puede escribir; lo escrito y lo dictado antes no se toca.
 */
export function VozDeLaPregunta({
  pregunta,
  puedeDictar,
  leyendo,
  dictando,
  deshabilitado,
  fallo,
  alEscuchar,
  alDictar,
}: {
  /** El enunciado, para el nombre accesible: «Escuchar la pregunta ¿Qué siento?». */
  pregunta: string;
  puedeDictar: boolean;
  leyendo: boolean;
  dictando: boolean;
  deshabilitado?: boolean;
  /** Por qué falló el micrófono en ESTA pregunta, o `null`. */
  fallo: string | null;
  alEscuchar: () => void;
  alDictar: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.bloque}>
      <View style={estilos.fila}>
        <BotonDeVoz
          icono="volume"
          iconoActivo="pause"
          etiqueta="Escuchar"
          etiquetaActiva="Detener"
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
            etiqueta="Dictar"
            etiquetaActiva="Parar"
            activo={dictando}
            nombreAccesible={`Dictar la respuesta a ${pregunta}`}
            nombreAccesibleActivo={`Parar de dictar la respuesta a ${pregunta}`}
            deshabilitado={deshabilitado}
            alPresionar={alDictar}
          />
        ) : null}
      </View>
      {dictando ? (
        <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textSoft, fontSize: 14, lineHeight: 20 }]}>
          Te escucho. Cuando termines, toca «Parar».
        </Text>
      ) : null}
      {leyendo ? (
        <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textSoft, fontSize: 14, lineHeight: 20 }]}>
          Si no la oyes, sube el volumen de tu teléfono.
        </Text>
      ) : null}
      {fallo ? (
        <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 14, lineHeight: 20 }]}>
          {fallo}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: { gap: 6 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
