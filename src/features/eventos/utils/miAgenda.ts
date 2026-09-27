import type { Ocurrencia } from '../types/eventos.types';
import { fechaEnZona, horaEnZona, sumarDiasIso } from './zonaHoraria';

/**
 * «Mi agenda» (E-8): los próximos 7 días, empezando hoy, con lo que tiene cada uno a una hora —
 * eventos, hábitos con hora y acciones agendadas—, en orden de hora. Cero endpoints nuevos: junta
 * lo que ya existe (eventos del calendario, horario de hábitos, acciones de hoy y de mañana).
 *
 * Función pura: la pantalla solo pinta. Todo va en la zona del TELÉFONO, que es la del día de la
 * persona; un evento de otra zona cae en el día en que ella lo vive.
 */

export type TipoDeEntrada = 'evento' | 'habito' | 'accion';

export interface EntradaDeAgenda {
  tipo: TipoDeEntrada;
  /** `HH:mm`. */
  hora: string;
  titulo: string;
  /** Para abrir el evento; `null` en hábitos y acciones. */
  eventoId: string | null;
  /** Solo eventos: si la persona dijo «Voy». */
  voy: boolean;
}

export interface DiaDeAgenda {
  fecha: string;
  entradas: EntradaDeAgenda[];
}

/** Lo mínimo de un hábito que la agenda necesita. */
export interface HabitoParaAgenda {
  titulo: string;
  /** `HH:mm`, o vacío si no tiene hora. */
  hora: string;
  /** 0 = lunes … 6 = domingo (ISO), igual que `DIAS_DEL_PLAN`. */
  diasActivos: boolean[];
  bloqueado: boolean;
}

/** Lo mínimo de una acción del día. */
export interface AccionParaAgenda {
  fecha: string;
  titulo: string;
  /** `HH:mm` o `HH:mm:ss`; `null` = sin hora (no entra a la agenda). */
  hora: string | null;
}

export const DIAS_DE_AGENDA = 7;

/** 0 = lunes … 6 = domingo, para `YYYY-MM-DD`. */
function indiceIsoDelDia(fechaIso: string): number {
  const [a, m, d] = fechaIso.split('-').map(Number);
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
}

export function armarAgenda(params: {
  ahoraMs: number;
  zona: string | null;
  ocurrencias: Ocurrencia[];
  habitos: HabitoParaAgenda[];
  acciones: AccionParaAgenda[];
}): DiaDeAgenda[] {
  const { ahoraMs, zona, ocurrencias, habitos, acciones } = params;
  const hoy = fechaEnZona(ahoraMs, zona);
  const dias: DiaDeAgenda[] = [];
  for (let i = 0; i < DIAS_DE_AGENDA; i++) {
    const fecha = sumarDiasIso(hoy, i);
    const indice = indiceIsoDelDia(fecha);
    const entradas: EntradaDeAgenda[] = [];

    for (const oc of ocurrencias) {
      if (oc.asistencia === 'NOT_GOING') continue;
      if (fechaEnZona(oc.iniciaEn, zona) !== fecha) continue;
      entradas.push({
        tipo: 'evento',
        hora: horaEnZona(oc.iniciaEn, zona),
        titulo: oc.titulo,
        eventoId: oc.evento.id,
        voy: oc.asistencia === 'GOING',
      });
    }
    for (const h of habitos) {
      if (h.bloqueado || !h.hora || !h.diasActivos[indice]) continue;
      entradas.push({ tipo: 'habito', hora: h.hora.slice(0, 5), titulo: h.titulo, eventoId: null, voy: false });
    }
    for (const a of acciones) {
      if (a.fecha !== fecha || !a.hora) continue;
      entradas.push({ tipo: 'accion', hora: a.hora.slice(0, 5), titulo: a.titulo, eventoId: null, voy: false });
    }

    entradas.sort((x, y) => x.hora.localeCompare(y.hora));
    dias.push({ fecha, entradas });
  }
  return dias;
}
