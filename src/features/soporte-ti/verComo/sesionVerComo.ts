import { z } from 'zod';

import { almacenamientoSeguro } from '../../../services/storage/almacenamientoSeguro';
import type { User } from '../../auth/types/auth.types';

/**
 * La sesión de Soporte TI guardada aparte mientras está en «ver como» (spec 002, fase 2, §5). La sesión de prueba pasa
 * a ser la de la app (el `X-Auth-Token` de `apiFetch`) y esta guarda lo necesario para volver **sin red**: el token de
 * Soporte TI y su perfil. Vive en memoria y, por si la app se cierra, en el almacenamiento seguro (es una credencial).
 *
 * Al abrir la app con una guardada, se vuelve a la de Soporte TI: «ver como» no sobrevive a un reinicio.
 */
export type VerComoGuardado = {
  tokenSoporte: string;
  usuarioSoporte: User;
  tokenDePrueba: string;
  /** «Mentor», «Mentor junior»: lo que dice la franja. */
  etiqueta: string;
  venceEn: string | null;
};

const CLAVE = 'renaser.sesion.verComo';

const guardadoSchema = z
  .object({
    tokenSoporte: z.string(),
    tokenDePrueba: z.string(),
    etiqueta: z.string(),
    venceEn: z.string().nullish(),
    usuarioSoporte: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        role: z.string(),
        status: z.string(),
        avatarUrl: z.string().nullable(),
        bio: z.string().nullish(),
        department: z.string().nullish(),
      })
      .passthrough(),
  })
  .passthrough();

let actual: VerComoGuardado | null = null;

export function verComoActual(): VerComoGuardado | null {
  return actual;
}

/* Ninguna operación tumba la app: sin almacenamiento, «ver como» sigue en memoria y no sobrevive a un reinicio. */
export async function guardarVerComo(datos: VerComoGuardado): Promise<void> {
  actual = datos;
  try {
    await almacenamientoSeguro.guardarDato(CLAVE, JSON.stringify(datos));
  } catch {
    // Se sigue con lo que hay en memoria.
  }
}

export async function olvidarVerComo(): Promise<void> {
  actual = null;
  try {
    await almacenamientoSeguro.borrarDato(CLAVE);
  } catch {
    // Lo que quede guardado se descarta al abrir la app (vuelve a Soporte TI).
  }
}

/** Lo que quedó guardado de una sesión anterior de la app (cerrada en «ver como»). */
export async function recuperarVerComo(): Promise<VerComoGuardado | null> {
  try {
    const crudo = await almacenamientoSeguro.leerDato(CLAVE);
    if (!crudo) return null;
    const resultado = guardadoSchema.safeParse(JSON.parse(crudo));
    if (!resultado.success) return null;
    const d = resultado.data;
    return {
      tokenSoporte: d.tokenSoporte,
      tokenDePrueba: d.tokenDePrueba,
      etiqueta: d.etiqueta,
      venceEn: d.venceEn ?? null,
      usuarioSoporte: { ...d.usuarioSoporte, bio: d.usuarioSoporte.bio ?? null, department: d.usuarioSoporte.department ?? null },
    };
  } catch {
    return null;
  }
}

/** Para las pruebas. */
export function reiniciarVerComoEnMemoria(): void {
  actual = null;
}
