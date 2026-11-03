import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { ETIQUETA_EJE } from '../../objetivos/types/objetivos.types';
import { iconoDelEje } from '../../objetivos/utils/iconoDelEje';
import type { ResultadoDeTerminar } from '../types/diagnostico.types';
import { TEXTO_SIN_OBJETIVOS, TITULO_DEL_CIERRE } from '../utils/textosDelDiagnostico';

/** Los objetivos con el de la prioridad principal primero (el orden en que Plan los va a mostrar). */
export function objetivosParaElCierre(resultado: ResultadoDeTerminar): ResultadoDeTerminar['objetivos'] {
  const primero = resultado.prioridad;
  return [...resultado.objetivos].sort((a, b) => Number(b.eje === primero) - Number(a.eje === primero));
}

/**
 * El cierre del diagnóstico (spec 026, FR-013): dice que los objetivos ya están preparados y cuáles son —tal como los escribió
 * la persona, con su prioridad primero—, la primera acción que dejó y qué sigue. Si el diagnóstico no alimentó ninguno, dice
 * que los escribirá en Plan. El botón «Continuar» lo pone quien lo usa.
 */
export function CierreDelDiagnostico({ resultado, queSigue }: { resultado: ResultadoDeTerminar; queSigue: string }) {
  const { c, t } = useTheme();
  const objetivos = objetivosParaElCierre(resultado);

  return (
    <View style={estilos.columna}>
      <View style={[estilos.sello, { backgroundColor: c.goldWash, borderColor: c.gold }]}>
        <Icon name="checkCircle" size={24} color={c.goldInk} />
      </View>
      <Text accessibilityRole="header" style={[t.screenTitle, { color: c.textStrong }]}>
        {TITULO_DEL_CIERRE}
      </Text>

      {objetivos.length > 0 ? (
        <View style={estilos.lista}>
          {objetivos.map(objetivo => (
            <View key={objetivo.eje} style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
              <View style={estilos.eje}>
                <Icon name={iconoDelEje(objetivo.eje)} size={16} color={c.goldInk} />
                <Text style={[t.body, estilos.nombreDelEje, { color: c.goldInk }]}>
                  {ETIQUETA_EJE[objetivo.eje]}
                  {objetivo.eje === resultado.prioridad ? ' · tu prioridad principal' : ''}
                </Text>
              </View>
              <Text style={[t.body, estilos.texto, { color: c.textStrong }]}>{objetivo.texto}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[t.body, estilos.texto, { color: c.text }]}>{TEXTO_SIN_OBJETIVOS}</Text>
      )}

      {resultado.primeraAccion ? (
        <View style={estilos.accion}>
          <Text style={[t.body, estilos.nombreDelEje, { color: c.textSoft }]}>Tu primera acción</Text>
          <Text style={[t.body, estilos.texto, { color: c.text }]}>{resultado.primeraAccion}</Text>
        </View>
      ) : null}

      <Text style={[t.body, estilos.texto, { color: c.textSoft }]}>{queSigue}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 20, paddingTop: 12 },
  sello: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  lista: { gap: 12 },
  tarjeta: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
  eje: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombreDelEje: { fontSize: 15, lineHeight: 21, fontFamily: fuentes.negrita },
  texto: { fontSize: 16, lineHeight: 23 },
  accion: { gap: 4 },
});
