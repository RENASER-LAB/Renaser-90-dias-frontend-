/**
 * En qué semana y en qué mes del programa está el aprendiz, contado igual que el servidor.
 *
 * **Las semanas son las del servidor (D-203 del backend): de LUNES A DOMINGO, trece, y nunca la
 * 14.** Se cuentan desde la semana de calendario que contiene el primer día (efectivo) del
 * programa: la 1 va del día 1 al primer domingo (corta si no se empezó un lunes) y desde ahí cada
 * una va de lunes a domingo. Los días que caerían en una semana 14 (inicio de martes a domingo) se
 * suman a la 13, que siempre termina el día 90. Es la misma cuenta que `rocks` guarda en
 * `rocas_semanales.numero_semana`: si acá diera otro número, «2. TU SEMANA 05» hablaría de una semana
 * y el objetivo guardado sería de otra.
 *
 * **Por qué hace falta la fecha de hoy.** Con el día del programa solo no alcanza: el día 7 es la
 * semana 1 para quien empezó un lunes (es su primer domingo) y la 2 para quien empezó un martes
 * (es su primer lunes). El primer día sale de restarle a hoy el día del programa, que el servidor
 * deriva con el ajuste de días ya aplicado (`GET /home`): es el mismo «primer día efectivo» del que
 * cuenta `rocks`. Hoy es la fecha local del teléfono, igual que en el resto de la app.
 *
 * > **Corregido 2026-09-27 (D-203 del backend).** Este archivo contaba **12 semanas de siete días
 * > del programa** (`semanaDe = ⌈día / 7⌉`, acotada a 12), confirmadas por el dueño el 2026-09-08
 * > con este argumento: «la planificación no arranca el día 1, arranca cuando el aprendiz llena su
 * > Mapa (día 7); del día 8 al 90 hay 83 días ≈ 12 semanas». El 2026-09-27 el dueño decidió semanas
 * > de lunes a domingo para todos (el domingo es el día de cierre y el Domingo Ritual queda en
 * > domingo), trece, con la 13 hasta el día 90, y el servidor numera así las semanas que guarda.
 * > Con la cuenta vieja la app mostraba «semana N de 12» con otro número que el servidor (y 12 en los
 * > días 85 a 90, que son la 13), y el domingo mostraba una semana y guardaba la siguiente (OBJ-03).
 *
 * **El mes es un bloque de cuatro semanas** contado desde que la persona arrancó, no un mes del
 * calendario: dos aprendices que empezaron en fechas distintas están en su mes 2 en momentos
 * distintos del año. Con trece semanas el mes 3 son las semanas 9 a 13: la 13 se suma al último
 * bloque igual que sus días sobrantes se suman a la 13.
 */

/** Semanas del programa: de lunes a domingo, la 13 hasta el día 90 (D-203). */
export const SEMANAS_DEL_PROGRAMA = 13;

export const SEMANAS_POR_MES = 4;

/** Meses del programa: tres bloques de cuatro semanas, y el último se lleva la 13. */
export const MESES_DEL_PROGRAMA = 3;

const DIAS_POR_SEMANA = 7;

const DOMINGO = 0;

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo);
}

/**
 * Semana del programa (1 a 13) en la que cae HOY, para quien va por `diaPrograma`.
 *
 * El día 0 —todavía no arrancó, o no eligió su Día 1— es la semana 1, como en el servidor: ya está
 * mirando su primera semana, y "semana 0" no significaría nada. Pasado el lunes de la 13 se queda en
 * 13: nunca hay 14.
 */
export function semanaDe(diaPrograma: number, hoy: Date = new Date()): number {
  if (!Number.isFinite(diaPrograma) || diaPrograma < 1) {
    return 1;
  }
  const dia = Math.trunc(diaPrograma);
  const indiceDeHoy = (hoy.getDay() + 6) % DIAS_POR_SEMANA; // 0 = lunes … 6 = domingo
  // Qué día de la semana fue el día 1: hoy menos los días que van del programa.
  const indiceDelDiaUno = (((indiceDeHoy - (dia - 1)) % DIAS_POR_SEMANA) + DIAS_POR_SEMANA) % DIAS_POR_SEMANA;
  // Días desde el lunes de la semana 1 hasta hoy, y cuántos lunes pasaron en ese tramo.
  const lunesTranscurridos = Math.floor((indiceDelDiaUno + dia - 1) / DIAS_POR_SEMANA);
  return acotar(lunesTranscurridos + 1, 1, SEMANAS_DEL_PROGRAMA);
}

/**
 * Qué semana se arma HOY: la de hoy, salvo el DOMINGO, que ya prepara la que empieza el lunes (el
 * Domingo Ritual). Antes del día 1 es la 1, y nunca pasa de la 13: un domingo que cae dentro de la
 * 13 la vuelve a pedir a ella.
 *
 * Es `SemanaPrograma.semanaAPlanificar` del backend: `POST /rocks/weekly` no recibe el número y guarda
 * en esta semana. La pantalla la usa para mostrar el domingo, con su número, la semana que se va a
 * guardar, en vez de la que termina.
 */
export function semanaAPlanificar(diaPrograma: number, hoy: Date = new Date()): number {
  if (!Number.isFinite(diaPrograma) || diaPrograma < 1) {
    return 1;
  }
  const semana = semanaDe(diaPrograma, hoy);
  return hoy.getDay() === DOMINGO ? Math.min(semana + 1, SEMANAS_DEL_PROGRAMA) : semana;
}

/**
 * Mes del programa (1 a 3) para un día dado, contado en **bloques de cuatro semanas**.
 *
 * **No sirve para decidir a qué mes pertenece un OBJETIVO.** Acá el mes agrupa planes semanales, y
 * cuatro semanas son 28 días. Los objetivos cierran a los 30, 60 y 90 días —así están los hitos
 * del Mapa (V08) y así está `rocas_mensuales` en el backend— y para eso está `mesDelObjetivo`, en
 * `objetivoMensual.ts`. Son dos cortes distintos del mismo programa; cada uno está bien en su
 * terreno, y cruzarlos corre de mes el objetivo.
 */
export function mesDe(diaPrograma: number, hoy: Date = new Date()): number {
  return mesDeLaSemana(semanaDe(diaPrograma, hoy));
}

/** Las semanas que componen un mes, en orden: 1 a 4, 5 a 8 y 9 a 13. */
export function semanasDelMes(mes: number): number[] {
  const acotado = acotar(Math.trunc(mes), 1, MESES_DEL_PROGRAMA);
  const primera = (acotado - 1) * SEMANAS_POR_MES + 1;
  const ultima = acotado === MESES_DEL_PROGRAMA ? SEMANAS_DEL_PROGRAMA : primera + SEMANAS_POR_MES - 1;
  return Array.from({ length: ultima - primera + 1 }, (_, i) => primera + i);
}

/** A qué mes pertenece una semana. La 13 es del mes 3. */
export function mesDeLaSemana(semana: number): number {
  const acotada = acotar(Math.trunc(semana), 1, SEMANAS_DEL_PROGRAMA);
  return Math.min(Math.ceil(acotada / SEMANAS_POR_MES), MESES_DEL_PROGRAMA);
}

/** Cómo se nombra el bloque en pantalla: "Mes 2 · Semanas 5 a 8". */
export function etiquetaDelMes(mes: number): string {
  const semanas = semanasDelMes(mes);
  return `Mes ${acotar(Math.trunc(mes), 1, MESES_DEL_PROGRAMA)} · Semanas ${semanas[0]} a ${semanas[semanas.length - 1]}`;
}
