import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotonPeligro, BotonSecundario } from '../../../components/Legible';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { textoDelContador, type ResumenDeLaSeleccion } from '../utils/quitarPreguntas';

/**
 * La barra del modo «Quitar preguntas»: va fija arriba (no en el scroll ni abajo, donde está el botón de SER), con el contador y las dos
 * salidas. «Quitar» pide una confirmación única; «Cancelar» sale del modo sin tocar nada.
 */
export function BarraDeQuitar({
  resumen,
  ocupado,
  onCancelar,
  onQuitar,
}: {
  resumen: ResumenDeLaSeleccion;
  ocupado: boolean;
  onCancelar: () => void;
  onQuitar: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.barra, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
      <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22, fontFamily: fuentes.media }]}>
        {textoDelContador(resumen)}
      </Text>
      <View style={estilos.botones}>
        <View style={{ flex: 1 }}>
          <BotonSecundario etiqueta="Cancelar" onPress={onCancelar} deshabilitado={ocupado} />
        </View>
        <View style={{ flex: 1 }}>
          <BotonPeligro etiqueta="Quitar" onPress={onQuitar} cargando={ocupado} deshabilitado={resumen.marcadas === 0} />
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10, marginBottom: 8 },
  botones: { flexDirection: 'row', gap: 10 },
});
