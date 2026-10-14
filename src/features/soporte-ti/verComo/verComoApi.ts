import { z } from 'zod';

import { ApiError, apiFetch, apiFetchConRespuesta } from '../../../services/http/apiClient';
import { BASE_SOPORTE_TI, CODIGO_CONSOLA_BLOQUEADA } from '../api/soporteTiApi';
import { cerrarConsola, renovarConsola, tokenDeConsola } from '../estado/sesionDeConsola';

/**
 * «Ver como» (spec 002, fase 2, US5; contrato `fase-2.md` §5; decisiones P2 y P4 del dueño): Soporte TI abre una sesión
 * de **solo lectura** de una cuenta de prueba de un rol base o de un rol personalizado activo.
 */

/** Lo que se elige: un rol base (`MENTOR`) o un rol personalizado (su id). */
export type EleccionVerComo = { rol: string } | { rolPersonalizadoId: string };

const cuentaSchema = z
  .object({
    cuenta: z
      .object({
        id: z.string().nullish(),
        nombre: z.string().nullish(),
        rol: z.string().nullish(),
        rolPersonalizado: z.object({ id: z.string().nullish(), nombre: z.string().nullish() }).passthrough().nullish(),
      })
      .passthrough()
      .nullish(),
    venceEn: z.string().nullish(),
  })
  .passthrough();

export type SesionDePrueba = {
  /** El `X-Auth-Token` de la sesión nueva, de la cuenta de prueba (30 min, solo lectura). */
  token: string;
  venceEn: string | null;
  /** El nombre del rol tal como lo devolvió el servidor, si vino. */
  nombreDelRol: string | null;
};

/**
 * `POST /soporte-ti/ver-como`. La respuesta trae la sesión nueva en `X-Auth-Token`: **no** se toma como la de la app
 * (quien llama decide cuándo cambiarse, después de guardar aparte la de Soporte TI). 404 = el servidor todavía no tiene
 * «ver como» (llega en otra tanda); 423 = la consola se bloqueó.
 */
export async function abrirSesionDePrueba(eleccion: EleccionVerComo): Promise<SesionDePrueba> {
  const consola = tokenDeConsola();
  if (!consola) throw new ApiError(423, 'La consola se bloqueó. Vuelve a escribir tu contraseña.', { codigo: CODIGO_CONSOLA_BLOQUEADA });
  try {
    const respuesta = await apiFetchConRespuesta<unknown>(`${BASE_SOPORTE_TI}/ver-como`, {
      method: 'POST',
      body: eleccion,
      cabeceras: { 'X-Consola-Token': consola },
      noTomarSesionDeLaRespuesta: true,
      timeoutMs: 20_000,
    });
    renovarConsola();
    const token = respuesta.cabecera('X-Auth-Token');
    if (!token) throw new Error('El servidor no devolvió la sesión de la cuenta de prueba.');
    const datos = cuentaSchema.safeParse(respuesta.datos ?? {});
    const cuenta = datos.success ? datos.data.cuenta : null;
    return {
      token,
      venceEn: datos.success ? datos.data.venceEn ?? null : null,
      nombreDelRol: cuenta?.rolPersonalizado?.nombre?.trim() || null,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 423) cerrarConsola();
    throw error;
  }
}

/**
 * `DELETE /soporte-ti/ver-como` con la sesión de prueba (la que se cierra), aunque la app ya volvió a la de Soporte TI.
 * Nunca falla hacia afuera: salir de «ver como» tiene que funcionar sin red (la sesión de prueba vence sola).
 */
export async function cerrarSesionDePrueba(tokenDePrueba: string): Promise<void> {
  try {
    await apiFetch<unknown>(`${BASE_SOPORTE_TI}/ver-como`, { method: 'DELETE', sesion: tokenDePrueba, timeoutMs: 8_000 });
  } catch {
    // Sin red o ya vencida: el servidor la da por cerrada a los 30 minutos.
  }
}
