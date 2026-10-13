import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { FormField } from '../../../components/FormField';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { BotonPrincipal } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { mensajeDeFallo } from '../../admin/utils/mensajes';
import { desbloquear } from '../api/soporteTiApi';
import { MINUTOS_DE_LA_CONSOLA } from '../estado/sesionDeConsola';
import { queHacerConElError } from '../utils/consola';

/**
 * La puerta de la consola Soporte TI (spec 002, plan §D6): la contraseña de la cuenta abre la consola por 15 minutos
 * sin usarla. Cinco contraseñas mal en 15 minutos traban el desbloqueo un rato (lo cuenta el servidor). Los errores van
 * en diálogo; la contraseña mal, además, marca el campo en rojo.
 */
export function DesbloqueoConsolaScreen({
  aviso,
  onDesbloqueada,
  onSalir,
}: {
  /** Por qué se volvió a bloquear (sesión vencida), si viene de adentro. */
  aviso: string | null;
  onDesbloqueada: () => void;
  onSalir: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useSystemBackHandler(() => {
    onSalir();
    return true;
  });

  const entrar = async () => {
    if (enviando) return;
    if (!contrasena) {
      tacto.error();
      setError('Escribe tu contraseña.');
      Alert.alert('Falta la contraseña', 'Escribe la contraseña de tu cuenta para abrir la consola.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await desbloquear(contrasena, 'CONSOLA');
      setContrasena('');
      tacto.logro();
      onDesbloqueada();
    } catch (e) {
      const que = queHacerConElError(e);
      tacto.error();
      if (que === 'contrasena_incorrecta') {
        setError('La contraseña no es correcta.');
        Alert.alert('Contraseña incorrecta', 'Revísala y vuelve a intentarlo.');
      } else if (que === 'demasiados_intentos') {
        Alert.alert('Demasiados intentos', `Espera ${MINUTOS_DE_LA_CONSOLA} minutos y vuelve a intentarlo.`);
      } else {
        Alert.alert('No se pudo abrir la consola', mensajeDeFallo(e, 'Vuelve a intentarlo en un momento.'));
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Soporte TI" subtitulo="Consola bloqueada" onVolver={onSalir} />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 36,
          paddingHorizontal: horizontalPadding,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 18,
        }}
      >
        {aviso ? (
          <View accessibilityLiveRegion="polite" style={[estilos.aviso, { backgroundColor: c.goldWash, borderColor: c.gold }]}>
            <Text style={[t.body, estilos.texto, { color: c.textStrong }]}>{aviso}</Text>
          </View>
        ) : null}
        <View style={estilos.fila}>
          <View style={[estilos.baldosa, { backgroundColor: c.goldWash }]}>
            <Icon name="lock" size={TAMANO_ICONO.grande} color={c.goldInk} />
          </View>
          <Text style={[t.body, estilos.texto, { color: c.textSoft, flex: 1 }]}>
            Aquí se prenden y se apagan las funciones de la app. La consola se bloquea sola a los {MINUTOS_DE_LA_CONSOLA}{' '}
            minutos sin usarla; para entrar, escribe tu contraseña.
          </Text>
        </View>
        <FormField
          label="Contraseña"
          value={contrasena}
          onChangeText={v => {
            setError(null);
            setContrasena(v);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void entrar()}
          icon="lock"
          error={error}
        />
        <BotonPrincipal etiqueta="Desbloquear" onPress={() => void entrar()} cargando={enviando} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  aviso: { borderWidth: 1, borderRadius: 14, padding: 14 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  baldosa: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  texto: { fontSize: 16, lineHeight: 23 },
});
