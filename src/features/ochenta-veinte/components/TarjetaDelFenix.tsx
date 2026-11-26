import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';

const FENIX = require('../../../../assets/rive/phoenix_alegre.png');

/**
 * La recomendación del fénix (spec 058 FR-016): una tarjeta oscura (clara en el tema oscuro) con el fénix, una línea de rótulo, el texto y, si
 * hay algo que reagendar, un botón. La usan «Tu 80/20» y «Planifica tus objetivos»; no sabe qué dice ni a dónde lleva el botón.
 */
export function TarjetaDelFenix({
  rotulo,
  texto,
  boton,
  alTocarElBoton,
}: {
  rotulo?: string;
  texto: string;
  boton?: string;
  alTocarElBoton?: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.textStrong }]}>
      <View style={estilos.fila}>
        <Image source={FENIX} style={estilos.fenix} resizeMode="contain" accessible={false} />
        <View style={estilos.texto}>
          {rotulo ? <Text style={[t.small, { color: c.bg, opacity: 0.8, fontFamily: fuentes.media, fontSize: 14 }]}>{rotulo}</Text> : null}
          <Text style={[t.body, { color: c.bg, fontFamily: fuentes.seminegrita, fontSize: 16, lineHeight: 23 }]}>{texto}</Text>
        </View>
      </View>
      {boton && alTocarElBoton ? (
        <Presionable
          onPress={alTocarElBoton}
          accessibilityRole="button"
          accessibilityLabel={boton}
          style={[estilos.boton, { backgroundColor: c.gold }]}
        >
          <Text style={[t.body, { color: c.onGold, fontFamily: fuentes.negrita, fontSize: 16 }]}>{boton}</Text>
        </Presionable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 16, padding: 16, gap: 12 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fenix: { width: 48, height: 48 },
  texto: { flex: 1, minWidth: 0, gap: 2 },
  boton: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
