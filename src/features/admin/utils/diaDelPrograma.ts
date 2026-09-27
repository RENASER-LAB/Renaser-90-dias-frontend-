import { ApiError } from '../../../services/http/apiClient';
import { ultimoAjusteDiaSchema } from '../api/adminSchemas';

/**
 * Cambiar el día del programa de un aprendiz desde Administración (pedido del dueño, 26/09).
 *
 * El contrato es el del backend (D-82, `SetProgramDayRequest`): `programDay` entero y `motivo` de
 * hasta 280 caracteres. Rango **1 a 89** por decisión del dueño (26/09): el 90 gradúa a la persona
 * y no se deshace, y el 0 la deja un día sin programa; ninguno se pone desde esta herramienta.
 * Antes el rango era 0..90. El motivo es opcional en el servidor —el panel viejo no lo
 * mandaba—, pero acá se pide SIEMPRE: la bitácora `ajustes_dia_programa` existe para responder
 * «¿por qué le movimos el día?», y un ajuste sin motivo no la responde.
 *
 * Todo lo que decide algo vive acá, sin React, para probarlo sin pantalla.
 */

export const DIA_MINIMO = 1;
export const DIA_MAXIMO = 89;
export const MOTIVO_MAXIMO = 280;

/** Deja un día dentro de 1..89. */
export function acotarDia(dia: number): number {
  if (!Number.isFinite(dia)) return DIA_MINIMO;
  return Math.min(DIA_MAXIMO, Math.max(DIA_MINIMO, Math.trunc(dia)));
}

/** Los botones − / + y los atajos «+1 día» / «−1 día»: mueven y nunca salen del rango. */
export function moverDia(dia: number, delta: number): number {
  return acotarDia(dia + delta);
}

/**
 * Lo que la persona escribió en el campo numérico. Solo dígitos; `null` si está vacío o no es un
 * número entero. NO se acota: un «95» escrito se muestra como error, no se convierte en silencio
 * en un 90 que nadie pidió.
 */
export function leerDiaEscrito(texto: string): number | null {
  const limpio = texto.trim();
  if (!/^\d{1,3}$/.test(limpio)) return null;
  return Number(limpio);
}

export type ResultadoDelCambio =
  | { ok: true; cuerpo: { programDay: number; motivo: string } }
  | { ok: false; error: string };

/** Revisa lo elegido y, si está bien, arma el cuerpo EXACTO del PUT. */
export function validarCambioDeDia(entrada: {
  diaActual: number;
  diaNuevo: number | null;
  motivo: string;
}): ResultadoDelCambio {
  const { diaActual, diaNuevo } = entrada;
  if (diaNuevo === null || !Number.isInteger(diaNuevo) || diaNuevo < DIA_MINIMO || diaNuevo > DIA_MAXIMO) {
    return { ok: false, error: `Escribe un día entre ${DIA_MINIMO} y ${DIA_MAXIMO}.` };
  }
  if (diaNuevo === diaActual) {
    return { ok: false, error: `Ya está en el día ${diaActual}. Elige otro día.` };
  }
  const motivo = entrada.motivo.trim();
  if (!motivo) {
    return { ok: false, error: 'Escribe el motivo del cambio. Queda guardado junto al ajuste.' };
  }
  if (motivo.length > MOTIVO_MAXIMO) {
    return { ok: false, error: `El motivo puede tener hasta ${MOTIVO_MAXIMO} caracteres.` };
  }
  return { ok: true, cuerpo: cuerpoDelCambioDeDia(diaNuevo, motivo) };
}

/** El cuerpo del PUT, con los nombres que espera el backend. */
export function cuerpoDelCambioDeDia(dia: number, motivo: string): { programDay: number; motivo: string } {
  return { programDay: dia, motivo: motivo.trim() };
}

/** La pregunta de la confirmación: nombre, día de ahora y día nuevo, sin abreviar nada. */
export function preguntaDelCambioDeDia(nombre: string | null | undefined, desde: number, hasta: number): string {
  const quien = nombre?.trim() || 'esta persona';
  return `¿Pasar a ${quien} del día ${desde} al día ${hasta}?`;
}

/** El renglón que acompaña a la pregunta: cuántos días y en qué sentido. */
export function detalleDelCambioDeDia(desde: number, hasta: number): string {
  const diferencia = hasta - desde;
  const dias = Math.abs(diferencia) === 1 ? '1 día' : `${Math.abs(diferencia)} días`;
  const sentido = diferencia > 0 ? `Adelanta ${dias}` : `Retrocede ${dias}`;
  return `${sentido}. Lo que ya hizo (hábitos, evidencias, puntos) no se borra.`;
}

