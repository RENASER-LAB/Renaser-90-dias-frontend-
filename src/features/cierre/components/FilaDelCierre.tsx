import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { ANCHO_DE_LA_HORA } from '../../training/components/FilaDelDia';
import type { ItemDelDia } from '../../training/utils/itemsDelDia';
import { DURACION_DEL_CIERRE } from '../utils/itemDelCierre';

/** Lo que dice la fila de un día anterior a la derecha. */
export const TEXTO_DE_DIA_CERRADO_EN_LA_FILA = 'Cerrado';
export const TEXTO_DE_DIA_SIN_CERRAR_EN_LA_FILA = 'Sin cerrar';

/**
 * La fila «Cierra tu día» de Training (spec 017). Se distingue de los hábitos por su fondo dorado suave y el ícono de
 * luna; ya cerrada queda verde, con «Día cerrado» y lo que dijo para mañana. No lleva ✓, ni «Subir», ni puntos, ni
 * «Te toca ahora»: es opcional y no cuenta.
 *
 * - **Hoy** (`soloLectura` en `false`): toda la fila es un botón que abre la hoja. Cerrada, vuelve a abrirla para cambiar.
 * - **Un día anterior** (`soloLectura`): solo texto, «Cerrado» o «Sin cerrar». No se cierra tarde; tocarla no hace nada.
 *
 * Sin animación propia: no se despide con fundido (se queda en su lugar, cerrada o no) y la lista no la mueve. Mide ≥ 66,
 * con el área de toque de 48 o más (AGENTS.md §4).
 */
export function FilaDelCierre({
  item,
  soloLectura = false,
  onAbrir,
}: {
  item: ItemDelDia;
  soloLectura?: boolean;
  onAbrir?: (item: ItemDelDia) => void;
}) {
  const { c, t } = useTheme();
  const { fontScale } = useWindowDimensions();
  const anchoDeLaHora = Math.round(ANCHO_DE_LA_HORA * Math.min(Math.max(fontScale, 1), 1.5));
  const cerrado = item.hecho;
  const datos = item.cierre ?? null;
  const segundaLinea = cerrado
    ? datos?.lineaDeManana ?? (datos?.cerradoA ? `Cerrado a las ${datos.cerradoA}` : null)
    : soloLectura
      ? null
      : DURACION_DEL_CIERRE;

  const etiqueta = [
    item.hora ?? 'Sin hora',
    item.titulo,
    soloLectura ? (cerrado ? TEXTO_DE_DIA_CERRADO_EN_LA_FILA : TEXTO_DE_DIA_SIN_CERRAR_EN_LA_FILA) : null,
    segundaLinea,
    !soloLectura ? (cerrado ? 'toca para cambiar tu cierre' : 'opcional, no da puntos') : null,
  ]
    .filter(Boolean)
    .join(', ');

  const tarjeta = (
    <View style={[estilos.tarjeta, { backgroundColor: cerrado ? c.successWash : c.goldWash }]}>
      <Icon name={cerrado ? 'checkCircle' : 'moon'} size={TAMANO_ICONO.normal} color={cerrado ? c.success : c.goldInk} />
      <View style={estilos.texto}>
        <Text style={[t.body, { fontSize: 16, color: c.textStrong, fontFamily: 'Jost_500Medium' }]}>{item.titulo}</Text>
        {segundaLinea ? <Text style={[t.small, { color: c.textSoft }]}>{segundaLinea}</Text> : null}
      </View>
      {soloLectura ? (
        <Text style={[t.small, { color: cerrado ? c.success : c.textSoft, fontFamily: 'Jost_500Medium' }]}>
          {cerrado ? TEXTO_DE_DIA_CERRADO_EN_LA_FILA : TEXTO_DE_DIA_SIN_CERRAR_EN_LA_FILA}
        </Text>
      ) : (
        <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
      )}
    </View>
  );

  return (
    <View style={estilos.fila}>
      <Text numberOfLines={1} style={[t.small, estilos.hora, { width: anchoDeLaHora, color: item.hora ? c.textStrong : c.chevron }]}>
        {item.hora ?? '—'}
      </Text>
      {soloLectura ? (
        <View style={{ flex: 1 }} accessible accessibilityLabel={etiqueta}>
          {tarjeta}
        </View>
      ) : (
        <Presionable
          onPress={() => onAbrir?.(item)}
          accessibilityRole="button"
          accessibilityLabel={etiqueta}
          contenedorStyle={{ flex: 1 }}
        >
          {tarjeta}
        </Presionable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 66, paddingVertical: 6 },
  hora: { fontFamily: 'Jost_700Bold', fontSize: 14, fontVariant: ['tabular-nums'] },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  texto: { flex: 1, minWidth: 0, gap: 2 },
});
