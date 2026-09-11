import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Palette } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import type { EstadoGrupoApi } from '../api/adminSchemas';

/**
 * Vigente / Programado / Cerrado / Sin período.
 *
 * Cada estado lleva su PALABRA además del color. El color solo sería una trampa para el público
 * de esta app —50 a 60 años, y una parte con daltonismo— y AGENTS.md §4 lo prohíbe: el estado se
 * lee, no se adivina por el tono.
 *
 * "Sin período" no es un dato faltante que haya que disimular: es lo que son todos los grupos
 * anteriores a que existieran las fechas, y significa que ese grupo no caduca.
 */
export function EstadoDeGrupo({ estado }: { estado: EstadoGrupoApi | null | undefined }) {
  const { c, t } = useTheme();
  if (!estado) return null;

  const { texto, color } = descripcion(estado, c);
  return (
    <View style={[estilos.pastilla, { borderColor: color }]}>
      <Text style={[t.body, { color, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3 }]}>
        {texto}
      </Text>
    </View>
  );
}

export function textoDeEstado(estado: EstadoGrupoApi | null | undefined): string {
  if (!estado) return '';
  return { VIGENTE: 'Vigente', PROGRAMADO: 'Programado', CERRADO: 'Cerrado', SIN_PERIODO: 'Sin período' }[estado];
}

function descripcion(estado: EstadoGrupoApi, c: Palette) {
  switch (estado) {
    /* Solo el vigente lleva el dorado. Si los cuatro tuvieran color propio, el color dejaria de
       significar "este es el que esta corriendo" y volveria a ser decoracion. */
    case 'VIGENTE':
      return { texto: 'VIGENTE', color: c.goldInk };
    case 'PROGRAMADO':
      return { texto: 'PROGRAMADO', color: c.textSoft };
    case 'CERRADO':
      return { texto: 'CERRADO', color: c.textSoft };
    default:
      return { texto: 'SIN PERÍODO', color: c.textSoft };
  }
}

const estilos = StyleSheet.create({
  pastilla: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
});
