import { useCallback, useState } from 'react';

import { useArranqueDelPrograma } from './useArranqueDelPrograma';

/**
 * ¿Tiene fila en el programa y todavía no eligió su Día 1? (D-260)
 *
 * Reusa `useArranqueDelPrograma` —el mismo `GET /onboarding/activate-program` de Plan y Training—
 * y solo pregunta cuando puede ser: inscrito y en el día 0. Quien va por el día 5, o quien no tiene
 * fila, no paga la llamada. `alElegir` vuelve a consultar después de elegir, para que la tarjeta se
 * vaya sola.
 */
export function useDiaUnoPorElegir(inscrito: boolean | undefined, diaPrograma: number | undefined) {
  const [version, setVersion] = useState(0);
  const arranque = useArranqueDelPrograma(inscrito === true && diaPrograma === 0, version);
  const alElegir = useCallback(() => setVersion(v => v + 1), []);
  return { porElegir: arranque.estado === 'PENDIENTE_ELEGIR', alElegir };
}
