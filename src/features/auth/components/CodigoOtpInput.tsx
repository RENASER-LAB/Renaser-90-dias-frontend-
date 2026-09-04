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
                  fontFamily: 'Jost_500Medium',
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

      <View style={styles.reenvio}>
        {puedeReenviar ? (
          <Pressable onPress={onReenviar} disabled={deshabilitado} hitSlop={10}>
            <Text style={[t.micro, { color: c.gold, letterSpacing: 1.2, fontWeight: '600' }]}>
              ¿NO RECIBISTE EL CÓDIGO? REENVIAR
            </Text>
          </Pressable>
        ) : (
          <Text style={[t.micro, { color: c.tabInactive, letterSpacing: 1.1 }]}>
            Reenviar nuevo código en {segundosParaReenviar}s
          </Text>
        )}
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
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
});
