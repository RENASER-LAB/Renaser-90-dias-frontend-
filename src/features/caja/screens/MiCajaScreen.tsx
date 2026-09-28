import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { irAPestana } from '../../../navigation/navegacionRef';
import { mensajeDeError } from '../../../services/http/apiClient';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { avisar, confirmar } from '../../admin/utils/dialogo';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { confirmarQueLaRecibi, guardarMiDestino } from '../api/cajaApi';
import type { MiCaja } from '../api/cajaSchemas';
import {
  CAMPOS_DEL_DESTINO,
  destinoParaGuardar,
  formularioDelDestino,
  type FormularioDelDestino,
} from '../utils/contenidoYDestino';
import { etiquetaParaElAprendiz, pasosDeMiCaja, rastreoAbrible, textoDelEnvio } from '../utils/estadosDeCaja';

/**
 * Yo → «Tu Caja Renaser» (spec §7): los cinco pasos, «Ya la recibí» cuando está en camino, «¿Te la
 * enviamos a otro lugar?» antes del envío y, ya entregada, la invitación (opcional) a mostrarla en el
 * Muro. Pocas palabras, a pedido del dueño.
 */
export function MiCajaScreen({ caja, onVolver, onCambio }: { caja: MiCaja; onVolver: () => void; onCambio: () => Promise<void> }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [cambiandoDestino, setCambiandoDestino] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useSystemBackHandler(() => {
    if (cambiandoDestino) setCambiandoDestino(false);
    else onVolver();
    return true;
  });

  const estado = etiquetaParaElAprendiz(caja.estado);
  const pasos = pasosDeMiCaja(caja);
  const envio = textoDelEnvio(caja.envioDatos);
  const rastreo = rastreoAbrible(caja.envioDatos?.rastreoUrl);

  const laRecibi = async () => {
    if (!(await confirmar('¿Ya la recibiste?', undefined, { ok: 'Sí, ya la tengo' }))) return;
    setConfirmando(true);
    try {
      await confirmarQueLaRecibi();
      await onCambio();
    } catch (e) {
      avisar('No se pudo', mensajeDeError(e, 'Vuelve a intentar.'));
    } finally {
      setConfirmando(false);
    }
  };

  const publicarEnElMuro = () => {
    if (!irAPestana('Comunidad', { abrirComposerMuro: true })) avisar('Muro', 'Ábrelo desde Comunidad.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo="Tu Caja Renaser"
        onVolver={cambiandoDestino ? () => setCambiandoDestino(false) : onVolver}
      />
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
          gap: 22,
        }}
      >
        {cambiandoDestino ? (
          <OtroDestino
            caja={caja}
            onListo={async () => {
              setCambiandoDestino(false);
              await onCambio();
            }}
          />
        ) : (
          <>
            {estado ? (
              <Text accessibilityRole="header" style={[estilos.estado, { color: caja.estado === 'CON_PROBLEMA' ? c.danger : c.textStrong }]}>
                {estado}
              </Text>
            ) : null}

            <View style={{ gap: 0 }}>
              {pasos.map((paso, i) => (
                <View key={paso.estado} style={estilos.paso}>
                  <View style={estilos.columnaDelPunto}>
                    <View
                      style={[
                        estilos.punto,
                        {
                          backgroundColor: paso.hecho || paso.actual ? c.gold : 'transparent',
                          borderColor: paso.hecho || paso.actual ? c.gold : c.borderStrong,
                        },
                      ]}
                    >
                      {paso.hecho ? <Icon name="check" size={14} color={c.onGold} strokeWidth={2} /> : null}
                    </View>
                    {i < pasos.length - 1 ? (
                      <View style={[estilos.raya, { backgroundColor: paso.hecho ? c.gold : c.border }]} />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 18 }}>
                    <Text
                      style={[
                        t.body,
                        {
                          color: paso.hecho || paso.actual ? c.textStrong : c.textSoft,
                          fontSize: 17,
                          fontFamily: paso.actual ? 'Jost_700Bold' : 'Jost_400Regular',
                        },
                      ]}
                    >
                      {paso.etiqueta}
                    </Text>
                    {paso.fecha && (paso.hecho || paso.actual) ? (
                      <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>{paso.fecha}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>

            {envio ? <Text style={[t.body, { color: c.textStrong, fontSize: 17 }]}>{envio}</Text> : null}
            {rastreo ? (
              <BotonSecundario etiqueta="Ver dónde va" icono="arrow" onPress={() => void Linking.openURL(rastreo)} />
            ) : null}

            {caja.puedeConfirmar ? (
              <BotonPrincipal etiqueta="Ya la recibí" icono="check" onPress={() => void laRecibi()} cargando={confirmando} />
            ) : null}

            {caja.puedeCambiarDestino ? (
              <BotonSecundario etiqueta="¿Te la enviamos a otro lugar?" onPress={() => setCambiandoDestino(true)} />
            ) : null}

            {caja.estado === 'ENTREGADA' ? (
              <View style={[estilos.muro, { borderColor: c.borderStrong, backgroundColor: c.goldWash }]}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 17 }]}>¿Nos muestras tu caja?</Text>
                <BotonSecundario etiqueta="Publicar una foto" icono="camera" onPress={publicarEnElMuro} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Otra dirección, otro número o quién la recibe. Todo opcional. */
function OtroDestino({ caja, onListo }: { caja: MiCaja; onListo: () => Promise<void> }) {
  const { c, t } = useTheme();
  const [formulario, setFormulario] = useState<FormularioDelDestino>(() => formularioDelDestino(caja.destino));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await guardarMiDestino(destinoParaGuardar(formulario));
      await onListo();
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo guardar.'));
      setGuardando(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Text accessibilityRole="header" style={[estilos.estado, { color: c.textStrong }]}>
        ¿A dónde te la enviamos?
      </Text>
      {CAMPOS_DEL_DESTINO.map(campo => (
        <View key={campo.clave} style={{ gap: 6 }}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>{campo.rotulo}</Text>
          <TextInput
            value={formulario[campo.clave]}
            onChangeText={v => setFormulario(f => ({ ...f, [campo.clave]: v }))}
            keyboardType={campo.teclado}
            accessibilityLabel={campo.rotulo}
            style={[t.body, estilos.campo, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }]}
          />
        </View>
      ))}
      {error ? (
        <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>
          {error}
        </Text>
      ) : null}
      <BotonPrincipal etiqueta="Guardar" onPress={() => void guardar()} cargando={guardando} />
    </View>
  );
}

const estilos = StyleSheet.create({
  estado: { fontFamily: 'Fraunces_600SemiBold', fontSize: 26, lineHeight: 32 },
  paso: { flexDirection: 'row', gap: 14 },
  columnaDelPunto: { alignItems: 'center', width: 26 },
  punto: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  raya: { width: 2, flex: 1, minHeight: 18 },
  muro: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  campo: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 52, fontSize: 17 },
});
