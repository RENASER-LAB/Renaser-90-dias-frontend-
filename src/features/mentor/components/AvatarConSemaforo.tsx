import React from 'react';
import { View } from 'react-native';

import { AvatarPersona } from '../../../components/ui';
import type { Palette } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';
import { coloresDelSemaforo } from '../../semaforo/utils/coloresDelSemaforo';
import type { ColorSemaforo } from '../../semaforo/types/semaforo.types';

/** El grosor del anillo (spec 055, boceto aprobado): ~2,5 px reales. */
export const GROSOR_DEL_ANILLO = 2.5;
/** El aire entre el anillo y la foto: sin él, la foto se come el color. */
const AIRE_DEL_ANILLO = 2;

/**
 * El color del anillo: el del semáforo (rojo, ámbar, verde) y, sin datos, un gris suave (`divider`), nunca el verde: sin datos
 * no es «va bien» (D-128). Sale de `coloresDelSemaforo`, no de literales, para que cambie con el tema claro y oscuro.
 */
export function colorDelAnillo(color: ColorSemaforo, c: Palette): string {
  return color === 'SIN_DATOS' ? c.divider : coloresDelSemaforo(color, c).relleno;
}

/**
 * La foto o las iniciales de una persona con el color de su semáforo en el BORDE (spec 055 FR-005 y FR-010). Reutiliza
 * `AvatarPersona`; el nombre va aparte, en el color de texto normal: el color solo no basta, siempre lo acompaña una palabra.
 */
export function AvatarConSemaforo({
  nombre,
  avatarUrl,
  color,
  size,
}: {
  nombre?: string | null;
  avatarUrl?: string | null;
  color: ColorSemaforo;
  /** El lado de la FOTO; el anillo se suma por fuera. */
  size: number;
}) {
  const { c } = useTheme();
  const lado = size + 2 * (GROSOR_DEL_ANILLO + AIRE_DEL_ANILLO);
  return (
    <View
      testID="anillo-del-avatar"
      importantForAccessibility="no-hide-descendants"
      style={{
        width: lado,
        height: lado,
        borderRadius: lado / 2,
        borderWidth: GROSOR_DEL_ANILLO,
        borderColor: colorDelAnillo(color, c),
        padding: AIRE_DEL_ANILLO,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AvatarPersona nombre={nombre} avatarUrl={avatarUrl} size={size} />
    </View>
  );
}
