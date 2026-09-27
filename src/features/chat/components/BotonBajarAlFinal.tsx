import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { contadorDelBoton } from '../utils/bajadaDelChat';

/**
 * El botón «↓» de WhatsApp (2026-09-27): aparece cuando la persona subió a leer historia y la
 * lleva de vuelta al último mensaje. Si mientras tanto llegaron mensajes, lo dice en un círculo
 * dorado. Redondo de 52 px: se toca con el pulgar sin apuntar.
 */
export function BotonBajarAlFinal({ nuevosSinVer, onPress }: { nuevosSinVer: number; onPress: () => void }) {
  const { c } = useTheme();
  const contador = contadorDelBoton(nuevosSinVer);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={
        contador
          ? `Ir al último mensaje. ${nuevosSinVer === 1 ? '1 mensaje nuevo' : `${contador} mensajes nuevos`}`
          : 'Ir al último mensaje'
      }
      style={({ pressed }) => [
        styles.boton,
        { backgroundColor: c.cardBgAlt, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {/* El chevron apunta a la derecha: girado, apunta abajo, como en el desplegable de Tribu. */}
      <View style={{ transform: [{ rotate: '90deg' }] }}>
        <Icon name="chevron" size={24} color={c.goldInk} strokeWidth={1.8} />
      </View>
      {contador && (
        <View style={[styles.contador, { backgroundColor: c.gold }]}>
          <Text style={[styles.contadorTexto, { color: c.onGold }]}>{contador}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  contador: {
    position: 'absolute',
    top: -8,
    left: -6,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: {
    fontFamily: 'Jost_700Bold',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});
