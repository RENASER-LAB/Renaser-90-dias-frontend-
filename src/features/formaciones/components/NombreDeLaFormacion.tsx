import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { useFormacionDeLaSesion } from '../context/FormacionContext';
import { nombreQueSeMuestra } from '../utils/vistaDeFormacion';

/**
 * El nombre fijo y discreto de la formación en la que se está (spec 022, FR-014): una línea chica bajo el título de Hoy, solo para
 * quien tiene más de una formación o es de una distinta de la Escuela. Para el resto de la gente no dibuja nada: Hoy queda como
 * estaba. Es texto, sin toque ni movimiento; cambiar de formación se hace desde Yo.
 */
export function NombreDeLaFormacion() {
  const { c, t } = useTheme();
  const { formacion } = useFormacionDeLaSesion();
  const nombre = nombreQueSeMuestra(formacion);
  if (!nombre) return null;
  return (
    <Text accessibilityLabel={`Formación: ${nombre}`} numberOfLines={1} style={[t.small, estilos.nombre, { color: c.goldInk }]}>
      {nombre}
    </Text>
  );
}

const estilos = StyleSheet.create({
  /* 13 px y negrita, como el resto de los rótulos de la app (`MicroLabel`); sin espaciado de letras (tipo oración). */
  nombre: { fontSize: 13, fontFamily: fuentes.negrita, marginBottom: 8 },
});
