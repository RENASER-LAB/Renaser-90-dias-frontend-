import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { abrirAjustesDeLaUbicacion, useUbicacionAproximada } from '../servicios/ubicacionAproximada';
import { TEXTOS_DE_LA_CARRERA } from '../utils/textosDeLaCarrera';

/**
 * El aviso de «ubicación aproximada» de la pantalla de la carrera (spec 042 FR-056, #236): una línea corta y el botón que abre los
 * ajustes de la app, donde se activa la ubicación precisa. Solo se ve si el permiso está dado pero es aproximado; con la ubicación
 * precisa, o sin permiso, no ocupa lugar (ni el espacio entre filas de la pantalla). Al volver de los ajustes se vuelve a leer y
 * desaparece solo. `estilo` deja a la pantalla esconderlo detrás de la cuenta 3, 2, 1, como el resto de lo que no es el mapa.
 */
export function AvisoDeUbicacionAproximada({ estilo }: { estilo?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const aproximada = useUbicacionAproximada();
  if (!aproximada) return null;
  return (
    <View testID="aviso-de-ubicacion-aproximada" style={[estilos.fila, { backgroundColor: c.goldWash, borderColor: c.borderStrong }, estilo]}>
      <Icon name="alertTriangle" size={TAMANO_ICONO.normal} color={c.goldInk} />
      <Text style={[estilos.texto, { color: c.goldInk }]}>{TEXTOS_DE_LA_CARRERA.ubicacionAproximada}</Text>
      <Presionable
        onPress={() => void abrirAjustesDeLaUbicacion()}
        accessibilityRole="button"
        accessibilityLabel={TEXTOS_DE_LA_CARRERA.abrirAjustesAccesible}
        style={estilos.boton}
      >
        <Text style={[estilos.textoBoton, { color: c.goldInk }]}>{TEXTOS_DE_LA_CARRERA.abrirAjustes}</Text>
      </Presionable>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingLeft: 14, minHeight: 48 },
  texto: { flexShrink: 1, flexGrow: 1, flexBasis: 160, fontFamily: fuentes.media, fontSize: 14 },
  boton: { minHeight: 48, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  textoBoton: { fontFamily: fuentes.negrita, fontSize: 14 },
});
