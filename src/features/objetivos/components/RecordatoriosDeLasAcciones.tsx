import { fuentes } from '../../../theme/fuentes';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { HAY_RECORDATORIOS_LOCALES } from '../../habits/notificaciones/recordatoriosDeHabito';
import { useAlarmasAlDiaConLasAcciones } from '../hooks/useAlarmasAlDiaConLasAcciones';
import { preferenciasDeAcciones } from '../notificaciones/recordatoriosDeAcciones';
import type { PreferenciasDeAcciones } from '../notificaciones/preferenciasPorDia';
import { RESUMEN_DE_LOS_RECORDATORIOS_POR_OMISION, resumenDeLosRecordatorios } from '../notificaciones/resumenDelRecordatorio';
import type { RocaDiariaApi } from '../types/objetivos.types';
import { RecordatorioDeAcciones } from './RecordatorioDeAcciones';

/**
 * «Recordatorios de tus acciones ›» en Plan (2026-10-31, E2E del rediseño: el bloque entero con «Cómo suena» empujaba «Tu 80/20» y
 * «Organizar mi semana ›» unas tres pantallas más abajo). Una fila de una línea con el estado, que abre una hoja grande con el
 * MISMO control de siempre (`RecordatorioDeAcciones`), sin tocar su lógica: el diario, el aviso antes de cada acción, los días y
 * «Cómo suena». Yo → Alarmas lo sigue mostrando directo.
 *
 * - **Las alarmas no dependen de que la hoja esté abierta.** El control ponía al día las alarmas de cada acción cuando Plan cambiaba
 *   la lista; con él dentro de una hoja eso dejaría de correr con la hoja cerrada. Lo hace ahora `useAlarmasAlDiaConLasAcciones`,
 *   siempre montado aquí, y el control de la hoja va con `sincronizarConLaLista={false}` para no hacerlo dos veces.
 * - **La línea de estado** se lee de lo guardado al montar y cada vez que la hoja se cierra (el control guarda al tocar).
 * - Sin alarmas locales (web, Expo Go) no se dibuja nada, como antes.
 * - Sin animaciones nuevas: la hoja es `HojaDesdeAbajo`; la fila, un `Presionable`.
 */
export function RecordatoriosDeLasAcciones({ userId, rocas }: { userId: string; rocas?: RocaDiariaApi[] }) {
  const { c, t } = useTheme();
  const [abierta, setAbierta] = useState(false);
  const [prefs, setPrefs] = useState<PreferenciasDeAcciones | null>(null);

  useAlarmasAlDiaConLasAcciones(userId, rocas);

  const leer = useCallback(() => {
    void preferenciasDeAcciones(userId).then(setPrefs).catch(() => undefined);
  }, [userId]);
  useEffect(() => {
    if (HAY_RECORDATORIOS_LOCALES) leer();
  }, [leer]);

  if (!HAY_RECORDATORIOS_LOCALES) return null;

  const resumen = prefs ? resumenDeLosRecordatorios(prefs) : RESUMEN_DE_LOS_RECORDATORIOS_POR_OMISION;

  return (
    <>
      <Presionable
        onPress={() => setAbierta(true)}
        accessibilityRole="button"
        accessibilityLabel={`Recordatorios de tus acciones. ${resumen}`}
        contenedorStyle={estilos.contenedor}
        style={[estilos.fila, { borderTopColor: c.divider }]}
      >
        <Icon name="bell" size={TAMANO_ICONO.normal} color={c.goldInk} />
        <View style={estilos.textos}>
          <Text style={[t.body, estilos.titulo, { color: c.textStrong }]}>Recordatorios de tus acciones</Text>
          <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>{resumen}</Text>
        </View>
        <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
      </Presionable>

      <HojaDesdeAbajo
        visible={abierta}
        alCerrar={() => {
          setAbierta(false);
          leer();
        }}
        titulo="Recordatorios de tus acciones"
        tamano="grande"
      >
        <View style={estilos.cuerpoDeLaHoja}>
          <RecordatorioDeAcciones userId={userId} rocas={rocas} sincronizarConLaLista={false} />
        </View>
      </HojaDesdeAbajo>
    </>
  );
}

const estilos = StyleSheet.create({
  contenedor: { marginTop: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  titulo: { fontSize: 16, lineHeight: 22, fontFamily: fuentes.media },
  cuerpoDeLaHoja: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
});
