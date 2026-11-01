import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { HAY_RECORDATORIOS_LOCALES } from '../../habits/notificaciones/recordatoriosDeHabito';
import type { PagosDeLaPersona } from '../api/pagosSchemas';
import {
  PREFERENCIAS_DE_PAGOS_POR_DEFECTO,
  preferenciasDePagos,
  resumenDeLosRecordatoriosDePago,
  type PreferenciasDePagos,
} from '../notificaciones/preferenciasDePagos';
import { ControlDeRecordatoriosDePago } from './ControlDeRecordatoriosDePago';

/**
 * «Recordatorios de pago ›» al pie de «Mi ingreso» (spec 032): una fila de una línea con el estado guardado en este teléfono («3 días antes y el mismo día ·
 * 09:00», «Apagados en este teléfono») que abre una hoja con el MISMO control de Yo → Alarmas, como «Recordatorios de tus acciones» en Plan. La línea se
 * lee al montar y cada vez que se cierra la hoja. Sin alarmas locales (web, Expo Go) no se dibuja.
 */
export function RecordatoriosDePagoEnMiIngreso({ userId, pagos }: { userId: string; pagos: PagosDeLaPersona | null }) {
  const { c, t } = useTheme();
  const [abierta, setAbierta] = useState(false);
  const [prefs, setPrefs] = useState<PreferenciasDePagos>(PREFERENCIAS_DE_PAGOS_POR_DEFECTO);

  const leer = useCallback(() => {
    void preferenciasDePagos(userId).then(setPrefs).catch(() => undefined);
  }, [userId]);
  useEffect(() => {
    if (HAY_RECORDATORIOS_LOCALES) leer();
  }, [leer]);

  if (!HAY_RECORDATORIOS_LOCALES) return null;
  const resumen = resumenDeLosRecordatoriosDePago(prefs);

  return (
    <>
      <Presionable
        onPress={() => setAbierta(true)}
        accessibilityRole="button"
        accessibilityLabel={`Recordatorios de pago. ${resumen}`}
        style={[estilos.fila, { borderColor: c.border, backgroundColor: c.cardBg }]}
      >
        <Icon name="bell" size={TAMANO_ICONO.normal} color={c.goldInk} />
        <View style={estilos.textos}>
          <Text style={[t.body, estilos.titulo, { color: c.textStrong }]}>Recordatorios de pago</Text>
          <Text style={[t.small, { color: c.textSoft, fontSize: 16 }]}>{resumen}</Text>
        </View>
        <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
      </Presionable>

      <HojaDesdeAbajo
        visible={abierta}
        alCerrar={() => {
          setAbierta(false);
          leer();
        }}
        titulo="Recordatorios de pago"
        tamano="grande"
      >
        <View style={estilos.cuerpoDeLaHoja}>
          <ControlDeRecordatoriosDePago userId={userId} pagos={pagos} />
        </View>
      </HojaDesdeAbajo>
    </>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderRadius: 14 },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  titulo: { fontSize: 17, lineHeight: 24, fontFamily: fuentes.media },
  cuerpoDeLaHoja: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
});
