import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { RESUMEN_MAX_LENGTH, RESUMEN_MIN_LENGTH } from '../api/claseDiariaApi';
import type { ClaseDiariaApi } from '../types/academy.types';

/**
 * Cierre de la Clase Diaria: la persona escribe qué entendió de la clase de hoy y recién con eso
 * el hábito queda completado.
 *
 * Las tres reglas que gobiernan este componente, y por qué:
 *
 * 1. **Nada se marca hasta que el envío responde OK.** El estado "completado" NO se toca de forma
 *    optimista. Si la persona cierra el modal sin querer — el gesto lateral del sistema, el botón
 *    de atrás, la ✕ — el hábito sigue pendiente y puede volver a intentarlo desde Training. Esto
 *    no necesita ningún estado intermedio "completado sin resumen": el backend solo cierra el
 *    registro dentro del mismo POST que recibe el resumen.
 * 2. **Cerrar es siempre gratis.** Por eso el gesto de retroceso cierra el modal (lo cablea
 *    `useSystemBackHandler` en la pantalla que lo monta) y nunca la app.
 * 3. **Ya completado = solo lectura.** Si el registro ya vino `COMPLETADO`, no se vuelve a pedir
 *    el resumen: se muestra el que la persona ya escribió. El modal deja de ser un formulario.
 *
 * El largo del resumen lo valida el backend (400 si no cumple); acá se avisa ANTES de mandar para
 * que la persona no escriba y se lleve un error después.
 */

interface ClaseDiariaModalProps {
  visible: boolean;
  /** Qué clase toca hoy. `null` mientras se está pidiendo. */
  clase: ClaseDiariaApi | null;
  cargando: boolean;
  /** Falla del GET de la clase del día — distinta de un error al enviar. */
  error: string | null;
  /**
   * Resumen ya guardado (`respuestaTexto` del track). Si viene, el hábito ya está cerrado y el
   * modal se abre en modo lectura.
   */
  resumenGuardado: string | null;
  enviando: boolean;
  errorEnvio: string | null;
  /** Solo se llama con un resumen que ya pasó la validación de largo. */
  onEnviar: (leccionId: string, resumen: string) => void;
  /** Llevar a la lección del día dentro de Cursos. */
  onIrALaLeccion: (clase: ClaseDiariaApi) => void;
  onCerrar: () => void;
}

