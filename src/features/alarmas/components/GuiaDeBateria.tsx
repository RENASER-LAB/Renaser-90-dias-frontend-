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
export const PASOS_DE_BATERIA: readonly string[] = [
  'Toca «Abrir ajustes de Renaser».',
  'Entra a «Batería» y elige «Sin restricciones» (en algunos teléfonos, «No optimizar»).',
  'En Xiaomi, Oppo o Huawei, activa también «Inicio automático».',
  'No cierres Renaser deslizándola desde las apps recientes ni uses «Forzar detención».',
];

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
      <Text style={[estilos.titulo, { color: c.textStrong }]}>Que el teléfono no apague tus alarmas</Text>
      <Text style={[estilos.cuerpo, { color: c.textSoft }]}>
        Algunos teléfonos cierran las apps para ahorrar batería, y con ellas se borran las alarmas.
      </Text>
      {PASOS_DE_BATERIA.map((paso, i) => (
        <Text key={paso} style={[estilos.cuerpo, { color: c.textStrong }]}>{`${i + 1}. ${paso}`}</Text>
      ))}
      <Text style={[estilos.cuerpo, { color: c.textSoft }]}>
        Si se cerró, ábrela una vez: las alarmas vuelven solas.
      </Text>
      <BotonSecundario etiqueta="Abrir ajustes de Renaser" onPress={() => void abrir()} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  titulo: { fontFamily: 'Jost_700Bold', fontSize: 19, lineHeight: 25 },
  cuerpo: { fontFamily: 'Jost_400Regular', fontSize: 17, lineHeight: 24 },
});
