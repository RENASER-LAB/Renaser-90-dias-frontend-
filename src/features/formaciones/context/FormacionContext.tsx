import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '../../auth/context/AuthContext';
import { elegirMiFormacion, leerMiFormacion } from '../api/formacionesApi';
import type { FormacionDeLaSesion } from '../types/formaciones.types';
import { Contexto, useFormacionDeLaSesion, type ContextoDeFormacion } from './contextoDeFormacion';

/* La formación de la sesión (spec 022): el contexto y su lectura viven en `contextoDeFormacion.ts` (sin la sesión); este archivo es el PROVEEDOR. */
export { useFormacionDeLaSesion };
export type { ContextoDeFormacion };

/** Va dentro de `AuthProvider`: la cuenta es la de la sesión iniciada. */
export function FormacionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const cuenta = isAuthenticated && user ? user.id : null;
  const deLaSesion = user?.formacion ?? null;
  const [formacion, setFormacion] = useState<FormacionDeLaSesion | null>(deLaSesion);
  const lectura = useRef(0);
  const cuentaActual = useRef(cuenta);
  cuentaActual.current = cuenta;

  /* Al entrar otra cuenta, o al llegar una sesión nueva (refrescar el perfil), se parte de lo que dice la sesión. */
  useEffect(() => {
    lectura.current += 1;
    setFormacion(deLaSesion);
  }, [cuenta, deLaSesion]);

  const recargar = useCallback(async () => {
    if (!cuentaActual.current) return;
    const turno = ++lectura.current;
    try {
      const leida = await leerMiFormacion();
      if (turno === lectura.current && leida) setFormacion(leida);
    } catch {
      /* Sin red o un backend anterior (404): se queda lo que había. Nunca se inventa una formación. */
    }
  }, []);

  const elegir = useCallback(async (codigo: string) => {
    const turno = ++lectura.current;
    const elegida = await elegirMiFormacion(codigo);
    if (turno === lectura.current && elegida) setFormacion(elegida);
  }, []);

  useEffect(() => {
    if (!cuenta) return undefined;
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado === 'active') void recargar();
    });
    return () => suscripcion.remove();
  }, [cuenta, recargar]);

  const valor = useMemo(() => ({ formacion, elegir, recargar }), [formacion, elegir, recargar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
