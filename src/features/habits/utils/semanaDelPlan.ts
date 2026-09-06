/**
 * Los siete días, y la semana que el Plan dibuja, en un solo lugar.
 *
 * **Este archivo no importa NADA, y conviene que siga así.** `PlanScreen` lo importa; si acá se
 * importara de vuelta algo de la pantalla quedaría un ciclo. Por eso el tipo del día se define ACÁ
 * y `PlanScreen` lo reexporta como `DayOfWeek`, y no al revés — la dependencia apunta en un solo
 * sentido, del que sabe poco (los días) al que sabe mucho (la pantalla).
 *
 * POR QUE ESTO NO VIVE EN `PlanScreen`
 *
 * Hasta ahora la regla de "que semana se muestra" existia solo dentro de la pantalla, que era
 * suficiente mientras nadie mas la necesitara. Dejo de serlo al leer la pausa de vuelta del
 * backend (E-145): para saber si un habito esta pausado el JUEVES hay que saber **que fecha real
 * es ese jueves**, y esa cuenta tiene que dar exactamente lo mismo que la que pinta las pestanas.
 * Si las dos copias se separan un dia, la pausa se pinta en la casilla equivocada — y seria un
 * bug silencioso, porque las dos partes "funcionan".
 */

/** Los siete días como los escribe la pantalla. `PlanScreen` lo reexporta como `DayOfWeek`. */
export type DiaDelPlan = 'LUN' | 'MAR' | 'MIÉ' | 'JUE' | 'VIE' | 'SÁB' | 'DOM';

export const DIAS_DEL_PLAN: DiaDelPlan[] = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

/** Indice de HOY dentro de una semana que arranca en lunes (0 = lunes … 6 = domingo). */
export const INDICE_DE_HOY = (new Date().getDay() + 6) % 7;

/**
 * `true` cuando la semana que hay que mostrar es la SIGUIENTE, no la que esta corriendo.
 *
 * > **Movido desde `PlanScreen` el 2026-09-06 (E-145), sin cambiarle el comportamiento.**
 *
 * > **Corregido 2026-09-06 (E-137).** D-98 dejo la regla "lo que se planifica es de mañana en
 * > adelante" y apago la pestaña de hoy — correcto. Pero un **domingo** no tiene mañana dentro de
 * > su propia semana: `INDICE_DE_HOY` valia 6, los 7 dias quedaban apagados y la pestaña inicial
 * > se quedaba en el propio domingo, tambien apagado. El comentario de entonces asumia que esa
 * > semana cerrada "era la verdad de ese momento", y no lo es: mañana existe, es el lunes
 * > siguiente, y simplemente no se estaba dibujando. Efecto real, reportado por el dueño tras
 * > registrarse un domingo: *"quiero ordenar mis habitos para mañana, no me deja porque no tengo
 * > la opcion de ver"*. Cuando hoy es domingo se muestra la semana siguiente entera (lunes a
 * > domingo), con todos sus dias planificables — que es exactamente lo que D-98 queria decir con
 * > "la pestaña inicial pasa a ser MAÑANA".
 */
export const MOSTRAR_SEMANA_SIGUIENTE = INDICE_DE_HOY === DIAS_DEL_PLAN.length - 1;

/**
 * `Date` -> `yyyy-MM-dd` en hora LOCAL.
 *
 * `toISOString()` NO sirve acá: convierte a UTC y, para cualquier zona al oeste de Greenwich
 * —Lima, que es donde vive el padron— corre la fecha un dia hacia atras durante buena parte del
 * dia. Es la misma clase de error que E-91.
 */
export function aFechaIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** El lunes de la semana que se muestra. */
function lunesDeLaSemanaMostrada(): Date {
  const hoy = new Date();
  const lunes = new Date(hoy);
  // getDay() devuelve 0 para domingo; acá la semana arranca el lunes, así que el domingo cuenta
  // como el séptimo día y no como el primero.
  lunes.setDate(hoy.getDate() - INDICE_DE_HOY + (MOSTRAR_SEMANA_SIGUIENTE ? 7 : 0));
  return lunes;
}

/** Fecha COMPLETA (`yyyy-MM-dd`) de cada día de la semana que se está mostrando. */
export function fechasIsoDeLaSemana(): Record<DiaDelPlan, string> {
  const lunes = lunesDeLaSemanaMostrada();
  const fechas = {} as Record<DiaDelPlan, string>;
  DIAS_DEL_PLAN.forEach((dia, indice) => {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + indice);
    fechas[dia] = aFechaIso(fecha);
  });
  return fechas;
}

/** Solo el día del mes (`07`) de cada día — es lo que se dibuja en las pestañas. */
export function diasDelMesDeLaSemana(): Record<DiaDelPlan, string> {
  const iso = fechasIsoDeLaSemana();
  const dias = {} as Record<DiaDelPlan, string>;
  for (const dia of DIAS_DEL_PLAN) dias[dia] = iso[dia].slice(-2);
  return dias;
}
