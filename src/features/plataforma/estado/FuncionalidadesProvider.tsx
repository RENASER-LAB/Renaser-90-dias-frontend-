import React, { useEffect } from 'react';
import { AppState } from 'react-native';

import { suscribirFuncionalidadApagada } from '../../../services/http/apiClient';
import { useAuth } from '../../auth/context/AuthContext';
import { leerMisFuncionalidades } from '../api/funcionalidadesApi';
import { crearAlmacenDeFuncionalidades, type AlmacenDeFuncionalidades } from './almacenDeFuncionalidades';
import { ContextoDeFuncionalidades } from './contexto';
import { guardarLectura, recuperarLectura } from './memoriaLocal';

/** Cada cuánto se relee con la app abierta y al frente (spec 002, FR-012: «cada ≤ 60 s»). */
export const INTERVALO_DE_RELECTURA_MS = 60_000;

/** La única instancia de la app: la lee el proveedor de `App.tsx`. */
export const funcionalidades: AlmacenDeFuncionalidades = crearAlmacenDeFuncionalidades({
  leer: leerMisFuncionalidades,
  recuperar: recuperarLectura,
  guardar: guardarLectura,
});

/**
 * Mantiene al día los interruptores de la cuenta que está adentro (spec 002, contrato §8):
 * - al entrar una cuenta (carga lo guardado de esa cuenta y lee el servidor) y al salir (todo prendido);
 * - al volver la app al frente;
 * - cada 60 s mientras está al frente (en segundo plano no se pide nada);
 * - cuando `apiFetch` ve un 503 `FUNCIONALIDAD_APAGADA`.
 *
 * Va en `App.tsx`, dentro de `AuthProvider`. Esta versión recibe la cuenta y el almacén por props (las pruebas la usan
 * así); la de la app es {@link FuncionalidadesProvider}, que toma la cuenta de la sesión.
 */
export function ProveedorDeFuncionalidades({
  cuenta,
  almacen = funcionalidades,
  children,
}: {
  cuenta: string | null;
  almacen?: AlmacenDeFuncionalidades;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    void almacen.cambiarCuenta(cuenta);
  }, [almacen, cuenta]);

  useEffect(() => {
    if (!cuenta) return;
    let intervalo: ReturnType<typeof setInterval> | null = null;
    const arrancar = () => {
      if (intervalo === null) intervalo = setInterval(() => void almacen.releer(), INTERVALO_DE_RELECTURA_MS);
    };
    const parar = () => {
      if (intervalo !== null) clearInterval(intervalo);
      intervalo = null;
    };
    if (AppState.currentState !== 'background') arrancar();
    const frente = AppState.addEventListener('change', estadoDeLaApp => {
      if (estadoDeLaApp === 'active') {
        void almacen.releer();
        arrancar();
      } else if (estadoDeLaApp === 'background') {
        parar();
      }
    });
    const sinAvisos = suscribirFuncionalidadApagada(apagada => almacen.recibirApagada(apagada));
    return () => {
      parar();
      frente.remove();
      sinAvisos();
    };
  }, [almacen, cuenta]);

  return <ContextoDeFuncionalidades.Provider value={almacen}>{children}</ContextoDeFuncionalidades.Provider>;
}

/** El de `App.tsx`: la cuenta es la de la sesión iniciada. */
export function FuncionalidadesProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  return <ProveedorDeFuncionalidades cuenta={isAuthenticated && user ? user.id : null}>{children}</ProveedorDeFuncionalidades>;
}
