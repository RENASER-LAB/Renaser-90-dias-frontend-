import { z } from 'zod';

/**
 * `GET /api/v1/mapa-renacimiento` (`MapaRenacimientoController.consultar`).
 *
 * `stageCompleted` es la unica fuente fiable de "esta persona ya recorrio el mapa".
 *
 * > **Corregido el 2026-09-22.** `actions` estaba como `z.object({}).passthrough()`, y el
 * > comentario de aca explicaba por que: se declaraba para que el esquema fallara ruidoso si el
 * > backend le cambiaba la forma, "aunque el flujo local todavia no las lea". Ya las lee alguien:
 * > el asistente del plan semanal las usa para prellenar las acciones criticas en vez de pedirlas
 * > de nuevo en blanco. Asi que ahora se tipan de verdad.
 * >
 * > `protocols` sigue sin tipar, por el mismo motivo que antes: nadie los lee todavia.
 */
export const mapaServidorSchema = z
  .object({
    actions: z.array(
      z
        .object({
          /** `salud` | `negocio_dinero` | `relaciones`, tal como los guarda la V41. */
          area: z.string(),
          text: z.string(),
          weeklyFrequency: z.number().int(),
        })
        .passthrough()
    ),
    protocols: z.array(z.object({}).passthrough()),
    stageCompleted: z.boolean(),
  })
  .passthrough();

export type MapaServidor = z.infer<typeof mapaServidorSchema>;

export function validarRespuesta<T>(esquema: z.ZodType, datos: unknown, origen: string): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('; ');
    throw new Error(`El backend respondió algo inesperado en ${origen} — ${detalle}`);
  }
  return resultado.data as T;
}
