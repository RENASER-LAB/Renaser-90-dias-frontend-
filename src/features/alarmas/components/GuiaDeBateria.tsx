import React from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { BotonSecundario } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * Yo → Alarmas: cómo evitar que el teléfono borre las alarmas (D-217, 2026-09-28).
 *
 * Probado en el emulador el 28/09 con `dumpsys alarm`: detener la app a la fuerza —lo que hacen Xiaomi,
 * Samsung, Huawei y Oppo al cerrarla desde recientes o para ahorrar batería— borra la alarma de mañana
 * hasta que se vuelve a abrir la app. En ese estado **tampoco llega el push del servidor**: Android no le
 * entrega nada a una app detenida. Lo único que lo evita es que el teléfono no la detenga.
 *
 * El botón abre los ajustes de Renaser; desde ahí se entra a Batería. No hay una pantalla común a todas
 * las marcas para ir directo a «Sin restricciones».
 */
/** Dos frases como máximo (dueño, 28/09: «mucho texto marea al usuario»). */
export const TEXTO_DE_BATERIA =
  'Para que tus alarmas no se borren, en Batería elige «Sin restricciones» y no cierres Renaser a la fuerza.';

export function GuiaDeBateria() {
  const { c } = useTheme();
  if (Platform.OS !== 'android') return null;

  const abrir = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('No se pudo abrir', 'Abre los Ajustes del teléfono, entra a Apps → Renaser → Batería.');
    }
  };

  return (
    <View style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <Text style={[estilos.cuerpo, { color: c.textSoft }]}>{TEXTO_DE_BATERIA}</Text>
      <BotonSecundario etiqueta="Abrir ajustes" onPress={() => void abrir()} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  cuerpo: { fontFamily: 'Jost_400Regular', fontSize: 17, lineHeight: 24 },
});
