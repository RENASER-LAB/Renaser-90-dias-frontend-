import {
  DIAS_DEL_PLAN,
  INDICE_DE_HOY,
  MOSTRAR_SEMANA_SIGUIENTE,
  fechasIsoDeLaSemana,
  type DiaDelPlan,
} from '../../habits/utils/semanaDelPlan';

/**
 * Cuándo se puede planificar, en palabras que la pantalla pueda mostrar.
 *
 * **Por qué existe.** El backend tiene dos ventanas horarias y las hace cumplir con un 403 o un 400.
 * Que la persona las descubra chocándose contra un error es mal diseño: hay que decirle de antemano
 * hasta cuándo puede cambiar algo. Esto no *decide* nada — la autoridad sigue siendo el servidor,
 * que además cuenta con la zona horaria del participante y no con la del teléfono. Acá solo se
 * calcula qué texto mostrar y qué fecha proponer por defecto.
 *
 * Las dos ventanas, tal como están en el backend:
 *
 * | Ventana | Cuándo | Dónde |
 * |---|---|---|
 * | Semanal | domingo 12:00 → lunes 09:00 local | `VentanaPlanificacionSemanal` |
 * | Diaria | desde las 18:00 solo se planifica **mañana**; antes, hoy o mañana | `VentanaPlanificacionDiaria` |
 *
 * El nombre `EditarDentroDe48hUseCase` en el backend es engañoso: no son 48 h. Quien planifica
 * dentro de la ventana puede corregir mientras siga abierta; quien planifica a destiempo tiene 2 h,
 * y nunca más allá del fin de su día local.
 */

/** Desde qué hora del domingo se puede abrir la semana. */
export const SEMANAL_ABRE_HORA_DOMINGO = 12;

/** Hasta qué hora del lunes sigue abierta. */
export const SEMANAL_CIERRA_HORA_LUNES = 9;

/** Desde esta hora, el plan del día siguiente reemplaza al de hoy. */
export const DIARIA_ABRE_HORA = 18;

const DOMINGO = 0;
const LUNES = 1;

/** ¿Está abierta ahora la ventana para abrir o corregir la semana? */
export function ventanaSemanalAbierta(ahora: Date = new Date()): boolean {
  const dia = ahora.getDay();
  if (dia === DOMINGO) {
    return ahora.getHours() >= SEMANAL_ABRE_HORA_DOMINGO;
  }
  if (dia === LUNES) {
    return ahora.getHours() < SEMANAL_CIERRA_HORA_LUNES;
  }
  return false;
}

/**
 * Qué decirle a la persona sobre la ventana semanal.
 *
 * Se muestra siempre, abierta o cerrada: saber que "el domingo a las 12 puedes replanificar" es tan
 * útil como saber que ahora se puede.
 */
export function textoVentanaSemanal(ahora: Date = new Date()): string {
  return ventanaSemanalAbierta(ahora)
    ? `Puedes corregir tu plan hasta el lunes a las ${SEMANAL_CIERRA_HORA_LUNES}:00.`
    : `Vas a poder replanificar el domingo desde las ${SEMANAL_ABRE_HORA_DOMINGO}:00.`;
}

/** `YYYY-MM-DD` en hora local. `toISOString()` no sirve: pasa a UTC y a la noche cambia el día. */
export function fechaLocalISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * Qué día se propone planificar.
 *
 * Desde las 18:00 el backend **solo** acepta mañana, así que ofrecer "hoy" a esa hora sería ofrecer
 * un 400. Antes de las 18:00 se propone hoy, que es lo que la persona espera al abrir la app a la
 * mañana con el día por delante.
 */
export function fechaAPlanificar(ahora: Date = new Date()): { fecha: string; esManana: boolean } {
  const esManana = ahora.getHours() >= DIARIA_ABRE_HORA;
  const objetivo = new Date(ahora);
  if (esManana) {
    objetivo.setDate(objetivo.getDate() + 1);
  }
  return { fecha: fechaLocalISO(objetivo), esManana };
}

