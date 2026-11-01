import { useCallback, useState } from 'react';

import { useArranqueDelPrograma } from './useArranqueDelPrograma';

/**
 * ¿Tiene fila en el programa y todavía no eligió su Día 1? (D-260)
 *
 * Reusa `useArranqueDelPrograma` —el mismo `GET /onboarding/activate-program` de Plan y Training—
 * y solo pregunta cuando puede ser: inscrito y en el día 0. Quien va por el día 5, o quien no tiene
 * fila, no paga la llamada. `alElegir` vuelve a consultar después de elegir, para que la tarjeta se
 * vaya sola.
 *
 * Con la misma consulta dice también si ya eligió y está esperando (`esperando`) y la fecha en que empieza (`fechaInicio`, `YYYY-MM-DD`;
 * issue #72).
 */
export function useDiaUnoPorElegir(inscrito: boolean | undefined, diaPrograma: number | undefined, usuarioId?: string | null) {
  const [version, setVersion] = useState(0);
  const habilitado = inscrito === true && diaPrograma === 0;
  const arranque = useArranqueDelPrograma(habilitado, version, usuarioId);
  const alElegir = useCallback(() => setVersion(v => v + 1), []);
  /* Issue #72: ya eligió su Día 1 y la fecha todavía no llega (día 0 con el programa activado). Es el estado que Hoy no decía nunca: el Día 1
     no puede ser hoy, así que todo aprendiz recién activado pasa al menos un día así. `fechaInicio` es `null` si el servidor no la mandó. */
  const esperando = habilitado && (arranque.estado === 'ESPERANDO_INICIO' || arranque.estado === 'EN_CURSO');
  const fechaInicio =
    arranque.estado === 'ESPERANDO_INICIO' ? arranque.fechaInicio : arranque.estado === 'EN_CURSO' ? arranque.fechaInicio ?? null : null;
  return { porElegir: arranque.estado === 'PENDIENTE_ELEGIR',
    esperando,
    fechaInicio: esperando ? fechaInicio : null,
    error: arranque.estado === 'ERROR',
    mensaje: arranque.estado === 'ERROR' ? arranque.mensaje : undefined,
    reintentar: arranque.estado === 'ERROR' ? arranque.reintentar : alElegir,
    alElegir };
}
