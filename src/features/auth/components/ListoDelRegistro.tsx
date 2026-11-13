import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { BotonDelIngreso } from './BotonDelIngreso';
import { EntradaEscalonada } from './EntradaEscalonada';

/**
 * El final de «Solicitar acceso» (spec 051): «Listo, <nombre>», una línea y «Ir al inicio». Sobre fondo liso, como los pasos.
 * «Ver el estado de mi solicitud» sigue existiendo (es la única forma de saber si la aprobaron mientras no hay sesión), pero
 * como un enlace chico: el resultado de la consulta se dice en una línea bajo el texto.
 */
export function ListoDelRegistro({
  nombre,
  aviso,
  error,
  consultando,
  puedeConsultar,
  alIrAlInicio,
  alConsultarEstado,
}: {
  nombre: string;
  aviso: string | null;
  error: string | null;
  consultando: boolean;
  puedeConsultar: boolean;
  alIrAlInicio: () => void;
  alConsultarEstado: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, isTablet } = useResponsive();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.raiz, { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={[styles.centro, { paddingHorizontal: horizontalPadding }, isTablet && styles.tablet]}>
        <EntradaEscalonada indice={0} style={styles.bloque}>
          <View style={[styles.circulo, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
            <Icon name="check" size={28} color={c.goldInk} strokeWidth={2} />
          </View>
          <Text accessibilityRole="header" style={[styles.titulo, { color: c.textStrong }]}>
            {nombre ? `Listo, ${nombre}` : 'Listo'}
          </Text>
          <Text style={[t.body, styles.linea, { color: c.textSoft }]}>Te avisaremos cuando aprueben tu acceso.</Text>
          {error ? (
            <Text accessibilityLiveRegion="polite" style={[t.small, styles.linea, { color: c.danger }]}>{error}</Text>
          ) : aviso ? (
            <Text accessibilityLiveRegion="polite" style={[t.small, styles.linea, { color: c.goldInk }]}>{aviso}</Text>
          ) : null}
        </EntradaEscalonada>
      </View>

      <View style={[styles.pie, { paddingHorizontal: horizontalPadding }, isTablet && styles.tablet]}>
        {puedeConsultar ? (
          <Presionable
            accessibilityRole="button"
            accessibilityLabel="Consultar el estado de tu solicitud"
            onPress={alConsultarEstado}
            disabled={consultando}
            style={styles.enlace}
          >
            {consultando ? (
              <ActivityIndicator color={c.goldInk} size="small" />
            ) : (
              <Text style={[t.small, styles.textoDelEnlace, { color: c.goldInk }]}>Ver el estado de mi solicitud</Text>
            )}
          </Presionable>
        ) : null}
        <BotonDelIngreso etiqueta="Ir al inicio" cargando={false} onPress={alIrAlInicio} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  centro: { flex: 1, justifyContent: 'center' },
  tablet: { maxWidth: 560, width: '100%', alignSelf: 'center' },
  bloque: { alignItems: 'center', gap: 14 },
  circulo: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  titulo: { fontFamily: fuentes.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.8, textAlign: 'center' },
  linea: { textAlign: 'center' },
  pie: { gap: 6 },
  enlace: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  textoDelEnlace: { fontFamily: fuentes.media, textDecorationLine: 'underline' },
});
