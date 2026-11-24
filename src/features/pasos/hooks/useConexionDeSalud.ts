import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  abrirHealthConnect,
  pedirPermisosDeSalud,
  soporteDeSalud,
} from '../services/saludConectada';
import { anotarElIntento, borrarElIntento, borrarLaConexion, guardarLaConexion, leerLaConexion } from '../services/conexionDeLosPasos';

/**
 * El estado de «Salud de Apple» como conexión de la cuenta, sin depender del hábito de kilómetros (spec 037, issue #255): la fila de
 * Yo lo necesita aunque la persona no tenga ese hábito. Es la misma conexión que usa `usePasosDelDia` (mismas funciones de
 * `saludConectada` y `conexionDeLosPasos`, misma clave por cuenta): conectar aquí o allá es lo mismo.
 *
 * Estados: `cargando` → `no-disponible` (iPad sin Salud, Android, web) | `sin-conectar` | `conectada`.
 * No lee pasos: solo dice si la persona aceptó y si el sistema ya mostró su diálogo.
 */
export type EstadoDeLaConexion = 'cargando' | 'no-disponible' | 'sin-conectar' | 'conectada';

export interface ConexionDeSalud {
  estado: EstadoDeLaConexion;
  /** Acepta la hoja y pide el permiso al sistema. `true` si quedó conectada. */
  conectar: () => Promise<boolean>;
  /** Olvida la conexión de esta cuenta en la app y abre Salud para que la persona quite el permiso allá (iOS no deja quitarlo desde la app). */
  desconectar: () => void;
  abrirSalud: () => void;
}

export function useConexionDeSalud(cuentaId: string | null): ConexionDeSalud {
  const [soporte, setSoporte] = useState<'cargando' | 'disponible' | 'no-disponible'>('cargando');
  const [conectadoEn, setConectadoEn] = useState<string | null | undefined>(undefined);
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    void soporteDeSalud().then(estado => vigente && setSoporte(estado));
    return () => {
      vigente = false;
    };
  }, []);

  const leerConexion = useCallback(async (): Promise<string | null> => {
    if (!cuentaId) return null;
    return (await leerLaConexion(cuentaId)).conectadoEn;
  }, [cuentaId]);

  useEffect(() => {
    let vigente = true;
    setConectadoEn(undefined);
    void leerConexion().then(c => vigente && setConectadoEn(c));
    return () => {
      vigente = false;
    };
  }, [leerConexion]);

  // Training pudo conectar o desconectar mientras Yo seguía montada: al volver a primer plano se relee.
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado === 'active') void leerConexion().then(c => montado.current && setConectadoEn(c));
    });
    return () => suscripcion.remove();
  }, [leerConexion]);

  const conectar = useCallback(async (): Promise<boolean> => {
    if (!cuentaId) return false;
    await anotarElIntento(cuentaId, new Date());
    if (!(await pedirPermisosDeSalud())) return false;
    const ahora = new Date();
    await guardarLaConexion(cuentaId, ahora);
    await borrarElIntento(cuentaId);
    if (montado.current) setConectadoEn(ahora.toISOString());
    return true;
  }, [cuentaId]);

  const desconectar = useCallback(() => {
    if (cuentaId) void borrarLaConexion(cuentaId);
    setConectadoEn(null);
    abrirHealthConnect();
  }, [cuentaId]);

  const estado: EstadoDeLaConexion =
    soporte === 'cargando' || conectadoEn === undefined
      ? 'cargando'
      : soporte === 'no-disponible'
        ? 'no-disponible'
        : conectadoEn !== null
          ? 'conectada'
          : 'sin-conectar';

  return { estado, conectar, desconectar, abrirSalud: abrirHealthConnect };
}
