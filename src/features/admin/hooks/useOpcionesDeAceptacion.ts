import { useEffect, useState } from 'react';

import { leerOpcionesDeAceptacion } from '../api/adminApi';
import type { OpcionesDeAceptacionApi } from '../api/adminSchemas';

/**
 * Lo que ofrece la hoja «Aceptar» (spec 025): `undefined` mientras se lee, `null` si el servidor no lo ofrece (un backend anterior: la hoja
 * queda solo con el rol y no manda formaciones) y las opciones si llegaron. Se lee una vez por pantalla.
 */
export function useOpcionesDeAceptacion(): OpcionesDeAceptacionApi | null | undefined {
  const [opciones, setOpciones] = useState<OpcionesDeAceptacionApi | null | undefined>(undefined);
  useEffect(() => {
    let vigente = true;
    leerOpcionesDeAceptacion().then(lectura => {
      if (vigente) setOpciones(lectura);
    });
    return () => {
      vigente = false;
    };
  }, []);
  return opciones;
}
