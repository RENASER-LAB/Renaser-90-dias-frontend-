import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonPeligro } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { coincideElCorreo } from '../../cuenta/utils/eliminarCuenta';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { eliminarCuentaDePersona } from '../api/adminApi';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { mensajeDeFallo } from '../utils/mensajes';

/**
 * Administración → ficha → «Eliminar cuenta» (backend D-243). Confirmación fuerte: hay que ESCRIBIR
 * el correo de la persona, y el botón final se habilita solo si coincide (sin distinguir mayúsculas
 * ni espacios en los extremos). El servidor vuelve a comprobarlo (400 si no coincide).
 *
 * Es una vista de la ficha y no un modal, por el mismo motivo que «Cambiar día del programa»: en la
 * web un diálogo encima de otro `Modal` no siempre queda arriba.
 */
export function EliminarCuentaAdminScreen({
  personaId,
  nombre,
  correo,
  onVolver,
  onEliminada,
}: {
  personaId: string;
  nombre: string;
  correo: string;
  onVolver: () => void;
  onEliminada: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [escrito, setEscrito] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const coincide = coincideElCorreo(escrito, correo);

  const eliminar = async () => {
    if (!coincide) return;
    setEnviando(true);
    setError(null);
    try {
      await eliminarCuentaDePersona(personaId, escrito.trim());
      onEliminada();
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudo eliminar la cuenta.'));
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Eliminar cuenta" subtitulo={nombre} onVolver={onVolver} />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 16,
        }}
      >
        <Text style={[t.body, { color: c.danger, fontSize: 17, fontFamily: 'Jost_500Medium' }]}>
          Se borra ahora y para siempre. No se puede deshacer.
        </Text>
        <View style={{ gap: 6 }}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 16 }]}>
            Escribe su correo para confirmar: <Text style={{ fontFamily: 'Jost_700Bold' }}>{correo}</Text>
          </Text>
          <TextInput
            value={escrito}
            onChangeText={v => {
              setEscrito(v);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!enviando}
            accessibilityLabel="Correo de la persona"
            style={[t.body, estilos.campo, { backgroundColor: c.cardBg, borderColor: error ? c.danger : c.border, color: c.text, fontSize: 17 }]}
          />
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>
            {error}
          </Text>
        ) : null}
        <BotonPeligro
          etiqueta="Eliminar cuenta"
          onPress={() => void eliminar()}
          cargando={enviando}
          deshabilitado={!coincide}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  campo: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 52, fontSize: 17 },
});
