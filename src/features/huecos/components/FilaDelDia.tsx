import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { DiaConHuecos } from '../types/huecos.types';
import {
  diaCorto,
  huecoHablado,
  lineaDelHueco,
  resumenDelDia,
  TEXTO_DE_DIA_SIN_HUECOS,
  ventanaEnPalabras,
} from '../utils/textosDeHuecos';

/**
 * Un día de la semana de huecos: su nombre, su ventana («De 05:30 a 22:30», o «Sin hora de Despertar o de Dormir: se cuenta todo el día») y
 * sus huecos de 30 minutos o más, uno por renglón.
 *
 * **Plegable solo cuando la semana es larga** (`plegable`): entonces la cabecera es un botón de 48 con un chevron que dice
 * el estado (abajo cerrado, arriba abierto) y, plegado, una sola línea con cuántos huecos hay. En una semana corta no hay
 * nada que tocar: todo se lee de corrido. Abrir y cerrar es instantáneo, sin animación: lo hace quien acompaña varias
 * veces por visita y lo que importa es leer (como los días de `DiaDeLaPersona`).
 *
 * Un día sin huecos lo dice con palabras, no con un vacío: «Sin huecos de 30 min o más».
 */
export function FilaDelDia({
  dia,
  primera,
  plegable,
  abierto,
  alAlternar,
}: {
  dia: DiaConHuecos;
  primera: boolean;
  plegable: boolean;
  abierto: boolean;
  alAlternar: () => void;
}) {
  const { c, t } = useTheme();
  const nombre = diaCorto(dia.fecha);
  const ventana = ventanaEnPalabras(dia.ventana);
  const mostrarHuecos = !plegable || abierto;

  const cabecera = (
    <>
      <View style={estilos.textos}>
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>{nombre}</Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{ventana}</Text>
        {!mostrarHuecos ? (
          <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 22, fontFamily: 'Jost_500Medium' }]}>
            {resumenDelDia(dia)}
          </Text>
        ) : null}
      </View>
      {plegable ? (
        /* El chevron apunta abajo cerrado y arriba abierto: la forma dice el estado. */
        <View style={{ transform: [{ rotate: abierto ? '270deg' : '90deg' }] }}>
          <Icon name="chevron" size={18} color={c.chevron} />
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[estilos.dia, primera ? null : { borderTopWidth: 1, borderTopColor: c.divider }]}>
      {plegable ? (
        <Presionable
          onPress={alAlternar}
          accessibilityRole="button"
          accessibilityState={{ expanded: abierto }}
          accessibilityLabel={`${nombre}. ${ventana}. ${resumenDelDia(dia)}`}
          accessibilityHint={abierto ? 'Toca para plegar el día' : 'Toca para ver los huecos del día'}
          style={estilos.cabecera}
        >
          {cabecera}
        </Presionable>
      ) : (
        <View style={estilos.cabecera}>{cabecera}</View>
      )}

      {mostrarHuecos ? (
        <View style={estilos.huecos}>
          {dia.huecos.length === 0 ? (
            <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{TEXTO_DE_DIA_SIN_HUECOS}</Text>
          ) : (
            dia.huecos.map(hueco => (
              <Text
                key={`${hueco.desde}-${hueco.hasta}`}
                accessibilityLabel={huecoHablado(hueco)}
                style={[t.body, { color: c.text, fontSize: 17, lineHeight: 24, fontFamily: 'Jost_500Medium' }]}
              >
                {lineaDelHueco(hueco)}
              </Text>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  dia: { paddingVertical: 4 },
  /* 48: el mínimo cómodo para una sola mano (AGENTS.md §4). */
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 48, paddingVertical: 6 },
  textos: { flex: 1, minWidth: 0, gap: 1 },
  huecos: { gap: 4, paddingBottom: 8 },
});
