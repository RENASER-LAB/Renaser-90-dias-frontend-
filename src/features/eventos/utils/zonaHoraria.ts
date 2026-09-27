/**
 * Fechas y horas de un evento **en la zona del evento**, no en la del teléfono ni en UTC.
 *
 * Existe por la misma razón que la regla 02 del backend (E-91): la medianoche local no existe a una
 * hora UTC fija. Un evento a las 23:30 de Lima cae al día siguiente en UTC; si la app agrupara por
 * `toISOString()` lo pondría en el día equivocado. Y el aviso «a las 06:00 del día del evento» es a
 * las 06:00 **de la zona del evento**, igual que lo calcula el backend (`CalculadoraRecordatorios`).
 *
 * Sin librerías: `Intl.DateTimeFormat` con `timeZone` (Hermes lo trae). Si la zona no se entiende, se
 * cae a la del teléfono en vez de lanzar: un evento con hora aproximada es mejor que una sección rota.
 */

export const ZONA_POR_DEFECTO = 'America/Lima';

/** La zona IANA del teléfono. Si el motor no la sabe, la del padrón (Lima). */
export function zonaDelTelefono(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ZONA_POR_DEFECTO;
  } catch {
    return ZONA_POR_DEFECTO;
  }
}

interface Partes {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
}

function partesEnZona(ms: number, zona: string): Partes | null {
  try {
    const formato = new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const p: Record<string, number> = {};
    for (const parte of formato.formatToParts(new Date(ms))) {
      if (parte.type !== 'literal') p[parte.type] = Number(parte.value);
    }
    if (![p.year, p.month, p.day, p.hour, p.minute].every(Number.isFinite)) return null;
    // Algunos motores devuelven 24 para la medianoche aun con h23.
    return { anio: p.year, mes: p.month, dia: p.day, hora: p.hour % 24, minuto: p.minute };
  } catch {
    return null;
  }
}

function partesLocales(ms: number): Partes {
  const d = new Date(ms);
  return { anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate(), hora: d.getHours(), minuto: d.getMinutes() };
}

const dos = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` del instante, en la zona dada. */
export function fechaEnZona(instante: string | number, zona: string | null): string {
  const ms = typeof instante === 'number' ? instante : Date.parse(instante);
  const p = (zona && partesEnZona(ms, zona)) || partesLocales(ms);
  return `${p.anio}-${dos(p.mes)}-${dos(p.dia)}`;
}

/** `HH:mm` del instante, en la zona dada. */
export function horaEnZona(instante: string | number, zona: string | null): string {
  const ms = typeof instante === 'number' ? instante : Date.parse(instante);
  const p = (zona && partesEnZona(ms, zona)) || partesLocales(ms);
  return `${dos(p.hora)}:${dos(p.minuto)}`;
}

/** Cuánto hay que sumarle a UTC para tener la hora de pared de `zona` en ese instante, en ms. */
function desfase(ms: number, zona: string): number | null {
  const p = partesEnZona(ms, zona);
  if (!p) return null;
  const comoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto);
  // El instante tiene segundos y milisegundos que las partes no: se descartan para comparar.
  return comoUtc - (ms - (ms % 60_000));
}

/**
 * El instante (ms) en que es `hora` del día `fecha` en `zona`. `fecha` = `YYYY-MM-DD`, `hora` = `HH:mm`.
 * `null` si la fecha o la hora no se entienden.
 */
export function instanteEnZona(fecha: string, hora: string, zona: string | null): number | null {
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const h = /^(\d{1,2}):(\d{2})$/.exec(hora);
  if (!f || !h) return null;
  const [anio, mes, dia] = [Number(f[1]), Number(f[2]), Number(f[3])];
  const [hh, mm] = [Number(h[1]), Number(h[2])];
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || hh > 23 || mm > 59) return null;
  const comoUtc = Date.UTC(anio, mes - 1, dia, hh, mm);
  const primero = zona ? desfase(comoUtc, zona) : null;
  if (primero === null) return new Date(anio, mes - 1, dia, hh, mm).getTime();
  // Dos pasadas: el desfase del instante adivinado puede no ser el del instante real si entre los
  // dos hay un cambio de horario (no en Lima, sí en otras zonas).
  const tentativo = comoUtc - primero;
  const segundo = desfase(tentativo, zona as string);
  return segundo === null || segundo === primero ? tentativo : comoUtc - segundo;
}

/** Suma días a `YYYY-MM-DD` sin pasar por la zona del teléfono. */
export function sumarDiasIso(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return `${t.getUTCFullYear()}-${dos(t.getUTCMonth() + 1)}-${dos(t.getUTCDate())}`;
}
