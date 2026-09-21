import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  MAXIMO_MINUTOS_RUEDA_ANTELACION,
  MINIMO_MINUTOS_ANTELACION,
} from '../utils/etiquetaDeAntelacion';
import { FranjaCentral, Rueda } from './Rueda';

/**
 * La rueda de "cuántos minutos antes": 1 a 60, una sola columna.
 *
 * ## Por qué existe (2026-09-21)
 *
 * La antelación propia del recordatorio se escribía en un `TextInput` con `keyboardType`
 * numérico. Reporte del dueño: al tocar "Otra" el teclado del sistema subía y **tapaba el propio
 * campo**, así que se escribía a ciegas. La hoja de Planificar no tiene scroll a propósito (las
 * ruedas de hora se pelearían con él por el dedo, AGENTS.md §2), así que no había a dónde correr
 * el campo: la salida era sacar el teclado de la ecuación.
 *
 * Es la MISMA {@link Rueda} que la de hora/minuto de arriba en esa hoja —mismo alto de fila, misma
 * franja central, mismo enganche— con otra lista de valores. El gesto ya está aprendido dos
 * pantallas más arriba.
 *
 * El rango es el que pidió el dueño. No recorta lo que el sistema acepta: un aviso de 90 minutos
 * guardado de antes sigue vivo, visible y guardándose — ver `minutosDeArranqueDeLaRueda`.
 */

const VALORES = Array.from(
  { length: MAXIMO_MINUTOS_RUEDA_ANTELACION - MINIMO_MINUTOS_ANTELACION + 1 },
  (_, i) => MINIMO_MINUTOS_ANTELACION + i,
);

interface RuedaAntelacionPickerProps {
  /**
   * El minuto donde abre la rueda. Como {@link Rueda} es NO controlada, esto tiene que quedarse
   * quieto mientras la rueda está en pantalla: cambiarlo en cada giro la haría saltar sola debajo
   * del dedo. Quien la usa lo calcula una vez, al abrirla.
   */
  minutosIniciales: number;
  onCambiar: (minutos: number) => void;
}

export function RuedaAntelacionPicker({ minutosIniciales, onCambiar }: RuedaAntelacionPickerProps) {
  return (
    <View style={styles.contenedor}>
      <FranjaCentral />
      <Rueda
        etiqueta="Minutos de antelación"
        valores={VALORES}
        valorInicial={minutosIniciales}
        onCambiar={onCambiar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /* Ancho fijo y no `flex`: la franja central se estira a lo ancho de este contenedor, y sin un
     ancho propio se comería también el botón de al lado. 76 es lo que ocupan dos dígitos a 30px
     con aire, el mismo cuerpo que las columnas de la rueda de hora. */
  contenedor: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
