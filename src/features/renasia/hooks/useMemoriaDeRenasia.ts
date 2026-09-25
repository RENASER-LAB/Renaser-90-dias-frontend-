import { useCallback, useEffect, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import { obtenerMemoriaRenasia, olvidarRecuerdoRenasia, olvidarTodoRenasia } from '../api/memoriaApi';
import type { MemoriaRenasiaApi } from '../types/renasia.types';

const NO_SE_PUDO_CARGAR = 'No se pudo cargar lo que Renasia recuerda de ti.';
const NO_SE_PUDO_BORRAR = 'No se pudo borrar. Intenta de nuevo.';

/**
 * Lo que Renasia recuerda de la persona (D-167), para su perfil. Carga solo cuando `activo` pasa a
 * `true` (al entrar a Ajustes), no cada vez que se abre la pestaña Yo.
 *
 * Después de borrar SIEMPRE se vuelve a pedir: borrar un recuerdo también borra el resumen en el
 * servidor, y lo que se ve tiene que ser lo que quedó, no una resta hecha acá.
 */
export function useMemoriaDeRenasia(activo: boolean) {
  const [memoria, setMemoria] = useState<MemoriaRenasiaApi | null>(null);
  const [cargando, setCargando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setMemoria(await obtenerMemoriaRenasia());
    } catch (e) {
      setError(mensajeDeError(e, NO_SE_PUDO_CARGAR));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (activo) void recargar();
  }, [activo, recargar]);

  const borrarY = useCallback(
    async (borrar: () => Promise<void>) => {
      setBorrando(true);
      let fallo: string | null = null;
      try {
        await borrar();
      } catch (e) {
        fallo = mensajeDeError(e, NO_SE_PUDO_BORRAR);
      } finally {
        setBorrando(false);
      }
      await recargar();
      if (fallo) setError(fallo);
    },
    [recargar]
  );

  const olvidar = useCallback((id: string) => borrarY(() => olvidarRecuerdoRenasia(id)), [borrarY]);
  const olvidarTodo = useCallback(() => borrarY(olvidarTodoRenasia), [borrarY]);

  return { memoria, cargando, borrando, error, recargar, olvidar, olvidarTodo };
}
