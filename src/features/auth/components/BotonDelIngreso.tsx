import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme/ThemeContext';
import { Presionable } from '../../../components/Presionable';
import { tacto } from '../../../utils/tacto';

/**
 * El botón principal del login y de «Solicitar acceso» (2026-10-05): ancho completo, abajo, en la
 * zona del pulgar, y sube con el teclado (lo pone la pantalla fuera del scroll).
 *
 * - Se hunde a 0.97 al apoyar el dedo (`Presionable`, 120 ms ease-out) y da un «tic» háptico al
 *   confirmar el toque: el mismo instante en que aparece el indicador de carga, que es la parte
 *   visual de esa respuesta (`animate-expo`: el háptico, en el mismo cuadro que lo que se ve).
 * - Cargando: el texto se cambia por el indicador sin que el botón cambie de tamaño (alto fijo),
 *   así nada de abajo salta; y no se puede volver a tocar.
 */
export function BotonDelIngreso({
  etiqueta,
  cargando,
  onPress,
}: {
  etiqueta: string;
  cargando: boolean;
  onPress: () => void;
}) {
  const { c, t } = useTheme();

  return (
    <Presionable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: cargando, busy: cargando }}
      disabled={cargando}
      onPress={() => {
        tacto.seleccion();
        onPress();
      }}
      style={[styles.boton, { shadowColor: c.gold }]}
    >
      <LinearGradient colors={c.goldGrad} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.relleno}>
        {cargando ? (
          <ActivityIndicator color={c.onGold} size="small" />
        ) : (
          <Text style={[t.cardTitle, styles.texto, { color: c.onGold }]}>{etiqueta}</Text>
        )}
      </LinearGradient>
    </Presionable>
  );
}

const styles = StyleSheet.create({
  boton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  relleno: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontFamily: 'Jost_500Medium',
    fontSize: 16,
    letterSpacing: 0.1,
  },
});
