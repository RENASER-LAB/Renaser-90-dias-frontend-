import { z } from 'zod';

/**
 * `GET /api/v1/mapa-renacimiento` (`MapaRenacimientoController.consultar`).
 *
 * De los tres campos que devuelve, el que importa aqui es `stageCompleted`: es la unica fuente
 * fiable de "esta persona ya recorrio el mapa". `actions` y `protocols` se declaran para que el
 * esquema falle ruidoso si el backend les cambia la forma, aunque el flujo local todavia no los
 * lea (su borrador vive en el dispositivo).
 */
export const mapaServidorSchema = z
  .object({
    actions: z.array(z.object({}).passthrough()),
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
