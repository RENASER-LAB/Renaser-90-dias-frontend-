/**
 * Fechas de un cronograma de pagos (spec 032). La fecha de una cuota es una fecha FIJA del calendario, sin hora ni zona, que escribe
 * Administración: viaja como `AAAA-MM-DD` y se muestra como «15 nov». Pura, sin `Date` ni `Intl` (en Android dependen de cómo se compiló
 * Hermes): el 15 de noviembre es el 15 de noviembre en cualquier teléfono.
 */
export type FechaDePago = { dia: number; mes: number; anio: number };

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

export function diasDelMesDePago(mes: number, anio: number): number {
  if (mes === 2) return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

const dosCifras = (n: number): string => String(n).padStart(2, '0');

/** `AAAA-MM-DD` → la fecha; `null` si no es una fecha que existe (el 31 de febrero no lo es). */
export function partirIso(iso: string | null | undefined): FechaDePago | null {
  const hallada = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!hallada) return null;
  return validar({ anio: Number(hallada[1]), mes: Number(hallada[2]), dia: Number(hallada[3]) });
}

/** `DD/MM/AAAA` (lo que guarda el campo de fecha de la app) → la fecha; `null` si falta o no existe. */
export function partirDdMmAaaa(valor: string | null | undefined): FechaDePago | null {
  const hallada = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((valor ?? '').trim());
  if (!hallada) return null;
  return validar({ dia: Number(hallada[1]), mes: Number(hallada[2]), anio: Number(hallada[3]) });
}

function validar(f: FechaDePago): FechaDePago | null {
  if (f.mes < 1 || f.mes > 12 || f.dia < 1 || f.dia > diasDelMesDePago(f.mes, f.anio)) return null;
  return f;
}

export function aIso(f: FechaDePago): string {
  return `${f.anio}-${dosCifras(f.mes)}-${dosCifras(f.dia)}`;
}

export function aDdMmAaaa(f: FechaDePago): string {
  return `${dosCifras(f.dia)}/${dosCifras(f.mes)}/${f.anio}`;
}

/** `DD/MM/AAAA` → `AAAA-MM-DD`; `null` si no es una fecha. */
export function ddMmAaaaAIso(valor: string | null | undefined): string | null {
  const f = partirDdMmAaaa(valor);
  return f ? aIso(f) : null;
}

/** `AAAA-MM-DD` → `DD/MM/AAAA`, para precargar el campo de fecha. Vacío si no es una fecha. */
export function isoADdMmAaaa(iso: string | null | undefined): string {
  const f = partirIso(iso);
  return f ? aDdMmAaaa(f) : '';
}

/**
 * «15 nov», o «15 nov 2027» si no es del año de `hoy` (un diplomado de un año cruza de año y «15 ene» sola confunde). Sin fecha válida, el texto
 * que llegó: nunca una cuota sin fecha.
 */
export function fechaCortaDePago(iso: string, hoy: FechaDePago): string {
  const f = partirIso(iso);
  if (!f) return iso;
  return `${f.dia} ${MESES_CORTOS[f.mes - 1]}${f.anio === hoy.anio ? '' : ` ${f.anio}`}`;
}

/** «15 de noviembre de 2026», para decirla en una frase o a un lector de pantalla. */
export function fechaEnPalabrasDePago(iso: string): string {
  const f = partirIso(iso);
  return f ? `${f.dia} de ${MESES_LARGOS[f.mes - 1]} de ${f.anio}` : iso;
}

/** El instante (ISO con hora) como día del calendario del teléfono: «3 de noviembre». Para «Confirmaste el …». */
export function diaDeUnInstante(instante: string | null | undefined): string | null {
  if (!instante) return null;
  const ms = Date.parse(instante);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms);
  return `${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}`;
}

/** Hoy, según el reloj del teléfono: es el «hoy» de los recordatorios (las alarmas son locales). */
export function hoyDelTelefono(ahoraMs: number = Date.now()): FechaDePago {
  const d = new Date(ahoraMs);
  return { dia: d.getDate(), mes: d.getMonth() + 1, anio: d.getFullYear() };
}

/** Días de calendario de `desde` a `hasta` (negativo si `hasta` es anterior). Sin horas de verano de por medio: se cuenta con UTC. */
export function diasEntre(desde: FechaDePago, hasta: FechaDePago): number {
  const a = Date.UTC(desde.anio, desde.mes - 1, desde.dia);
  const b = Date.UTC(hasta.anio, hasta.mes - 1, hasta.dia);
  return Math.round((b - a) / 86_400_000);
}

/** La fecha `dias` días después (o antes, si es negativo). */
export function sumarDias(f: FechaDePago, dias: number): FechaDePago {
  const d = new Date(Date.UTC(f.anio, f.mes - 1, f.dia + dias));
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

/**
 * La misma fecha, `meses` meses después. Si el día no existe en ese mes queda en el último («31 ene» + 1 → «28 feb»): las cuotas de «el 31 de
 * cada mes» caen el último día de los meses cortos. Se cuenta SIEMPRE desde la fecha de partida, no de la anterior (no se corre el día).
 */
export function sumarMeses(f: FechaDePago, meses: number): FechaDePago {
  const total = f.anio * 12 + (f.mes - 1) + meses;
  const anio = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  return { anio, mes, dia: Math.min(f.dia, diasDelMesDePago(mes, anio)) };
}
