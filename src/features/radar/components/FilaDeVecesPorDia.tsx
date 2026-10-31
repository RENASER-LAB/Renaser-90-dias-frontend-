import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { FilaDeDiasDelPlan, type HoraDelDia } from '../../habits/components/FilaDeDiasDelPlan';
import { DIAS_DEL_PLAN, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';
import type { DiaIso } from '../utils/miRadar';
import { type VistaDeUnDia, textoDelDiaEnLaFila } from '../utils/vecesDeMiRadar';

/** El día de la pantalla (LUN … DOM) como día ISO (1 … 7): el que habla el contrato. */
export const isoDelDia = (dia: DiaDelPlan): DiaIso => (DIAS_DEL_PLAN.indexOf(dia) + 1) as DiaIso;
/** El día ISO como el de la pantalla. */
export const diaDeLaPantalla = (iso: number): DiaDelPlan => DIAS_DEL_PLAN[iso - 1];

const CORRE_TODOS_LOS_DIAS: Record<DiaDelPlan, boolean> = {
  LUN: true, MAR: true, 'MIÉ': true, JUE: true, VIE: true, 'SÁB': true, DOM: true,
};

/**
 * Los siete días de Mi Radar (spec 019): la fila de «Planificar» de los hábitos (`FilaDeDiasDelPlan`, sin tocar su forma) con,
 * en cada pastilla, **solo cuántas veces pregunta ese día**, la cifra en dorado. Hoy y lo pasado llevan candado; un día sin
 * Radar, «—». El lector de pantalla dice «Sábado 31, 15 veces».
 *
 * - **Sin días marcados** el rótulo dice «Todos los días»; **con días marcados**, «Solo sáb, dom» y aparece «Todos» para volver.
 * - No guarda nada ni sabe de horas: recibe cómo se ve cada día (`vistas`) y avisa qué día se tocó.
 */
export function FilaDeVecesPorDia({
  vistas,
  marcados,
  frase,
  alAlternarDia,
  alVolverATodos,
}: {
  vistas: ReadonlyArray<VistaDeUnDia>;
  marcados: readonly DiaDelPlan[];
  /** Los marcados dichos en una línea: `sáb, dom`. */
  frase: string;
  alAlternarDia: (dia: DiaDelPlan) => void;
  alVolverATodos: () => void;
}) {
  const { c } = useTheme();
  const enModoDias = marcados.length > 0;
  const vistaDe = (dia: DiaDelPlan) => vistas.find(v => v.dia === isoDelDia(dia));

  const horarios: Partial<Record<DiaDelPlan, HoraDelDia>> = {};
  for (const dia of DIAS_DEL_PLAN) {
    const vista = vistaDe(dia);
    if (vista) horarios[dia] = { hora: textoDelDiaEnLaFila(vista), propio: vista.veces > 0 };
  }

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
        horarios={horarios}
        enEdicion={[...marcados]}
        planificable={dia => vistaDe(dia)?.editable === true}
        etiquetaPropiaDelDia={(dia, nombreYFecha) => {
          const vista = vistaDe(dia);
          if (!vista?.editable) return `${nombreYFecha}, ya no se puede cambiar`;
          return `${nombreYFecha}, ${vista.veces > 0 ? (vista.veces === 1 ? '1 vez' : `${vista.veces} veces`) : 'sin Radar'}`;
        }}
        onAlternarDia={alAlternarDia}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  filaDelRotulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  rotulo: { flexShrink: 1, minHeight: 24, justifyContent: 'center' },
  enlaceTodos: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 8 },
  textoDelEnlace: { fontFamily: fuentes.media, fontSize: 16, lineHeight: 22 },
});
