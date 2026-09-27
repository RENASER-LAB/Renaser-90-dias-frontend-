import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { VistaDeEventos } from '../utils/vistaPreferida';
import { LETRA } from './piezas';

const OPCIONES: { vista: VistaDeEventos; etiqueta: string; icono: IconName }[] = [
  { vista: 'calendario', etiqueta: 'Calendario', icono: 'calendar' },
  { vista: 'tarjetas', etiqueta: 'Tarjetas', icono: 'stack' },
];

/**
 * «Calendario» | «Tarjetas»: las dos formas de ver los eventos que pidió el dueño el 2026-09-26.
 * Dos botones de 52 px a lo ancho; el elegido va relleno en dorado, como las medallas de Comunidad.
 */
export function SelectorDeVista({ vista, onCambiar }: { vista: VistaDeEventos; onCambiar: (v: VistaDeEventos) => void }) {
  const { c, space } = useTheme();
  return (
    <View accessibilityRole="tablist" style={estilos.fila}>
      {OPCIONES.map(op => {
        const elegida = op.vista === vista;
        return (
          <Pressable
            key={op.vista}
            onPress={() => onCambiar(op.vista)}
            accessibilityRole="tab"
            accessibilityState={{ selected: elegida }}
            accessibilityLabel={`Ver en ${op.etiqueta.toLowerCase()}`}
            style={({ pressed }) => [
              estilos.opcion,
              {
                borderRadius: space.radiusSm,
                borderColor: elegida ? c.gold : c.borderStrong,
                backgroundColor: elegida ? c.gold : c.cardBg,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Icon name={op.icono} size={20} color={elegida ? c.onGold : c.goldInk} strokeWidth={1.4} />
            <Text style={[estilos.texto, { color: elegida ? c.onGold : c.textStrong }]}>{op.etiqueta}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 10 },
  opcion: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  texto: { fontFamily: 'Jost_500Medium', fontSize: LETRA.titulo - 1 },
});
