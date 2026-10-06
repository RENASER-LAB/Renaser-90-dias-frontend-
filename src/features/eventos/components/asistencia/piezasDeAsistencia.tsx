import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '../../../../components/Icon';
import { AvatarPersona } from '../../../../components/ui';
import { useTheme } from '../../../../theme/ThemeContext';
import { LETRA } from '../piezas';

/**
 * Piezas de «Quién respondió» y «Pasar lista» (D-256). Misma escala que el resto de Eventos: letra de
 * 16 px o más y filas de 64 px como mínimo (spec §0.4: quien la usa tiene de 30 a 60 años).
 */

export type TonoDeEtiqueta = 'bien' | 'oro' | 'neutro';

/** Una píldora de estado: «● En curso», «Cerrada», «Sin confirmar», «Tarde». */
export function Etiqueta({
  texto,
  tono,
  icono,
  conPunto = false,
}: {
  texto: string;
  tono: TonoDeEtiqueta;
  icono?: IconName;
  conPunto?: boolean;
}) {
  const { c } = useTheme();
  const color = { bien: c.success, oro: c.goldInk, neutro: c.textSoft }[tono];
  const fondo = { bien: c.successWash, oro: c.goldWash, neutro: c.placeholderA }[tono];
  return (
    <View style={[estilos.etiqueta, { backgroundColor: fondo }]}>
      {conPunto ? <View style={[estilos.punto, { backgroundColor: color }]} /> : null}
      {icono ? <Icon name={icono} size={16} color={color} /> : null}
      <Text style={[estilos.etiquetaTexto, { color }]} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

/** Una persona de la lista: foto o iniciales, nombre, una o dos líneas, y lo que va a la derecha. */
export function FilaDePersona({
  nombre,
  avatarUrl,
  linea,
  tonoLinea = 'suave',
  segunda,
  derecha,
  ultima = false,
}: {
  nombre: string;
  avatarUrl: string | null;
  linea: string;
  tonoLinea?: 'suave' | 'bien' | 'oro';
  /** Una segunda línea en dorado: «Antes dijo «No voy» (sáb 3, 21:05)», «Reintentando…». */
  segunda?: string | null;
  derecha?: React.ReactNode;
  ultima?: boolean;
}) {
  const { c } = useTheme();
  const colorLinea = { suave: c.textSoft, bien: c.success, oro: c.goldInk }[tonoLinea];
  return (
    <View style={[estilos.fila, { borderBottomColor: c.divider, borderBottomWidth: ultima ? 0 : StyleSheet.hairlineWidth }]}>
      <AvatarPersona nombre={nombre} avatarUrl={avatarUrl} size={44} />
      <View style={estilos.textos}>
        <Text style={[estilos.nombre, { color: c.textStrong }]} numberOfLines={1}>
          {nombre}
        </Text>
        <Text style={[estilos.linea, { color: colorLinea }]} numberOfLines={1}>
          {linea}
        </Text>
        {segunda ? (
          <Text style={[estilos.linea, { color: c.goldInk }]} numberOfLines={2}>
            {segunda}
          </Text>
        ) : null}
      </View>
      {derecha}
    </View>
  );
}

/** Un mensaje para la lista vacía o sin resultados de búsqueda. */
export function Vacio({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <Text style={[estilos.vacio, { color: c.textSoft }]}>{children}</Text>;
}

const estilos = StyleSheet.create({
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 32,
    alignSelf: 'flex-start',
  },
  punto: { width: 8, height: 8, borderRadius: 4 },
  etiquetaTexto: { fontFamily: 'Jost_500Medium', fontSize: 15 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68, paddingVertical: 10 },
  textos: { flex: 1, gap: 2 },
  nombre: { fontFamily: 'Jost_500Medium', fontSize: 17, lineHeight: 22 },
  linea: { fontFamily: 'Jost_400Regular', fontSize: LETRA.cuerpo - 1, lineHeight: 21 },
  vacio: { fontFamily: 'Jost_400Regular', fontSize: LETRA.cuerpo, lineHeight: 23, paddingVertical: 20, textAlign: 'center' },
});
