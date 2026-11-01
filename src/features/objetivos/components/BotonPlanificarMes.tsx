import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * La fila discreta que abre «Planificar mi mes» (spec 028), debajo del objetivo de 90 días en Plan. Una sola línea con el mes del programa
 * en curso («Mes 1 · Semanas 1 a 4») y un chevron: no es una tarjeta más ni un llamado a la acción, porque nada la exige (FR-016). Mismo
 * fondo y borde que las tarjetas de Plan, 56 de alto, `Presionable`, sin animación propia.
 */
export const ETIQUETA_DE_PLANIFICAR_MI_MES = 'Planificar mi mes';

export function BotonPlanificarMes({ mesEnCurso, onPress }: { mesEnCurso: string | null; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={mesEnCurso ? `${ETIQUETA_DE_PLANIFICAR_MI_MES}. ${mesEnCurso}` : ETIQUETA_DE_PLANIFICAR_MI_MES}
      style={[estilos.fila, { borderColor: c.border, backgroundColor: c.cardBg }]}
    >
      <Icon name="calendarRange" size={TAMANO_ICONO.normal} color={c.goldInk} />
      <View style={estilos.textos}>
        <Text style={[t.body, estilos.titulo, { color: c.textStrong }]}>{ETIQUETA_DE_PLANIFICAR_MI_MES}</Text>
        {/* Mientras no se sabe el día del programa no se dice un mes: Plan lee `/home` al abrirse. */}
        {mesEnCurso ? <Text style={[t.small, estilos.subtitulo, { color: c.textSoft }]}>{mesEnCurso}</Text> : null}
      </View>
      <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.textSoft} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  fila: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 17 },
  textos: { flex: 1 },
  titulo: { fontFamily: fuentes.media, fontSize: 16, lineHeight: 22 },
  subtitulo: { fontSize: 14, lineHeight: 20, fontVariant: ['tabular-nums'] },
});
