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

/**
 * «3 de noviembre». Acepta las dos formas en que el servidor manda una fecha, y no son lo mismo (issue #108):
 *  - una FECHA de calendario (`2026-11-03`, `LocalDate`): se parte el texto, sin `Date`, que la leería como medianoche UTC y en Lima la correría un día;
 *  - un INSTANTE (`2026-11-03T02:30:00Z`: cuándo se aceptó, se firmó, se confirmó): se lee en la zona del TELÉFONO, como el resto de la app. Antes se partía el
 *    texto también, así que quedaba en UTC: entre las 19:00 y las 24:00 de Lima («Aceptada el 3 de noviembre» a las 21:30 del 2) salía el día siguiente.
 */
export function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  if (esUnInstante(iso)) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return `${d.getDate()} de ${MESES[d.getMonth()]}`;
  }
  const p = partes(iso);
  return p ? `${p.dia} de ${MESES[p.mes - 1]}` : '—';
}

/** ¿Trae hora (`…T02:30:00Z`)? Una fecha sola no: es un día de calendario, sin zona. */
function esUnInstante(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(iso);
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

/**
 * Endereza lo que una persona escribe a mano: `2026-09-1` → `2026-09-01`, `2026/9/1` → `2026-09-01`.
 *
 * Existe porque el campo de período es texto libre y `esFechaValida` exige los diez caracteres
 * exactos. Quien escribía el día sin el cero delante —que es como se escribe una fecha en
 * castellano— sólo se enteraba al guardar, con un error de formato que no explica que falta un
 * cero. Rechazar eso es correcto pero inútil: el dato se entiende perfecto.
 *
 * NO inventa nada. Si no reconoce tres números separados por `-` o `/`, devuelve el texto tal cual
 * y que `esFechaValida` haga su trabajo: es preferible un error claro a una fecha adivinada. El
 * 31 de febrero sigue sin pasar, porque esto normaliza la FORMA, no valida el calendario.
 */
export function normalizarFechaIso(texto: string): string {
  const m = /^\s*(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s*$/.exec(texto);
  if (!m) return texto;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}
