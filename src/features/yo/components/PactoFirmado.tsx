import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';
import { fechaDeFirma } from '../utils/navegacionDeYo';

/**
 * El pie del Pacto cuando ya está firmado (decisión 12 del dueño, 2026-10-05): en solo lectura.
 *
 * **Antes**: quien ya había firmado entraba a revisar su Pacto y encontraba el lienzo vacío y
 * «Sellar mi compromiso» otra vez, como si no hubiera firmado nunca.
 *
 * **De dónde sale cada cosa:**
 * - La **fecha**: `pactSignedAt` de `GET /api/v1/onboarding/state` (el mismo dato que pone el ✓ en
 *   «Mi onboarding»).
 * - La **firma dibujada**: el servidor la guarda (un PNG en S3, registrado con `POST
 *   /api/v1/onboarding/media`, con los trazos en `metadata`), pero **no hay ningún endpoint que la
 *   devuelva**: `GET /api/v1/onboarding/answers` trae solo el `mediaId`, y `MediaController` solo
 *   tiene la subida. Por eso acá no se dibuja: mostrar el nombre en letra de firma sería aparentar
 *   una firma que la pantalla no tiene. Cuando el backend la exponga, va debajo de la fecha.
 */
export function PactoFirmado({ firmadoEn }: { firmadoEn: string | null }) {
  const { c, t } = useTheme();
  const fecha = fechaDeFirma(firmadoEn);
  return (
    <View
      accessible
      accessibilityLabel={`${fecha ? `Firmado el ${fecha}` : 'Pacto firmado'}. Tu firma quedó guardada en tu expediente.`}
      style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBg }]}
    >
      <View style={[estilos.marca, { backgroundColor: c.successWash }]}>
        <Icon name="check" size={TAMANO_ICONO.normal} color={c.success} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.cardTitle, { color: c.textStrong }]}>{fecha ? `Firmado el ${fecha}` : 'Pacto firmado'}</Text>
        <Text style={[t.body, { color: c.textSoft }]}>Tu firma quedó guardada en tu expediente.</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
  },
  marca: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
