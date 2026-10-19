import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * Qué semana de la persona se está mirando y cómo ir a la anterior o a la siguiente (spec 005, FR-010).
 *
 * Es la misma forma que `NavegacionDeSemanas` del semáforo —flechas de 48 × 48 a los costados y el rango
 * siempre escrito en el medio—, pero con otro lenguaje: aquí la semana es la de la persona, de sábado a
 * viernes, y no «los últimos 7 días». Solo props.
 *
 * Sin animación: se cambia de semana varias veces por visita y la pantalla tiene que responder al instante.
 * La flecha que no se puede usar (antes del programa, o en la semana en curso) se ve más tenue en vez de
 * desaparecer, para que el rango del medio no salte.
 */
export function NavegacionDeLaSemana({
  titulo,
  rango,
  puedeAnterior,
  puedeSiguiente,
  onAnterior,
  onSiguiente,
}: {
  titulo: string;
  rango: string | null;
  puedeAnterior: boolean;
  puedeSiguiente: boolean;
  onAnterior: () => void;
  onSiguiente: () => void;
}) {
  const { c, t } = useTheme();

  return (
    <View style={estilos.fila}>
      <Flecha icono="arrowLeft" etiqueta="Semana anterior" habilitada={puedeAnterior} onPress={onAnterior} />
      <View
        style={estilos.centro}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={rango ? `${titulo}. ${rango}` : titulo}
      >
        <Text style={[t.cardTitle, { color: c.textStrong, textAlign: 'center' }]}>{titulo}</Text>
        {rango ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22, textAlign: 'center' }]}>{rango}</Text>
        ) : null}
      </View>
      <Flecha icono="arrow" etiqueta="Semana siguiente" habilitada={puedeSiguiente} onPress={onSiguiente} />
    </View>
  );
}

function Flecha({
  icono,
  etiqueta,
  habilitada,
  onPress,
}: {
  icono: IconName;
  etiqueta: string;
  habilitada: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      disabled={!habilitada}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: !habilitada }}
      style={[
        estilos.flecha,
        { borderColor: c.border, backgroundColor: c.cardBg, opacity: habilitada ? 1 : 0.35 },
      ]}
    >
      <Icon name={icono} size={16} color={c.goldInk} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  centro: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  /* 48 × 48: el mínimo cómodo para una sola mano (AGENTS.md §4). */
  flecha: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
