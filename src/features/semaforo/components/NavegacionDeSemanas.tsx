import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { LecturaPorSemana } from '../hooks/useLecturaPorSemana';
import { rotuloDeVentana } from '../utils/lecturaDelSemaforo';
import { semanaSiguiente } from '../utils/semanasDelSemaforo';

type Navegable = Pick<
  LecturaPorSemana<unknown>,
  'posicion' | 'rango' | 'cerrada' | 'puedeAnterior' | 'puedeSiguiente' | 'anterior' | 'siguiente' | 'inicio'
>;

/**
 * Qué días se están mirando, y cómo ir a la semana anterior o a la siguiente.
 *
 * El rango va siempre escrito (la fecha de corte que pide el contrato, §5), en el medio y en letra
 * de lectura; las flechas, a los costados, de 48 × 48. Desde la semana cerrada más nueva, "siguiente"
 * vuelve a los últimos 7 días, y lo dice.
 *
 * Solo props: no sabe si mira un grupo o el resumen de todos.
 */
export function NavegacionDeSemanas({ lectura }: { lectura: Navegable }) {
  const { c, t } = useTheme();
  const { titulo, rango } = rotuloDeVentana(lectura.posicion.modo, lectura.rango, lectura.cerrada);
  const siguienteVuelveAVigente = semanaSiguiente(lectura.posicion, lectura.inicio.hastaVigente)?.modo === 'vigente';

  return (
    <View style={estilos.fila}>
      <Flecha
        icono="arrowLeft"
        etiqueta="Semana anterior"
        habilitada={lectura.puedeAnterior}
        onPress={lectura.anterior}
      />
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
      <Flecha
        icono="arrow"
        etiqueta={siguienteVuelveAVigente ? 'Volver a los últimos 7 días' : 'Semana siguiente'}
        habilitada={lectura.puedeSiguiente}
        onPress={lectura.siguiente}
      />
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
    <Pressable
      onPress={onPress}
      disabled={!habilitada}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: !habilitada }}
      style={({ pressed }) => [
        estilos.flecha,
        {
          borderColor: c.border,
          backgroundColor: pressed ? c.goldWash : c.cardBg,
          /* Deshabilitada se sigue viendo, más tenue: que desaparezca haría saltar el rango. */
          opacity: habilitada ? 1 : 0.35,
        },
      ]}
    >
      <Icon name={icono} size={16} color={c.goldInk} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  centro: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  /* 48 × 48: el mínimo cómodo para una sola mano (AGENTS.md §4, contrato §5). */
  flecha: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
