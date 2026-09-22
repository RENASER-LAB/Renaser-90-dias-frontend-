import React from 'react';
import { View } from 'react-native';

import { useRocasDiarias } from '../hooks/useRocasDiarias';
import { useRocasSemanales } from '../hooks/useRocasSemanales';
import type { EjeObjetivo, RocaMaestraApi } from '../types/objetivos.types';
import { TarjetaAccionesDelDia } from './TarjetaAccionesDelDia';
import { TarjetaPlanSemanal } from './TarjetaPlanSemanal';

/**
 * Las partes 2 y 3 del plan, juntas porque comparten el mismo dato: las rocas de la semana.
 *
 * **Por qué un componente y no dos hooks en `PlanScreen`.** Las acciones del día salen de las
 * acciones críticas de la semana, así que las dos tarjetas necesitan `useRocasSemanales`. Montarlo
 * dos veces serían dos `GET /rocks/weekly` para lo mismo. Y montarlo en la pantalla haría las
 * cuatro llamadas (semanal, hoy, mañana) cada vez que alguien abre Plan, aunque nunca entre a
 * Objetivos: acá se montan solo cuando esta vista está en pantalla.
 */

interface NivelesDelPlanProps {
  /** Las rocas maestras ya cargadas arriba. Sin ellas no se puede saber el eje de una semanal. */
  maestras: RocaMaestraApi[];
  numeroSemana: number;
  diaPrograma: number;
  /**
   * El eje que la persona eligió como principal en el Mapa. Baja desde `PlanScreen`, que ya lo
   * tiene de `usePrioridadPrincipal`: montar ese hook otra vez acá serían dos lecturas iguales.
   */
  ejePrincipal: EjeObjetivo | null;
  onIrAlMapa?: () => void;
}

export function NivelesDelPlan({ maestras, numeroSemana, diaPrograma, ejePrincipal, onIrAlMapa }: NivelesDelPlanProps) {
  const semanal = useRocasSemanales(maestras);
  const diaria = useRocasDiarias();

  return (
    <View style={{ gap: 14 }}>
      <TarjetaPlanSemanal
        semanal={semanal}
        maestras={maestras}
        numeroSemana={numeroSemana}
        ejePrincipal={ejePrincipal}
        onIrAlMapa={onIrAlMapa}
      />
      <TarjetaAccionesDelDia diaria={diaria} semanal={semanal} diaPrograma={diaPrograma} />
    </View>
  );
}
