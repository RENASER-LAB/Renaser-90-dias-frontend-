import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { Coordenada } from '../utils/geo';
import type { FiguraDelAvatar } from '../utils/fusionDelAvatar';
import { AvatarCaminante } from './AvatarCaminante';

export const INCLINACION = 60;
export const ACERCAMIENTO = 18;

/**
 * En la web no hay carrera (FR-001: solo Android). Esta versión existe para que el paquete web no cargue `react-native-maps`, que
 * no tiene web: dibuja el fondo neutro con el avatar.
 */
export function MapaDeCarrera(props: {
  ruta: readonly Coordenada[];
  posicion: Coordenada | null;
  rumbo: number;
  duracionMs: number;
  figura: FiguraDelAvatar;
  caminando: boolean;
  iniciales: string;
  fotoUrl?: string | null;
  chapa?: string | null;
  alto?: number;
}) {
  const { c } = useTheme();
  return (
    <View style={[estilos.contenedor, props.alto != null ? { height: props.alto } : { flex: 1 }, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
      <AvatarCaminante figura={props.figura} caminando={false} iniciales={props.iniciales} fotoUrl={props.fotoUrl} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
