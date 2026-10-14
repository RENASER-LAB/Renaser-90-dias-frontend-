import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeFallo } from '../../admin/utils/mensajes';
import { listarRoles } from '../api/soporteTiApi';
import type { RolPersonalizadoConsola } from '../api/soporteTiSchemas';
import { queHacerConElError } from '../utils/consola';

/**
 * Los roles personalizados que la consola tiene a la vista (spec 002, fase 2). Se leen la primera vez que se abre
 * «Roles» (`activa`) y al pedirlo (deslizar, «Reintentar», después de pasar personas o de un 409). Un 423 bloquea la
 * consola. Un backend sin roles personalizados (404) se ve como una lista vacía con el error en su lugar.
 */
export function useRolesConsola(activa: boolean, alBloquearse: () => void) {
  const [roles, setRoles] = useState<RolPersonalizadoConsola[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const bloquear = useRef(alBloquearse);
  bloquear.current = alBloquearse;

  const recargar = useCallback(async (): Promise<RolPersonalizadoConsola[] | null> => {
    setCargando(true);
    setFallo(null);
    try {
      const lista = await listarRoles();
      setRoles(lista);
      return lista;
    } catch (e) {
      if (queHacerConElError(e) === 'desbloquear') {
        bloquear.current();
        return null;
      }
      setFallo(mensajeDeFallo(e, 'No se pudieron leer los roles.'));
      return null;
    } finally {
      setCargando(false);
    }
  }, []);

  const pedido = useRef(false);
  useEffect(() => {
    if (activa && !pedido.current) {
      pedido.current = true;
      void recargar();
    }
  }, [activa, recargar]);

  /** Lo que devolvió el servidor al crear o editar: reemplaza (o suma) su fila sin releer todo. */
  const ponerRol = useCallback((rol: RolPersonalizadoConsola) => {
    setRoles(actual => {
      const lista = actual ?? [];
      return lista.some(r => r.id === rol.id) ? lista.map(r => (r.id === rol.id ? rol : r)) : [...lista, rol];
    });
  }, []);

  const quitarRol = useCallback((id: string) => {
    setRoles(actual => (actual ? actual.filter(r => r.id !== id) : actual));
  }, []);

  return { roles, cargando, fallo, recargar, ponerRol, quitarRol };
}
