import React, { useEffect, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { fuentes } from '../../../theme/fuentes';
import type { PREGUNTAS_RADAR } from '../config/configRadar';
import { BotonDeDictar, LADO_DEL_AREA } from './BotonDeDictar';

type Pregunta = (typeof PREGUNTAS_RADAR)[number];

/** Letra y alto de línea del texto de la respuesta (16 / 22, como el campo de la maqueta). */
const LETRA = 16;
const LINEA = 22;
const RELLENO_VERTICAL = 10;
/** El campo arranca en unas dos líneas… */
export const ALTO_MINIMO_DEL_CAMPO = 72;
/** …crece solo con lo que se escribe o se dicta hasta cinco líneas, y de ahí en adelante se desplaza por dentro. */
export const LINEAS_MAXIMAS_DEL_CAMPO = 5;
export const ALTO_MAXIMO_DEL_CAMPO = LINEAS_MAXIMAS_DEL_CAMPO * LINEA + 2 * RELLENO_VERTICAL;
/** Cuánto sitio deja el texto a la derecha para no pasar por debajo del micrófono (44 de área + 4 de margen + 4 de aire). */
export const MARGEN_DEL_TEXTO_ANTE_EL_MICROFONO = LADO_DEL_AREA + 8;
/** Dónde queda el micrófono respecto de la orilla de abajo y de la derecha del campo. */
const MARGEN_DEL_MICROFONO = 4;

/**
 * UNA pregunta de texto del Código Renaser (2026-11-03, opción C de la maqueta del dueño: «Dictar dentro del campo»):
 *
 * ```
 * ¿Qué estoy sintiendo?                       ← la pregunta, sola en su renglón (sin íconos)
 * ┌──────────────────────────────────────────┐
 * │ Siento…                                  │  ← el campo: multilínea, arranca en ~2 líneas y crece hasta 5
 * │                                      (🎤) │  ← el micrófono, DENTRO del campo, anclado abajo a la derecha
 * └──────────────────────────────────────────┘
 * ```
 *
 * - **No hay «Escuchar».** Con solo leer la pregunta basta (el dueño); el parlante y las voces grabadas se quitaron.
 * - **El micrófono vive en el campo,** como en un buscador, anclado ABAJO a la derecha para que no se mueva cuando el campo crece. El
 *   texto deja 52 de margen a la derecha para no pasar por debajo de él (con el micrófono apagado por el teléfono, el margen es el normal).
 * - **Lo dictado se escribe EN el campo mientras se habla** (`textoVisible`: lo escrito más lo que el reconocedor va entendiendo), en
 *   la misma caja; el campo crece con eso y, mientras dura y después, el cursor queda al FINAL (`selection`), con lo que el campo, si
 *   ya pasó de cinco líneas, se desplaza para mostrarlo. Al tocar el campo para corregir, el cursor vuelve a ser de quien lo toca.
 * - **Un solo scroll en la pantalla:** pasadas las cinco líneas el campo se desplaza por dentro; el resto de la pantalla no.
 * - Lo único que aparece mientras pasa algo es el aviso si el micrófono falla; en reposo la pregunta es su enunciado y su campo.
 */
export function PreguntaDelRadar({
  pregunta,
  /** Lo que se muestra en el campo: el texto, o el texto más lo que el reconocedor va entendiendo mientras se dicta. */
  textoVisible,
  marcador,
  puedeDictar,
  dictando,
  enviando,
  marcadaVacia,
  fallo,
  alCambiar,
  alDictar,
  alMedir,
}: {
  pregunta: Pregunta;
  textoVisible: string;
  marcador: string;
  puedeDictar: boolean;
  dictando: boolean;
  enviando: boolean;
  /** Se intentó registrar y esta respuesta sigue vacía: el borde se pone rojo. */
  marcadaVacia: boolean;
  /** Por qué falló el micrófono en ESTA pregunta, o `null`. */
  fallo: string | null;
  alCambiar: (texto: string) => void;
  alDictar: () => void;
  alMedir: (e: LayoutChangeEvent) => void;
}) {
  const { c, t } = useTheme();

  /* Cursor al final: desde que se abre el micrófono y hasta que la persona toca el campo. Con `selection` controlado, un campo
     multilínea más alto que su tope se desplaza hasta mostrar lo último que se dictó. */
  const [cursorAlFinal, setCursorAlFinal] = useState(false);
  useEffect(() => {
    if (dictando) setCursorAlFinal(true);
  }, [dictando]);
  const fin = textoVisible.length;

  return (
    <View style={estilos.pregunta} onLayout={alMedir}>
      <Text style={[t.cardTitle, estilos.enunciado, { color: c.text }]}>{pregunta.titulo}</Text>
      {fallo ? (
        <Text accessibilityRole="alert" style={[t.small, estilos.linea, { color: c.danger }]}>
          {fallo}
        </Text>
      ) : null}
      <View
        style={[
          estilos.caja,
          {
            backgroundColor: c.cardBgAlt,
            borderColor: marcadaVacia ? '#E06A66' : dictando ? c.goldInk : c.border,
          },
        ]}
      >
        <TextInput
          value={textoVisible}
          onChangeText={alCambiar}
          placeholder={dictando ? 'Te escucho…' : marcador}
          placeholderTextColor={c.micro}
          multiline
          editable={!enviando && !dictando}
          scrollEnabled
          selection={cursorAlFinal ? { start: fin, end: fin } : undefined}
          onFocus={() => setCursorAlFinal(false)}
          style={[estilos.campo, { color: c.text }, puedeDictar ? estilos.conMicrofono : null]}
          accessibilityLabel={pregunta.titulo}
        />
        {puedeDictar ? (
          <View style={estilos.microfono}>
            <BotonDeDictar
              activo={dictando}
              nombreAccesible={`Dictar la respuesta a ${pregunta.titulo}`}
              nombreAccesibleActivo={`Parar de dictar la respuesta a ${pregunta.titulo}`}
              deshabilitado={enviando}
              alPresionar={alDictar}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pregunta: { gap: 6 },
  enunciado: { fontSize: 16, lineHeight: LINEA },
  linea: { lineHeight: 18 },
  /* La caja lleva el borde y el fondo; el campo de adentro no tiene borde, para que el micrófono quede DENTRO de la misma caja. */
  caja: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  campo: {
    minHeight: ALTO_MINIMO_DEL_CAMPO,
    maxHeight: ALTO_MAXIMO_DEL_CAMPO,
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: RELLENO_VERTICAL,
    paddingBottom: RELLENO_VERTICAL,
    fontFamily: fuentes.regular,
    fontSize: LETRA,
    lineHeight: LINEA,
    textAlignVertical: 'top',
  },
  conMicrofono: { paddingRight: MARGEN_DEL_TEXTO_ANTE_EL_MICROFONO },
  microfono: { position: 'absolute', right: MARGEN_DEL_MICROFONO, bottom: MARGEN_DEL_MICROFONO },
});
