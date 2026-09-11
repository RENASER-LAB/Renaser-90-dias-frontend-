/**
 * TODAS las perillas del Código Renaser, en un solo archivo.
 *
 * **Este archivo existe para que lo cambien.** El pedido fue literal: *"acá lo dejas propenso a
 * cambios porque el cliente quiere que lo cambiemos"*. Si mañana el horario pasa a ser de 07:00
 * a 22:00, o los slots bajan a 6, o la obligatoriedad se levanta, se toca ACÁ y nada más: la
 * lógica (`utils/slotsDelRadar.ts`), el hook y la pantalla leen de estas constantes y no tienen
 * ningún número propio.
 *
 * ## Las reglas que codifica (pedido del dueño, 2026-09-11)
 *
 *  1. Se activa **cuando arranca el día 1** del programa. En día 0 —cuenta aprobada pero el reloj
 *     todavía no corre— no aparece.
 *  2. **12 slots por día, uno por hora en punto.** No 12 respuestas sueltas: 12 momentos fijos.
 *  3. **Para todas las cuentas, sin excluir ningún rol.** La única diferencia es la salida:
 *     el aprendiz lo tiene que llenar sí o sí (pantalla completa, sin cerrar, el retroceso no lo
 *     descarta); el resto del staff lo ve igual pero lo puede cerrar. Ver `rolesObligados`.
 *  4. **Se apaga el día 8 y no vuelve.** Es el mismo corte que saca a la persona del grupo de
 *     bienvenida (`PoliticaMentoria.DIA_TRASLADO_POR_DEFECTO = 8` en el backend): la etapa de
 *     recepción y el Código Renaser terminan juntos, a propósito, y por eso el número está
 *     escrito una sola vez en cada lado y no repartido por la pantalla.
 *
 * ## La regla que NO es una perilla: no hay cola de atrasados
 *
 * Sólo hay **un slot abierto a la vez**, el de la hora en curso. Cuando el reloj pasa a la hora
 * siguiente, el anterior se cierra y no vuelve nunca, ni como pendiente ni como vencido.
 *
 * Es la respuesta a la pregunta del dueño ("¿y si entra a las 10 de la mañana, le salen 3?"):
 * **no, le sale uno solo — el de las 10**. Y no es una preferencia de diseño, es lo único que el
 * backend puede sostener: `registros_radar` es un log *append-only* sin plazo, sin estado
 * "pendiente" y sin "uno por día" (está documentado así en `docs/MODULO_HABITS.md` §8.0 del
 * backend, y es la razón por la que el modo Verdugo no pudo tener destino RADAR). Encolar los
 * perdidos sería inventar en el móvil una deuda que el servidor no conoce, y el resultado
 * práctico sería el peor: alguien que abre la app a las 19:00 del día 3 se encontraría 11
 * formularios apilados.
 */
