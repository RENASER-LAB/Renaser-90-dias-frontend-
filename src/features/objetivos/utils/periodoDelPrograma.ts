/**
 * En qué semana y en qué mes del programa está el aprendiz, derivado del día en que va.
 *
 * **Por qué derivado y no de calendario.** El "mes" acá no es enero ni febrero: es un bloque de
 * cuatro semanas contado desde que la persona arrancó. Dos aprendices que empezaron en fechas
 * distintas están en su mes 2 en momentos distintos del año, y eso es lo correcto. Atarlo al
 * calendario obligaría a preguntar en qué día del mes empezó cada uno y a decidir qué pasa con
 * quien arrancó un 29 — problemas que no existen si se cuenta de corrido.
 *
 * **Por qué 12 semanas y no 13.** Confirmado por el dueño del programa el 2026-09-08. El backend
 * admite hasta 13 (`numero_semana BETWEEN 1 AND 13`) porque 90 ÷ 7 = 12,86, y a primera vista
 * parece que la app se queda corta. No es así: **la planificación no arranca el día 1**. Arranca
 * cuando el aprendiz llena su Mapa de Renacimiento, que se desbloquea el día 7. Del día 8 al 90 hay
 * 83 días ≈ 12 semanas, y la primera se va en el onboarding.
 *
 * > **Corregido 2026-09-08.** Acá decía que eran 12 porque "13 no se divide en meses de cuatro".
 * > Esa es una consecuencia cómoda, no el motivo, y dejaba la puerta abierta a que alguien viera
 * > el `BETWEEN 1 AND 13` del backend y "corrigiera" este archivo a 13.
 *
 * Que además den tres meses exactos de cuatro semanas es un efecto colateral bueno: no hay
 * sobrantes ni casos especiales. Los últimos días del programa caen dentro de la semana 12.
 *
 * Todo esto es aritmética pura y sin fechas: se puede probar sin reloj y sin zona horaria, que es
 * justo lo que evitó el error del día del programa registrado como E-91 en el backend.
 */

/** Semanas del programa. Ver arriba por qué 12 y no 13. */
export const SEMANAS_DEL_PROGRAMA = 12;

export const SEMANAS_POR_MES = 4;

/** Meses del programa: 12 semanas en bloques de 4. */
export const MESES_DEL_PROGRAMA = SEMANAS_DEL_PROGRAMA / SEMANAS_POR_MES;

const DIAS_POR_SEMANA = 7;

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo);
}

/**
 * Semana del programa (1 a 12) para un día dado.
 *
 * El día 0 y el día 1 son ambos la semana 1: alguien que todavía no arrancó ya está mirando su
 * primera semana, y mostrarle "semana 0" no significaría nada. Pasado el día 84 se queda en 12,
 * porque los últimos días del programa pertenecen a esa última semana.
 */
export function semanaDe(diaPrograma: number): number {
  if (!Number.isFinite(diaPrograma)) {
    return 1;
  }
  return acotar(Math.ceil(Math.max(diaPrograma, 1) / DIAS_POR_SEMANA), 1, SEMANAS_DEL_PROGRAMA);
}

/**
 * Mes del programa (1 a 3) para un día dado, contado en **bloques de cuatro semanas**.
 *
 * **No sirve para decidir a qué mes pertenece un OBJETIVO.** Acá el mes agrupa planes semanales, y
 * cuatro semanas son 28 días: con esta cuenta el mes 3 arranca el día 57 y los últimos días entran
 * solo porque el resultado se acota. Los objetivos cierran a los 30, 60 y 90 días —así están los
 * hitos del Mapa (V08) y así está `rocas_mensuales` en el backend— y para eso está
 * `mesDelObjetivo`, en `objetivoMensual.ts`. Son dos cortes distintos del mismo programa; cada uno
 * está bien en su terreno, y cruzarlos corre de mes el objetivo.
 */
export function mesDe(diaPrograma: number): number {
  return acotar(Math.ceil(semanaDe(diaPrograma) / SEMANAS_POR_MES), 1, MESES_DEL_PROGRAMA);
}

/** Las cuatro semanas que componen un mes, en orden. `mesDeLaSemana(5)` = 2, y ese mes son 5,6,7,8. */
export function semanasDelMes(mes: number): number[] {
  const acotado = acotar(Math.trunc(mes), 1, MESES_DEL_PROGRAMA);
  const primera = (acotado - 1) * SEMANAS_POR_MES + 1;
  return Array.from({ length: SEMANAS_POR_MES }, (_, i) => primera + i);
}

/** A qué mes pertenece una semana. */
export function mesDeLaSemana(semana: number): number {
  const acotada = acotar(Math.trunc(semana), 1, SEMANAS_DEL_PROGRAMA);
  return Math.ceil(acotada / SEMANAS_POR_MES);
}

/** Cómo se nombra el bloque en pantalla: "Mes 2 · Semanas 5 a 8". */
export function etiquetaDelMes(mes: number): string {
  const semanas = semanasDelMes(mes);
  return `Mes ${acotar(Math.trunc(mes), 1, MESES_DEL_PROGRAMA)} · Semanas ${semanas[0]} a ${semanas[semanas.length - 1]}`;
}
