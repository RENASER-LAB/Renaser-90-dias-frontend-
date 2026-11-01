import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { useEstadoDeMiDiagnostico } from '../hooks/useEstadoDeMiDiagnostico';
import { diagnosticoPendiente } from '../utils/estadoDelDiagnostico';
import { TARJETA_PENDIENTE_LINEA, TARJETA_PENDIENTE_TITULO } from '../utils/textosDelDiagnostico';

/**
 * «Completa tu diagnóstico» en Hoy (spec 026, FR-026-9): para quien ya estaba dentro de la app y Administración le asignó el
 * diagnóstico. Una fila compacta, toda tocable, con el estilo de las tarjetas de Hoy (la del Mapa que reemplaza era igual).
 *
 * **Solo existe con el diagnóstico pendiente o en curso.** Devuelve `null` —sin dibujar nada— con la ficha estándar, con el
 * diagnóstico terminado, mientras no se sabe, y cuando el servidor no tiene la ruta (404) o no hay red: ahí Hoy queda como estaba.
 * La tarjeta pregunta su propio estado (`useEstadoDeMiDiagnostico`) y se va sola cuando la persona termina.
 *
 * Movimiento: ninguno propio. Responde al dedo con el `Presionable` de siempre.
 */
export function TarjetaDelDiagnosticoPendiente({ alAbrir }: { alAbrir: () => void }) {
  const { c, t } = useTheme();
  const { estado } = useEstadoDeMiDiagnostico();

  if (!diagnosticoPendiente(estado)) return null;

  return (
    <Presionable
      onPress={alAbrir}
      accessibilityRole="button"
      accessibilityLabel={`${TARJETA_PENDIENTE_TITULO}. ${TARJETA_PENDIENTE_LINEA}`}
      style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}
    >
      <Icon name="listChecks" size={TAMANO_ICONO.normal} color={c.goldInk} />
      <View style={estilos.textos}>
        <Text style={[t.cardTitle, estilos.titulo, { color: c.textStrong }]} numberOfLines={1}>
          {TARJETA_PENDIENTE_TITULO}
        </Text>
        <Text style={[t.small, estilos.linea, { color: c.textSoft }]} numberOfLines={2}>
          {TARJETA_PENDIENTE_LINEA}
        </Text>
      </View>
      <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.textSoft} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 17,
    paddingVertical: 14,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textos: { flex: 1, gap: 2 },
  titulo: { fontSize: 16, lineHeight: 22, fontFamily: fuentes.negrita },
  linea: { fontSize: 14, lineHeight: 20 },
});
