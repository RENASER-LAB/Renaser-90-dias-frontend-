import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { SelectorDeFormacion } from '../../formaciones/components/SelectorDeFormacion';
import { textoDelProgramaEnOtraFormacion } from '../../formaciones/utils/programaEnOtraFormacion';

/**
 * La línea que reemplaza a «Mi programa» (Training y Hoy) cuando la persona tiene activa otra formación que la de su programa propio
 * (spec 023, FR-030a): dice dónde está y abre el mismo selector de formación de Yo (spec 022). Una sola línea y un botón de 48: se ve de
 * vez en cuando y quien llega aquí busca cambiarse, así que no se anima.
 */
export function AvisoDeProgramaEnOtraFormacion({ nombre }: { nombre: string }) {
  const { c, t } = useTheme();
  const [eligiendo, setEligiendo] = useState(false);
  return (
    <>
      <View
        style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}
        accessibilityRole="summary"
        accessibilityLabel={textoDelProgramaEnOtraFormacion(nombre)}
      >
        <View style={estilos.fila}>
          <Icon name="lock" size={TAMANO_ICONO.normal} color={c.goldInk} />
          <Text style={[t.body, estilos.texto, { color: c.textStrong }]}>{textoDelProgramaEnOtraFormacion(nombre)}</Text>
        </View>
        <Presionable
          onPress={() => setEligiendo(true)}
          accessibilityRole="button"
          accessibilityLabel="Cambiar de formación"
          style={[estilos.boton, { borderColor: c.goldInk }]}
        >
          <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media }]}>Cambiar de formación</Text>
        </Presionable>
      </View>
      <SelectorDeFormacion visible={eligiendo} alCerrar={() => setEligiendo(false)} />
    </>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  texto: { flex: 1, flexShrink: 1, fontSize: 16, lineHeight: 22 },
  boton: { minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
});
