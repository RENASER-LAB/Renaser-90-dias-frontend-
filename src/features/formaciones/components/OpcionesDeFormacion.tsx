import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { OpcionDeFormacion } from '../types/formaciones.types';

/**
 * Las formaciones entre las que elige el personal, una fila por cada una (spec 022). La activa lleva el ✓ y su nombre en negrita; el
 * estado no depende solo del color. Cada fila mide 64 de alto (más que el mínimo táctil de 48) y se hunde al apretar con
 * `Presionable`, como el resto de la app. Sin animación propia: se elige una vez al día o menos.
 */
export function OpcionesDeFormacion({
  opciones,
  activa,
  enCurso,
  onElegir,
}: {
  opciones: OpcionDeFormacion[];
  activa: string | null;
  /** El código que se está cambiando ahora: la fila lo dice y no se puede tocar otra mientras tanto. */
  enCurso: string | null;
  onElegir: (codigo: string) => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.lista}>
      {opciones.map(opcion => {
        const esLaActiva = opcion.codigo === activa;
        const cambiando = enCurso === opcion.codigo;
        return (
          <Presionable
            key={opcion.codigo}
            disabled={enCurso !== null}
            onPress={() => onElegir(opcion.codigo)}
            accessibilityRole="radio"
            accessibilityState={{ selected: esLaActiva, disabled: enCurso !== null }}
            accessibilityLabel={esLaActiva ? `${opcion.nombre}, la que usas ahora` : opcion.nombre}
            style={[
              estilos.fila,
              { borderColor: esLaActiva ? c.goldInk : c.border, backgroundColor: esLaActiva ? c.goldWash : c.cardBgAlt },
            ]}
          >
            <Text style={[t.cardTitle, estilos.nombre, { color: c.textStrong }]}>{opcion.nombre}</Text>
            {cambiando ? (
              <Text style={[t.small, { color: c.textSoft }]}>Cambiando…</Text>
            ) : esLaActiva ? (
              <Icon name="check" size={20} color={c.goldInk} />
            ) : null}
          </Presionable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: 10 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  nombre: { flex: 1, flexShrink: 1, fontSize: 17 },
});
