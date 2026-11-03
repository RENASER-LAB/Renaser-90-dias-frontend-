import { useCallback, useEffect, useRef, useState } from 'react';

import { leerVersionesDelDiagnostico } from '../api/diagnosticoAdminApi';
import type { VersionDelDiagnostico } from '../types/diagnosticoAdmin.types';
import { falloDe, type FalloDeFichas } from '../utils/textos';

/** El historial de versiones publicadas (quién y cuándo), de la más nueva a la más vieja. Se lee cada vez que se abre. */
export function useVersionesDelDiagnostico(activo: boolean) {
  const [versiones, setVersiones] = useState<VersionDelDiagnostico[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<FalloDeFichas | null>(null);
  const turno = useRef(0);

  const recargar = useCallback(async () => {
    const mio = ++turno.current;
    setCargando(true);
    setFallo(null);
    try {
      const leidas = await leerVersionesDelDiagnostico();
      if (mio === turno.current) setVersiones(leidas);
    } catch (e) {
      if (mio === turno.current) setFallo(falloDe(e));
    } finally {
      if (mio === turno.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (activo) void recargar();
    return () => {
      turno.current += 1;
    };
  }, [activo, recargar]);

  return { versiones, cargando, fallo, recargar };
}
