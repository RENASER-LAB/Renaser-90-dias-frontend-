import { z } from 'zod';

/**
 * Validación en runtime de lo que responde el backend para hábitos. Mismo criterio que
 * `features/academy/api/academySchemas.ts`: los tipos de TypeScript se borran al compilar, así que
 * sin esto un cambio de nombre de campo en el backend aparece como un `undefined` silencioso muy
 * lejos de la causa, en vez de un error claro en la primera llamada.
 *
 * `passthrough()` en todos los objetos a propósito: que el backend agregue campos nuevos no debe
 * romper la app.
 */

const habitoCatalogoSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    habitType: z.string(),
    category: z.string(),
    evidenceRequirement: z.string(),
    isOptional: z.boolean(),
    isSystemHabit: z.boolean(),
    isDeactivatable: z.boolean(),
    // Identidad FUNCIONAL del hábito de catálogo (`DAILY_CLASS`, `PASTILLA_RENACER`...); null en
    // los hábitos personales. Es el único criterio estable para reconocer un hábito puntual: el
    // título es renombrable por el propio aprendiz. `.optional()` además de `.nullable()` para no
    // romper contra un backend viejo que todavía no manda el campo.
    systemKey: z.string().nullable().optional(),
    // Icono CURADO del hábito (`SLEEP`, `WATER`, `RITUAL_MORNING`...), que la base guarda desde el
    // baseline y hasta 2026-09-07 ninguna API exponía. `.optional()` para no romper contra un
    // backend anterior a ese cambio; ahí se sigue usando el icono de la categoría.
    iconKey: z.string().nullable().optional(),
    // Dias de la semana en que el habito aplica (`"MONDAY"`..`"SUNDAY"`), derivados del TipoDia de
    // sus horarios. `.optional()` para no romper contra un backend anterior a V28, que no lo manda.
    activeWeekdays: z.array(z.string()).optional(),
    // Día de programa en que el hábito se desbloquea, y cuántos le faltan al aprendiz. El servidor
    // los calcula porque es donde vive el día de programa (mismo criterio que `academy`).
    // `.optional()` para no romper contra un backend anterior a este cambio.
    unlockDay: z.number().optional(),
    daysUntilUnlock: z.number().optional(),
    locked: z.boolean().optional(),
  })
  .passthrough();

const preferenciaHabitoSchema = z
  .object({
    habitId: z.string(),
    title: z.string(),
    triggerTime: z.string().nullable(),
    limitTime: z.string().nullable(),
    customized: z.boolean(),
    // Se valida de verdad en vez de `z.unknown()`: es el dato que sostiene el aviso "desde
    // cuándo rige el horario nuevo", así que si el backend cambia su forma conviene enterarse
    // acá y no con un `undefined` silencioso dentro de la tarjeta.
    pendingChange: z
      .object({
        triggerTime: z.string().nullable(),
        limitTime: z.string().nullable(),
        effectiveDate: z.string(),
      })
      .passthrough()
      .nullable(),
  })
  .passthrough();

const trackDelDiaSchema = z
  .object({
    id: z.string(),
    habitoId: z.string(),
    fechaEjecucion: z.string(),
    diaPrograma: z.number(),
    tipoDia: z.string(),
    esOpcional: z.boolean(),
    estado: z.string(),
    puntosOtorgados: z.number(),
    completadoEn: z.string().nullable(),
    respuestaTexto: z.string().nullable(),
    calificacionProductividad: z.number().nullable(),
    guia: z.unknown().nullable(),
    tituloHabito: z.string(),
    tipoHabito: z.string(),
    horaDisparo: z.string().nullable(),
    horaLimite: z.string().nullable(),
    /**
     * Agregados por el backend el 2026-09-05. `nullish()` y no `nullable()` a propósito: un
     * backend anterior a ese cambio no manda estos campos y la pantalla tiene que seguir
     * funcionando igual, sin puntos en juego ni cuenta regresiva.
     *
     * - `puntosEnJuego`: lo que paga completarlo AHORA. Null si el track ya está en estado
     *   terminal (hecho, vencido o fallido) — no hay nada en juego en lo que ya pasó.
     * - `puntosMaximos`: el techo de la escala, para poder decir "6 de 10" sin que el cliente
     *   tenga que conocer la constante (que es del backend, D-97, y puede cambiar).
     * - `plazoEvidencia`: instante ISO en que el hábito se bloquea. Es lo que permite la cuenta
     *   regresiva y ordenar "el próximo a vencer" sin recalcular ninguna ventana ni conocer la
     *   zona horaria del aprendiz. Null si el hábito no vence.
     */
    puntosEnJuego: z.number().nullish(),
    puntosMaximos: z.number().nullish(),
    plazoEvidencia: z.string().nullish(),
    /**
     * Agregado por el backend el 2026-09-05 (D-113): si ese track ya tiene al menos una evidencia
     * subida, en cualquier estado de validación.
     *
     * Reemplaza el cruce que hacía `useTraining` contra `GET /api/v1/evidence`, que estaba roto
     * por construcción: ese listado devuelve UNA página de 20 filas sin filtro de día y mezclando
     * evidencia de hábito, de roca y de espíritu, así que en cuanto hay más de 20 filas la
     * evidencia de un hábito de hoy queda fuera de la página y el chip dice "SUBIR" sobre un
     * archivo ya guardado. El servidor responde exacto y sin depender de ninguna paginación.
     *
     * `optional()` y no `nullish()`: es un boolean, nunca viene null. Contra un backend anterior
     * a este cambio llega `undefined` y el hook lo trata como `false`.
     */
    tieneEvidencia: z.boolean().optional(),
  })
  .passthrough();

