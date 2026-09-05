import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { Icon } from '../../../components/Icon';
import { useRenasiaChat } from '../hooks/useRenasiaChat';
import { MensajeBurbuja } from '../components/MensajeBurbuja';
import { AGENTES, nombreVisible } from '../data/agentes';
import type { AgenteRenasia } from '../types/renasia.types';

export interface RenasiaPanelProps {
  /**
   * D-102: con cuál de los dos asistentes habla este panel. Decide el nombre en el header, el
   * historial que se carga y el prompt que usa el backend. `RenasiaLauncher` monta el
   * acompañante (`COMPANION`); `ChatDelCurso` monta a Sparkie (`COURSE_TUTOR`).
   */
  agent: AgenteRenasia;
  visible: boolean;
  onClose: () => void;
  /**
   * Solo para `COURSE_TUTOR`: el curso/lección sobre el que se pregunta. `etiqueta` se muestra
   * bajo el nombre para que la persona sepa sobre qué está preguntando; `ambito` viaja al backend
   * en un campo aparte (`scope`, D-100) y va al prompt de sistema, nunca dentro de la pregunta;
   * `cursoId` acota el contexto que el backend recupera a las lecciones de ese curso.
   */
  contexto?: { etiqueta: string; ambito: string; cursoId?: string | null };
}

/** Altura mínima de controles táctiles (AGENTS.md: 48–52px para pulsación cómoda con una mano). */
const ALTURA_MIN_CONTROL = 50;

/**
 * Panel de conversación con uno de los dos asistentes del programa (D-102). Autocontenido: se
 * monta donde se decida pasándole `agent`, `visible` y `onClose`. A propósito NO está conectado
 * a ninguna pantalla de tab — AGENTS.md prohíbe tocar `HoyScreen`, `PlanScreen`, `TrainingScreen`,
 * `ComunidadScreen`, `YoScreen` o `RootNavigator.tsx`; la entrada la cuelgan `RenasiaLauncher`
 * (flotante, acompañante) y `ChatDelCurso` (al pie del curso, Sparkie).
 */
