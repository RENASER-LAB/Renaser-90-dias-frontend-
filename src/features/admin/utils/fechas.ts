const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * "1 – 30 de septiembre" cuando las dos fechas caen en el mismo mes, "28 de septiembre – 4 de
 * octubre" cuando no.
 *
 * Se formatea partiendo el texto ISO y NO con `new Date(iso)`: ese constructor interpreta
 * "2026-09-30" como medianoche UTC y en Lima lo muestra como el 29. Es el error clásico de fecha
 * corrida un día, y acá cambiaría el día de cierre que ve el administrador.
 */
export function rangoDeFechas(inicio: string | null, fin: string | null): string {
  if (!inicio || !fin) return 'Sin período';
  const a = partes(inicio);
  const b = partes(fin);
  if (!a || !b) return 'Sin período';
  if (a.anio === b.anio && a.mes === b.mes) {
    return `${a.dia} – ${b.dia} de ${MESES[a.mes - 1]}`;
  }
  const anio = a.anio === b.anio ? '' : ` de ${b.anio}`;
  return `${a.dia} de ${MESES[a.mes - 1]} – ${b.dia} de ${MESES[b.mes - 1]}${anio}`;
}

export function fechaCorta(iso: string | null): string {
  const p = iso ? partes(iso) : null;
  return p ? `${p.dia} de ${MESES[p.mes - 1]}` : '—';
}

function partes(iso: string): { anio: number; mes: number; dia: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

/** Hoy en formato ISO, tomado del reloj local. Solo para proponer fechas por defecto en el alta. */
export function hoyIso(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

/** Suma días a una fecha ISO sin pasar por la zona local: se opera en UTC de punta a punta. */
export function sumarDias(iso: string, dias: number): string {
  const p = partes(iso);
  if (!p) return iso;
  const d = new Date(Date.UTC(p.anio, p.mes - 1, p.dia));
  d.setUTCDate(d.getUTCDate() + dias);
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mes}-${dia}`;
}

/** Valida "YYYY-MM-DD" y que la fecha exista de verdad (31 de febrero no pasa). */
export function esFechaValida(iso: string): boolean {
  const p = partes(iso);
  if (!p || iso.length !== 10) return false;
  const d = new Date(Date.UTC(p.anio, p.mes - 1, p.dia));
  return d.getUTCFullYear() === p.anio && d.getUTCMonth() === p.mes - 1 && d.getUTCDate() === p.dia;
}
