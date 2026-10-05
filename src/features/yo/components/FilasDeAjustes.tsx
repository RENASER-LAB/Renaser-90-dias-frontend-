import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';

/** Medidas de una fila de Ajustes, como las de iOS (rediseño de Yo, 2026-10-05). */
export const ALTO_FILA_AJUSTE = 56;
export const LADO_BALDOSA = 30;
export const TAMANO_ICONO_BALDOSA = 18;
export const TAMANO_CHEVRON_FILA = 20;
const RELLENO_X = 16;
const SEPARACION = 12;
/** La línea entre filas empieza donde empieza el texto, no en el borde: como en iOS. */
export const SANGRIA_SEPARADOR = RELLENO_X + LADO_BALDOSA + SEPARACION;

/**
 * Un grupo de filas de Ajustes: un título en tipo oración y una caja con las filas.
 *
 * **La línea negra al pie de cada grupo (bug, modo claro).** Cada fila tenía `borderBottomWidth: 1`
 * en su estilo, y el color se le pasaba a todas MENOS a la última («la última no lleva línea»). Una
 * fila con ancho de borde y sin color dibuja el borde con el color por defecto: negro. Por eso cada
 * grupo cerraba con una raya oscura pegada al borde redondeado. Acá las filas no tienen borde: el
 * grupo pone una línea ENTRE dos filas, y la última no tiene ninguna después.
 *
 * Las filas que no se muestran (`null`, `false`) no cuentan: no dejan líneas dobles ni una al final.
 */
export function GrupoDeAjustes({ titulo, children }: { titulo?: string; children?: React.ReactNode }) {
  const { c, t } = useTheme();
  const filas = React.Children.toArray(children).filter(React.isValidElement);
  if (filas.length === 0) return null;
  return (
    <View style={estilos.grupo}>
      {titulo ? (
        <Text accessibilityRole="header" style={[t.small, estilos.titulo, { color: c.textSoft }]}>
          {titulo}
        </Text>
      ) : null}
      <View style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        {filas.map((fila, i) => (
          <React.Fragment key={fila.key ?? i}>
            {i > 0 ? <View testID="separador-de-ajuste" style={[estilos.separador, { backgroundColor: c.divider }]} /> : null}
            {fila}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

/**
 * Una fila de Ajustes: baldosa dorada de 30 con el ícono de 18, título, detalle opcional y «›» de 20.
 *
 * - **`peligro`** (cerrar sesión, eliminar la cuenta): texto rojo y baldosa con lavado rojo.
 * - **`sinChevron`**: la fila HACE algo en vez de abrir otra pantalla (cerrar sesión). El «›»
 *   promete otra pantalla, así que en una acción no va.
 * - **`accesorio`** (un `Interruptor`): la fila no se toca, se toca el accesorio. Envolver un
 *   interruptor en algo tocable hace que un toque lo cambie dos veces y vuelva a donde estaba.
 * - **`baldosa`**: un dibujo propio en lugar de un ícono (el orbe de SER).
 *
 * Las filas que se tocan responden al dedo (`Presionable`) y se anuncian como un botón con su título
 * y su detalle; la baldosa y el «›» son decorativos.
 */
export function FilaDeAjuste({
  icono,
  baldosa,
  titulo,
  detalle,
  onPress,
  peligro = false,
  sinChevron = false,
  accesorio,
  etiqueta,
}: {
  icono?: IconName;
  baldosa?: React.ReactNode;
  titulo: string;
  detalle?: string | null;
  onPress?: () => void;
  peligro?: boolean;
  sinChevron?: boolean;
  accesorio?: React.ReactNode;
  /** Lo que oye el lector de pantalla, si tiene que decir más que el título y el detalle. */
  etiqueta?: string;
}) {
  const { c, t } = useTheme();
  const contenido = (
    <>
      <View
        testID="baldosa-de-ajuste"
        style={[estilos.baldosa, { backgroundColor: peligro ? c.dangerWash : c.gold }]}
      >
        {baldosa ?? (icono ? <Icon name={icono} size={TAMANO_ICONO_BALDOSA} color={peligro ? c.danger : c.onGold} /> : null)}
      </View>
      <View style={estilos.textos}>
        <Text style={[t.body, estilos.tituloFila, { color: peligro ? c.danger : c.textStrong }]}>{titulo}</Text>
        {detalle ? <Text style={[t.small, estilos.detalle, { color: c.textSoft }]}>{detalle}</Text> : null}
      </View>
      {accesorio ?? (sinChevron || !onPress ? null : <Icon name="chevron" size={TAMANO_CHEVRON_FILA} color={c.chevron} />)}
    </>
  );

  if (accesorio || !onPress) {
    return <View style={estilos.fila}>{contenido}</View>;
  }
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta ?? (detalle ? `${titulo}. ${detalle}` : titulo)}
      style={estilos.fila}
    >
      {contenido}
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: 8 },
  titulo: { fontFamily: 'Jost_500Medium', fontSize: 14, lineHeight: 19, paddingHorizontal: RELLENO_X },
  caja: { borderWidth: 1, borderRadius: space.radius, overflow: 'hidden' },
  /* 1 px y no `hairlineWidth`: en un Android de densidad alta la línea de pelo en `divider` claro no se ve. */
  separador: { height: 1, marginLeft: SANGRIA_SEPARADOR },
  fila: {
    minHeight: ALTO_FILA_AJUSTE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SEPARACION,
    paddingHorizontal: RELLENO_X,
    paddingVertical: 10,
  },
  baldosa: {
    width: LADO_BALDOSA,
    height: LADO_BALDOSA,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0, gap: 1 },
  tituloFila: { fontFamily: 'Jost_500Medium', fontSize: 16, lineHeight: 22 },
  detalle: { fontSize: 14, lineHeight: 19 },
});