export interface ConfigRadar {
  /** Interruptor general. En `false` el Código Renaser no aparece en ningún lado. */
  activo: boolean;
  /** Primer día de programa en que aparece. 1 = el primer día real (el día 0 no cuenta). */
  primerDia: number;
  /** Último día INCLUSIVE. Desde `ultimoDia + 1` no vuelve a salir. */
  ultimoDia: number;
  /** Hora en punto del primer slot del día (0..23). */
  horaDelPrimerSlot: number;
  /** Cuántos slots hay, uno por hora consecutiva a partir del primero. */
  slotsPorDia: number;
  /**
   * Roles para los que el Código Renaser es INNEGOCIABLE: el formulario ocupa la pantalla
   * entera —por encima de las pestañas, no dentro de Hoy—, no tiene botón de cerrar y el
   * retroceso del sistema no lo descarta.
   *
   * **Nadie queda excluido.** Para cualquier otro rol el formulario aparece igual, con el mismo
   * contenido y en la misma hora; lo único que cambia es que se puede cerrar.
   *
   * **Van las DOS nomenclaturas del mismo rol, y no es redundancia.** El enum de la base está en
   * castellano (`APRENDIZ`, `MENTOR`, `LIDER_MENTORES`, `ADMIN`, `ALQUIMISTA`) y Java lo traduce
   * al inglés (`TRAINEE`, `MENTOR`, `MENTOR_LEAD`…) en `RolUsuarioSqlMapper`. Con dos juegos de
   * nombres vivos, comprobar sólo uno es un fallo que no avisa: el formulario saldría opcional
   * para el aprendiz y nadie sabría por qué. Es el mismo criterio que ya usa `ROL_MENTOR`
   * (`features/mentor/types/mentor.types.ts`), por la misma razón.
   */
  rolesObligados: readonly string[];
  /**
   * `true` = con un slot abierto y sin responder, el formulario se abre solo.
   *
   * Sólo afecta a quien PUEDE cerrarlo, y una vez por slot, no una vez por visita: si lo cierra,
   * no se vuelve a abrir hasta la hora siguiente. Reabrirlo en bucle volvería la app inusable.
   * Para los roles obligados es indistinto — ahí el formulario no se cierra hasta llenarse.
   */
  abrirAutomaticamente: boolean;
  /**
   * Minutos de cortesía entre que la franja abre y que el formulario toma la pantalla.
   *
   * Sin esto, a las 11:00:00 en punto el formulario tapaba lo que la persona estuviera haciendo
   * —un mensaje a medio escribir, una evidencia subiéndose— doce veces al día. La tarjeta dorada
   * aparece igual desde el segundo cero, con la cuenta atrás a la vista, así que nadie se entera
   * tarde: lo que se gana es que el corte deje de ser una emboscada.
   *
   * En 0 vuelve al comportamiento de antes.
   */
  minutosDeCortesia: number;
}

export const CONFIG_RADAR: ConfigRadar = {
  activo: true,
  primerDia: 1,
  ultimoDia: 7,
  // 08:00 … 19:00 = 12 horas en punto. Es la franja de vigilia razonable para un programa que
  // pide una respuesta cada hora; moverla es cambiar estos dos números y nada más.
  horaDelPrimerSlot: 8,
  slotsPorDia: 12,
  rolesObligados: ['TRAINEE', 'APRENDIZ'],
  abrirAutomaticamente: true,
  minutosDeCortesia: 2,
};

/** Las cinco preguntas, con el campo del contrato HTTP que cada una llena. */
export const PREGUNTAS_RADAR = [
  {
    campo: 'whatAmIDoing',
    titulo: '¿Qué hago?',
    ayuda: 'Lo que estás haciendo en este momento, sin adornos.',
    marcador: 'Estoy…',
  },
  {
    campo: 'whatAmIThinking',
    titulo: '¿Qué pienso?',
    ayuda: 'El pensamiento que te está ocupando ahora.',
    marcador: 'Estoy pensando en…',
  },
  {
    campo: 'whatAmIFeeling',
    titulo: '¿Qué siento?',
    ayuda: 'La emoción, no la interpretación.',
    marcador: 'Siento…',
  },
  {
    campo: 'whatAmIAvoiding',
    titulo: '¿Qué evito?',
    ayuda: 'Eso que sabes que toca y estás postergando.',
    marcador: 'Estoy evitando…',
  },
] as const;

export type CampoRadar = (typeof PREGUNTAS_RADAR)[number]['campo'];

/**
 * Límite de cada texto. Es el mismo número en las tres capas —dominio Java
 * (`RegistroRadar.TEXTO_MAX_LENGTH`), `@Size` del DTO y esta pantalla—, así que validar acá no
 * es desconfiar del servidor: es que la persona vea el corte mientras escribe en vez de perder
 * el texto contra un 400.
 */
export const MAXIMO_CARACTERES = 2_000;

/** Rango de `nivel_energia` (`CHECK BETWEEN 1 AND 10` en la tabla). */
export const ENERGIA_MINIMA = 1;
export const ENERGIA_MAXIMA = 10;

/**
 * ¿Para este rol es innegociable?
 *
 * Un rol desconocido —o todavía sin cargar— cuenta como NO obligado a propósito. Atrapar a
 * alguien detrás de un formulario sin salida por una carrera de carga sería mucho peor que
 * ofrecerle un cierre que no le correspondía: el registro se pide igual, sólo cambia la puerta.
 */
export function rolObligadoAlRadar(rol: string | null | undefined, cfg: ConfigRadar = CONFIG_RADAR): boolean {
  if (!rol) return false;
  return cfg.rolesObligados.includes(rol.toUpperCase());
}
