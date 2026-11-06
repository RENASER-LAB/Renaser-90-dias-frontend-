import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { fuentes } from '../../../theme/fuentes';
import { lineaAntesDeEnviar, TEXTO_DEL_ENLACE, type FlujoDelCodigo } from '../utils/codigoPorWhatsApp';
import type { EstadoDelWhatsapp } from '../hooks/useOfertaDeWhatsApp';

type Props = {
  flujo: FlujoDelCodigo;
  estado: EstadoDelWhatsapp;
  enmascarado: string | null;
  mensaje: string | null;
  error: string | null;
  onEnviar: () => void;
};

/**
 * «¿No te llegó? Envíamelo por WhatsApp» (spec 043, FR-012, FR-015): aparece a los 60 segundos en la pantalla del código, un botón de 48 de alto con
 * el ícono del chat. En el alta dice a qué número va (enmascarado); en la recuperación no muestra ninguno. Entra con el fundido de `Aparicion` (se ve
 * una vez por pantalla); tocarlo vibra con `tacto` según el resultado.
 */
export function EnlaceDeWhatsApp({ flujo, estado, enmascarado, mensaje, error, onEnviar }: Props) {
  const { c, t } = useTheme();
  const linea = lineaAntesDeEnviar(flujo, enmascarado);

  if (estado === 'enviado' && mensaje) {
    return (
      <Aparicion desplazamiento={6}>
        <View style={styles.enviado} accessibilityLiveRegion="polite" accessibilityRole="text">
          <Icon name="checkCircle" size={20} color={c.goldInk} />
          <Text style={[t.body, styles.texto, { color: c.goldInk }]}>{mensaje}</Text>
        </View>
      </Aparicion>
    );
  }

  return (
    <Aparicion desplazamiento={6}>
      <Presionable
        accessibilityRole="button"
        accessibilityLabel={linea ? `${TEXTO_DEL_ENLACE}. ${linea}` : TEXTO_DEL_ENLACE}
        accessibilityState={{ busy: estado === 'enviando', disabled: estado === 'enviando' }}
        disabled={estado === 'enviando'}
        onPress={onEnviar}
        style={[styles.enlace, { borderColor: c.border }]}
      >
        {estado === 'enviando' ? (
          <ActivityIndicator size="small" color={c.goldInk} />
        ) : (
          <Icon name="messageCircle" size={20} color={c.goldInk} />
        )}
        <View style={styles.textos}>
          <Text style={[t.body, styles.texto, { color: c.goldInk, fontFamily: fuentes.media }]}>{TEXTO_DEL_ENLACE}</Text>
          {linea ? <Text style={[t.small, { color: c.textSoft, fontSize: 15 }]}>{linea}</Text> : null}
        </View>
      </Presionable>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[t.small, styles.error, { color: c.danger }]}>
          {error}
        </Text>
      ) : null}
    </Aparicion>
  );
}

const styles = StyleSheet.create({
  enlace: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    width: '100%',
  },
  textos: { flexShrink: 1, gap: 2 },
  texto: { fontSize: 16, flexShrink: 1 },
  enviado: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    width: '100%',
  },
  error: { fontSize: 15, marginTop: 6, textAlign: 'center' },
});
