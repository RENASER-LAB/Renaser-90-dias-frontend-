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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { tacto } from '../../../utils/tacto';
import { propsDelCampoDelChat } from '../../chat/utils/campoDelChat';
import { useRenasiaChat } from '../hooks/useRenasiaChat';
import { useDictado } from '../hooks/useDictado';
import { useFrasesDeHabitos } from '../hooks/useFrasesDeHabitos';
import { LARGO_MAXIMO_PREGUNTA, recortarPregunta, unirDictado } from '../utils/dictado';
import { cambioAlRegistrar, cambioTrasIniciar, estadoVisibleDelPedido, solicitudDelPedido } from '../utils/pedidosDeFoto';
import { REGLAS_DE_ACCION } from '../../objetivos/utils/registroDeAccionConFoto';
import { useRegistroConFoto } from '../../habits/hooks/useRegistroConFoto';
import { RegistroConFotoModal } from '../../habits/components/RegistroConFotoModal';
import { MensajeBurbuja } from '../components/MensajeBurbuja';
import { FenixDeSerQuieto } from '../../fenix/components/FenixDeSerQuieto';
import { AGENTES, nombreVisible } from '../data/agentes';
import type { AgenteRenasia, PedidoDeFotoUI } from '../types/renasia.types';

export interface RenasiaPanelProps {
  /**
   * Con quién habla este panel: SER (`COMPANION`). D-255 retiró a Sparkie (`COURSE_TUTOR`), que
   * era el otro valor; `RenasiaLauncher` y `ChatDelCurso` montan los dos a SER.
   */
  agent: AgenteRenasia;
  visible: boolean;
  onClose: () => void;
  /**
   * Solo cuando se abre desde un curso: el curso/lección sobre el que se pregunta. `etiqueta` se muestra
   * bajo el nombre para que la persona sepa sobre qué está preguntando; `ambito` viaja al backend
   * en un campo aparte (`scope`, D-100) y va al prompt de sistema, nunca dentro de la pregunta;
   * `cursoId` acota el contexto que el backend recupera a las lecciones de ese curso.
   */
  contexto?: { etiqueta: string; ambito: string; cursoId?: string | null };
}

/** El fénix del encabezado (era el orbe de 38) y el de la bienvenida con la conversación vacía (era el de 64). */
const TAMANO_FENIX_ENCABEZADO = 48;
const TAMANO_FENIX_BIENVENIDA = 140;

/** Altura mínima de controles táctiles (AGENTS.md: 48–52px para pulsación cómoda con una mano). */
const ALTURA_MIN_CONTROL = 50;

/**
 * Panel de conversación con SER, el asistente del programa. Autocontenido: se
 * monta donde se decida pasándole `agent`, `visible` y `onClose`. A propósito NO está conectado
 * a ninguna pantalla de tab — AGENTS.md prohíbe tocar `HoyScreen`, `PlanScreen`, `TrainingScreen`,
 * `ComunidadScreen`, `YoScreen` o `RootNavigator.tsx`; la entrada la cuelgan `RenasiaLauncher`
 * (flotante) y `ChatDelCurso` (al pie del curso, con el curso de contexto; antes era Sparkie, D-255).
 */
