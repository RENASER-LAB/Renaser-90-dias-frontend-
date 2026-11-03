import { useCallback, useEffect, useRef, useState } from 'react';

import { leerFichaDeLaPersona } from '../api/diagnosticoAdminApi';
import type { EstadoDelDiagnostico } from '../../diagnostico/types/diagnostico.types';
import type { FichaDeIngreso } from '../types/diagnosticoAdmin.types';

/**
 * La ficha de ingreso de una persona (`ficha` y `estado` de `GET /admin/diagnostico/personas/{id}`) para su ficha en Administración. Si el
 * servidor no la ofrece (un backend anterior, otra formación, sin permiso) la sección simplemente no se dibuja (`disponible` falso): la ficha
 * de la persona no depende de esto.
 */
export function useFichaDeLaPersona(personaId: string) {
  const [datos, setDatos] = useState<{ ficha: FichaDeIngreso; estado: EstadoDelDiagnostico } | null>(null);
  const [cargando, setCargando] = useState(true);
  const turno = useRef(0);

  const recargar = useCallback(async () => {
    const mio = ++turno.current;
    setCargando(true);
    try {
      const l = await leerFichaDeLaPersona(personaId);
      if (mio === turno.current) setDatos({ ficha: l.ficha, estado: l.estado });
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

  return { ficha: datos?.ficha ?? null, estado: datos?.estado ?? null, cargando, disponible: datos !== null, recargar };
}
