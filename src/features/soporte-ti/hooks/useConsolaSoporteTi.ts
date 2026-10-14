import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeFallo } from '../../admin/utils/mensajes';
import { leerCircuitoDeLaIa, listarFuncionalidades } from '../api/soporteTiApi';
import type { FuncionalidadConsola, ParteDelCircuito } from '../api/soporteTiSchemas';
import { queHacerConElError } from '../utils/consola';

/**
 * Lo que la consola tiene a la vista: el catálogo con su estado y el circuito de la IA. Se lee al desbloquear y al
 * pedirlo (deslizar, «Reintentar», un 409). Un 423 bloquea la consola (`alBloquearse`). El circuito es aparte: si
 * falla (backend sin la parte de la IA), la lista se ve igual.
 */
export function useConsolaSoporteTi(activa: boolean, alBloquearse: () => void) {
  const [funcionalidades, setFuncionalidades] = useState<FuncionalidadConsola[] | null>(null);
  const [circuito, setCircuito] = useState<ParteDelCircuito[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const bloquear = useRef(alBloquearse);
  bloquear.current = alBloquearse;

  const recargar = useCallback(async (): Promise<FuncionalidadConsola[] | null> => {
    setCargando(true);
    setFallo(null);
    try {
      const [lista, partes] = await Promise.all([
        listarFuncionalidades(),
        leerCircuitoDeLaIa().catch(e => {
          if (queHacerConElError(e) === 'desbloquear') throw e;
          return null;
        }),
      ]);
      setFuncionalidades(lista);
      setCircuito(partes);
      return lista;
    } catch (e) {
      if (queHacerConElError(e) === 'desbloquear') {
        bloquear.current();
        return null;
      }
      setFallo(mensajeDeFallo(e, 'No se pudo leer el estado de las funcionalidades.'));
      return null;
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (activa) void recargar();
  }, [activa, recargar]);

  /** Lo que devolvió el `PUT`: reemplaza su fila sin releer todo. */
  const reemplazar = useCallback((nueva: FuncionalidadConsola) => {
    setFuncionalidades(actual => (actual ? actual.map(f => (f.clave === nueva.clave ? nueva : f)) : actual));
  }, []);

  return { funcionalidades, circuito, cargando, fallo, recargar, reemplazar };
}

export type EstadoDeLaConsola = ReturnType<typeof useConsolaSoporteTi>;
