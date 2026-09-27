import React from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { BotonPrincipal } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { abrirAlarmasYRecordatorios, hayQueRevisarAlarmaExacta } from '../permisoDeAlarmaExacta';

/**
 * Aviso grande de Yo → Alarmas: sin «Alarmas y recordatorios», Android 14+ deja sonar las alarmas
 * hasta ~40 minutos tarde. Siempre visible en Android 12+, porque la app no puede saber si ya está
 * concedido (`permisoDeAlarmaExacta.ts`).
 */
export function AvisoAlarmaExacta() {
  const { c } = useTheme();
  if (!hayQueRevisarAlarmaExacta(Platform.OS, Platform.Version)) return null;

  const abrir = async () => {
    const abierta = await abrirAlarmasYRecordatorios(Linking);
    if (abierta === 'ninguna') {
      Alert.alert(
        'No se pudo abrir',
        'Abre los Ajustes del teléfono, busca «Alarmas y recordatorios» y permítelo para Renaser.',
      );
    }
  };

  return (
    <View style={[estilos.caja, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
      <Text style={[estilos.titulo, { color: c.textStrong }]}>Alarmas a la hora exacta</Text>
      <Text style={[estilos.cuerpo, { color: c.textStrong }]}>
        Para que tus alarmas suenen a la hora exacta, permite «Alarmas y recordatorios». En la lista que
        se abre, toca Renaser y actívalo. Si ya lo hiciste, no hace falta nada más.
      </Text>
      <BotonPrincipal etiqueta="Revisar permiso de alarmas exactas" onPress={() => void abrir()} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 10 },
  titulo: { fontFamily: 'Jost_700Bold', fontSize: 19, lineHeight: 25 },
  cuerpo: { fontFamily: 'Jost_400Regular', fontSize: 17, lineHeight: 24 },
});
