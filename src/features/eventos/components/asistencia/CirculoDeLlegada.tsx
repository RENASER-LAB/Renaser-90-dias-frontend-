import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '../../../../components/Icon';
import { Presionable } from '../../../../components/Presionable';
import { useTheme } from '../../../../theme/ThemeContext';
import type { EstadoDeLlegada } from '../../types/asistencia.types';
import { tacto } from '../../../../utils/tacto';

const TEXTO: Record<'A_TIEMPO' | 'TARDE' | 'nada', string> = {
  A_TIEMPO: 'a tiempo',
  TARDE: 'llegó tarde',
  nada: 'sin marcar',
};

/**
 * El círculo de 44 px de cada fila de «Pasar lista» (D-256, regla del dueño): **un toque = a tiempo;
 * segundo toque o mantener = tarde**; un tercer toque lo deja sin marcar (= ausente).
 *
 * **Sin animación propia, a propósito** (`animate-expo` §1): se toca decenas de veces seguidas al pasar
 * lista, y cualquier recorrido lo haría sentir lento. El cambio de relleno es instantáneo; la única
 * respuesta física es la de `Presionable` (escala 0.97 en 120 ms al apoyar el dedo), más el háptico de
 * selección en el mismo instante. Con «tarde» el ícono cambia de ✓ a reloj: el estado no depende solo
 * del color.
 */
export function CirculoDeLlegada({
  nombre,
  llegada,
  deshabilitado,
  alTocar,
  alMantener,
}: {
  nombre: string;
  llegada: EstadoDeLlegada;
  deshabilitado?: boolean;
  alTocar: () => void;
  alMantener: () => void;
}) {
  const { c } = useTheme();
  const fondo = llegada === 'A_TIEMPO' ? c.success : llegada === 'TARDE' ? c.gold : 'transparent';
  const borde = llegada ? fondo : c.borderStrong;
  const tinta = llegada ? c.bg : c.tabInactive;
  return (
    <Presionable
      onPress={() => {
        tacto.seleccion();
        alTocar();
      }}
      onLongPress={() => {
        tacto.mantener();
        alMantener();
      }}
      delayLongPress={350}
      disabled={deshabilitado}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${nombre}: ${TEXTO[llegada ?? 'nada']}`}
      accessibilityHint="Toca para marcar a tiempo; otra vez, o mantén presionado, para tarde."
      accessibilityState={{ disabled: !!deshabilitado, checked: llegada !== null }}
      style={[estilos.circulo, { backgroundColor: fondo, borderColor: borde, opacity: deshabilitado ? 0.5 : 1 }]}
    >
      <View pointerEvents="none">
        <Icon name={llegada === 'TARDE' ? 'clock' : 'check'} size={22} color={tinta} strokeWidth={llegada ? 2.4 : undefined} />
      </View>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  circulo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
