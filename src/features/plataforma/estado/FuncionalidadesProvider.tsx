import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { suscribirFuncionalidadApagada } from '../../../services/http/apiClient';
import { useAuth } from '../../auth/context/AuthContext';
import { leerMisFuncionalidades } from '../api/funcionalidadesApi';
import { crearAlmacenDeFuncionalidades, type AlmacenDeFuncionalidades, type EstadoDeFuncionalidades } from './almacenDeFuncionalidades';
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
 * Sin proveedor (una pantalla probada sola, un componente fuera del árbol) no hay almacén y todo está prendido: es lo
 * mismo que pasa sin datos, y el servidor igual bloquea.
 */
export const ContextoDeFuncionalidades = createContext<AlmacenDeFuncionalidades | null>(null);

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

const SIN_ALMACEN: EstadoDeFuncionalidades = Object.freeze({
  cuenta: null,
  version: null,
  etag: null,
  apagadas: Object.freeze({}),
  origen: 'nada',
});
const sinSuscripcion = () => () => undefined;
const estadoSinAlmacen = () => SIN_ALMACEN;
const nuncaReleyendo = () => false;

/** El estado entero (para el hook de cada funcionalidad). Se vuelve a dibujar solo cuando cambia. */
export function useEstadoDeFuncionalidades(): EstadoDeFuncionalidades {
  const almacen = useContext(ContextoDeFuncionalidades);
  const estado = almacen ? almacen.estado : estadoSinAlmacen;
  return useSyncExternalStore(almacen ? almacen.suscribir : sinSuscripcion, estado, estado);
}

/** Volver a leer ahora (el «Reintentar» del aviso). Sin proveedor no hace nada. */
export function useReleerFuncionalidades(): () => Promise<void> {
  const almacen = useContext(ContextoDeFuncionalidades);
  return almacen ? almacen.releer : sinRelectura;
}
const sinRelectura = () => Promise.resolve();

/** ¿Hay una lectura en vuelo? (el «Revisando…» del aviso). */
export function useReleyendoFuncionalidades(): boolean {
  const almacen = useContext(ContextoDeFuncionalidades);
  const releyendo = almacen ? almacen.releyendo : nuncaReleyendo;
  return useSyncExternalStore(almacen ? almacen.suscribir : sinSuscripcion, releyendo, releyendo);
}
