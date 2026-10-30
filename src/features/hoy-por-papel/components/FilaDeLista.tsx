import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * Una lista de filas para Hoy (spec 018): la caja con borde y las filas de 56 que se tocan, sin tarjeta por fila. Es la
 * forma de «Mi grupo» y «Mis mentores»: nombre, una línea gris debajo si hace falta, lo que importa a la derecha y el
 * chevron de 16 de todas las tarjetas de Hoy.
 */
export function ListaDeFilas({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>{children}</View>;
}

export function FilaDeLista({
  izquierda,
  titulo,
  subtitulo,
  subtituloEnAlerta = false,
  derecha,
  onPress,
  etiquetaAccesible,
  primera,
}: {
  /** Un punto de color o un avatar. */
  izquierda?: React.ReactNode;
  titulo: string;
  subtitulo?: string | null;
  /** Para lo que hay que atender (un grupo sin mentor): en el rojo del tema. */
  subtituloEnAlerta?: boolean;
  /** Lo que importa: el porcentaje, el color. */
  derecha?: React.ReactNode;
  /** Sin esto la fila es solo para leer. */
  onPress?: () => void;
  /** Lo que oye quien no ve: nombre, estado con su palabra y qué abre. */
  etiquetaAccesible: string;
  primera: boolean;
}) {
  const { c, t } = useTheme();
  const contenido = (
    <>
      {izquierda}
      <View style={estilos.texto}>
        <Text style={[t.cardTitle, { color: c.textStrong }]} numberOfLines={2}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text
            style={[t.body, { color: subtituloEnAlerta ? c.danger : c.textSoft, fontSize: 15, lineHeight: 20 }]}
            numberOfLines={2}
          >
            {subtitulo}
          </Text>
        ) : null}
      </View>
      {derecha}
      {onPress ? <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} /> : null}
    </>
  );
  const borde = { borderTopColor: c.divider, borderTopWidth: primera ? 0 : StyleSheet.hairlineWidth };

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={etiquetaAccesible} style={[estilos.fila, borde]}>
        {contenido}
      </View>
    );
  }
  return (
    <Presionable onPress={onPress} accessibilityRole="button" accessibilityLabel={etiquetaAccesible} style={[estilos.fila, borde]}>
      {contenido}
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  /* El borde redondeado recorta la fila que se hunde al apretar: `overflow` en la caja y no en cada fila. */
  lista: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  /* 56 de alto como mínimo: se toca con el pulgar sin apuntar (AGENTS.md §4). */
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10 },
  texto: { flex: 1, minWidth: 0, gap: 1 },
});