export function RenasiaPanel({ agent, visible, onClose, contexto }: RenasiaPanelProps) {
  const { c, t } = useTheme();
  const { isTablet, horizontalPadding, rs } = useResponsive();
  const perfil = AGENTES[agent];
  const nombre = nombreVisible(agent);
  const {
    mensajes,
    cargandoHistorial,
    errorHistorial,
    cargandoMasAntiguos,
    hayMasAntiguos,
    enviando,
    cargarHistorialInicial,
    cargarMasAntiguos,
    enviarPregunta,
    reintentarMensaje,
  } = useRenasiaChat({ agent, courseId: contexto?.cursoId, ambito: contexto?.ambito });

  const [texto, setTexto] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Soporte para gestos nativos de Android / Xiaomi: deslizar desde el borde (o el botón físico
  // de retroceso) cierra el panel en vez de dejar que el sistema navegue por debajo de él.
  useSystemBackHandler(() => {
    onClose();
    return true;
  }, visible);

  useEffect(() => {
    if (visible) {
      void cargarHistorialInicial();
    }
    // Solo al abrir: no queremos recargar el historial completo en cada re-render del panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleEnviar = () => {
    const paraEnviar = texto;
    if (!paraEnviar.trim() || enviando) return;
    setTexto('');
    void enviarPregunta(paraEnviar);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: c.divider, paddingHorizontal: horizontalPadding }]}
        >
          <View style={styles.headerTitulo}>
            <View style={[styles.medallion, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
              <Icon name="chat" size={18} color={c.gold} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[t.sectionTitle, { color: c.textStrong, fontSize: 13 }]}>{nombre}</Text>
              <Text style={[t.small, { color: c.textSoft, fontSize: 12.5 }]} numberOfLines={1}>
                {contexto ? `Sobre: ${contexto.etiqueta}` : perfil.subtitulo}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Cerrar ${nombre}`}
            style={[styles.cerrarBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
          >
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>✕</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.scrollContent,
              {
                flexGrow: 1,
                paddingBottom: 36,
                paddingHorizontal: horizontalPadding,
                maxWidth: isTablet ? 560 : undefined,
                alignSelf: isTablet ? 'center' : 'stretch',
                width: isTablet ? '100%' : undefined,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {cargandoHistorial ? (
              <View style={styles.centro}>
                <ActivityIndicator color={c.gold} />
              </View>
            ) : errorHistorial ? (
              <View style={styles.centro}>
                <Text style={[t.body, { color: c.textSoft, textAlign: 'center', fontSize: 14.5 }]}>
                  {errorHistorial}
                </Text>
                <Pressable
                  onPress={() => void cargarHistorialInicial()}
                  style={[styles.reintentarHistorialBtn, { borderColor: c.gold }]}
                >
                  <Text style={[t.micro, { color: c.gold, fontSize: 11.5, fontWeight: '700' }]}>
                    REINTENTAR
                  </Text>
                </Pressable>
              </View>
            ) : mensajes.length === 0 ? (
              <View style={styles.centro}>
                <View style={[styles.medallionGrande, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
                  <Icon name="chat" size={28} color={c.gold} />
                </View>
                <Text style={[t.cardTitle, { color: c.textStrong, textAlign: 'center', marginTop: 14 }]}>
                  {perfil.vacioTitulo}
                </Text>
                <Text
                  style={[
                    t.body,
                    { color: c.textSoft, textAlign: 'center', marginTop: 8, fontSize: 14.5, lineHeight: 21 },
                  ]}
                >
                  {perfil.vacioParrafo}
                </Text>
              </View>
            ) : (
              <>
                {hayMasAntiguos && (
                  <Pressable
                    onPress={() => void cargarMasAntiguos()}
                    disabled={cargandoMasAntiguos}
                    style={styles.cargarMasBtn}
                  >
                    {cargandoMasAntiguos ? (
                      <ActivityIndicator size="small" color={c.gold} />
                    ) : (
                      <Text style={[t.micro, { color: c.gold, fontSize: 11, fontWeight: '700' }]}>
                        VER MENSAJES ANTERIORES
                      </Text>
                    )}
                  </Pressable>
                )}
                {mensajes.map(m => (
                  <MensajeBurbuja
                    key={m.id}
                    mensaje={m}
                    nombreAsistente={nombre}
                    onReintentar={reintentarMensaje}
                  />
                ))}
              </>
            )}
          </ScrollView>

          {/* Input */}
          <View
            style={[styles.inputBar, { borderTopColor: c.divider, paddingHorizontal: horizontalPadding }]}
          >
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder={`Escribile a ${nombre}…`}
              placeholderTextColor={c.textSoft}
              style={[
                styles.input,
                { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text, fontSize: rs(14.5) },
              ]}
              multiline
              editable={!enviando}
              onSubmitEditing={handleEnviar}
              blurOnSubmit={false}
            />
            <Pressable
              onPress={handleEnviar}
              disabled={enviando || !texto.trim()}
              accessibilityRole="button"
              accessibilityLabel="Enviar pregunta"
              style={[
                styles.enviarBtn,
                { backgroundColor: c.gold, opacity: enviando || !texto.trim() ? 0.5 : 1 },
              ]}
            >
              {enviando ? (
                <ActivityIndicator size="small" color={c.onGold} />
              ) : (
                <Icon name="send" size={18} color={c.onGold} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerTitulo: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  medallion: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionGrande: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrarBtn: {
    width: ALTURA_MIN_CONTROL,
    height: ALTURA_MIN_CONTROL,
    borderRadius: ALTURA_MIN_CONTROL / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingTop: 18 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 12,
  },
  reintentarHistorialBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    minHeight: ALTURA_MIN_CONTROL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cargarMasBtn: {
    alignSelf: 'center',
    minHeight: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginBottom: 6,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: ALTURA_MIN_CONTROL,
    maxHeight: 120,
  },
  enviarBtn: {
    width: ALTURA_MIN_CONTROL,
    height: ALTURA_MIN_CONTROL,
    borderRadius: ALTURA_MIN_CONTROL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
