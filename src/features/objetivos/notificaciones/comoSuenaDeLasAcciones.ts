import { FRASE_GENERICA_DE_OBJETIVOS } from '../../alarmas/vozDeLosHabitos';
import {
  FILAS_DE_COMO_SUENA,
  type FilaDeComoSuena,
  type MotivoDeAtenuacion,
} from '../../training/utils/comoSuena';

/**
 * Lo propio de «Cómo suena» en las acciones de los objetivos (spec 010). Todo lo demás —los estados de cada fila, las reglas
 * (sonido o vibración obligatorio, la voz necesita el sonido), «Varía», qué se guarda— es el de los hábitos
 * (`training/utils/comoSuena`) sin cambios: no se duplica lógica.
 *
 * ## Qué cambia respecto de un hábito
 *
 * - **La voz.** Una acción del día no tiene un nombre que una voz grabada pueda decir: «Voz» es la frase de objetivos que
 *   ya existe («Tienes acciones de tus objetivos por hacer»), la misma con la que el tono «Voz» de Yo → Alarmas avisa estas
 *   acciones. No se graba nada nuevo.
 * - **Cuándo no hay nada que decidir.** En un hábito, sin aviso no hay alarma. Acá hay dos alarmas —el recordatorio diario
 *   y el aviso antes de cada acción—, así que la sección solo se atenúa cuando no hay NINGUNA.
 */

/** Lo que dice la fila «Voz» de las acciones: la frase de objetivos. */
export const DESCRIPCION_VOZ_DE_LAS_ACCIONES = `Una voz dice: «${FRASE_GENERICA_DE_OBJETIVOS}»`;

/** Las cuatro filas para las acciones: las de siempre, con «Voz» en lugar de «Voz que dice el hábito». */
export const FILAS_DE_COMO_SUENA_DE_LAS_ACCIONES: ReadonlyArray<FilaDeComoSuena> = FILAS_DE_COMO_SUENA.map(fila =>
  fila.clave === 'voz' ? { ...fila, etiqueta: 'Voz', descripcion: DESCRIPCION_VOZ_DE_LAS_ACCIONES } : fila,
);

/**
 * Por qué «Cómo suena» va atenuada y sin tocar, o `null` si se puede usar: no hay recordatorio diario ni aviso antes de
 * las acciones en lo que se está editando. Con días que no coinciden (uno con recordatorio y otro sin él) sí se puede usar:
 * lo que se elija vale para todos y a los que no suenan no les cambia nada.
 */
export function motivoDeAtenuacionDeLasAcciones({
  sinAlarmas,
  conDias,
  cuantosDias,
}: {
  /** Ni el recordatorio diario ni el aviso suenan en lo que se está editando. */
  sinAlarmas: boolean;
  conDias: boolean;
  cuantosDias: number;
}): MotivoDeAtenuacion | null {
  if (!sinAlarmas) return null;
  return {
    titulo: !conDias
      ? 'Todavía no tienes recordatorio ni aviso'
      : cuantosDias > 1
        ? 'Estos días no tienen recordatorio ni aviso'
        : 'Este día no tiene recordatorio ni aviso',
    ayuda: 'Enciende el recordatorio o elige un aviso para elegir cómo suena.',
  };
}
