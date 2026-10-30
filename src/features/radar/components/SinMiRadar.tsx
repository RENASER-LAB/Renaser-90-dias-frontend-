import React from 'react';
import { ScrollView, Text } from 'react-native';

import { BotonSecundario } from '../../../components/Legible';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { BotonElegirDiaUno } from '../../programa/components/BotonElegirDiaUno';
import {
  MENSAJE_CARGANDO,
  MENSAJE_NO_DISPONIBLE,
  MENSAJE_NO_SE_PUDO_CARGAR,
  MENSAJE_SIN_PROGRAMA,
  type VistaDeMiRadar,
} from '../utils/vistaDeMiRadar';

/**
 * Lo que dice Yo → Mi Radar cuando todavía no hay Mi Radar que mostrar (spec 019): el motivo en una línea y, solo si hay algo que
 * hacer, un botón. Qué se dice lo decide `vistaDeMiRadar`; esto solo lo dibuja.
 *
 *  - **Sin programa**: «Elegir mi Día 1» (el selector del onboarding, con su flecha para volver). Al elegir, `alElegirElDiaUno` vuelve a
 *    leer.
 *  - **Sin red o 5xx**: «Reintentar».
 *  - Lo demás (cargando, antes del día 8, suspendida, sin permiso): una línea y nada más.
 */
export function SinMiRadar({
  vista,
  alElegirElDiaUno,
  alReintentar,
}: {
  vista: Exclude<VistaDeMiRadar, { tipo: 'editor' }>;
  alElegirElDiaUno: () => void;
  alReintentar: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const linea = (texto: string) => (
    <Text key="linea" accessibilityRole="text" style={[t.body, { color: c.text, fontSize: 17, lineHeight: 24 }]}>
      {texto}
    </Text>
  );

  const contenido = (): React.ReactNode => {
    switch (vista.tipo) {
      case 'cargando':
        return linea(MENSAJE_CARGANDO);
      case 'sin-programa':
        return [linea(MENSAJE_SIN_PROGRAMA), <BotonElegirDiaUno key="elegir" onActivado={alElegirElDiaUno} />];
      case 'aun-no':
      case 'bloqueada':
        return linea(vista.texto);
      case 'fallo':
        return [linea(MENSAJE_NO_SE_PUDO_CARGAR), <BotonSecundario key="reintentar" etiqueta="Reintentar" onPress={alReintentar} />];
      case 'no-disponible':
        return linea(MENSAJE_NO_DISPONIBLE);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: horizontalPadding,
        paddingTop: 8,
        paddingBottom: 36,
        maxWidth: contentMaxWidth,
        width: '100%',
        alignSelf: 'center',
        gap: 18,
      }}
    >
      {contenido()}
    </ScrollView>
  );
}