/**
 * `PATCH /api/v1/habit-preferences/{id}` — lo que el backend responde al cambiar un horario.
 *
 * `deferred` es la parte que importa: si la ventana del hábito YA arrancó hoy, el backend
 * NO rechaza el cambio, lo programa para `deferredEffectiveDate` ("no se improvisa el día").
 * Hasta ahora el front descartaba esta respuesta entera y no tenía forma de saberlo.
 */
export const cambioHorarioSchema = z
  .object({
    habitId: z.string(),
    triggerTime: z.string().nullable(),
    limitTime: z.string().nullable(),
    deferred: z.boolean(),
    /** `yyyy-MM-dd`: desde cuándo rige. Null cuando `deferred` es false (rige ya). */
    deferredEffectiveDate: z.string().nullish(),
  })
  .passthrough();

/**
 * `GET /api/v1/habit-unlocks` — qué hábitos lleva este aprendiz en su plan y, sobre todo, **cuáles
 * están pausados** (E-145).
 *
 * `paused` dice que hay una pausa REGISTRADA; `pausedUntil` es su último día INCLUSIVE, o `null`
 * si es indefinida ("hasta que yo lo reactive"). Los dos los agregó V31 del lado del backend —
 * hasta entonces ninguna respuesta de lectura exponía la pausa, que es exactamente por lo que el
 * interruptor volvía a verse encendido al recargar.
 */
const desbloqueoHabitoSchema = z
  .object({
    habitId: z.string(),
    unlockDay: z.number(),
    chosenAt: z.string().nullable(),
    paused: z.boolean(),
    pausedUntil: z.string().nullable(),
  })
  .passthrough();

export const habitsSchemas = {
  catalogo: z.array(habitoCatalogoSchema),
  /** `enabled` es del programa entero, no de un hábito: si viene `false`, no hay plan que leer. */
  planDesbloqueos: z
    .object({ enabled: z.boolean(), items: z.array(desbloqueoHabitoSchema) })
    .passthrough(),
  /**
   * `POST /api/v1/habits` devuelve el hábito recién creado con la MISMA forma que un ítem del
   * catálogo (`MiHabitoResponse`), así que se valida con el mismo esquema y se mapea con el mismo
   * `mapearPlanHabit` — la tarjeta que se dibuja después de crear es la que va a volver del
   * servidor en la próxima recarga, no una versión inventada del cliente.
   */
  habitoCreado: habitoCatalogoSchema,
  /** El backend envuelve las preferencias en `{habits: [...]}`, no las devuelve sueltas. */
  preferencias: z.object({ habits: z.array(preferenciaHabitoSchema) }).passthrough(),
  tracksDeHoy: z.array(trackDelDiaSchema),
  cambioHorario: cambioHorarioSchema,
};

export function validarRespuesta<T>(esquema: z.ZodType<T>, datos: unknown, origen: string): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .slice(0, 3)
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join(' | ');
    throw new Error(`Respuesta inesperada de ${origen} — ${detalle}`);
  }
  return resultado.data;
}
