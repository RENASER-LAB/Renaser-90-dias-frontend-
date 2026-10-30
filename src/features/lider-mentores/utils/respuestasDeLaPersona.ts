import type {
  DiaDeLaPersona,
  ObligacionDeLaPersona,
  ProgramacionDeLaPersona,
} from '../types/cumplimientoDelLider.types';

/**
 * Las dos respuestas de arriba de la ficha de una persona (spec 018): «¿Programó?» y «¿Subió evidencias?». Funciones
 * puras —ni React ni red— para probar cada texto sin montar la pantalla.
 *
 * Tres reglas:
 *
 * - **La app no decide el «Sí» / «No».** Lo decide el servidor (`programo`, con la regla de la spec 018); acá solo se
 *   dice, y con las cuentas al lado para que el «No» se explique.
 * - **Lo que falta no es un «No».** Sin `programacion` (un servidor anterior, o nada que programar hoy) la tarjeta no
 *   existe; con cero obligaciones que pidan evidencia, tampoco: nunca un «0 de 0» que suene a incumplimiento.
 * - **Las evidencias son de los mismos días que muestra la ficha**, no de otra ventana: se cuentan de sus propios días.
 */

export type TonoDeLaRespuesta = 'bien' | 'mal' | 'neutro';

export interface RespuestaDeLaFicha {
  pregunta: string;
  /** «Sí», «No» o «4 de 12». */
  valor: string;
  detalle: string;
  tono: TonoDeLaRespuesta;
  /** Lo que oye quien no ve: la pregunta, la respuesta y el detalle, de corrido. */
  dicho: string;
}

function armar(pregunta: string, valor: string, detalle: string, tono: TonoDeLaRespuesta): RespuestaDeLaFicha {
  return { pregunta, valor, detalle, tono, dicho: `${pregunta} ${valor}. ${detalle}.` };
}

/**
 * «¿Programó?»: el «Sí» / «No» del servidor y, debajo, las dos cuentas que pidió el dueño —hábitos con su hora y acciones
 * agendadas—. `null` si el servidor no manda la programación.
 */
export function respuestaDeProgramacion(programacion: ProgramacionDeLaPersona | null | undefined): RespuestaDeLaFicha | null {
  if (!programacion) return null;
  const habitos = `${programacion.habitosConHora} de ${programacion.habitosTotal} ${
    programacion.habitosTotal === 1 ? 'hábito' : 'hábitos'
  } con su hora`;
  const acciones =
    programacion.accionesTotal === 0
      ? 'sin acciones hoy'
      : `${programacion.accionesConHora} de ${programacion.accionesTotal} ${
          programacion.accionesTotal === 1 ? 'acción agendada' : 'acciones agendadas'
        }`;
  return armar('¿Programó?', programacion.programo ? 'Sí' : 'No', `${habitos} · ${acciones}`, programacion.programo ? 'bien' : 'mal');
}

/** Un día que todavía corre (hoy) o que no llegó no cuenta: lo que le falta por entregar aún no es una falta. */
function estaCerrado(dia: DiaDeLaPersona): boolean {
  return dia.motivo !== 'EN_CURSO' && dia.motivo !== 'FUTURO';
}

/** La obligación tiene lo que se le pidió: una entrega, un archivo o texto subido, o la publicación del Muro. */
export function tieneSuEvidencia(obligacion: ObligacionDeLaPersona): boolean {
  return obligacion.entrega === 'ENTREGADA' || obligacion.evidencias.length > 0 || obligacion.publicacionId !== null;
}

/** De las obligaciones de los días cerrados que piden evidencia, cuántas la tienen. */
export function evidenciasDeLosDias(dias: readonly DiaDeLaPersona[]): { conEvidencia: number; total: number } {
  const piden = dias.filter(estaCerrado).flatMap(dia => dia.obligaciones.filter(o => o.requiereEvidencia));
  return { conEvidencia: piden.filter(tieneSuEvidencia).length, total: piden.length };
}

/** «¿Subió evidencias?»: `4 de 12` de los mismos días de la ficha. `null` si ningún hábito de esos días pedía evidencia. */
export function respuestaDeEvidencias(dias: readonly DiaDeLaPersona[]): RespuestaDeLaFicha | null {
  const { conEvidencia, total } = evidenciasDeLosDias(dias);
  if (total === 0) return null;
  return armar('¿Subió evidencias?', `${conEvidencia} de ${total}`, 'Estos 7 días', 'neutro');
}
