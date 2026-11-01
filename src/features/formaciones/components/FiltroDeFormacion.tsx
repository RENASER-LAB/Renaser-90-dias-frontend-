import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CODIGOS_DE_FORMACION } from '../types/formaciones.types';
import { nombreCortoDeFormacion } from '../utils/nombreDeFormacion';

/**
 * El filtro «Formación» de las listas de Administración (Personas y Grupos; spec 022). Una fila de pastillas de 48: «Todas» y las
 * tres formaciones. `null` = todas. El estado no depende solo del color (la elegida va en negrita y con el borde dorado).
 * Cambia al instante, sin animación: se toca varias veces seguidas mientras se mira cada lista.
 */
export function FiltroDeFormacion({ valor, onCambiar }: { valor: string | null; onCambiar: (codigo: string | null) => void }) {
  const { c, t } = useTheme();
  const opciones: Array<{ codigo: string | null; etiqueta: string }> = [
    { codigo: null, etiqueta: 'Todas' },
    ...CODIGOS_DE_FORMACION.map(codigo => ({ codigo: codigo as string, etiqueta: nombreCortoDeFormacion(codigo) })),
  ];
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Formación" style={estilos.fila}>
      {opciones.map(opcion => {
        const activa = valor === opcion.codigo;
        return (
          <Pressable
            key={opcion.codigo ?? 'todas'}
            onPress={() => {
              if (activa) return;
              tacto.seleccion();
              onCambiar(opcion.codigo);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={opcion.codigo === null ? 'Todas las formaciones' : opcion.etiqueta}
            style={[
              estilos.pastilla,
              { borderColor: activa ? c.goldInk : c.border, backgroundColor: activa ? c.goldWash : 'transparent' },
            ]}
          >
            <Text style={[t.body, { color: activa ? c.goldInk : c.textSoft, fontSize: 16, fontFamily: activa ? fuentes.negrita : fuentes.regular }]}>
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pastilla: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
});
