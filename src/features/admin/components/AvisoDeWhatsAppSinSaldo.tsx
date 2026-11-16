import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { EstadoDeWhatsApp } from '../api/estadoDeWhatsAppApi';
import { lineaDeLosEnviosFallidos, TEXTO_SIN_SALDO, TITULO_SIN_SALDO } from '../utils/avisoDeWhatsAppSinSaldo';

/**
 * La tarjeta de aviso arriba del panel de Administración cuando los WhatsApp no salen por falta de saldo en YCloud
 * (spec 054, FR-006). Con el estilo de avisos de la app (borde y fondo de peligro). Sin aviso no dibuja nada, ni un hueco.
 */
export function AvisoDeWhatsAppSinSaldo({ estado }: { estado: EstadoDeWhatsApp | null }) {
  const { c, t } = useTheme();
  if (!estado || !estado.sinSaldo) return null;
  const linea = lineaDeLosEnviosFallidos(estado.fallaron, estado.desde);
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`${TITULO_SIN_SALDO}. ${TEXTO_SIN_SALDO} ${linea}.`}
      style={[estilos.tarjeta, { borderColor: c.danger, backgroundColor: c.dangerWash }]}
    >
      <Icon name="alertTriangle" size={20} color={c.danger} />
      <View style={estilos.cuerpo}>
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>{TITULO_SIN_SALDO}</Text>
        <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>{TEXTO_SIN_SALDO}</Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{linea}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1.5, borderRadius: 16, padding: 14, width: '100%' },
  cuerpo: { flex: 1, flexShrink: 1, gap: 6 },
});
