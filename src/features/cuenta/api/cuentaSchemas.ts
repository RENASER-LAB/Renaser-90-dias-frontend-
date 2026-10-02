import { z } from 'zod';

/**
 * Contratos de la eliminación de cuenta (backend D-243; Google Play exige poder eliminar la cuenta
 * desde la app y desde un enlace web).
 *
 * `passthrough()` como en el resto de la app: un campo que el backend agregue mañana no rompe esto.
 */

/**
 * `GET /api/v1/users/me/account-deletion`: cómo confirma esta cuenta. `CONTRASENA` si tiene
 * contraseña; `CODIGO` si entra solo con Google o Apple (se le manda un código al correo).
 */
export const comoSeConfirmaSchema = z
  .object({
    confirmaCon: z.enum(['CONTRASENA', 'CODIGO']),
    diasDeGracia: z.number().int().nonnegative(),
  })
  .passthrough();

/**
 * El 200 de `POST /api/v1/users/me/account-deletion` y de `POST /api/v1/account-deletion/confirm`:
 * la cuenta quedó cerrada en `cerradaEn` y sus datos se borran en `seBorraEl`.
 */
export const cuentaCerradaSchema = z
  .object({
    cerradaEn: z.string(),
    seBorraEl: z.string(),
    diasDeGracia: z.number().int().nonnegative(),
  })
  .passthrough();

export type ComoSeConfirma = z.infer<typeof comoSeConfirmaSchema>;
export type CuentaCerrada = z.infer<typeof cuentaCerradaSchema>;
