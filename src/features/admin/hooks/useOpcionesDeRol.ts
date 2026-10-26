import { useEffect, useState } from 'react';

import { listarRolesAsignables, type OpcionDeRol } from '../api/adminApi';
import { OPCIONES_BASE, opcionesDeRol } from '../utils/rolesAsignables';

/**
 * Los roles que se pueden dar (spec 002, fase 2, contrato §4.5): `GET /admin/roles-asignables`, una vez por pantalla.
 * Mientras llega, y si falla (backend sin el endpoint, sin red), los seis de siempre: elegir un rol base nunca depende de
 * esta lectura.
 */
export function useOpcionesDeRol(): OpcionDeRol[] {
  const [opciones, setOpciones] = useState<OpcionDeRol[]>(() => [...OPCIONES_BASE]);
  useEffect(() => {
    let vigente = true;
    listarRolesAsignables().then(
      lista => {
        if (vigente) setOpciones(opcionesDeRol(lista));
      },
      () => undefined,
    );
    return () => {
      vigente = false;
    };
  }, []);
  return opciones;
}
