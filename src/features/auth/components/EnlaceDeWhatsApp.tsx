import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { fuentes } from '../../../theme/fuentes';
import { ETIQUETA_DEL_ENLACE, lineaAntesDeEnviar, TEXTO_DEL_ENLACE, type FlujoDelCodigo } from '../utils/codigoPorWhatsApp';
import type { EstadoDelWhatsapp } from '../hooks/useOfertaDeWhatsApp';

type Props = {
  flujo: FlujoDelCodigo;
  estado: EstadoDelWhatsapp;
  enmascarado: string | null;
  onEnviar: () => void;
};

/**
 * «Por WhatsApp» (spec 043, FR-012): aparece a los 60 segundos en la misma línea que «¿No te llegó? Reenviar», con 48 de alto táctil. En el alta el
 * lector de pantalla oye además a qué número va (enmascarado); en la recuperación, ninguno. Lo que pasó al tocarlo lo dice `LineaDeWhatsApp`.
 */
export function EnlaceDeWhatsApp({ flujo, estado, enmascarado, onEnviar }: Props) {
  const { c, t } = useTheme();
  const linea = lineaAntesDeEnviar(flujo, enmascarado);
  const enviando = estado === 'enviando';
  return (
    <Aparicion desplazamiento={0}>
      <Presionable
        accessibilityRole="button"
        accessibilityLabel={linea ? `${ETIQUETA_DEL_ENLACE}. ${linea}` : ETIQUETA_DEL_ENLACE}
        accessibilityState={{ busy: enviando, disabled: enviando }}
        disabled={enviando}
        onPress={onEnviar}
        style={styles.enlace}
      >
        {enviando ? <ActivityIndicator size="small" color={c.goldInk} /> : null}
        <Text style={[t.small, styles.texto, { color: c.goldInk, fontFamily: fuentes.media }]}>{TEXTO_DEL_ENLACE}</Text>
      </Presionable>
    </Aparicion>
  );
}

/** Debajo de la línea: lo que pasó al tocar «Por WhatsApp» (FR-015), o el motivo si no salió. */
export function LineaDeWhatsApp({ mensaje, error }: { mensaje: string | null; error: string | null }) {
  const { c, t } = useTheme();
  const texto = error ?? mensaje;
  if (!texto) return null;
  return (
    <Aparicion desplazamiento={4}>
      <Text accessibilityLiveRegion="polite" style={[t.small, styles.linea, { color: error ? c.danger : c.goldInk }]}>
        {texto}
      </Text>
    </Aparicion>
  );
}

const styles = StyleSheet.create({
  enlace: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  texto: { fontSize: 15 },
  linea: { fontSize: 15, textAlign: 'center', marginTop: 2 },
});
