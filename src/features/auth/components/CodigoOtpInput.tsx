import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';

/** Los códigos del alta y de la recuperación son ambos de 6 dígitos (backend: `\d{6}`). */
export const LARGO_CODIGO = 6;

type Props = {
  codigo: string;
  onChange: (codigo: string) => void;
  /** El `TextInput` real está oculto; la pantalla lo enfoca al entrar al paso. */
  inputRef: React.RefObject<TextInput | null>;
  /** Segundos que faltan para poder reenviar. Con `puedeReenviar` en true se ignora. */
  segundosParaReenviar: number;
  puedeReenviar: boolean;
  onReenviar: () => void;
  deshabilitado?: boolean;
  /** Lo que va en la misma línea después de «Reenviar»: la opción de WhatsApp (spec 043). */
  otraOpcion?: React.ReactNode;
};

/**
 * Las seis casillas del código, el input oculto que las alimenta y la fila de reenvío. Antes
 * vivía inline en `LoginScreen` para el OTP del alta; se extrajo (D-102) cuando la recuperación
 * de contraseña necesitó exactamente la misma pantalla. El temporizador NO vive acá: lo maneja
 * la pantalla, porque es ella la que sabe cuándo se pidió el código.
 */
export function CodigoOtpInput({
  codigo,
  onChange,
  inputRef,
  segundosParaReenviar,
  puedeReenviar,
  onReenviar,
  deshabilitado = false,
  otraOpcion,
}: Props) {
  const { c, t } = useTheme();

  return (
    <>
      <Pressable onPress={() => inputRef.current?.focus()} style={styles.casillas}>
        {Array.from({ length: LARGO_CODIGO }, (_, index) => {
          const digito = codigo[index] || '';
          const esLaActual = codigo.length === index;
          const tieneDigito = digito.length > 0;

          return (
            <View
              key={index}
              style={[
                styles.casilla,
                {
                  borderColor: esLaActual ? c.gold : tieneDigito ? c.borderStrong : c.border,
                  backgroundColor: c.cardBgAlt,
                  transform: [{ scale: esLaActual ? 1.05 : 1 }],
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: fuentes.media,
                  color: tieneDigito ? c.textStrong : c.tabInactive,
                }}
              >
                {digito}
              </Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={codigo}
        onChangeText={texto => onChange(texto.replace(/[^0-9]/g, '').slice(0, LARGO_CODIGO))}
        keyboardType="number-pad"
        maxLength={LARGO_CODIGO}
        style={styles.inputOculto}
        autoFocus
      />

      {/* Una sola línea chica, en tipo oración (pedido del dueño del 06/11: «mucho texto, más limpio»): «¿No te llegó? Reenviar» y, a los
          60 s, «· Por WhatsApp». Cada opción mide 48 de alto táctil. */}
      <View style={styles.reenvio}>
        <Text style={[t.small, styles.textoReenvio, { color: c.textSoft }]}>¿No te llegó?</Text>
        {puedeReenviar ? (
          <Pressable
            onPress={onReenviar}
            disabled={deshabilitado}
            accessibilityRole="button"
            accessibilityLabel="Reenviar el código al correo"
            style={styles.opcion}
          >
            <Text style={[t.small, styles.textoReenvio, { color: c.goldInk, fontFamily: fuentes.media }]}>Reenviar</Text>
          </Pressable>
        ) : (
          <View style={styles.opcion}>
            <Text style={[t.small, styles.textoReenvio, { color: c.tabInactive, fontVariant: ['tabular-nums'] }]}>
              Reenviar en {segundosParaReenviar} s
            </Text>
          </View>
        )}
        {otraOpcion ? <Text style={[t.small, styles.textoReenvio, { color: c.textSoft }]}>·</Text> : null}
        {otraOpcion}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  casillas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    gap: 6,
  },
  casilla: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputOculto: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  reenvio: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
  },
  opcion: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  textoReenvio: { fontSize: 15 },
});
