import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { AlumnoConEstado } from '../types/mentor.types';

/**
 * Un aprendiz en la lista simple del grupo: la que se muestra solo cuando el semáforo no está
 * disponible (servidor sin la ruta, o sin permiso). Nombre e inicial, y se abre su ficha.
 *
 * > **Corregido 2026-09-26 (S-1).** Esta fila mostraba «Día por confirmar» y una cápsula de estado
 * > («Sin datos», «Al día», «N hábitos pendientes») calculada con campos que `mentorApi.ts` siempre
 * > mandaba en `null`: todas las filas decían lo mismo y nada de eso era cierto. El estado de cada
 * > persona lo dice ahora el semáforo del grupo; esta fila ya no afirma nada que no sepa.
 *
 * La inicial sustituye al avatar: no hay foto que descargar, así que tampoco hay recuadro vacío.
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

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${nombre}. Abrir su ficha.`}
      style={({ pressed }) => [
        estilos.fila,
        { borderBottomColor: c.divider, backgroundColor: pressed ? c.goldWash : 'transparent' },
      ]}
    >
      <View style={[estilos.inicial, { borderColor: c.border, backgroundColor: c.goldWash }]}>
        <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontFamily: 'Jost_700Bold' }]}>
          {inicial || '·'}
        </Text>
      </View>
      <Text style={[t.cardTitle, estilos.nombre, { color: c.textStrong, fontSize: 17 }]} numberOfLines={2}>
        {nombre}
      </Text>
      <Icon name="chevron" size={14} color={c.chevron} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  /* 56 px: por encima del mínimo de 48 que pide AGENTS.md §4. */
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 9, borderBottomWidth: 1 },
  inicial: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  nombre: { flex: 1, minWidth: 0 },
});
