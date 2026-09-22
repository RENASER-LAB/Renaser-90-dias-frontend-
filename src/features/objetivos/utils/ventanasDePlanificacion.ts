import { DIAS_DEL_PLAN, INDICE_DE_HOY, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';

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
 * El borde superior es el domingo: cada objetivo del día cuelga del objetivo de SU semana, así que
 * ofrecer la semana que viene sería ofrecer un `NO_WEEKLY_ROCK`. Esa se planifica el domingo.
 *
 * Usa `fechaAPlanificar` para el corte de las 18:00 en vez de repetir la hora: una sola definición
 * de "desde cuándo se planifica mañana" en toda la app.
 */
export function diaAgendable(dia: DiaDelPlan, ahora: Date = new Date()): boolean {
  const indice = DIAS_DEL_PLAN.indexOf(dia);
  const hoy = INDICE_DE_HOY;
  const desde = fechaAPlanificar(ahora).esManana ? hoy + 1 : hoy;
  return indice >= desde;
}
