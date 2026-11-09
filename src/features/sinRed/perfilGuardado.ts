import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UsuarioApi } from '../auth/types/auth.types';

/**
 * Spec 048 (FR-001, FR-002): el último perfil que dio el servidor, para entrar a la app sin señal.
 *
 * Va atado a la sesión que lo pidió (una huella del token, nunca el token): si la sesión guardada en el teléfono es otra,
 * no se usa. Se borra al cerrar sesión (FR-009). Apenas el servidor responde, el perfil se vuelve a pedir y gana el de él:
 * así una cuenta suspendida mientras no había señal se entera con la primera respuesta.
 */
const CLAVE = 'renaser.sinRed.perfil';

export type PerfilGuardado = {
  perfil: UsuarioApi;
  /** Si ya pasó la puerta de ingreso (onboarding completo o exento) la última vez que se supo. */
  ingresoResuelto: boolean;
  guardadoEn: string;
};

type Guardado = PerfilGuardado & { huella: string };

/** Los últimos 12 caracteres del token: alcanza para reconocer la sesión sin guardar el token entero dos veces. */
export function huellaDelToken(token: string): string {
  return token.slice(-12);
}

export async function guardarPerfil(token: string, perfil: UsuarioApi, ingresoResuelto: boolean): Promise<void> {
  const guardado: Guardado = { perfil, ingresoResuelto, guardadoEn: new Date().toISOString(), huella: huellaDelToken(token) };
  try {
    await AsyncStorage.setItem(CLAVE, JSON.stringify(guardado));
  } catch {
    // Sin perfil guardado, sin señal se pide el login: lo de siempre, nada se rompe.
  }
}

export async function leerPerfilGuardado(token: string): Promise<PerfilGuardado | null> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE);
    if (!crudo) return null;
    const g = JSON.parse(crudo) as Partial<Guardado>;
    if (!g || g.huella !== huellaDelToken(token) || !g.perfil || typeof g.perfil.id !== 'string') return null;
    return { perfil: g.perfil, ingresoResuelto: g.ingresoResuelto === true, guardadoEn: String(g.guardadoEn ?? '') };
  } catch {
    return null;
  }
}

export async function olvidarPerfilGuardado(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CLAVE);
  } catch {
    /* nada que hacer */
  }
}
