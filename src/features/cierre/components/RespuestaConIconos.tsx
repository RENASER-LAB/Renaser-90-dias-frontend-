import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { iconoDelMotivo, iconoDelPlan, textoCortoDelMotivo, textoCortoDelPlan } from '../data/textosDelCierre';
import { respuestaParaElLector } from '../utils/textosDeLosCierres';

/**
 * Lo que la persona dijo de una acción pendiente, en las fichas del acompañamiento (spec 017): «Tiempo → Otra hora»,
 * con el mismo ícono (de línea, no un emoji) y el mismo texto corto de los chips con que lo eligió (2026-11-03, «Cierra tu día con chips de ícono»).
 *
 * - **Solo lectura**: el ícono es chico (16) y del gris del texto; nada que tocar.
 * - **Se entiende lo que se entiende**: un valor que esta versión no conoce no se dibuja, ni él ni su ícono (la otra mitad
 *   sí); sin ninguna de las dos, no se dibuja nada.
 * - **El lector de pantalla oye el texto completo de siempre** («No me alcanzó el tiempo, Hacerla a otra hora»), no los
 *   íconos ni las flechas.
 * - Si el renglón no cabe, se parte entre las dos mitades (`flexWrap`), nunca a mitad de una.
 */
export function RespuestaConIconos({ cierre }: { cierre: { motivo: string | null; manana: string | null } }) {
  const { c, t } = useTheme();
  const motivo = textoCortoDelMotivo(cierre.motivo);
  const plan = textoCortoDelPlan(cierre.manana);
  if (!motivo && !plan) return null;

  return (
    <View style={estilos.fila} accessible accessibilityLabel={respuestaParaElLector(cierre) ?? undefined}>
      {motivo ? <Parte texto={motivo} icono={iconoDelMotivo(cierre.motivo)} /> : null}
      {motivo && plan ? <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>→</Text> : null}
      {plan ? <Parte texto={plan} icono={iconoDelPlan(cierre.manana)} /> : null}
    </View>
  );
}

function Parte({ texto, icono }: { texto: string; icono: IconName | null }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.parte}>
      {icono ? <Icon name={icono} size={TAMANO_ICONO.chico} color={c.textSoft} /> : null}
      <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22 }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 2 },
  parte: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
