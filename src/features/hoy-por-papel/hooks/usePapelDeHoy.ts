import { useCallback, useEffect, useState } from 'react';

import { guardarPapelRecordado, leerPapelRecordado } from '../utils/papelRecordado';
import { papelQueSeVe, type PapelDeHoy } from '../utils/papelesDeHoy';

/**
 * El papel de Hoy que se está viendo y cómo cambiarlo (spec 018). Recuerda la última elección por cuenta.
 *
 * - Sin control (`papeles` vacío) no toca el almacenamiento ni demora nada: Hoy es el de siempre.
 * - Con control, `papel` es `null` solo el instante que tarda en leerse lo guardado (unos milisegundos, una vez por
 *   cuenta): así Hoy no dibuja un papel y salta a otro.
 * - `recordado` es lo último que eligió aunque hoy no se ofrezca: «Mi grupo» llega unos instantes después (el servidor
 *   tiene que decir que acompaña uno) y, sin esperarlo, Hoy dibujaría «Mi programa» y saltaría al grupo.
 * - Elegir es instantáneo (sin animación: se usa decenas de veces) y se guarda detrás.
 */
export function usePapelDeHoy(
  userId: string | null | undefined,
  papeles: readonly PapelDeHoy[],
): { papel: PapelDeHoy | null; recordado: PapelDeHoy | null; elegir: (papel: PapelDeHoy) => void } {
  const conControl = papeles.length > 0;
  /* Lo leído, junto con la cuenta a la que pertenece: al cambiar de cuenta no queda a la vista el de la anterior. */
  const [leido, setLeido] = useState<{ userId: string; papel: PapelDeHoy | null } | null>(null);

  useEffect(() => {
    if (!conControl || !userId) return;
    let vigente = true;
    void leerPapelRecordado(userId).then(papel => {
      if (vigente) setLeido({ userId, papel });
    });
    return () => {
      vigente = false;
    };
  }, [conControl, userId]);

  const elegir = useCallback(
    (papel: PapelDeHoy) => {
      if (!userId) return;
      setLeido({ userId, papel });
      void guardarPapelRecordado(userId, papel);
    },
    [userId],
  );

  if (!conControl) return { papel: null, recordado: null, elegir };
  /* Sin cuenta no hay nada guardado que leer: el primero de la lista. */
  if (!userId) return { papel: papelQueSeVe(papeles, null), recordado: null, elegir };
  const yaLeido = leido !== null && leido.userId === userId;
  return {
    papel: yaLeido ? papelQueSeVe(papeles, leido.papel) : null,
    /* Lo último que eligió, aunque hoy no le corresponda: quien lo monta puede esperar a que el papel vuelva. */
    recordado: yaLeido ? leido.papel : null,
    elegir,
  };
}
