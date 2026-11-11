import { escribirOEncolar, escriturasEsperando, type MetodoDeEscritura } from '../../sinRed/escrituraSinRed';
import { horaReal } from '../../sinRed/horaReal';
import { registrarAjusteDeLectura } from '../../sinRed/lecturasGuardadas';
import { fechaLocal } from '../notificaciones/utils/alarmasPorDia';
import type { DesbloqueoHabitoApi, DiaDeLaSemanaApi, PlanDesbloqueosApi, PreferenciaHabitoApi } from '../types/habits.types';

/**
 * Spec 048, fase 3 (FR-019, D13, D14): planificar hábitos y alarmas sin señal.
 *
 * Todas las escrituras de planificar (hora, aviso y alarma de un día o general, apagar un día, plan de la semana, pausar, quitar o
 * agregar un hábito al plan) pasan por `escribirOEncolar`: sin señal se guardan con la hora real y se ven al instante. La hoja
 * reprograma las alarmas del teléfono con lo elegido apenas termina la llamada, así que suenan a la hora nueva sin esperar al servidor.
 *
 * - El aviso de «rige mañana» (D-91) se calcula con la hora real: el cambio de hora siempre rige desde mañana, y el servidor lo corrige al
 *   llegar. Si cambió algo en su cuenta después de lo que hiciste (otro teléfono, tu mentora), gana lo suyo y se avisa (D13).
 * - Los ajustes de lectura dibujan lo pendiente sobre las preferencias, los días de la semana y el plan de desbloqueos guardados.
 * - **Un hábito propio nuevo (`POST /habits`) necesita señal**: el servidor le pone el `id` con el que se planifica todo lo demás.
 */
export function escribirDeHabito(
  etiqueta: string,
  metodo: MetodoDeEscritura,
  ruta: string,
  cuerpo?: unknown,
  resumen?: string | null,
): Promise<void> {
  return escribirOEncolar<void>(
    { area: 'habitos', etiqueta, metodo, ruta, ...(cuerpo !== undefined ? { cuerpo } : {}), ...(resumen ? { resumen } : {}) },
    { validar: () => undefined, optimista: () => undefined },
  );
}

/** El cambio de hora de un hábito siempre rige desde mañana (D-91): lo mismo que responde el servidor, con la hora real. */
export function cambioDeHoraDeMananaEnEspera(): { deferred: boolean; deferredEffectiveDate: string } {
  const ahora = horaReal().instante;
  return { deferred: true, deferredEffectiveDate: fechaLocal(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)) };
}

const hora = (t: unknown): string | null => (typeof t === 'string' ? t.slice(0, 5) : null);

export function resumenDeHora(triggerTime: unknown, limitTime?: unknown): string | null {
  const desde = hora(triggerTime);
  if (!desde) return null;
  const hasta = hora(limitTime);
  return hasta ? `Hora: ${desde} a ${hasta}` : `Hora: ${desde}`;
}

const RUTA_PREFERENCIAS = '/api/v1/habit-preferences';

registrarAjusteDeLectura(async (ruta, datos) => {
  const limpia = ruta.split('?')[0];
  const esLista = limpia === RUTA_PREFERENCIAS;
  const dias = /^\/api\/v1\/habit-preferences\/([^/]+)\/weekdays$/.exec(limpia);
  const esDesbloqueos = limpia === '/api/v1/habit-unlocks';
  if (!esLista && !dias && !esDesbloqueos) return datos;
  const esperando = await escriturasEsperando('habitos');
  if (esperando.length === 0) return datos;

  // `GET /habit-preferences` envuelve las preferencias en `{ habits: [...] }`.
  const envuelta = esLista && datos && typeof datos === 'object' && Array.isArray((datos as { habits?: unknown }).habits);
  if (esLista && envuelta) {
    let prefs = (datos as { habits: PreferenciaHabitoApi[] }).habits;
    for (const e of esperando) {
      const m = /^\/api\/v1\/habit-preferences\/([^/]+)$/.exec(e.ruta);
      if (!m || e.metodo !== 'PATCH') continue;
      const c = e.cuerpo as { triggerTime?: string | null; limitTime?: string | null; reminderEnabled?: boolean; reminderMinutesBefore?: number | null; reminderMinutesList?: number[] };
      prefs = prefs.map(p =>
        p.habitId !== m[1]
          ? p
          : {
              ...p,
              triggerTime: c.triggerTime ?? p.triggerTime,
              limitTime: c.limitTime === undefined ? p.limitTime : c.limitTime,
              customized: true,
              ...(c.reminderEnabled !== undefined ? { reminderEnabled: c.reminderEnabled } : {}),
              ...(c.reminderMinutesBefore !== undefined ? { reminderMinutesBefore: c.reminderMinutesBefore } : {}),
              ...(c.reminderMinutesList !== undefined ? { reminderMinutesList: c.reminderMinutesList } : {}),
            },
      );
    }
    return { ...(datos as object), habits: prefs };
  }

  if (dias && Array.isArray(datos)) {
    let semana = datos as DiaDeLaSemanaApi[];
    for (const e of esperando) {
      const m = /^\/api\/v1\/habit-preferences\/([^/]+)\/weekdays\/([A-Z]+)(\/reminder|\/active)?$/.exec(e.ruta);
      if (!m || m[1] !== dias[1]) continue;
      const dia = m[2];
      const c = (e.cuerpo ?? {}) as { triggerTime?: string; limitTime?: string | null; reminderEnabled?: boolean; reminderMinutesList?: number[] };
      semana = semana.map(d => {
        if (d.weekday !== dia) return d;
        if (m[3] === '/reminder' && e.metodo === 'PUT') return { ...d, reminderEnabled: c.reminderEnabled, reminderMinutesList: c.reminderMinutesList ?? [], customReminder: true };
        if (m[3] === '/active' && e.metodo === 'DELETE') return { ...d, active: false };
        if (!m[3] && e.metodo === 'PUT') return { ...d, triggerTime: c.triggerTime ?? d.triggerTime, limitTime: c.limitTime === undefined ? d.limitTime : c.limitTime, custom: true, customTime: true };
        return d;
      });
    }
    return semana;
  }

  if (esDesbloqueos && datos && typeof datos === 'object' && Array.isArray((datos as PlanDesbloqueosApi).items)) {
    const plan = datos as PlanDesbloqueosApi;
    let items: DesbloqueoHabitoApi[] = plan.items;
    for (const e of esperando) {
      const m = /^\/api\/v1\/habit-unlocks\/([^/]+)$/.exec(e.ruta);
      if (!m) continue;
      if (e.metodo === 'DELETE') items = items.filter(i => i.habitId !== m[1]);
      else if (e.metodo === 'PATCH') {
        const c = e.cuerpo as { active: boolean; pausedUntil?: string };
        items = items.map(i => (i.habitId === m[1] ? { ...i, paused: !c.active, pausedUntil: c.active ? null : c.pausedUntil ?? null } : i));
      } else if (e.metodo === 'PUT' && !items.some(i => i.habitId === m[1])) {
        items = [...items, { habitId: m[1], unlockDay: 1, chosenAt: e.hechoEn, paused: false, pausedUntil: null }];
      }
    }
    return { ...plan, items };
  }
  return datos;
});
