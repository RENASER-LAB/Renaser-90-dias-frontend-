import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { BotonPeligro, BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { eliminarMiCuenta, enviarmeCodigoParaEliminar, leerComoSeConfirma } from '../api/cuentaApi';
import type { ComoSeConfirma } from '../api/cuentaSchemas';
import { confirmarEliminacion } from '../utils/confirmarEliminacion';
import {
  LARGO_DEL_CODIGO,
  codigoCompleto,
  limpiarCodigo,
  mensajeDelFalloAlEliminar,
  textoDeCuentaCerrada,
} from '../utils/eliminarCuenta';

/**
 * Yo → «Eliminar mi cuenta» (backend D-243; Google Play exige poder hacerlo desde la app).
 *
 * Pocas líneas: qué pasa al instante, cuántos días hay para arrepentirse y qué pasa después. Se
 * confirma con la contraseña o, si la cuenta entra solo con Google o Apple, con un código al correo.
 *
 * Tras el 200 el servidor ya cerró todas las sesiones: se muestra el aviso de cierre (el diálogo vive
 * en la raíz, así que sobrevive a la vuelta al login) y se llama a `onCerrada` (el `logout` local).
 */
export function EliminarMiCuentaScreen({ onVolver, onCerrada }: { onVolver: () => void; onCerrada: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const [como, setComo] = useState<ComoSeConfirma | null>(null);
  const [falloAlLeer, setFalloAlLeer] = useState(false);
  const [contrasena, setContrasena] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const leer = useCallback(async () => {
    setFalloAlLeer(false);
    try {
      setComo(await leerComoSeConfirma());
    } catch {
      setFalloAlLeer(true);
    }
  }, []);

  useEffect(() => {
    void leer();
  }, [leer]);

  const enviarCodigo = async () => {
    setEnviandoCodigo(true);
    setError(null);
    try {
      await enviarmeCodigoParaEliminar();
      setCodigoEnviado(true);
    } catch (e) {
      setError(mensajeDelFalloAlEliminar(e, 'app'));
    } finally {
      setEnviandoCodigo(false);
    }
  };

  const conContrasena = como?.confirmaCon === 'CONTRASENA';
  const listo = conContrasena ? contrasena.length > 0 : codigoEnviado && codigoCompleto(codigo);

  const eliminar = async () => {
    if (!como || !listo) return;
    const seguro = await confirmarEliminacion(
      '¿Eliminar tu cuenta?',
      `Se cierra ahora. Tienes ${como.diasDeGracia} días para pedir a soporte que la recupere.`,
    );
    if (!seguro) return;
    setEliminando(true);
    setError(null);
    try {
      const cerrada = await eliminarMiCuenta(conContrasena ? { contrasena } : { codigo });
      Alert.alert('Tu cuenta quedó cerrada', textoDeCuentaCerrada(cerrada));
      onCerrada();
    } catch (e) {
      setError(mensajeDelFalloAlEliminar(e, 'app'));
      setEliminando(false);
    }
  };

  const campo = [t.body, estilos.campo, { backgroundColor: c.cardBg, borderColor: error ? c.danger : c.border, color: c.text }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Eliminar mi cuenta" onVolver={onVolver} />
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
          gap: 18,
        }}
      >
        {!como && !falloAlLeer ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 24 }} /> : null}

        {falloAlLeer ? (
          <View style={{ gap: 12 }}>
            <Text style={[t.body, { color: c.danger, fontSize: 16 }]}>No se pudo cargar. Revisa tu conexión.</Text>
            <BotonSecundario etiqueta="Reintentar" onPress={() => void leer()} />
          </View>
        ) : null}

        {como ? (
          <>
            <View style={{ gap: 10 }}>
              <Linea texto="Tu cuenta se cierra al instante: ya no podrás entrar y sales de tus grupos, del ranking y de la comunidad." />
              <Linea texto={`Durante ${como.diasDeGracia} días puedes pedir a soporte que la recupere.`} />
              <Linea texto="Después, tus datos se borran para siempre." />
            </View>

            {conContrasena ? (
              <View style={{ gap: 6 }}>
                <Text style={[t.body, estilos.rotulo, { color: c.textStrong }]}>Tu contraseña</Text>
                <TextInput
                  value={contrasena}
                  onChangeText={v => {
                    setContrasena(v);
                    setError(null);
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!eliminando}
                  accessibilityLabel="Tu contraseña"
                  style={campo}
                />
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <BotonSecundario
                  etiqueta={codigoEnviado ? 'Enviarme otro código' : 'Enviarme un código'}
                  icono="mail"
                  onPress={() => void enviarCodigo()}
                  cargando={enviandoCodigo}
                  deshabilitado={eliminando}
                />
                {codigoEnviado ? (
                  <View style={{ gap: 6 }}>
                    <Text style={[t.body, estilos.rotulo, { color: c.textStrong }]}>Código que te llegó al correo</Text>
                    <TextInput
                      value={codigo}
                      onChangeText={v => {
                        setCodigo(limpiarCodigo(v));
                        setError(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={LARGO_DEL_CODIGO}
                      editable={!eliminando}
                      accessibilityLabel="Código de 6 dígitos"
                      style={[...campo, estilos.codigo]}
                    />
                  </View>
                ) : null}
              </View>
            )}

            {error ? (
              <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>
                {error}
              </Text>
            ) : null}

            <BotonPeligro
              etiqueta="Eliminar mi cuenta"
              onPress={() => void eliminar()}
              cargando={eliminando}
              deshabilitado={!listo}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Linea({ texto }: { texto: string }) {
  const { c, t } = useTheme();
  return <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>{texto}</Text>;
}

const estilos = StyleSheet.create({
  rotulo: { fontSize: 16, fontFamily: 'Jost_500Medium' },
  campo: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 52, fontSize: 17 },
  codigo: { fontVariant: ['tabular-nums'] },
});
