import { useCallback, useEffect, useState } from 'react';

import { leerTerminosAceptados, type LecturaDeLoAceptado } from '../api/terminosApi';

/**
 * Lo que la persona aceptó, para releerlo desde Yo → Mi onboarding (spec 027, FR-023). Lee cada vez que `activo` pasa a verdadero (la firma llega como un
 * enlace de 15 minutos: no se guarda de una visita a otra) y deja `null` mientras lee, para no dibujar nada a medias. Solo lectura.
 */
export function useTerminosAceptados(activo: boolean): { lectura: LecturaDeLoAceptado | null; releer: () => void } {
  const [lectura, setLectura] = useState<LecturaDeLoAceptado | null>(null);
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    if (!activo) return undefined;
    let vigente = true;
    leerTerminosAceptados().then(resultado => {
      if (vigente) setLectura(resultado);
    });
    return () => {
      vigente = false;
    };
  }, [activo, vuelta]);

  const releer = useCallback(() => {
    setLectura(null);
    setVuelta(n => n + 1);
  }, []);

  return { lectura, releer };
}
