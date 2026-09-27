import React from 'react';
import { View } from 'react-native';

import { useRocasDiarias } from '../hooks/useRocasDiarias';
import { useRocasSemanales } from '../hooks/useRocasSemanales';
import type { EjeObjetivo, RocaMaestraApi } from '../types/objetivos.types';
import { semanaAPlanificar } from '../utils/periodoDelPrograma';
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
  /**
   * El eje que se está mirando: la tarjeta de la semana muestra SOLO ese.
   *
   * > **Agregado el 2026-09-23.** La tarjeta apilaba los tres ejes siempre, así que estando en
   * > Negocio la primera línea era el objetivo de Cuerpo. Con una tarjeta por categoría, arriba y
   * > abajo hablan de lo mismo.
   */
  ejeAbierto: EjeObjetivo;
  /** El objetivo semanal ya calculado, por eje. Baja desde `PlanScreen`, que ya tiene el plan. */
  objetivoSugeridoDe: (eje: EjeObjetivo) => string;
  onIrAlMapa?: () => void;
}

export function NivelesDelPlan({ maestras, numeroSemana, diaPrograma, ejeAbierto, ejePrincipal, objetivoSugeridoDe,
  onIrAlMapa }: NivelesDelPlanProps) {
  const semanal = useRocasSemanales(maestras);
  /*
   * El domingo se arma la semana que EMPIEZA (D-203): `POST /rocks/weekly` la guarda sin que se le
   * mande el número, mientras `GET` sin número sigue devolviendo la que termina. Se lee aparte para
   * mostrarla con su número y para agendar el lunes, que cuelga de ella (E-340). Los otros días —y
   * el domingo dentro de la 13, o antes del Día 1— es la misma semana y no se lee dos veces.
   *
   * > **Agregado el 2026-09-27 (OBJ-03).** El domingo la tarjeta mostraba la semana que termina y
   * > «Armar mi semana» guardaba la siguiente: al recargar, lo guardado no aparecía. Y quien ya tenía
   * > armada la que termina no tenía por dónde armar la que empieza.
   */
  const semanaQueSeArma = semanaAPlanificar(diaPrograma);
  const armaLaQueEmpieza = semanaQueSeArma !== numeroSemana;
  const queEmpieza = useRocasSemanales(maestras, semanaQueSeArma, armaLaQueEmpieza);
  const diaria = useRocasDiarias();

  return (
    <View style={{ gap: 14 }}>
      <TarjetaPlanSemanal
        semanal={semanal}
        maestras={maestras}
        numeroSemana={numeroSemana}
        semanaQueEmpieza={armaLaQueEmpieza ? { semanal: queEmpieza, numeroSemana: semanaQueSeArma } : undefined}
        ejeAbierto={ejeAbierto}
        ejePrincipal={ejePrincipal}
        objetivoSugeridoDe={objetivoSugeridoDe}
        onIrAlMapa={onIrAlMapa}
      />
      <TarjetaAccionesDelDia
        diaria={diaria}
        semanal={semanal}
        semanalParaAgendar={armaLaQueEmpieza ? queEmpieza : undefined}
        diaPrograma={diaPrograma}
        ejeAbierto={ejeAbierto}
      />
    </View>
  );
}
