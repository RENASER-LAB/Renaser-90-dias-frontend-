import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { FilaDeDiasDelPlan } from '../../habits/components/FilaDeDiasDelPlan';
import { DIAS_DEL_PLAN, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';
import type { MiRadarApi } from '../types/radar.types';
import { resumenDelDiaEnLaFila } from '../utils/diasDeMiRadar';
import type { DiaIso } from '../utils/miRadar';

/** Mi Radar corre los siete días: ningún día de la fila está de más. */
const CORRE_TODOS_LOS_DIAS: Record<DiaDelPlan, boolean> = {
  LUN: true, MAR: true, 'MIÉ': true, JUE: true, VIE: true, 'SÁB': true, DOM: true,
};

/** Ningún día va con candado: cambiar las horas de Mi Radar rige en el acto (a diferencia de los hábitos, D-91). */
const TODOS_SE_PUEDEN_TOCAR = () => true;

/** El día de la pantalla (LUN … DOM) como día ISO (1 … 7): el que habla el contrato. */
export const isoDelDia = (dia: DiaDelPlan): DiaIso => (DIAS_DEL_PLAN.indexOf(dia) + 1) as DiaIso;

/**
 * Los siete días de la semana de Mi Radar (spec 012, cuarta ronda): la fila de «Planificar» de los hábitos
 * (`FilaDeDiasDelPlan`, sin tocarla), con su rótulo y su ayuda.
 *
 * - **Sin días marcados** el rótulo dice «Todos los días» y lo que se edita abajo vale para todos.
 * - **Con días marcados** dice «Solo sáb, dom» y aparece «Todos» para volver.
 * - Cada día dibuja un ícono si tiene horas propias (la campana) o si va sin Radar (la campana tachada); el lector de pantalla
 *   dice el estado completo («Sábado 24, horas propias: 11:00», «Domingo 25, sin Radar»). Un día que sigue a todos queda sin ícono.
 * - Ningún día va con candado: cambiar las horas rige en el acto.
 *
 * No guarda nada ni sabe de horas: recibe lo que hay (`base`) y avisa qué día se tocó.
 */
export function DiasDeMiRadar({
  base,
  marcados,
  frase,
  alAlternarDia,
  alVolverATodos,
}: {
  /** Lo que hay: las horas de todos los días y los días con las suyas (con `encendido` aunque aún no se haya guardado). */
  base: MiRadarApi;
  marcados: readonly DiaDelPlan[];
  /** Los marcados dichos en una línea: `sáb, dom`. */
  frase: string;
  alAlternarDia: (dia: DiaDelPlan) => void;
  alVolverATodos: () => void;
}) {
  const { c } = useTheme();
  const enModoDias = marcados.length > 0;

  return (
    <View>
      <View style={estilos.filaDelRotulo}>
        <View style={estilos.rotulo}>
          <MicroLabel>{enModoDias ? `Solo ${frase}` : 'Todos los días'}</MicroLabel>
        </View>
        {enModoDias && (
          <Presionable
            onPress={alVolverATodos}
            accessibilityRole="button"
            accessibilityLabel="Volver a todos los días"
            style={estilos.enlaceTodos}
          >
            <Icon name="arrowLeft" size={TAMANO_ICONO.chico} color={c.goldInk} />
            <Text style={[estilos.textoDelEnlace, { color: c.goldInk }]}>Todos</Text>
          </Presionable>
        )}
      </View>
      <FilaDeDiasDelPlan
        corre={CORRE_TODOS_LOS_DIAS}
        enEdicion={[...marcados]}
        planificable={TODOS_SE_PUEDEN_TOCAR}
        avisoDelDia={dia => resumenDelDiaEnLaFila(base, isoDelDia(dia))}
        onAlternarDia={alAlternarDia}
      />
      <Text style={[estilos.ayuda, { color: c.textSoft }]}>
        {enModoDias
          ? `Solo ${frase}, todas las semanas.`
          : 'Toca un día para darle sus propias horas o dejarlo sin Radar.'}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  filaDelRotulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  rotulo: { flexShrink: 1, minHeight: 24, justifyContent: 'center' },
  enlaceTodos: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 8 },
  textoDelEnlace: { fontFamily: 'Jost_500Medium', fontSize: 16, lineHeight: 22 },
  ayuda: { fontFamily: 'Jost_400Regular', fontSize: 16, lineHeight: 22, marginTop: 6 },
});
