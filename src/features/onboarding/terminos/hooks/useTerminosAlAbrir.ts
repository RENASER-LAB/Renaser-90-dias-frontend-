import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { leerMisTerminos } from '../api/terminosApi';
import type { TerminosDeMiFormacionApi } from '../api/terminosSchemas';

/**
 * Lee, al entrar y al volver al frente, los términos que la persona debe aceptar antes de usar la app (spec 027, FR-016). `cargada` es verdadera cuando
 * terminó la primera lectura —haya traído algo o no; si falla o el servidor no los ofrece, se deja pasar (nunca se bloquea a nadie por no poder leer)—.
 * `llave` cambia con la cuenta y la formación: al cambiarla se lee de nuevo y no queda a la vista la lectura de la anterior ni un instante.
 */
export function useTerminosAlAbrir(activo: boolean, llave: string): {
  cargada: boolean;
  terminos: TerminosDeMiFormacionApi | null;
  releer: () => Promise<void>;
} {
  const [estado, setEstado] = useState<{ llave: string; terminos: TerminosDeMiFormacionApi | null } | null>(null);
  const llaveVigente = useRef(llave);
  llaveVigente.current = llave;

  const releer = useCallback(async () => {
    const delaLlave = llaveVigente.current;
    const lectura = await leerMisTerminos();
    if (llaveVigente.current === delaLlave) setEstado({ llave: delaLlave, terminos: lectura });
  }, []);

  useEffect(() => {
    if (!activo) return undefined;
    void releer();
    const suscripcion = AppState.addEventListener('change', siguiente => {
      if (siguiente === 'active') void releer();
    });
    return () => suscripcion.remove();
  }, [activo, llave, releer]);

  const cargada = !activo || estado?.llave === llave;
  return { cargada, terminos: estado?.llave === llave ? estado.terminos : null, releer };
}
