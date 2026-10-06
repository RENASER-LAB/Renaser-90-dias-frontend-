import { useEffect, useState } from 'react';

import { leerAnimalesDeFase, type AnimalDeFaseApi } from '../api/animalesDeFaseApi';

/**
 * Lo que Administración configuró para el animal de cada fase, por número de fase. Un fallo (sin red,
 * servidor viejo sin el endpoint) no se muestra: devuelve vacío y la tarjeta usa los animales que trae
 * la app. Es un extra, nunca algo que pueda romper Yo.
 */
export function useAnimalesDeFase(): Record<number, AnimalDeFaseApi> {
  const [porFase, setPorFase] = useState<Record<number, AnimalDeFaseApi>>({});
  useEffect(() => {
    let vivo = true;
    leerAnimalesDeFase()
      .then(lista => {
        if (vivo) setPorFase(Object.fromEntries(lista.map(a => [a.fase, a])));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return porFase;
}
