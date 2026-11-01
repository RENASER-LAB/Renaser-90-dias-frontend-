import type { CuotaDePago } from '../api/pagosSchemas';
import { montoConMoneda } from '../utils/dinero';
import {
  diasEntre,
  fechaCortaDePago,
  fechaEnPalabrasDePago,
  hoyDelTelefono,
  partirIso,
  sumarDias,
  type FechaDePago,
} from '../utils/fechasDePago';
import type { PreferenciasDePagos } from './preferenciasDePagos';

/**
 * Qué alarmas de pago hay que tener puestas (spec 032). Pura: no toca la librería ni el almacenamiento, así que se prueba suelta.
 *
 * - **Una alarma por cuota pendiente y por aviso** (3 días antes, 1 día antes, el mismo día), a la hora elegida. Una cuota pagada no tiene ninguna.
 * - **Solo lo que viene**: un instante que ya pasó, o está por pasar (menos de `MARGEN_MS`), no se programa. Una cuota vencida y pendiente no suena:
 *   ni reproche ni ruido (decisión del dueño: no pagar no pasa nada).
 * - **Dos alarmas al mismo instante se juntan en una** (como el aviso agrupado de las demás, E-410): Android puede callar el sonido de la segunda
 *   si suenan a la vez. Su identificador es el instante, así que cuando una cuota se paga la alarma cambia de texto o desaparece sola.
 * - **«Hoy» es el del teléfono**: las alarmas son locales; las fechas de las cuotas son del calendario y no llevan zona.
 */

/** Una alarma que está por sonar en menos de esto ya no se programa: se programaría para «ahora». */
export const MARGEN_MS = 60_000;

/** El prefijo de todo identificador de alarma de pago: lo que empieza así es nuestro y se puede cancelar sin mirar de quién es. */
export const PREFIJO_DE_ALARMA_DE_PAGO = 'pago-';

export interface AlarmaDePago {
  /** Estable: `pago-<instante en ms>`. Programar con el mismo id REEMPLAZA la alarma. */
  id: string;
  cuandoMs: number;
  titulo: string;
  cuerpo: string;
  /** Lo que identifica el contenido: si cambia, la alarma se vuelve a programar. */
  firma: string;
}

function instanteLocal(dia: FechaDePago, hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return new Date(dia.anio, dia.mes - 1, dia.dia, h, m, 0, 0).getTime();
}

type Aviso = { cuota: CuotaDePago; vence: FechaDePago; antelacion: number };

function tituloDeUna(antelacion: number): string {
  if (antelacion === 0) return 'Tu cuota vence hoy';
  if (antelacion === 1) return 'Tu cuota vence mañana';
  return `Tu cuota vence en ${antelacion} días`;
}

function textoDeUna(aviso: Aviso, moneda: string | null): string {
  return `${montoConMoneda(aviso.cuota.monto, moneda)} · ${fechaEnPalabrasDePago(aviso.cuota.venceEl)}. Toca para ver tu cronograma.`;
}

function alarmaDe(cuandoMs: number, avisos: Aviso[], moneda: string | null, hoy: FechaDePago): AlarmaDePago {
  const id = `${PREFIJO_DE_ALARMA_DE_PAGO}${cuandoMs}`;
  let titulo: string;
  let cuerpo: string;
  if (avisos.length === 1) {
    titulo = tituloDeUna(avisos[0].antelacion);
    cuerpo = textoDeUna(avisos[0], moneda);
  } else {
    titulo = `Tienes ${avisos.length} cuotas por pagar`;
    cuerpo = `${avisos.map(a => `${montoConMoneda(a.cuota.monto, moneda)} el ${fechaCortaDePago(a.cuota.venceEl, hoy)}`).join(' · ')}. Toca para ver tu cronograma.`;
  }
  return { id, cuandoMs, titulo, cuerpo, firma: `${cuandoMs}|${titulo}|${cuerpo}` };
}

/**
 * @param cuotas todas las cuotas de la persona (las pagadas se ignoran)
 * @param moneda la del cronograma: el monto sale con su símbolo
 */
export function planDeAlarmasDePago(entrada: {
  cuotas: readonly CuotaDePago[];
  moneda: string | null;
  preferencias: PreferenciasDePagos;
  ahoraMs: number;
}): AlarmaDePago[] {
  const { cuotas, moneda, preferencias, ahoraMs } = entrada;
  if (!preferencias.activos || preferencias.antelaciones.length === 0) return [];
  const hoy = hoyDelTelefono(ahoraMs);
  const porInstante = new Map<number, Aviso[]>();
  for (const cuota of cuotas) {
    if (cuota.pagada) continue;
    const vence = partirIso(cuota.venceEl);
    if (!vence) continue;
    for (const antelacion of preferencias.antelaciones) {
      const dia = sumarDias(vence, -antelacion);
      const cuando = instanteLocal(dia, preferencias.hora);
      if (cuando <= ahoraMs + MARGEN_MS) continue;
      const lista = porInstante.get(cuando) ?? [];
      lista.push({ cuota, vence, antelacion });
      porInstante.set(cuando, lista);
    }
  }
  return [...porInstante.entries()].sort((a, b) => a[0] - b[0]).map(([cuando, avisos]) => alarmaDe(cuando, avisos, moneda, hoy));
}

/** Los días que faltan para el vencimiento de `iso` desde hoy (el del teléfono); negativo si ya pasó. `null` si la fecha no es válida. */
export function diasParaVencer(iso: string, ahoraMs: number): number | null {
  const vence = partirIso(iso);
  return vence ? diasEntre(hoyDelTelefono(ahoraMs), vence) : null;
}

export type DiferenciaDeAlarmas = {
  /** Identificadores que están puestos y ya no corresponden: se cancelan. */
  cancelar: string[];
  /** Las que faltan o cambiaron de contenido: se (re)programan. */
  programar: AlarmaDePago[];
};

/**
 * Lo que hay que hacer para pasar de lo puesto a lo que corresponde.
 *
 * @param puestas identificador → firma de lo que se programó (lo guarda el teléfono)
 * @param existentes los identificadores que el sistema todavía tiene programados (una alarma que el teléfono olvidó se vuelve a poner)
 */
export function diferenciaDeAlarmas(
  plan: readonly AlarmaDePago[],
  puestas: Readonly<Record<string, string>>,
  existentes: ReadonlySet<string>,
): DiferenciaDeAlarmas {
  const deseadas = new Set(plan.map(a => a.id));
  const cancelar = new Set<string>();
  for (const id of Object.keys(puestas)) if (!deseadas.has(id)) cancelar.add(id);
  for (const id of existentes) if (id.startsWith(PREFIJO_DE_ALARMA_DE_PAGO) && !deseadas.has(id)) cancelar.add(id);
  const programar = plan.filter(a => puestas[a.id] !== a.firma || !existentes.has(a.id));
  return { cancelar: [...cancelar], programar };
}
