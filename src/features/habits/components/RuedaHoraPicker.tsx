import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { FranjaCentral, Rueda } from './Rueda';

/**
 * Rueda de hora/minuto de scroll libre, tipo selector de reloj nativo (iOS/Android): cualquier
 * minuto (00-59), no pasos fijos. Distinto a propósito de `HoraPickerModal` (que sigue usando
 * pasos de 5 minutos en pantallas de Plan) — este componente es solo para el flujo nuevo de
 * "Planificar" en Training, pedido explícitamente con scroll libre.
 *
 * La columna en sí vive en {@link Rueda}, que no sabe de horas: se extrajo el 2026-09-21 para que
 * el recordatorio "Otra" pudiera usar la MISMA rueda con otra lista de valores.
 */

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = Array.from({ length: 60 }, (_, i) => i);

/**
 * Tope de arranque (D-122, backend `VentanaDelDia.ULTIMA_HORA_DE_DISPARO`). Más tarde que esto no
 * queda tiempo de completar el hábito antes de las 00:00, y el servidor devuelve 400.
 *
 * **Por qué se refleja acá y no se deja fallar al servidor.** El caso que motivó la regla es
 * justamente el de quien trabaja de noche: ofrecerle las 23:55 en la rueda y rechazárselo después
 * es la peor de las dos opciones. La rueda de minutos se acorta sola cuando la hora es 23.
 */
const ULTIMA_HORA = 23;
const ULTIMO_MINUTO_DE_LA_ULTIMA_HORA = 40;

interface RuedaHoraPickerProps {
  horaInicial: number;
  minutoInicial: number;
  onCambiar: (hora: number, minuto: number) => void;
}

export function RuedaHoraPicker({ horaInicial, minutoInicial, onCambiar }: RuedaHoraPickerProps) {
  const { c } = useTheme();
  // La hora es estado y no ref porque la rueda de minutos DEPENDE de ella: a las 23 se corta en
  // :40. El minuto sigue siendo ref — nada se re-renderiza cuando cambia.
  const [hora, setHora] = useState(horaInicial);
  const minutoRef = useRef(Math.min(minutoInicial, horaInicial === ULTIMA_HORA
    ? ULTIMO_MINUTO_DE_LA_ULTIMA_HORA
    : 59));

  const minutosDisponibles = hora === ULTIMA_HORA
    ? MINUTOS.slice(0, ULTIMO_MINUTO_DE_LA_ULTIMA_HORA + 1)
    : MINUTOS;

  return (
    <View style={styles.contenedor}>
      {/* La franja cruza las DOS ruedas y los dos puntos a propósito: lo que se está eligiendo es
          una hora, no dos números sueltos. */}
      <FranjaCentral />
      <Rueda
        etiqueta="Hora (formato de 24 horas)"
        valores={HORAS}
        valorInicial={horaInicial}
        onCambiar={h => {
          // Subir a las 23 con :55 puesto dejaría un valor que el servidor rechaza: se recorta al
          // último minuto válido, y la rueda de minutos se vuelve a montar mostrando ese recorte.
          if (h === ULTIMA_HORA && minutoRef.current > ULTIMO_MINUTO_DE_LA_ULTIMA_HORA) {
            minutoRef.current = ULTIMO_MINUTO_DE_LA_ULTIMA_HORA;
          }
          setHora(h);
          onCambiar(h, minutoRef.current);
        }}
      />
      <Text style={[styles.dosPuntos, { color: c.textStrong }]}>:</Text>
      <Rueda
        // `Rueda` es no controlada: solo se reposiciona al montarse. La key la remonta cuando la
        // lista de minutos cambia de largo, que es lo único que la puede dejar desincronizada.
        etiqueta="Minutos"
        key={`minutos-${minutosDisponibles.length}`}
        valores={minutosDisponibles}
        valorInicial={minutoRef.current}
        onCambiar={m => {
          minutoRef.current = m;
          onCambiar(hora, minutoRef.current);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dosPuntos: {
    fontFamily: 'Jost_700Bold',
    fontSize: 26,
    marginBottom: 2,
  },
});
