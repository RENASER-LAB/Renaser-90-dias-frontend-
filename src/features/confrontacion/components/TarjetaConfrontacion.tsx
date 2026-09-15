import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { fraseDelDia } from '../utils/fraseDelDia';

/**
 * La frase de confrontación del día, en Hoy.
 *
 * **Deliberadamente NO es una tarjeta.** Sin borde, sin fondo propio, sin ícono: una regla dorada
 * corta y el texto en la serif editorial, como una cita en una revista. Meterla en otra caja con
 * borde la habría igualado a las tarjetas de coherencia, racha y hábitos que tiene al lado — y
 * esto no es un dato más del día, es lo primero que la persona lee. Lo que la hace destacar es
 * que **no se parece a nada de lo que la rodea**, no que tenga más adornos.
 *
 * Si no hay día de programa todavía no dibuja nada (`fraseDelDia` devuelve `null`): a alguien que
 * no arrancó no se le muestra la frase del día 1.
 */
export function TarjetaConfrontacion({ diaPrograma }: { diaPrograma: number | null | undefined }) {
  const { c, t } = useTheme();
  const frase = fraseDelDia(diaPrograma);

  if (!frase) return null;

  return (
    <View style={estilos.bloque}>
      <View style={[estilos.regla, { backgroundColor: c.gold }]} />
      <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 19, lineHeight: 27 }]}>
        {frase.texto}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    marginTop: 22,
    marginBottom: 6,
    gap: 12,
  },
  /* Corta y a la izquierda: marca dónde empieza la cita sin encerrarla. */
  regla: {
    width: 34,
    height: 2,
    borderRadius: 1,
  },
});