export function ClaseDiariaModal({
  visible,
  clase,
  cargando,
  error,
  resumenGuardado,
  enviando,
  errorEnvio,
  onEnviar,
  onIrALaLeccion,
  onCerrar,
}: ClaseDiariaModalProps) {
  const { c, t } = useTheme();
  const { isTablet } = useResponsive();
  const [resumen, setResumen] = useState('');
  // Solo se pinta el borde de error DESPUÉS de un intento de envío: marcar en rojo un campo que
  // todavía está vacío porque recién se abrió el modal es hostil, no informativo.
  const [intentoDeEnvio, setIntentoDeEnvio] = useState(false);

  const yaCompletada = Boolean(resumenGuardado && resumenGuardado.trim().length > 0);

  // Se reinicia en cada apertura: el borrador de ayer no debe reaparecer sobre la clase de hoy.
  useEffect(() => {
    if (!visible) return;
    setResumen(resumenGuardado ?? '');
    setIntentoDeEnvio(false);
  }, [visible, resumenGuardado]);

  const limpio = resumen.trim();
  const largo = limpio.length;
  const muyCorto = largo < RESUMEN_MIN_LENGTH;
  const puedeEnviar = !muyCorto && largo <= RESUMEN_MAX_LENGTH && !enviando;
  const disponible = clase?.status === 'available' && Boolean(clase.leccionId);

  const handleEnviar = () => {
    setIntentoDeEnvio(true);
    if (!puedeEnviar || !clase?.leccionId) return;
    onEnviar(clase.leccionId, limpio);
  };

  const mostrarErrorDeLargo = intentoDeEnvio && muyCorto;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              borderColor: c.gold,
              backgroundColor: c.cardBg,
              maxWidth: isTablet ? 560 : undefined,
              width: isTablet ? '100%' : undefined,
              alignSelf: 'center',
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: c.divider }]}>
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>
                {yaCompletada ? 'TU RESUMEN DE HOY' : 'CLASE DIARIA'}
              </Text>
              <Text
                style={[t.cardTitle, { color: c.textStrong, fontSize: 15 }]}
                numberOfLines={2}
              >
                {clase?.leccionTitulo ?? 'Tu clase de hoy'}
              </Text>
            </View>
            <Pressable onPress={onCerrar} hitSlop={12} style={styles.cerrar}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>✕ Cerrar</Text>
            </Pressable>
          </View>

          {/*
            UN solo contenedor de scroll, sin `maxHeight` fijo: la tarjeta ya está acotada por el
            padding del overlay y el ScrollView se encarga del resto cuando entra el teclado.
          */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {cargando && (
              <View style={styles.centrado}>
                <ActivityIndicator color={c.gold} />
                <Text style={[t.body, { color: c.textSoft, fontSize: 14, marginTop: 10 }]}>
                  Buscando tu clase de hoy…
                </Text>
              </View>
            )}

            {!cargando && error && (
              <View style={styles.centrado}>
                <Text style={[t.body, { color: c.text, fontSize: 14, textAlign: 'center' }]}>
                  {error}
                </Text>
              </View>
            )}

            {!cargando && !error && clase?.status === 'not_started' && (
              <View style={styles.centrado}>
                <Text style={[t.body, { color: c.text, fontSize: 14, textAlign: 'center' }]}>
                  Todavía no arrancaste tus 90 días, así que aún no hay clase asignada. Cuando
                  empiece tu programa, tu clase del día aparece acá.
                </Text>
              </View>
            )}

            {!cargando && !error && clase?.status === 'coming_soon' && (
              <View style={styles.centrado}>
                <Text style={[t.body, { color: c.text, fontSize: 14, textAlign: 'center' }]}>
                  Hoy (día {clase.programDay}) no hay clase publicada. Vuelve mañana.
                </Text>
              </View>
            )}

            {!cargando && !error && disponible && clase && (
              <>
                {/* Paso 1: ir a verla. La clase se mira en Cursos, no acá dentro. */}
                <Pressable
                  onPress={() => onIrALaLeccion(clase)}
                  style={[
                    styles.enlaceLeccion,
                    { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt },
                  ]}
                >
                  <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
                    <Text style={[t.micro, { color: c.micro, fontWeight: '700', fontSize: 10.5 }]}>
                      DÍA {clase.programDay} · {clase.cursoTitulo ?? 'TU CURSO'}
                    </Text>
                    <Text
                      style={[t.body, { color: c.textStrong, fontSize: 14.5, fontWeight: '600' }]}
                    >
                      {clase.leccionTitulo}
                    </Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>
                      Tocá para ver la clase en Cursos
                    </Text>
                  </View>
                  <Text style={[t.cardTitle, { color: c.gold, fontSize: 20 }]}>›</Text>
                </Pressable>

                {yaCompletada ? (
                  /* Paso 2, ya hecho: se muestra lo que escribió, sin volver a pedirlo. */
                  <View style={{ marginTop: 16, gap: 8 }}>
                    <Text style={[t.micro, { color: '#4E9F76', fontWeight: '700', fontSize: 11 }]}>
                      ✓ CLASE COMPLETADA
                    </Text>
                    <View
                      style={[
                        styles.resumenLeido,
                        { borderColor: c.border, backgroundColor: c.cardBgAlt },
                      ]}
                    >
                      <Text style={[t.body, { color: c.text, fontSize: 14.5, lineHeight: 21 }]}>
                        {resumenGuardado}
                      </Text>
                    </View>
                  </View>
                ) : (
                  /* Paso 2: contar qué entendió. Sin esto, el hábito NO se cierra. */
                  <View style={{ marginTop: 16, gap: 8 }}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
                      ¿QUÉ ENTENDISTE DE LA CLASE?
                    </Text>
                    <Text style={[t.body, { color: c.textSoft, fontSize: 13 }]}>
                      Escribí con tus palabras lo que te llevás de hoy. Mínimo{' '}
                      {RESUMEN_MIN_LENGTH} letras.
                    </Text>
                    <TextInput
                      value={resumen}
                      onChangeText={setResumen}
                      multiline
                      // El corte duro acá evita que la persona escriba 2500 letras y las pierda
                      // al recibir un 400 del backend.
                      maxLength={RESUMEN_MAX_LENGTH}
                      editable={!enviando}
                      textAlignVertical="top"
                      placeholder="Hoy entendí que…"
                      placeholderTextColor={c.textSoft}
                      style={[
                        styles.input,
                        {
                          borderColor: mostrarErrorDeLargo ? '#E06A66' : c.border,
                          backgroundColor: c.cardBgAlt,
                          color: c.text,
                        },
                      ]}
                    />
                    <View style={styles.contadorFila}>
                      <Text
                        style={[
                          t.micro,
                          {
                            color: mostrarErrorDeLargo ? '#E06A66' : c.textSoft,
                            fontSize: 11.5,
                            flexShrink: 1,
                          },
                        ]}
                      >
                        {mostrarErrorDeLargo
                          ? `Te faltan ${RESUMEN_MIN_LENGTH - largo} letras`
                          : `${largo} / ${RESUMEN_MAX_LENGTH}`}
                      </Text>
                    </View>

                    {errorEnvio && (
                      <Text style={[t.body, { color: '#E06A66', fontSize: 13.5 }]}>
                        {errorEnvio}
                      </Text>
                    )}

                    <GoldButton
                      label="ENVIAR Y COMPLETAR"
                      onPress={handleEnviar}
                      loading={enviando}
                      disabled={enviando}
                      style={{ width: '100%', marginTop: 4 }}
                    />
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 16,
    // Techo relativo a la pantalla, no un número fijo: la tarjeta nunca tapa los bordes y el
    // ScrollView de adentro es el ÚNICO que scrollea (no hay otro contenedor de scroll encima).
    maxHeight: '86%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 12,
    gap: 10,
  },
  cerrar: {
    minHeight: 48,
    justifyContent: 'center',
  },
  centrado: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 8,
  },
  enlaceLeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 52,
    width: '100%',
    flexWrap: 'wrap',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14.5,
    lineHeight: 21,
    fontFamily: 'Jost_400Regular',
    minHeight: 132,
    width: '100%',
  },
  resumenLeido: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: '100%',
  },
  contadorFila: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
});
