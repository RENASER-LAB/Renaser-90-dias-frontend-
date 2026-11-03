import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { useFormacionDeLaSesion } from '../context/FormacionContext';
import { MENSAJE_SIN_FORMACION } from '../utils/vistaDeFormacion';

/**
 * Una persona del personal a quien Administración todavía no le asignó una formación (spec 022, historia 5, escenario 6): ve este
 * aviso y nada más. «Volver a revisar» relee la sesión (Administración pudo asignársela hace un momento) y «Cerrar sesión» le deja
 * salir. El servidor no le mostraría nada de ninguna formación de todos modos: esto solo evita una app vacía sin explicación.
 */
export function SinFormacionScreen() {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { recargar } = useFormacionDeLaSesion();
  const { logout } = useAuth();
  const [revisando, setRevisando] = useState(false);

  useSystemBackHandler(() => true);

  const revisar = async () => {
    setRevisando(true);
    try {
      await recargar();
    } finally {
      setRevisando(false);
    }
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: c.bg }]}>
      <ScrollView
        contentContainerStyle={[
          estilos.contenido,
          { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' },
        ]}
      >
        <Text accessibilityRole="header" style={[t.screenTitle, { color: c.textStrong }]}>
          Todavía no tienes formación
        </Text>
        <Text style={[t.body, estilos.cuerpo, { color: c.textSoft }]}>{MENSAJE_SIN_FORMACION}</Text>
        <View style={estilos.botones}>
          <BotonPrincipal etiqueta="Volver a revisar" onPress={() => void revisar()} cargando={revisando} />
          <BotonSecundario etiqueta="Cerrar sesión" onPress={() => void logout()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: { flexGrow: 1, justifyContent: 'center', gap: 16, paddingVertical: 36 },
  cuerpo: { fontSize: 17, lineHeight: 25 },
  botones: { gap: 12, marginTop: 8 },
});
