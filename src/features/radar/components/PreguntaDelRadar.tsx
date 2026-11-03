import React from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { fuentes } from '../../../theme/fuentes';
import type { PREGUNTAS_RADAR } from '../config/configRadar';
import { VozDeLaPregunta } from './VozDeLaPregunta';

type Pregunta = (typeof PREGUNTAS_RADAR)[number];

/** Alto de línea del enunciado: de él sale cuánto se acuesta el par de íconos (`VozDeLaPregunta`). */
export const ALTO_DE_LINEA_DEL_ENUNCIADO = 22;

/**
 * UNA pregunta de texto del Código Renaser, en su forma compacta (2026-11-03, pedido del dueño: «hay mucho texto y se extendió
 * demasiado»):
 *
 * ```
 * ¿Qué estoy sintiendo?                 (🔊)(🎤)     ← el enunciado y los dos íconos de voz, en un solo renglón
 * ┌──────────────────────────────────────────┐
 * │ Siento…                                  │       ← el campo
 * └──────────────────────────────────────────┘
 * ```
 *
 * Sin línea de ayuda debajo del enunciado y sin fila de botones. Las líneas que siguen solo existen mientras pasa algo: «Te
 * escucho…» con el micrófono abierto, «Si no la oyes…» con la voz sonando y el aviso si el micrófono falla; en reposo la pregunta
 * mide un renglón más el campo.
 */
export function PreguntaDelRadar({
  pregunta,
  /** Lo que se muestra en el campo: el texto, o el texto más lo que el reconocedor va entendiendo mientras se dicta. */
  textoVisible,
  marcador,
  puedeDictar,
  leyendo,
  dictando,
  enviando,
  marcadaVacia,
  fallo,
  alCambiar,
  alEscuchar,
  alDictar,
  alMedir,
}: {
  pregunta: Pregunta;
  textoVisible: string;
  marcador: string;
  puedeDictar: boolean;
  leyendo: boolean;
  dictando: boolean;
  enviando: boolean;
  /** Se intentó registrar y esta respuesta sigue vacía: el borde se pone rojo. */
  marcadaVacia: boolean;
  /** Por qué falló el micrófono en ESTA pregunta, o `null`. */
  fallo: string | null;
  alCambiar: (texto: string) => void;
  alEscuchar: () => void;
  alDictar: () => void;
  alMedir: (e: LayoutChangeEvent) => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.pregunta} onLayout={alMedir}>
      <View style={estilos.renglon}>
        <Text style={[t.cardTitle, estilos.enunciado, { color: c.text }]}>{pregunta.titulo}</Text>
        <VozDeLaPregunta
          pregunta={pregunta.titulo}
          puedeDictar={puedeDictar}
          leyendo={leyendo}
          dictando={dictando}
          deshabilitado={enviando}
          alEscuchar={alEscuchar}
          alDictar={alDictar}
        />
      </View>
      {dictando ? (
        <Text accessibilityLiveRegion="polite" style={[t.small, estilos.linea, { color: c.textSoft }]}>
          Te escucho. Toca el micrófono para parar.
        </Text>
      ) : null}
      {leyendo ? (
        <Text accessibilityLiveRegion="polite" style={[t.small, estilos.linea, { color: c.textSoft }]}>
          Si no la oyes, sube el volumen de tu teléfono.
        </Text>
      ) : null}
      {fallo ? (
        <Text accessibilityRole="alert" style={[t.small, estilos.linea, { color: c.danger }]}>
          {fallo}
        </Text>
      ) : null}
      <TextInput
        value={textoVisible}
        onChangeText={alCambiar}
        placeholder={dictando ? 'Te escucho…' : marcador}
        placeholderTextColor={c.micro}
        multiline
        editable={!enviando && !dictando}
        style={[
          estilos.campo,
          { color: c.text, backgroundColor: c.cardBgAlt, borderColor: marcadaVacia ? '#E06A66' : c.border },
        ]}
        accessibilityLabel={pregunta.titulo}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pregunta: { gap: 6 },
  renglon: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  enunciado: { flex: 1, flexShrink: 1, fontSize: 16, lineHeight: ALTO_DE_LINEA_DEL_ENUNCIADO },
  linea: { lineHeight: 18 },
  campo: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
    minHeight: 56,
    fontFamily: fuentes.regular,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
});
