import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '../../../components/GoldButton';
import { Icon } from '../../../components/Icon';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import type { PropsRegistroConFotoModal } from '../hooks/useRegistroConFoto';
import { PREGUNTA_DEL_REGISTRO, respuestaValida } from '../utils/registroConFoto';

/**
 * La pantalla partida del REGISTRO CON FOTO (pedido del dueño, 2026-09-26): arriba la foto que se
 * acaba de sacar, abajo "¿Qué sentiste?" con su campo y el botón para terminar. La pregunta sale
 * SOLO en los tres rituales (D-172), y ahí la respuesta es obligatoria; en los demás no hay pregunta
 * y la foto se registra sola apenas aparece (`useRegistroConFoto`). Se puede volver a sacar la foto
 * sin perder lo escrito.
 *
 * Solo dibuja: el estado y la subida viven en `useRegistroConFoto`, y es el mismo componente en
 * Training, en el chat del acompañante y en la hoja del orbe.
 *
 * **Dónde se monta importa en iOS:** si se abre desde algo que ya es un `Modal` (el chat), tiene
 * que montarse DENTRO de ese modal; montado al lado, iOS no lo presenta.
 */
export function RegistroConFotoModal({
  registro,
  respuesta,
  enviando,
  error,
  onCambiarRespuesta,
  onRetomarFoto,
  onTerminar,
  onCerrar,
}: PropsRegistroConFotoModal) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();
  const visible = registro !== null;
  const conPregunta = registro?.conPregunta ?? true;
  const puedeTerminar = respuestaValida(respuesta, conPregunta) && !enviando;

  // AGENTS.md §6: el gesto lateral cierra esta pantalla, nunca la app. Durante el envío se consume
  // sin cerrar: cortar a mitad dejaría la foto subida y el registro sin cerrar.
  useSystemBackHandler(
    useCallback(() => {
      if (!enviando) onCerrar();
      return true;
    }, [enviando, onCerrar]),
    visible,
  );

  if (!registro) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={() => !enviando && onCerrar()} statusBarTranslucent>
      <SafeAreaView style={[estilos.raiz, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={estilos.raiz} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Mitad de arriba: la foto. */}
          <View style={[estilos.mitadFoto, { backgroundColor: c.cardBgAlt, borderBottomColor: c.border }]}>
            {registro.archivo ? (
              <Image
                source={{ uri: registro.archivo.uri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessibilityLabel={`Foto de ${registro.titulo}`}
              />
            ) : (
              <View style={estilos.sinFoto}>
                <Icon name="checkCircle" size={30} color={c.success} />
                <Text style={[t.body, { color: c.textStrong, textAlign: 'center' }]}>
                  Tu foto ya quedó guardada
                </Text>
                <Text style={[t.small, { color: c.textSoft, textAlign: 'center' }]}>
                  {conPregunta ? 'Solo falta tu respuesta para terminar.' : 'Solo falta registrarla.'}
                </Text>
              </View>
            )}
            {!registro.evidenciaYaSubida ? (
              <Pressable
                onPress={onRetomarFoto}
                disabled={enviando}
                accessibilityRole="button"
                accessibilityLabel="Tomar otra foto"
                style={[estilos.retomar, { backgroundColor: c.bg, borderColor: c.borderStrong, opacity: enviando ? 0.5 : 1 }]}
              >
                <Icon name="camera" size={16} color={c.goldInk} />
                <Text style={[t.micro, { color: c.textStrong, fontFamily: 'Jost_700Bold', fontSize: 11.5 }]}>
                  TOMAR OTRA
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Mitad de abajo: la pregunta. Un único scroll (AGENTS.md §2). */}
          <ScrollView
            style={estilos.raiz}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              estilos.contenido,
              {
                paddingHorizontal: horizontalPadding,
                maxWidth: contentMaxWidth,
                alignSelf: isTablet ? 'center' : 'stretch',
                width: isTablet ? '100%' : undefined,
              },
            ]}
          >
            <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]} numberOfLines={2}>
              {registro.titulo.toUpperCase()}
            </Text>
            {conPregunta ? (
              <>
                <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 24 }]}>{PREGUNTA_DEL_REGISTRO}</Text>
                <TextInput
                  value={respuesta}
                  onChangeText={onCambiarRespuesta}
                  placeholder="Cuéntalo con tus palabras"
                  placeholderTextColor={c.tabInactive}
                  multiline
                  editable={!enviando}
                  accessibilityLabel={PREGUNTA_DEL_REGISTRO}
                  style={[
                    estilos.campo,
                    { color: c.textStrong, borderColor: error ? c.danger : c.border, backgroundColor: c.cardBgAlt },
                  ]}
                />
              </>
            ) : (
              <Text style={[t.body, { color: c.textSoft }]}>
                {enviando ? 'Registrando tu foto…' : error ? 'No se pudo registrar tu foto.' : 'Tu foto está lista.'}
              </Text>
            )}

            {error ? (
              <View style={[estilos.error, { borderColor: c.danger }]}>
                <Text style={[t.small, { color: c.danger, fontSize: 13 }]}>{error}</Text>
              </View>
            ) : null}

            <GoldButton
              label={enviando ? 'REGISTRANDO…' : error ? 'REINTENTAR' : conPregunta ? 'TERMINAR' : 'REGISTRAR'}
              onPress={onTerminar}
              loading={enviando}
              disabled={!puedeTerminar}
            />
            {!respuestaValida(respuesta, conPregunta) ? (
              <Text style={[t.small, { color: c.textSoft, textAlign: 'center' }]}>
                Escribe qué sentiste para poder terminar.
              </Text>
            ) : null}

            <Pressable
              onPress={onCerrar}
              disabled={enviando}
              accessibilityRole="button"
              style={[estilos.cancelar, { borderColor: c.border, opacity: enviando ? 0.4 : 1 }]}
            >
              {enviando ? (
                <ActivityIndicator size="small" color={c.textSoft} />
              ) : (
                <Text style={[t.micro, { color: c.textSoft, fontFamily: 'Jost_700Bold', fontSize: 11.5 }]}>
                  CANCELAR
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  mitadFoto: { flex: 1, borderBottomWidth: 1, overflow: 'hidden', justifyContent: 'center' },
  sinFoto: { alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  retomar: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  contenido: { flexGrow: 1, gap: 12, paddingTop: 18, paddingBottom: 36 },
  campo: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Jost_400Regular',
    textAlignVertical: 'top',
  },
  error: { borderWidth: 1, borderRadius: 10, padding: 10 },
  cancelar: { minHeight: 48, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
