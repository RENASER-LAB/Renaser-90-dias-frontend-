import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import { limpiarAviso, type FuncionalidadApagada } from '../api/funcionalidadesApi';

/**
 * La última lectura de los interruptores, guardada por cuenta en el teléfono (spec 002, FR-012): sin red, la app
 * sigue mostrando lo último que supo de ESA cuenta. Por cuenta, porque en un mismo teléfono pasan varias (pruebas,
 * el personal que presta el suyo) y lo apagado para un rol no es lo de otro.
 *
 * AsyncStorage y no el almacenamiento seguro: no es una credencial. Ninguna operación puede tumbar la app: un fallo
 * de lectura es «no hay nada guardado» y uno de escritura se ignora (la próxima lectura del servidor lo arregla).
 */
export type LecturaGuardada = { version: number; etag: string | null; apagadas: FuncionalidadApagada[] };

const PREFIJO = 'renaser.plataforma.funcionalidades.';

const guardadoSchema = z
  .object({
    version: z.number(),
    etag: z.string().nullish(),
    apagadas: z.array(z.object({ clave: z.string(), aviso: z.string().nullish() }).passthrough()),
  })
  .passthrough();

export function claveDeLaCuenta(cuenta: string): string {
  return PREFIJO + cuenta;
}

export async function guardarLectura(cuenta: string, lectura: LecturaGuardada): Promise<void> {
  try {
    await AsyncStorage.setItem(claveDeLaCuenta(cuenta), JSON.stringify({ ...lectura, guardadoEn: new Date().toISOString() }));
  } catch {
    // Sin almacenamiento (web privada, disco lleno): se sigue con lo que hay en memoria.
  }
}

export async function recuperarLectura(cuenta: string): Promise<LecturaGuardada | null> {
  try {
    const crudo = await AsyncStorage.getItem(claveDeLaCuenta(cuenta));
    if (!crudo) return null;
    const resultado = guardadoSchema.safeParse(JSON.parse(crudo));
    if (!resultado.success) return null;
    return {
      version: resultado.data.version,
      etag: resultado.data.etag ?? null,
      apagadas: resultado.data.apagadas.map(a => ({ clave: a.clave, aviso: limpiarAviso(a.aviso) })),
    };
  } catch {
    return null;
  }
}
