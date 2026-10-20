import { fechaLocal, horaCorta, isoDe, type CambioDeHoraGeneral, type DiaPropio } from './alarmasPorDia';
import { combinacionDelDia, type CombinacionDeAlarma } from './combinacionDeAlarma';

/**
 * «Repetir si no la atiendo» (spec 009, research R2): qué alarmas de repetición lleva un hábito. Pura: no toca la
 * librería ni el almacenamiento (eso es `repeticiones.ts`).
 *
 * ## Qué es una repetición
 *
 * Con «Repetir» encendido, la alarma de la hora del hábito vuelve a sonar a los **5** y a los **10** minutos, y no
 * más. Las alarmas de ANTES de la hora (30 min antes, 10 min antes) no se repiten: la repetición cuelga de la hora
 * del hábito. Si el día no tiene ningún aviso («Sin aviso»), o el hábito no va ese día, no hay nada que repetir.
 *
 * ## Por qué alarmas de FECHA en una ventana de 7 días
 *
 * Una alarma `DAILY` o `WEEKLY` no se puede «saltar solo hoy»: cancelarla borra las de todos los días siguientes,
 * y reprogramarla antes de su hora la vuelve a poner hoy. Con una alarma de fecha por día, cancelar la de HOY es
 * exacto y las de mañana siguen en pie. La ventana (hoy y los 6 días siguientes) se renueva cada vez que la app se
 * pone al día; si la persona no abre la app en 7 días, las repeticiones se acaban (la alarma principal sigue).
 *
 * ## El identificador
 *
 * `habito-{id}-rep-{AAAAMMDD}-{5|10}`, con la fecha del DÍA DEL HÁBITO (no la del instante en que suena: un hábito
 * a las 23:58 repite a las 00:03 del día siguiente y su identificador lleva el día del hábito). Programar de nuevo
 * el mismo identificador REEMPLAZA la alarma, no la duplica.
 *
 * ## «Atendida» gana
 *
 * Si la persona ya tocó una alarma de ese día, o completó el hábito, las repeticiones de ESE día no se vuelven a
 * poner: sin esto, la renovación de la ventana (que corre al abrir la app) las resucitaría y habría repeticiones
 * después de atender el hábito (SC-003). `atendidas` trae las fechas `AAAAMMDD` ya atendidas.
 */

/** A cuántos minutos de la hora del hábito vuelve a sonar. */
export const MINUTOS_DE_REPETICION: readonly [5, 10] = [5, 10];

/** Cuántos días mira la ventana, contando hoy. */
export const DIAS_DE_LA_VENTANA = 7;

/** Lo mínimo que el plan necesita saber de un hábito. */
export interface EntradaDeRepeticiones {
  habitoId: string;
  /** La hora general (`HH:mm` o `HH:mm:ss`). `null` = no tiene hora y los días sin hora propia no suenan. */
  horaGeneral: string | null | undefined;
  /** El aviso general, en minutos antes. Vacío = sin aviso. */
  avisosGenerales: readonly number[];
  /** Lo propio de cada día. `null`/`undefined` = el servidor no lo informa. */
  dias: readonly DiaPropio[] | null | undefined;
  /** Cómo suena la alarma del hábito (la general). `null`/`undefined` = la de siempre. */
  alarmaGeneral: CombinacionDeAlarma | null | undefined;
  /** Un cambio de hora general que todavía no rige (D-91): hasta su fecha rige `horaDeHoy`. */
  cambio?: CambioDeHoraGeneral | null;
}

export interface PedidoDeRepeticion {
  identificador: string;
  /** El día del HÁBITO, `AAAAMMDD`. */
  fecha: string;
  minutosDespues: number;
  /** Cuándo suena. */
  instanteMs: number;
  /** `HH:mm` a la que va el hábito ese día: el cuerpo del aviso dice «Te tocaba a las …». */
  horaDelDia: string;
  /** Cómo suena ESE día: por qué canal sale. */
  alarma: CombinacionDeAlarma;
}

