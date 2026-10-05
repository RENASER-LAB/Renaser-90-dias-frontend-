import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactionUser } from '../../../screens/ComunidadScreen';
import { Icon } from '../../../components/Icon';
import { AvatarPersona } from '../../../components/ui';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * Quién dio «me gusta» a una publicación del Muro (o desde el visor de fotos), en una hoja desde
 * abajo (rediseño del 2026-10-05, tanda 2 de Comunidad).
 *
 * > **Antes del 2026-10-05** era una ventana centrada con borde dorado, el título en mayúsculas
 * > («REACCIONES DEL POST»), un «× Cerrar» en texto y cada persona con el mismo emoji 👤. Ahora es
 * > la `HojaDesdeAbajo` de toda la app (se arrastra para cerrarla, colores del tema) y cada fila
 * > lleva la foto de la persona o sus iniciales (`AvatarPersona`), como en la info de un grupo.
 *
 * Solo «me gusta»: el dislike se retiró del producto y sus filas viejas se descartan en
 * `useWallReactions`. Por eso no hay pestañas de filtro.
 */
export function HojaDeReacciones({
  visible,
  alCerrar,
  reacciones,
  cargando,
  error,
}: {
  visible: boolean;
  alCerrar: () => void;
  reacciones: ReactionUser[];
  cargando: boolean;
  error: string | null;
}) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: altoVentana } = useWindowDimensions();

  const subtitulo = cargando ? 'Cargando…' : error ? undefined : `${reacciones.length} me gusta`;

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      titulo="Reacciones"
      subtitulo={subtitulo}
      etiquetaCerrar="Cerrar reacciones"
    >
      <ScrollView
        style={{ maxHeight: Math.round((altoVentana - insets.top) * 0.55) }}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
      >
        {cargando && (
          <View style={styles.estado}>
            <ActivityIndicator size="small" color={c.goldInk} />
            <Text style={[t.body, { color: c.textSoft }]}>Cargando reacciones…</Text>
          </View>
        )}
        {!cargando && error && <Text style={[t.body, styles.mensaje, { color: c.danger }]}>{error}</Text>}
        {!cargando && !error && reacciones.length === 0 && (
          <Text style={[t.body, styles.mensaje, { color: c.textSoft }]}>Todavía nadie reaccionó a esta publicación.</Text>
        )}
        {!cargando &&
          !error &&
          reacciones.map(persona => (
            <View
              key={persona.id}
              style={styles.fila}
              accessible
              accessibilityLabel={persona.role ? `${persona.name}, ${persona.role}. Me gusta` : `${persona.name}. Me gusta`}
            >
              <AvatarPersona nombre={persona.name} avatarUrl={persona.avatarUrl} size={40} />
              <View style={[styles.filaCuerpo, { borderBottomColor: c.divider }]}>
                <View style={styles.filaTextos}>
                  <Text numberOfLines={1} style={[styles.nombre, { color: c.textStrong }]}>
                    {persona.name}
                  </Text>
                  {persona.role ? (
                    <Text numberOfLines={1} style={[styles.rol, { color: c.textSoft }]}>
                      {persona.role}
                    </Text>
                  ) : null}
                </View>
                <Icon name="thumbsUp" size={18} color={c.goldInk} />
              </View>
            </View>
          ))}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const styles = StyleSheet.create({
  lista: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  mensaje: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 20,
  },
  filaCuerpo: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingRight: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filaTextos: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  nombre: {
    fontFamily: 'Jost_500Medium',
    fontSize: 16,
    lineHeight: 21,
  },
  rol: {
    fontFamily: 'Jost_400Regular',
    fontSize: 14,
    lineHeight: 19,
  },
});