/**
 * Qué días de la semana se pueden agendar para las acciones.
 *
 * **No es `esPlanificable`, la de los hábitos, y la diferencia es un día.** Aquélla bloquea hoy
 * siempre (D-91: el horario de un hábito rige desde mañana); las acciones del día **sí** se agendan
 * hoy mientras la ventana nocturna no haya abierto, y el servidor las acepta — es lo que la app
 * viene haciendo. Reusar la de hábitos les taparía un día que funciona.
 *
 * El borde superior es el domingo de la semana en curso: cada objetivo del día cuelga del objetivo
 * de SU semana, y el servidor no acepta los días de la semana que viene. **Salvo el domingo, que
 * agenda el lunes**: es mañana, y cuelga del objetivo de la semana que empieza (sin él, el servidor
 * responde `NO_WEEKLY_ROCK`; ver `mensajeSinPlanSemanal`).
 *
 * > **Corregido 2026-09-27 (E-340 del backend).** El párrafo de arriba decía: «El borde superior es
 * > el domingo: cada objetivo del día cuelga del objetivo de SU semana, así que ofrecer la semana
 * > que viene sería ofrecer un `NO_WEEKLY_ROCK`. Esa se planifica el domingo.» Y el domingo la cuenta
 * > no cerraba: la fila dibuja la semana SIGUIENTE (`MOSTRAR_SEMANA_SIGUIENTE`) pero el índice de hoy
 * > seguía siendo 6, así que antes de las 18:00 quedaba tocable solo el domingo PRÓXIMO —que el
 * > servidor rechaza— y desde las 18:00 ninguno; el lunes salía con candado. El servidor acepta ese
 * > lunes desde E-340; el martes y los días que siguen de esa semana los sigue rechazando, así que
 * > acá tampoco se ofrecen.
 *
 * Usa `fechaAPlanificar` para el corte de las 18:00 en vez de repetir la hora: una sola definición
 * de "desde cuándo se planifica mañana" en toda la app. El domingo el corte no cambia nada: el lunes
 * es mañana antes y después de las 18:00.
 */
export function diaAgendable(dia: DiaDelPlan, ahora: Date = new Date()): boolean {
  if (MOSTRAR_SEMANA_SIGUIENTE) {
    return dia === 'LUN';
  }
  const indice = DIAS_DEL_PLAN.indexOf(dia);
  const hoy = INDICE_DE_HOY;
  const desde = fechaAPlanificar(ahora).esManana ? hoy + 1 : hoy;
  return indice >= desde;
}

/**
 * En qué día de la fila arranca el planificador de acciones: el de `fecha` (la que propone
 * `fechaAPlanificar`) si está en la semana que se dibuja, y si no el lunes.
 *
 * Estaba escrita dentro de `AgendarAccionesModal` (`diaDeLaFecha`); bajó acá, igual, para poder
 * probar qué fecha se manda el domingo. Ese día la fila dibuja la semana que empieza y antes de las
 * 18:00 `fecha` es HOY, que no está en ella: el planificador arranca en el lunes, que es justo el
 * único día agendable.
 */
export function diaInicialDelPlanificador(fecha: string): DiaDelPlan {
  const fechas = fechasIsoDeLaSemana();
  return DIAS_DEL_PLAN.find(d => fechas[d] === fecha) ?? 'LUN';
}

/**
 * Lo que se dice debajo de la fila de días del planificador de acciones.
 *
 * El domingo la fila dibuja la semana que empieza y de ella solo se agenda el lunes
 * (`diaAgendable`): el texto de los demás días —«cualquier día que quede de la semana»— ahí era
 * falso, porque de esa semana se ven siete días y seis tienen candado.
 */
export function textoDeLaFilaDeDias(): string {
  return MOSTRAR_SEMANA_SIGUIENTE
    ? 'Hoy es domingo: de la semana que empieza puedes agendar el lunes, y corregirlo hasta que llegue. Los demás días se agendan desde el lunes.'
    : 'Puedes agendar cualquier día que quede de la semana, y corregirlo hasta que llegue. La semana que viene se arma el domingo.';
}

/** Lo que dice la tarjeta de las acciones cuando todavía no hay nada agendado. Ver `textoDeLaFilaDeDias`. */
export function textoParaEmpezarAAgendar(): string {
  return MOSTRAR_SEMANA_SIGUIENTE
    ? 'Hoy es domingo: puedes agendar las del lunes, y a qué hora.'
    : 'Elige cuáles caen cada día que quede de la semana, y a qué hora. Desde las 18:00 el día en curso ya no se reacomoda.';
}

/**
 * Qué decir cuando el servidor rechaza el plan de un día con `NO_WEEKLY_ROCK`: a ese día le falta el
 * objetivo de SU semana.
 *
 * El domingo lo que se agenda es el lunes, que cuelga del objetivo de la semana que empieza (E-340
 * del backend). Decir solo «arma tu plan de la semana» ahí confunde, porque la que termina hoy puede
 * estar armada: se nombra la semana que falta. Se decide por la fecha y no por la hora, así que da
 * lo mismo antes o después de las 18:00.
 */
export function mensajeSinPlanSemanal(fecha: string, ahora: Date = new Date()): string {
  return fecha > fechaLocalISO(domingoDeLaSemana(ahora))
    ? 'Todavía no armaste tu plan de la semana que empieza el lunes, y las acciones del lunes salen de ahí. Ármalo primero y vuelve a agendarlas.'
    : 'Primero arma tu plan de la semana: las acciones salen de ahí.';
}

/** El domingo que cierra la semana (de lunes a domingo) de `fecha`, en hora local. */
function domingoDeLaSemana(fecha: Date): Date {
  const domingo = new Date(fecha);
  domingo.setDate(fecha.getDate() + (6 - ((fecha.getDay() + 6) % 7)));
  return domingo;
}
