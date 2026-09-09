import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { useMiCelula } from '../hooks/useMiCelula';

/**
 * La entrada al grupo desde Hoy, solo para quien acompaña una célula.
 *
 * Va como tarjeta y NO como sexta pestaña: AGENTS.md §1 prohíbe alterar los cinco tabs, y con
 * razón — el mentor sigue siendo un aprendiz, y meterle una pestaña permanente cambiaría la
 * app para él en todas las pantallas, no solo donde acompaña.
 *
 * El resumen que muestra sale de los mismos datos que la pantalla del grupo, del mismo hook.
 * Si dijera un número calculado aparte, tarde o temprano diría uno distinto.
 */
export function TarjetaMentorHoy({ onAbrir }: { onAbrir: () => void }) {
  const { c, t } = useTheme();
  const { vista, cargando, fallo } = useMiCelula(true);

  const pendientes = vista?.resumen.requierenSeguimiento ?? 0;
  const sinDatos = Boolean(fallo) || !vista;

  const detalle =
    cargando ? 'Cargando tu célula…'
    : fallo === 'no_disponible' ? 'El seguimiento del grupo aún no está disponible.'
    : fallo ? 'No pudimos cargar tu célula.'
    : !vista || vista.todos.length === 0 ? 'Todavía no tienes aprendices asignados.'
    : pendientes === 0 ? 'Nadie necesita seguimiento hoy.'
    : pendientes === 1 ? '1 aprendiz necesita seguimiento.'
    : `${pendientes} aprendices necesitan seguimiento.`;

  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={`Abrir mi célula. ${detalle}`}
      style={({ pressed }) => [
        estilos.tarjeta,
        {
          /* Solo se resalta en dorado cuando hay algo que atender. Un borde permanente
             compite con la Roca del dia, que es la prioridad del aprendiz. */
          borderColor: !sinDatos && pendientes > 0 ? c.gold : c.border,
          backgroundColor: pressed ? c.goldWash : c.cardBg,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <MicroLabel>MI CÉLULA</MicroLabel>
        <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 5 }]} numberOfLines={1}>
          {vista?.celula.nombre ?? 'Acompañamiento'}
        </Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginTop: 3, lineHeight: 18 }]}>
          {detalle}
        </Text>
      </View>
      <View style={estilos.derecha}>
        {!sinDatos && pendientes > 0 ? (
          <View style={[estilos.contador, { backgroundColor: c.dangerWash }]}>
            <Text style={[t.micro, { color: c.danger, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
              {pendientes}
            </Text>
          </View>
        ) : (
          <Icon name="users" size={18} color={c.goldInk} />
        )}
        <Icon name="chevron" size={13} color={c.chevron} />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 16, padding: 16, minHeight: 56,
  },
  derecha: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 0 },
  contador: { minWidth: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
});
