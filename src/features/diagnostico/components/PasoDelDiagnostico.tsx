import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import type { PasoDelRecorrido } from '../utils/pasosDelRecorrido';
import { estaVacia, respuestaDe, type RespuestaEnEdicion, type ValoresDelDiagnostico } from '../utils/respuestasEnEdicion';
import type { ErroresDelPaso } from '../utils/validacion';
import { CampoDePregunta } from './CampoDePregunta';

interface PasoDelDiagnosticoProps {
  paso: PasoDelRecorrido;
  valores: ValoresDelDiagnostico;
  errores: ErroresDelPaso;
  alCambiar: (preguntaId: number, nuevo: RespuestaEnEdicion) => void;
  alMedir: (preguntaId: number, y: number) => void;
}

/**
 * Un paso del diagnóstico: la sección a la que pertenece (y su descripción, solo en el primer paso de la sección) y de una a
 * tres preguntas. La sección y las preguntas son hermanas en la misma columna: la altura que mide cada pregunta es, sin
 * cuentas, la altura a la que hay que bajar la vista cuando le falta algo.
 */
export function PasoDelDiagnostico({ paso, valores, errores, alCambiar, alMedir }: PasoDelDiagnosticoProps) {
  const { c, t } = useTheme();
  const primera = paso.preguntas[0];
  /* El teclado sube solo cuando el paso empieza por un campo de texto, vacío y obligatorio (como la ficha estándar). */
  const abreElTeclado =
    !!primera &&
    primera.requerida &&
    (primera.tipo === 'TEXTO' || primera.tipo === 'NUMERO') &&
    estaVacia(primera, respuestaDe(valores, primera.id));

  return (
    <View style={estilos.paso}>
      <View style={estilos.seccion}>
        <MicroLabel>{paso.seccion.titulo}</MicroLabel>
        {paso.primeroDeLaSeccion && paso.seccion.descripcion ? (
          <Text style={[t.body, estilos.descripcion, { color: c.textSoft }]}>{paso.seccion.descripcion}</Text>
        ) : null}
      </View>
      {paso.preguntas.map((pregunta, i) => (
        <CampoDePregunta
          key={pregunta.id}
          pregunta={pregunta}
          valor={respuestaDe(valores, pregunta.id)}
          error={errores[pregunta.id]}
          alCambiar={alCambiar}
          alMedir={alMedir}
          enfocarAlLlegar={i === 0 && abreElTeclado}
        />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  paso: { gap: 28 },
  seccion: { gap: 6 },
  descripcion: { fontSize: 16, lineHeight: 23 },
});
