import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * 2D o 3D en el mapa de la carrera (spec 042, pedido del dueño del 2026-11-05; antes la spec decía «sin botón 2D/3D»). Se recuerda en
 * este teléfono y por cuenta, para la próxima carrera. Por defecto, 3D (la cámara en diagonal). Si el teléfono no deja leer o
 * escribir, vale lo de por defecto y la carrera sigue igual.
 */

export type VistaDelMapa = '3d' | '2d';

export const VISTA_POR_DEFECTO: VistaDelMapa = '3d';
export const PREFIJO_VISTA_DEL_MAPA = 'renaser.carrera.vistaDelMapa.';

/** Lo ya leído o elegido, por cuenta: al volver a montar el mapa (pausa → seguir) no parpadea. */
const enMemoria = new Map<string, VistaDelMapa>();

export function otraVista(v: VistaDelMapa): VistaDelMapa {
  return v === '3d' ? '2d' : '3d';
}

export async function leerVistaDelMapa(cuentaId: string): Promise<VistaDelMapa> {
  const sabida = enMemoria.get(cuentaId);
  if (sabida) return sabida;
  try {
    const v = await AsyncStorage.getItem(PREFIJO_VISTA_DEL_MAPA + cuentaId);
    const vista: VistaDelMapa = v === '2d' || v === '3d' ? v : VISTA_POR_DEFECTO;
    enMemoria.set(cuentaId, vista);
    return vista;
  } catch {
    return VISTA_POR_DEFECTO;
  }
}

export async function guardarVistaDelMapa(cuentaId: string, vista: VistaDelMapa): Promise<void> {
  enMemoria.set(cuentaId, vista);
  try {
    await AsyncStorage.setItem(PREFIJO_VISTA_DEL_MAPA + cuentaId, vista);
  } catch {
    // Se pierde solo el recuerdo: esta carrera sigue con la elegida.
  }
}

export function olvidarVistasEnMemoriaParaPruebas(): void {
  enMemoria.clear();
}

/** La vista de esta cuenta y cómo cambiarla. Sin cuenta, 3D y sin recordar. */
export function useVistaDelMapa(cuentaId: string | null | undefined): [VistaDelMapa, () => void] {
  const [vista, setVista] = useState<VistaDelMapa>(() => (cuentaId ? enMemoria.get(cuentaId) : undefined) ?? VISTA_POR_DEFECTO);
  useEffect(() => {
    if (!cuentaId) return;
    let vivo = true;
    void leerVistaDelMapa(cuentaId).then(v => vivo && setVista(v));
    return () => {
      vivo = false;
    };
  }, [cuentaId]);
  const cambiar = useCallback(() => {
    setVista(actual => {
      const nueva = otraVista(actual);
      if (cuentaId) void guardarVistaDelMapa(cuentaId, nueva);
      return nueva;
    });
  }, [cuentaId]);
  return [vista, cambiar];
}
