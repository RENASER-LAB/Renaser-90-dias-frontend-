import React, { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { BotonPrincipal } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { estadoDeAlarmaExacta, type EstadoDeAlarmaExacta } from '../alarmaExactaNativa';
import { abrirPermisoDeAlarmasExactas } from '../pedirAlarmaExacta';

/**
 * Yo → Alarmas: el estado REAL de «Alarmas y recordatorios» (Android 12+). Sin ese permiso, Android 14+
 * deja sonar las alarmas hasta ~40 minutos tarde (E-314).
 *
 * > **Cambiado 2026-09-28 (D-217).** Era un aviso fijo, siempre visible, porque la app no podía saber si
 * > el permiso estaba dado. Ahora lo lee del sistema (`modules/renaser-alarmas`) y lo vuelve a leer al
 * > volver de los ajustes. Con un APK sin el módulo se ve como antes.
 */
export function AvisoAlarmaExacta() {
  const { c } = useTheme();
  const [estado, setEstado] = useState<EstadoDeAlarmaExacta>(() => estadoDeAlarmaExacta());

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', e => {
      if (e === 'active') setEstado(estadoDeAlarmaExacta());
    });
    return () => suscripcion.remove();
  }, []);

  if (estado === 'no_hace_falta' || Platform.OS !== 'android') return null;

  if (estado === 'concedido') {
    return (
      <View style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        <Text style={[estilos.titulo, { color: c.textStrong }]}>Alarmas a la hora exacta: activado ✓</Text>
        <Text style={[estilos.cuerpo, { color: c.textSoft }]}>Tus recordatorios suenan a la hora que elegiste.</Text>
      </View>
    );
  }

  const abrir = async () => {
    const abierta = await abrirPermisoDeAlarmasExactas();
    if (abierta === 'ninguna') {
      Alert.alert(
        'No se pudo abrir',
        'Abre los Ajustes del teléfono, busca «Alarmas y recordatorios» y permítelo para Renaser.',
      );
    }
  };

  return (
    <View style={[estilos.caja, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
      <Text style={[estilos.titulo, { color: c.textStrong }]}>
        {estado === 'denegado' ? 'Tus alarmas pueden llegar tarde' : 'Alarmas a la hora exacta'}
      </Text>
      <Text style={[estilos.cuerpo, { color: c.textStrong }]}>
        {estado === 'denegado'
          ? 'El permiso «Alarmas y recordatorios» está apagado: tus recordatorios pueden sonar hasta 40 minutos tarde. Toca el botón, activa el interruptor y vuelve.'
          : 'Para que tus alarmas suenen a la hora exacta, permite «Alarmas y recordatorios». En la lista que se abre, toca Renaser y actívalo. Si ya lo hiciste, no hace falta nada más.'}
      </Text>
      <BotonPrincipal etiqueta="Permitir alarmas a la hora exacta" onPress={() => void abrir()} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 10 },
  titulo: { fontFamily: 'Jost_700Bold', fontSize: 19, lineHeight: 25 },
  cuerpo: { fontFamily: 'Jost_400Regular', fontSize: 17, lineHeight: 24 },
});
