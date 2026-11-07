import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { fuentes } from '../../../theme/fuentes';
import { BOTON_DE_LA_GUIA } from '../../alarmas/data/guiasPorMarca';
import { TITULO_DE_LA_GUIA_DE_LA_CARRERA } from '../servicios/guiaDeBateriaDeLaCarrera';

/** La hoja de la guía de batería antes de correr (spec 042, 2026-11-07). Cerrarla es «Ahora no». Quieta, sin animación propia. */
export function HojaGuiaDeBateria({
  visible,
  linea,
  alRevisar,
  alAhoraNo,
}: {
  visible: boolean;
  linea: string;
  alRevisar: () => void;
  alAhoraNo: () => void;
}) {
  const { c } = useTheme();
  return (
    <HojaDesdeAbajo visible={visible} alCerrar={alAhoraNo} titulo={TITULO_DE_LA_GUIA_DE_LA_CARRERA}>
      <View style={estilos.cuerpo}>
        <Text style={[estilos.linea, { color: c.textSoft }]}>{linea}</Text>
        <GoldButton label={BOTON_DE_LA_GUIA} onPress={alRevisar} />
        <Presionable onPress={alAhoraNo} accessibilityRole="button" accessibilityLabel="Ahora no" style={estilos.ahoraNo}>
          <Text style={[estilos.ahoraNoTexto, { color: c.textStrong }]}>Ahora no</Text>
        </Presionable>
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 12, paddingBottom: 12 },
  linea: { fontFamily: fuentes.regular, fontSize: 17, lineHeight: 24 },
  ahoraNo: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  ahoraNoTexto: { fontFamily: fuentes.media, fontSize: 16 },
});