export function RenasiaPanel({ agent, visible, onClose, contexto }: RenasiaPanelProps) {
  const { c, t } = useTheme();
  const { isTablet, horizontalPadding, rs, contentMaxWidth } = useResponsive();
  const insets = useSafeAreaInsets();
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
    confirmarPropuesta,
    cancelarPropuesta,
    cambiarPedidoDeFoto,
  } = useRenasiaChat({ agent, courseId: contexto?.cursoId, ambito: contexto?.ambito });

  const [texto, setTexto] = useState('');
  // Dictado por voz (plan de IA v2.1 §3.5): lo dictado se suma al campo y la persona lo revisa
  // antes de enviar. En el acompañante se sesga con los nombres de sus hábitos de hoy.
  const frasesDeHabitos = useFrasesDeHabitos(agent === 'COMPANION');
  // El backend corta la pregunta a 4000 caracteres: lo dictado se suma sin pasarse de ahí.
  const dictado = useDictado(frasesDeHabitos, dictadoFinal =>
    setTexto(actual => recortarPregunta(unirDictado(actual, dictadoFinal)))
  );

  /**
   * "Tomar foto" en una tarjeta del acompañante (evento `evidencia`, 2026-09-26): la cámara y la
   * pantalla partida de Training, con el `registroId` que mandó el acompañante. El modal se monta
   * DENTRO del `Modal` de este panel: en iOS, un modal montado al lado de otro ya presentado no
   * se muestra.
   */
  const registroConFoto = useRegistroConFoto({
    onCompletado: (registroId, _resultado, _titulo, destino) => {
      // El logro, una vez, cuando el servidor confirmó (2026-10-07): este cierre no vibraba.
      tacto.logro();
      cambiarPedidoDeFoto(registroId, cambioAlRegistrar(destino));
    },
    // D-178: la tarjeta de una acción del día sube a los endpoints de rocas.
    destinos: { roca: REGLAS_DE_ACCION },
  });
  const tomarFoto = async (pedido: PedidoDeFotoUI) => {
    if (estadoVisibleDelPedido(pedido, Date.now()) !== 'pendiente') return;
    if (dictado.escuchando) dictado.detener();
    cambiarPedidoDeFoto(pedido.registroId, { estado: 'abriendo' });
    const resultado = await registroConFoto.iniciar(solicitudDelPedido(pedido));
    cambiarPedidoDeFoto(pedido.registroId, cambioTrasIniciar(resultado, pedido.destino));
  };
  const scrollRef = useRef<ScrollView>(null);

  /* Un solo fénix en el panel: el grande de la bienvenida mientras no hay mensajes, y el del encabezado después. */
  const sinConversacion = !cargandoHistorial && !errorHistorial && mensajes.length === 0;

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
            {/* SER se presenta con el fénix en foto fija (el ánimo del semáforo), el mismo del botón que abre este chat
                (2026-10-06). El fénix vivo es solo el del centro de Hoy.
                > **Corregido 2026-10-06.** Era su orbe (`OrbeQuieto` de 38, rediseño de Hoy del 2026-10-05), y antes
                > el globo `chat`. Con la conversación vacía el fénix está en grande abajo, así que acá no se repite. */}
            {sinConversacion ? null : <FenixDeSerQuieto size={TAMANO_FENIX_ENCABEZADO} />}
            <View style={{ flexShrink: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>{perfil.nombre}</Text>
              <Text style={[t.small, { color: c.textSoft, fontSize: 12.5 }]} numberOfLines={1}>
                {contexto ? `Sobre: ${contexto.etiqueta}` : perfil.subtitulo}
              </Text>
            </View>
          </View>
          {/* ✕ de 24 en un área de 44, sin disco: como la cabecera de las hojas de Comunidad. Era un ✕
              de 16 dentro de un círculo con borde de 50. */}
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Cerrar ${nombre}`}
            style={({ pressed }) => [styles.cerrarBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name="close" size={TAMANO_ICONO.grande} color={c.textSoft} />
          </Pressable>
        </View>

        {/*
          `behavior` va en las DOS plataformas desde 2026-09-17. Decia `undefined` en Android
          contando con que el sistema encogiera la ventana al abrir el teclado; con el modo
          edge-to-edge obligatorio (Android, SDK 54+) eso ya no pasa y la barra de escritura queda
          debajo del teclado. El calculo de `padding` se corrige solo —da 0 donde la ventana SI se
          encoge—, y `insets.top` compensa que el alto se mide contra el SafeAreaView mientras que
          el teclado se reporta en coordenadas de pantalla. Mismo arreglo que el chat de Comunidad.
        */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : insets.top}
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
                maxWidth: contentMaxWidth,
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
                <ActivityIndicator color={c.goldInk} />
              </View>
            ) : errorHistorial ? (
              <View style={styles.centro}>
                <Text style={[t.body, { color: c.textSoft, textAlign: 'center', fontSize: 14.5 }]}>
                  {errorHistorial}
                </Text>
                <Pressable
                  onPress={() => void cargarHistorialInicial()}
                  accessibilityRole="button"
                  style={[styles.reintentarHistorialBtn, { borderColor: c.gold }]}
                >
                  <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>Reintentar</Text>
                </Pressable>
              </View>
            ) : mensajes.length === 0 ? (
              <View style={styles.centro}>
                <FenixDeSerQuieto size={TAMANO_FENIX_BIENVENIDA} />
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
                    accessibilityRole="button"
                    style={styles.cargarMasBtn}
                  >
                    {cargandoMasAntiguos ? (
                      <ActivityIndicator size="small" color={c.goldInk} />
                    ) : (
                      <Text style={[t.small, { color: c.goldInk, fontSize: 14, fontFamily: 'Jost_700Bold' }]}>
                        Ver mensajes anteriores
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
                    onConfirmarPropuesta={confirmarPropuesta}
                    onCancelarPropuesta={cancelarPropuesta}
                    onTomarFoto={pedido => void tomarFoto(pedido)}
                  />
                ))}
              </>
            )}
          </ScrollView>

          {dictado.error ? (
            <Text
              style={[t.small, { color: c.danger, fontSize: 12.5, paddingHorizontal: horizontalPadding, paddingTop: 6 }]}
            >
              {dictado.error}
            </Text>
          ) : null}

          {/* Input */}
          <View
            style={[styles.inputBar, { borderTopColor: c.divider, paddingHorizontal: horizontalPadding }]}
          >
            {dictado.disponible && (
              <Pressable
                onPress={dictado.escuchando ? dictado.detener : dictado.empezar}
                disabled={enviando}
                accessibilityRole="button"
                accessibilityLabel={dictado.escuchando ? 'Dejar de dictar' : 'Dictar por voz'}
                style={[
                  styles.enviarBtn,
                  {
                    backgroundColor: dictado.escuchando ? c.danger : c.cardBgAlt,
                    borderWidth: 1,
                    borderColor: dictado.escuchando ? c.danger : c.border,
                    opacity: enviando ? 0.5 : 1,
                  },
                ]}
              >
                <Icon name="mic" size={20} color={dictado.escuchando ? '#FFFFFF' : c.goldInk} />
              </Pressable>
            )}
            <TextInput
              value={dictado.escuchando && dictado.parcial ? unirDictado(texto, dictado.parcial) : texto}
              onChangeText={setTexto}
              placeholder={dictado.escuchando ? 'Te escucho…' : `Escríbele a ${nombre}…`}
              placeholderTextColor={c.textSoft}
              style={[
                styles.input,
                { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text, fontSize: rs(14.5) },
              ]}
              multiline
              // Un renglón en la web, como en el teléfono y como el chat de Comunidad (`propsDelCampoDelChat`).
              {...propsDelCampoDelChat()}
              editable={!enviando && !dictado.escuchando}
              maxLength={LARGO_MAXIMO_PREGUNTA}
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

      <RegistroConFotoModal {...registroConFoto.modal} />
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
  cerrarBtn: {
    width: 44,
    height: 44,
    marginRight: -10,
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
    minHeight: 44,
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
