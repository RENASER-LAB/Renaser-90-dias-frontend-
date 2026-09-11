import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import type { FalloCelula } from '../hooks/useCelulaQueAcompano';
import type { VistaCelula } from '../hooks/useCelulaQueAcompano';

/**
 * La entrada al grupo desde Hoy, solo para quien acompaña una célula.
 *
 * Va como tarjeta y NO como sexta pestaña: AGENTS.md §1 prohíbe alterar los cinco tabs, y con
 * razón — el mentor sigue siendo un aprendiz, y meterle una pestaña permanente cambiaría la
 * app para él en todas las pantallas, no solo donde acompaña.
 *
 * NO pide los datos: los recibe. La pantalla del grupo y esta tarjeta se pintan desde la MISMA
 * lectura, hecha una sola vez en Hoy. Cuando cada una llamaba a su propio hook había dos
 * peticiones y, peor, dos verdades: bastaba que una fallara para que la tarjeta dijera una cosa
 * y el grupo otra.
 */
export function TarjetaMentorHoy({
  onAbrir,
  vista,
  cargando,
  fallo,
}: {
  onAbrir: () => void;
  vista: VistaCelula | null;
  cargando: boolean;
  fallo: FalloCelula | null;
}) {
  const { c, t } = useTheme();

  const pendientes = vista?.resumen.requierenSeguimiento ?? 0;
  const total = vista?.resumen.total ?? 0;
  /* Cuántos no se pueden juzgar. Si son todos, la tarjeta NO dice que estén bien: dice cuántos
     acompaña y nada más. Afirmar "nadie necesita seguimiento" sin un solo dato es la clase de
     frase que hace que un mentor no mire a alguien que sí lo necesitaba. */
  const sinJuzgar = vista?.resumen.sinDatos ?? 0;
  const sinDatos = Boolean(fallo) || !vista;

  const detalle =
    cargando ? 'Cargando tu grupo…'
    : fallo === 'no_disponible' ? 'El seguimiento del grupo aún no está disponible.'
    : fallo ? 'No pudimos cargar tu grupo.'
    : !vista || vista.todos.length === 0 ? 'Todavía no tienes aprendices asignados.'
    : pendientes === 0 && sinJuzgar === total
      ? `${total} ${total === 1 ? 'aprendiz' : 'aprendices'} · sin avance registrado todavía`
    : pendientes === 0 ? 'Nadie necesita seguimiento hoy.'
    : pendientes === 1 ? '1 aprendiz necesita seguimiento.'
    : `${pendientes} aprendices necesitan seguimiento.`;

  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={`Abrir mi grupo. ${detalle}`}
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
        <MicroLabel>MI GRUPO</MicroLabel>
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