const dos = (n: number) => String(n).padStart(2, '0');

/** `AAAAMMDD` de una fecha local. */
export function fechaCompacta(d: Date): string {
  return `${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}`;
}

export function identificadorDeRepeticion(habitoId: string, fecha: string, minutos: number): string {
  return `habito-${habitoId}-rep-${fecha}-${minutos}`;
}

/** El prefijo de todas las repeticiones de un hábito. */
export function prefijoDeRepeticiones(habitoId: string): string {
  return `habito-${habitoId}-rep-`;
}

const FORMA_DE_UNA_REPETICION = /^habito-(.+)-rep-(\d{8})-(\d+)$/;

/** De un identificador, el hábito, el día del hábito y los minutos; `null` si no es una repetición. */
export function repeticionDe(identificador: unknown): { habitoId: string; fecha: string; minutos: number } | null {
  if (typeof identificador !== 'string') return null;
  const m = FORMA_DE_UNA_REPETICION.exec(identificador);
  return m ? { habitoId: m[1], fecha: m[2], minutos: Number(m[3]) } : null;
}

/**
 * El hábito que nombra la ruta de un aviso (`/habitos/{id}?dimension=…`), o `null`. Es la ruta que llevan las
 * alarmas de hábitos, las repeticiones incluidas.
 */
export function habitoDeLaRuta(ruta: unknown): string | null {
  if (typeof ruta !== 'string') return null;
  const m = /^\/habitos\/([^/?#]+)/.exec(ruta);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

/** La hora que rige para el día `fecha` (local): la propia, o la general; con un cambio pendiente, la de esa fecha. */
function horaDelDia(entrada: EntradaDeRepeticiones, propio: DiaPropio | undefined, fecha: Date): string | null {
  if (propio?.hora) return horaCorta(propio.hora);
  if (entrada.cambio) {
    return horaCorta(fechaLocal(fecha) < entrada.cambio.desde ? entrada.cambio.horaDeHoy : entrada.cambio.horaNueva);
  }
  return horaCorta(entrada.horaGeneral);
}

/**
 * Las repeticiones que hay que tener puestas desde `ahora`: dos por día de la ventana en que el hábito va, tiene
 * aviso y su combinación pide «Repetir». No incluye lo que ya pasó ni los días atendidos.
 */
export function planDeRepeticiones(
  entrada: EntradaDeRepeticiones,
  ahora: Date,
  atendidas: ReadonlySet<string> = new Set(),
): PedidoDeRepeticion[] {
  const propios = new Map((entrada.dias ?? []).map(d => [d.iso, d]));
  const pedidos: PedidoDeRepeticion[] = [];
  for (let i = 0; i < DIAS_DE_LA_VENTANA; i++) {
    const dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + i, 12, 0, 0, 0);
    const propio = propios.get(isoDe(dia));
    if (propio && !propio.activo) continue;
    const avisos = propio?.avisos ?? entrada.avisosGenerales;
    if (avisos.length === 0) continue;
    const alarma = combinacionDelDia(entrada.alarmaGeneral, propio?.alarma);
    if (!alarma.repetir) continue;
    const hora = horaDelDia(entrada, propio, dia);
    if (!hora) continue;
    const fecha = fechaCompacta(dia);
    if (atendidas.has(fecha)) continue;
    const [h, m] = hora.split(':').map(Number);
    for (const minutos of MINUTOS_DE_REPETICION) {
      const instante = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m + minutos, 0, 0).getTime();
      if (instante <= ahora.getTime()) continue;
      pedidos.push({
        identificador: identificadorDeRepeticion(entrada.habitoId, fecha, minutos),
        fecha,
        minutosDespues: minutos,
        instanteMs: instante,
        horaDelDia: hora,
        alarma,
      });
    }
  }
  return pedidos;
}
