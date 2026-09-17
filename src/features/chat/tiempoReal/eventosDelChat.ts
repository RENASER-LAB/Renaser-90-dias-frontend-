import { z } from 'zod';

/**
 * Lo que llega por `/topic/conversaciones/{id}`.
 *
 * Por ese mismo canal viajan dos cosas distintas —mensajes nuevos y cambios de presencia— y se
 * distinguen por `event`. El backend lo manda siempre y con valor fijo
 * (`MensajeFanoutPayload.EVENTO` / `PresenciaFanoutPayload.EVENTO`): adivinar por "trae campo
 * texto" habría sido exactamente lo que el discriminador viene a evitar.
 *
 * Se valida con zod como todo lo que entra de la red (mismo criterio que `chatSchemas.ts`): un
 * payload con forma inesperada se descarta, nunca se cuela a la pantalla.
 */

/**
 * `event` es OPCIONAL acá, y no por descuido.
 *
 * El backend que está hoy en producción es anterior a este campo: publica el mensaje sin él.
 * Si el esquema lo exigiera, la app nueva se quedaría sin mensajes en vivo contra el servidor
 * viejo —en silencio, que es lo peor— hasta que se desplegara el backend. Una app que solo
 * anda contra la versión exacta del servidor que se está escribiendo no sirve: el teléfono se
 * actualiza cuando la tienda quiere, no cuando uno despliega.
 *
 * Que falte se interpreta como MESSAGE, que es lo único que ese backend manda por este canal.
 * Un `event` presente pero desconocido sigue siendo rechazado (ver {@link leerEventoDelChat}).
 */
const eventoMensajeSchema = z.object({
  event: z.literal('MESSAGE').optional(),
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  type: z.string(),
  text: z.string().nullable().optional(),
  createdAt: z.string(),
});

const eventoPresenciaSchema = z.object({
  event: z.literal('PRESENCE'),
  userId: z.string(),
  online: z.boolean(),
});

export type EventoMensaje = z.infer<typeof eventoMensajeSchema> & { event: 'MESSAGE' };
export type EventoPresencia = z.infer<typeof eventoPresenciaSchema>;
export type EventoDelChat = EventoMensaje | EventoPresencia;

/**
 * Convierte el cuerpo crudo de la trama en un evento, o `null` si no se entiende.
 *
 * Devuelve `null` en vez de lanzar a propósito: esto corre dentro del manejador del socket, y
 * un mensaje raro —un despliegue nuevo que agrega un evento que esta versión de la app no
 * conoce— no puede tumbar la conexión ni la pantalla. Se ignora y la vida sigue.
 */
export function leerEventoDelChat(cuerpo: string): EventoDelChat | null {
  let crudo: unknown;
  try {
    crudo = JSON.parse(cuerpo);
  } catch {
    return null;
  }

  /* Presencia primero, con su literal exigido: así un `event` desconocido —pongamos un
     "ESCRIBIENDO" de un backend más nuevo que esta app— no se cuela por la rama de mensaje,
     que es la que tiene el campo opcional. Sin este orden, la tolerancia con el servidor viejo
     se convertiría en tragarse cualquier cosa. */
  const presencia = eventoPresenciaSchema.safeParse(crudo);
  if (presencia.success) return presencia.data;

  const mensaje = eventoMensajeSchema.safeParse(crudo);
  if (mensaje.success) return { ...mensaje.data, event: 'MESSAGE' };

  return null;
}
