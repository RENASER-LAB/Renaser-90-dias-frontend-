// pedido del dueño 2026-11-05 muro compacto
import React from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';

export const TITULO_DE_LA_PUBLICACION_ABIERTA = 'Publicación';

/**
 * La publicación abierta desde la lista compacta del Muro (pedido del dueño, 2026-11-05): a pantalla completa DENTRO de
 * Comunidad, sobre la lista (que queda montada debajo, así que al volver conserva su posición). Cabecera «‹ Publicación»
 * y un solo scroll con la tarjeta de siempre (`TarjetaPublicacionMuro`, que llega como `children`): texto completo,
 * mosaico de fotos, reacciones, comentarios, compartir y moderación, sin reescribir nada.
 *
 * El atrás del sistema lo atiende la pantalla (`useSystemBackHandler` de `ComunidadScreen`), en su lugar de la cadena:
 * una hoja abierta encima (reacciones, compartir) se cierra antes que la publicación.
 *
 * Sin animación de entrada: abrir una publicación es frecuente y la lista sigue en su lugar debajo.
 */
export function PublicacionAbierta({
  onVolver,
  margenArriba = 0,
  children,
}: {
  onVolver: () => void;
  /** El borde seguro de arriba cuando la pantalla de Comunidad no lo aplica (encabezado flotante). */
  margenArriba?: number;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();
  /* Sin barra de pestañas mientras está abierta: el borde seguro de abajo lo pone esta pantalla (la de Comunidad no lo aplica). */
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={[StyleSheet.absoluteFill, estilos.capa, { backgroundColor: c.bg, paddingTop: margenArriba }]} testID="publicacion-abierta">
      <KeyboardAvoidingView style={estilos.lleno} behavior="padding">
        <CabeceraAdmin titulo={TITULO_DE_LA_PUBLICACION_ABIERTA} onVolver={onVolver} />
        <ScrollView
          style={estilos.lleno}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 36 + bottom,
            paddingHorizontal: horizontalPadding,
            maxWidth: contentMaxWidth,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          }}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  /* Encima de la lista y del encabezado de Comunidad (que también va en posición absoluta). */
  capa: { zIndex: 50, elevation: 50 },
  lleno: { flex: 1 },
});
