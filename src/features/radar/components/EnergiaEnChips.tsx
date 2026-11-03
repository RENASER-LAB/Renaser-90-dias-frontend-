import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { fuentes } from '../../../theme/fuentes';
import { tacto } from '../../../utils/tacto';
import { ENERGIA_MAXIMA, ENERGIA_MINIMA, PREGUNTA_ENERGIA } from '../config/configRadar';

/** Alto de cada chip (el mínimo táctil de la app) y aire entre ellos. */
export const ALTO_DEL_CHIP = 44;
const SEPARACION = 4;

const VALORES: readonly number[] = Array.from({ length: ENERGIA_MAXIMA - ENERGIA_MINIMA + 1 }, (_, i) => ENERGIA_MINIMA + i);

/**
 * La quinta pregunta del Código Renaser, «¿Cuál es mi nivel de energía?», como diez chips del 1 al 10 en una fila (2026-11-03,
 * opción C de la maqueta del dueño). Reemplaza al selector de `SliderRating` en este formulario (ese sigue en el onboarding).
 *
 * - **44 de alto**, borde fino y radio 10. El elegido va en dorado suave (lavado dorado, borde dorado, número en negrita dorada):
 *   el estado no depende solo del color, también del peso y de `accessibilityState.selected`.
 * - Debajo, «En reserva» a la izquierda y «A tope» a la derecha, a 13, sin números.
 * - **`null` NO es un número** (decisión del dueño, 2026-09-05): mientras la persona no eligió, ningún chip está marcado, y eso es lo
 *   que `faltantesDelRadar` entiende como «falta el nivel de energía».
 * - Elegir es instantáneo (se hace una vez por formulario): el cambio de color en el acto, la escala de `Presionable` y un «tic» de
 *   `tacto.seleccion()` si cambia. Sin animación propia.
 * - Cada chip no lleva etiqueta propia: el lector de pantalla oye «5, botón, seleccionado» y el grupo se llama como la pregunta.
 */
export function EnergiaEnChips({
  value,
  onChange,
  deshabilitado = false,
}: {
  value: number | null;
  onChange: (valor: number) => void;
  deshabilitado?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={estilos.bloque}>
      <Text accessibilityRole="header" style={[estilos.enunciado, { color: c.text }]}>
        {PREGUNTA_ENERGIA}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={PREGUNTA_ENERGIA} style={estilos.fila}>
        {VALORES.map(valor => {
          const elegido = value === valor;
          return (
            <Presionable
              key={valor}
              onPress={() => {
                if (elegido) return;
                tacto.seleccion();
                onChange(valor);
              }}
              disabled={deshabilitado}
              accessibilityRole="radio"
              accessibilityState={{ selected: elegido, disabled: deshabilitado }}
              hitSlop={{ left: 1, right: 1 }}
              contenedorStyle={estilos.celda}
              style={[
                estilos.chip,
                {
                  backgroundColor: elegido ? c.goldWash : c.cardBgAlt,
                  borderColor: elegido ? c.goldInk : c.border,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  estilos.numero,
                  { color: elegido ? c.goldInk : c.textSoft, fontFamily: elegido ? fuentes.negrita : fuentes.regular },
                ]}
              >
                {valor}
              </Text>
            </Presionable>
          );
        })}
      </View>
      <View style={estilos.extremos}>
        <Text style={[estilos.extremo, { color: c.textSoft }]}>En reserva</Text>
        <Text style={[estilos.extremo, { color: c.textSoft }]}>A tope</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: { gap: 8 },
  enunciado: { fontFamily: fuentes.seminegrita, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  fila: { flexDirection: 'row', gap: SEPARACION },
  celda: { flex: 1 },
  chip: { height: ALTO_DEL_CHIP, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  numero: { fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
  extremos: { flexDirection: 'row', justifyContent: 'space-between' },
  extremo: { fontFamily: fuentes.regular, fontSize: 13, lineHeight: 18 },
});
