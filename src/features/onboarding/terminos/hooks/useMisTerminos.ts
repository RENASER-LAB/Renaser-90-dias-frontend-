import { useCallback, useEffect, useState } from 'react';

import { leerMisTerminos } from '../api/terminosApi';
import type { TerminosDeMiFormacionApi } from '../api/terminosSchemas';

/**
 * Los términos vigentes de mi formación (spec 027) y qué se me pide. `cargada` es verdadera cuando terminó la lectura, haya traído algo o no; `terminos`
 * es `null` si el servidor no los ofrece (un backend anterior) o falló la lectura: quien lo usa cae al texto que la app lleva dentro.
 */
export function useMisTerminos(activo = true): {
  terminos: TerminosDeMiFormacionApi | null;
  cargada: boolean;
  recargar: () => Promise<TerminosDeMiFormacionApi | null>;
} {
  const [terminos, setTerminos] = useState<TerminosDeMiFormacionApi | null>(null);
  const [cargada, setCargada] = useState(!activo);

  const recargar = useCallback(async () => {
    const lectura = await leerMisTerminos();
    setTerminos(lectura);
    setCargada(true);
    return lectura;
  }, []);

  useEffect(() => {
    if (!activo) return undefined;
    let vigente = true;
    leerMisTerminos().then(lectura => {
      if (!vigente) return;
      setTerminos(lectura);
      setCargada(true);
    });
    return () => {
      vigente = false;
    };
  }, [activo]);

  return { terminos, cargada, recargar };
}