/** El texto de cada error del PUT, para una persona y no para un programador. */
export function mensajeDelErrorDeCambio(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.esDeRed) return 'Sin conexión. No se cambió el día; vuelve a intentar en un momento.';
    if (error.status === 400) {
      return `No se pudo cambiar: el día tiene que estar entre ${DIA_MINIMO} y ${DIA_MAXIMO} y el motivo, tener hasta ${MOTIVO_MAXIMO} caracteres.`;
    }
    if (error.status === 403) return 'Tu cuenta no puede cambiar el día.';
    if (error.status === 409) {
      return 'Esta persona todavía no empezó su Día 1: el día se puede ajustar desde que empieza.';
    }
    if (error.status === 404) return 'Esta persona no está inscrita en el programa: no tiene un día que cambiar.';
    if (error.esNoAutenticado) return 'Tu sesión venció. Vuelve a entrar.';
  }
  return 'No se pudo cambiar el día. Vuelve a intentar en un momento.';
}

export type UltimoAjusteDia = {
  diaAnterior: number;
  diaNuevo: number;
  motivo: string | null;
  ajustadoPor: string | null;
  ajustadoEn: string | null;
};

/**
 * `lastDayAdjustment` del detalle, o `null` si no vino (nunca se le movió el día, o backend sin
 * D-82) o vino con otra forma. Nunca lanza: una línea de historia no puede tumbar la ficha.
 */
export function leerUltimoAjuste(dato: unknown): UltimoAjusteDia | null {
  if (dato == null) return null;
  const leido = ultimoAjusteDiaSchema.safeParse(dato);
  if (!leido.success) return null;
  const a = leido.data;
  return {
    diaAnterior: a.previousDay,
    diaNuevo: a.newDay,
    motivo: a.motivo?.trim() || null,
    ajustadoPor: a.adjustedBy ?? null,
    ajustadoEn: a.adjustedAt ?? null,
  };
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * «Último ajuste: del día 40 al 34 por Ana, el 26 de septiembre. Motivo: viajó.»
 *
 * `quien` es el nombre ya resuelto («ti» si fue la misma cuenta); sin nombre dice «alguien del
 * equipo» y no un id. La fecha es un instante del servidor y se muestra en la zona del teléfono de
 * quien mira.
 */
export function textoDelUltimoAjuste(ajuste: UltimoAjusteDia, quien: string | null): string {
  let texto = `Último ajuste: del día ${ajuste.diaAnterior} al ${ajuste.diaNuevo} por ${quien || 'alguien del equipo'}`;
  const fecha = ajuste.ajustadoEn ? new Date(ajuste.ajustadoEn) : null;
  if (fecha && !Number.isNaN(fecha.getTime())) {
    texto += `, el ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
  }
  texto += '.';
  if (ajuste.motivo) texto += ` Motivo: ${ajuste.motivo}`;
  return texto;
}

/** Quién hizo el ajuste, en palabras: «ti», el nombre que se conozca, o `null`. */
export function nombreDeQuienAjusto(
  ajustadoPor: string | null,
  miId: string | null | undefined,
  nombres: ReadonlyMap<string, string>,
): string | null {
  if (!ajustadoPor) return null;
  if (miId && ajustadoPor === miId) return 'ti';
  return nombres.get(ajustadoPor)?.trim() || null;
}

export type DisponibilidadDelCambio = { puede: true } | { puede: false; motivo: string };

/**
 * ¿Tiene sentido ofrecer el cambio? Solo si su programa ya empezó. Antes del Día 1 el servidor
 * acepta el PUT, pero no corre el reloj (`ParticipacionPrograma.fijarDia` solo ajusta
 * `dias_ajuste_programa` si ya está activado y la fecha de inicio llegó): deja el número puesto y,
 * el día que empieza, el barrido lo vuelve a derivar desde su Día 1 y el ajuste se pierde. `hoy` es
 * una fecha ISO del teléfono; comparar el texto «AAAA-MM-DD» basta para decidir qué se muestra (el
 * servidor sigue siendo quien decide).
 */
export function disponibilidadDelCambio(
  detalle: { startDate?: string | null; inscrito?: boolean | null },
  hoy: string,
): DisponibilidadDelCambio {
  if (detalle.inscrito === false || !detalle.startDate) {
    return { puede: false, motivo: 'Todavía no eligió su Día 1: no hay día del programa que cambiar.' };
  }
  if (detalle.startDate.slice(0, 10) > hoy) {
    return {
      puede: false,
      motivo: 'Su programa todavía no empezó: el día se podrá cambiar desde su Día 1.',
    };
  }
  return { puede: true };
}
