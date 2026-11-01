import { useCallback, useEffect, useRef, useState } from 'react';

import { leerFormacionDeUnaPersonaApi } from '../api/formacionesApi';
import type { FormacionDeUnaPersona } from '../types/formaciones.types';

/**
 * La formación de una persona para su ficha de Administración (spec 022). Si el servidor no la ofrece (un backend anterior, o sin
 * permiso) la sección simplemente no se dibuja: `disponible` queda en `false` y no se muestra ningún error, porque la ficha no
 * depende de esto.
 */
export function useFormacionDeUnaPersona(personaId: string) {
  const [datos, setDatos] = useState<FormacionDeUnaPersona | null>(null);
  const [cargando, setCargando] = useState(true);
  const turno = useRef(0);

  const recargar = useCallback(async () => {
    const mio = ++turno.current;
    setCargando(true);
    try {
      const leida = await leerFormacionDeUnaPersonaApi(personaId);
      if (mio === turno.current) setDatos(leida);
    } catch {
      if (mio === turno.current) setDatos(null);
    } finally {
      if (mio === turno.current) setCargando(false);
    }
  }, [personaId]);

  useEffect(() => {
    setDatos(null);
    void recargar();
    return () => {
      turno.current += 1;
    };
  }, [recargar]);

  return { datos, cargando, disponible: datos !== null, recargar };
}
