import { z } from 'zod';

/**
 * Lo que llega por `/topic/conversaciones/{id}`.
 *
 * Por ese mismo canal viajan tres cosas distintas —mensajes nuevos, cambios de presencia y, desde el
 * 2026-09-27, hasta dónde leyeron todos (D-208)— y se distinguen por `event`. El backend lo manda
 * siempre y con valor fijo (`MensajeFanoutPayload.EVENTO` / `PresenciaFanoutPayload.EVENTO` /
 * `LecturaFanoutPayload.EVENTO`): adivinar por "trae campo texto" habría sido exactamente lo que el
 * discriminador viene a evitar.
 *
 * > **Corregido 2026-09-27.** Decía «dos cosas distintas»: el aviso de lectura (`READ`) es el tercero.
 * > Un APK que no lo conoce lo descarta sin romperse (ver {@link leerEventoDelChat}): verificado
 * > contra el `eventosDelChat.ts` de `origin/master`.
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
  /* Tolerante (2026-09-27): un mensaje del programa puede no tener una persona detrás. Con
     `z.string()` el aviso se descartaba y la bienvenida no aparecía hasta volver a entrar. */
  senderId: z.string().nullish(),
  type: z.string(),
  text: z.string().nullable().optional(),
  createdAt: z.string(),
});

/**
 * Si el aviso es de un mensaje de sistema (del programa). Se aceptan los dos nombres: desde el
 * 2026-09-27 (E-333 del backend) este canal manda el del REST (`SYSTEM`); antes mandaba el del
 * dominio (`SISTEMA`, `mensaje.tipo().name()`), y un backend sin actualizar lo sigue mandando.
 */
export function esAvisoDeSistema(evento: Pick<EventoMensaje, 'type'>): boolean {
  return evento.type === 'SISTEMA' || evento.type === 'SYSTEM';
}

/**
 * Si el aviso es el eco de algo que la pantalla ya agregó al mandarlo. Solo los mensajes propios
 * de una PERSONA: uno de sistema guardado a nombre de quien mira (la cuenta de staff que envía la
 * bienvenida) no lo mandó la pantalla, y hay que recargar para verlo.
 */
export function esEcoPropio(evento: Pick<EventoMensaje, 'type' | 'senderId'>, miUsuarioId: string | null | undefined): boolean {
  return !!miUsuarioId && evento.senderId === miUsuarioId && !esAvisoDeSistema(evento);
}

const eventoPresenciaSchema = z.object({
  event: z.literal('PRESENCE'),
  userId: z.string(),
  online: z.boolean(),
});

/**
 * «Todos leyeron hasta `readUpTo`» (D-208 del backend, `LecturaFanoutPayload`): los mensajes propios
 * escritos en ese instante o antes pasan a ✓✓. Es la misma marca para todos los que miran la
 * conversación: no dice quién leyó. Nunca llega de la comunidad, que no tiene ✓✓.
 */
const eventoLecturaSchema = z.object({
  event: z.literal('READ'),
  readUpTo: z.string(),
});

export type EventoMensaje = z.infer<typeof eventoMensajeSchema> & { event: 'MESSAGE' };
export type EventoPresencia = z.infer<typeof eventoPresenciaSchema>;
export type EventoLectura = z.infer<typeof eventoLecturaSchema>;
export type EventoDelChat = EventoMensaje | EventoPresencia | EventoLectura;

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

  // Con su literal exigido, igual que la presencia y por lo mismo: antes que la rama tolerante.
  const lectura = eventoLecturaSchema.safeParse(crudo);
  if (lectura.success) return lectura.data;

  const mensaje = eventoMensajeSchema.safeParse(crudo);
  if (mensaje.success) return { ...mensaje.data, event: 'MESSAGE' };

  return null;
}
