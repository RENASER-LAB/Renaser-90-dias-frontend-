import { useEffect, useRef } from 'react';

import { diaInicialDeTraining } from '../utils/diaInicialDeTraining';

/**
 * Abre Training en el día que corresponde (issue #107): en el Día 0, mañana (`diaInicialDeTraining`); en el resto, no hace nada (queda hoy).
 *
 * **Una sola vez por día de hoy**: si la persona toca otro día —incluso hoy— no se le vuelve a llevar a mañana; al pasar la medianoche (cambia `hoyIso`) se
 * decide de nuevo. Mientras no se sabe si el programa empieza mañana (`fechaDeInicio` sin dato) no se decide nada, y cuando llega la fecha se aplica, salvo
 * que la persona ya haya elegido otro día entre tanto (`hayDiaElegido`).
 */
export function useDiaInicialDeTraining({
  hoyIso,
  fechaDeInicio,
  hayDiaElegido,
  alElegir,
}: {
  hoyIso: string;
  fechaDeInicio: string | null | undefined;
  /** La persona ya eligió un día (distinto de hoy): no se le cambia. */
  hayDiaElegido: boolean;
  /** Elige ese día (`TrainingScreen.alElegirDia`). */
  alElegir: (iso: string) => void;
}): void {
  const yaDecididoPara = useRef<string | null>(null);
  useEffect(() => {
    if (yaDecididoPara.current === hoyIso) return;
    const dia = diaInicialDeTraining({ hoyIso, fechaDeInicio });
    if (dia === null) return;
    yaDecididoPara.current = hoyIso;
    if (!hayDiaElegido) alElegir(dia);
  }, [hoyIso, fechaDeInicio, hayDiaElegido, alElegir]);
}
