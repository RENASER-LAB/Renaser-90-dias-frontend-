import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '../../auth/context/AuthContext';
import { elegirMiFormacion, leerMiFormacion } from '../api/formacionesApi';
import type { FormacionDeLaSesion } from '../types/formaciones.types';

/**
 * La formación de la sesión (spec 022). Nace de lo que dice el login (`/auth/me`) y se relee al volver la app al frente: así un
 * traslado, o un cambio de lo que Administración le asignó al personal, se nota sin cerrar la app. `elegir` es el cambio de
 * formación activa del personal con varias.
 *
 * Qué NO hace: no decide qué ve cada persona (eso es del servidor en cada lectura). Solo guarda cuál es la formación para que
 * las pantallas la nombren y para que, al cambiar, todo se vuelva a armar (ver `llaveDeLasVistas`).
 */
export type ContextoDeFormacion = {
  /** Lo que se sabe. `null` = el servidor no la dijo (backend anterior) o todavía no se leyó: la persona es de la Escuela. */
  formacion: FormacionDeLaSesion | null;
  /** Elige la formación activa (personal con varias). Lanza el error del servidor si no se pudo. */
  elegir: (codigo: string) => Promise<void>;
  /** Vuelve a leerla del servidor, sin molestar si falla. */
  recargar: () => Promise<void>;
};

const SIN_FORMACION: ContextoDeFormacion = {
  formacion: null,
  elegir: async () => undefined,
  recargar: async () => undefined,
};

const Contexto = createContext<ContextoDeFormacion>(SIN_FORMACION);

export function useFormacionDeLaSesion(): ContextoDeFormacion {
  return useContext(Contexto);
}

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
