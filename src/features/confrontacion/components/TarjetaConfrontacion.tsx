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
 * Sale SIEMPRE, también a quien no tiene día de programa (personal sin programa, Día 0, sin Día 1 elegido): entonces la frase se elige por
 * la fecha del calendario (`fechaDeHoy`). Solo no dibuja nada mientras todavía no se sabe ni el día ni la fecha (`fraseDelDia` da `null`).
 *
 * > **Corregido 2026-11-01 (pedido del dueño: «recuerda la frase… que salga pese que no inició su programa»).** Antes no dibujaba nada sin
 * > día de programa, y a esas cuentas les quedaba un hueco vacío arriba de Hoy.
 */
export function TarjetaConfrontacion({
  diaPrograma,
  fechaDeHoy,
}: {
  diaPrograma: number | null | undefined;
  /** `YYYY-MM-DD`, la fecha de hoy en el teléfono. Solo se usa si no hay día de programa. `null` = todavía no se sabe. */
  fechaDeHoy?: string | null;
}) {
  const { c, t } = useTheme();
  const frase = fraseDelDia(diaPrograma, fechaDeHoy);

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
