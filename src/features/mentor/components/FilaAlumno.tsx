import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { etiquetaDeMotivo } from '../reglas';
import type { AlumnoConEstado } from '../types/mentor.types';

/**
 * Un aprendiz en la lista de la célula.
 *
 * El estado va en **texto dentro de una cápsula**, no en un punto de color. Un punto rojo al
 * lado de un nombre no dice si son cuatro días sin entrar o un hábito suelto —que se resuelven
 * de forma muy distinta— y para quien no distingue rojo de verde no dice nada en absoluto.
 *
 * La inicial sustituye al avatar: no hay foto que descargar, así que tampoco hay recuadro
 * vacío cuando falla. Es el mismo motivo por el que la tarjeta del Muro dejó de pintar una
 * rejilla de miniaturas.
 */
export function FilaAlumno({ alumno, onPress }: { alumno: AlumnoConEstado; onPress: () => void }) {
  const { c, t } = useTheme();

  const nombre = alumno.nombre?.trim() || 'Aprendiz sin nombre';
  const inicial = nombre
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0] ?? '')
    .join('')
    .toUpperCase();

  const dia =
    alumno.diaPrograma === null ? 'Día por confirmar'
    : alumno.diaPrograma <= 0 ? 'Todavía no arrancó'
    : `Día ${alumno.diaPrograma} de 90`;

  /* Solo el motivo más urgente en la fila. Los demás están en su detalle: apilar tres cápsulas
     hace que ninguna se lea, y la fila crece hasta romper la lista. */
  const principal = alumno.motivos[0];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        `${nombre}. ${dia}.` +
        (principal ? ` ${etiquetaDeMotivo(principal)}.` : ' Al día.') +
        (alumno.motivos.length > 1 ? ` Y ${alumno.motivos.length - 1} señal más.` : '')
      }
      style={({ pressed }) => [
        estilos.fila,
        { borderBottomColor: c.divider, backgroundColor: pressed ? c.goldWash : 'transparent' },
      ]}
    >
      <View style={[estilos.inicial, { borderColor: c.border, backgroundColor: c.goldWash }]}>
        <Text style={[t.micro, { color: c.goldInk, fontSize: 12, fontFamily: 'Jost_700Bold' }]}>
          {inicial || '·'}
        </Text>
      </View>

      <View style={estilos.cuerpo}>
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14.5 }]} numberOfLines={1}>
          {nombre}
        </Text>
        <Text style={[t.micro, { color: c.textSoft, fontSize: 11.5, marginTop: 2 }]} numberOfLines={1}>
          {dia}
        </Text>
      </View>

      <View style={estilos.derecha}>
        {principal ? (
          <View style={[estilos.capsula, { backgroundColor: c.dangerWash }]}>
            <Text
              style={[t.micro, { color: c.danger, fontSize: 10.5, fontFamily: 'Jost_700Bold' }]}
              numberOfLines={1}
            >
              {etiquetaDeMotivo(principal)}
            </Text>
          </View>
        ) : (
          <View style={[estilos.capsula, { backgroundColor: c.successWash }]}>
            <Text style={[t.micro, { color: c.success, fontSize: 10.5, fontFamily: 'Jost_700Bold' }]}>
              Al día
            </Text>
          </View>
        )}
        <Icon name="chevron" size={12} color={c.chevron} />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  /* 56px: por encima del minimo de 48 que pide AGENTS.md 4, y suficiente para dos lineas
     de texto sin que la fila se sienta apretada al recorrer diez seguidas. */
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 9, borderBottomWidth: 1 },
  inicial: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cuerpo: { flex: 1, minWidth: 0 },
  /* `flexShrink: 0` en la capsula y `flexShrink: 1` en el nombre: si algo tiene que ceder
     espacio en una pantalla estrecha, que sea el nombre (que ademas se recorta con puntos
     suspensivos), no el estado, que es el dato por el que el mentor mira la lista. */
  derecha: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 },
  capsula: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, maxWidth: 132 },
});
