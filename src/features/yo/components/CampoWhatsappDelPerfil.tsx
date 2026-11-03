import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PhoneCountryInput } from '../../../components/PhoneCountryInput';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { LecturaDelWhatsapp } from '../hooks/useWhatsappDelPerfil';

interface Props {
  lectura: LecturaDelWhatsapp;
  valor: string;
  /** Cambia cuando el número llega de una lectura nueva: el campo se arma de nuevo con su país. */
  version: number;
  error: string | null;
  onCambiar: (numeroCompleto: string) => void;
  onReintentar: () => void;
}

/**
 * El campo «WhatsApp» de Editar perfil (Yo → Ajustes → Perfil): el número de la Ficha Inicial con el MISMO control de la ficha —la píldora del país
 * (que abre la hoja desde abajo con buscador) y el número—.
 *
 * - **Mientras se lee no se dibuja el campo**: el país sale del número que recibe al montarse, así que no puede nacer vacío y cambiar después. En su
 *   lugar queda una caja del mismo alto (52), para que ni el botón de abajo ni los otros campos salten cuando llega.
 * - **Si no se pudo leer**, lo dice y deja reintentar en una fila de 52; el resto del perfil se guarda igual, sin tocar el número.
 * - El rótulo es el de los otros campos de la pantalla (15, medio), no el `MicroLabel` del control: el control va sin rótulo propio (`label=""`).
 */
export function CampoWhatsappDelPerfil({ lectura, valor, version, error, onCambiar, onReintentar }: Props) {
  const { c, t } = useTheme();
  const caja = [styles.sinLeer, { borderColor: c.border, backgroundColor: c.cardBg }];
  return (
    <View style={styles.campo}>
      <Text style={[t.small, styles.rotulo, { color: c.textStrong }]}>WhatsApp</Text>
      {lectura === 'listo' ? (
        <PhoneCountryInput
          key={version}
          label=""
          value={valor}
          onChange={fullNumber => onCambiar(fullNumber)}
          error={error ?? undefined}
          returnKeyType="done"
        />
      ) : lectura === 'error' ? (
        <Presionable
          accessibilityRole="button"
          accessibilityLabel="No pudimos cargar tu WhatsApp. Reintentar"
          onPress={onReintentar}
          style={caja}
        >
          <Text style={[t.body, styles.mensaje, { color: c.textSoft }]}>No pudimos cargar tu WhatsApp.</Text>
          <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media }]}>Reintentar</Text>
        </Presionable>
      ) : (
        <View style={caja} accessibilityLabel="Cargando tu WhatsApp">
          <Text style={[t.body, { color: c.textSoft }]}>Cargando…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: { gap: 6 },
  rotulo: { fontFamily: fuentes.media, fontSize: 15, lineHeight: 20 },
  sinLeer: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mensaje: { flex: 1 },
});
