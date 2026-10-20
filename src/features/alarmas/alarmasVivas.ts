import {
  estadoDeAlarmaExacta,
  proximaAlarmaPropia,
  type EstadoDeAlarmaExacta,
  type ProximaAlarmaPropia,
} from './alarmaExactaNativa';
import { cargarNotificaciones } from '../habits/notificaciones/recordatoriosDeHabito';

/**
 * ¿Siguen vivas las alarmas que la app programó? (spec 007, refuerzo FR-020, pedido del dueño del 19/10:
 * «arregla en general, no es ese dispositivo».)
 *
 * ## Por qué no basta el motivo de salida
 *
 * `detencionForzada.ts` lee el historial de salidas del proceso, pero cada marca lo cuenta a su manera: Honor puede
 * registrar «quitar de recientes» o ni dejar rastro, y entonces el teléfono borra las alarmas sin que la app se
 * entere. Esto mira el RESULTADO en vez de la causa: si la app tiene alarmas programadas a futuro y el sistema no
 * tiene ninguna «próxima alarma» de Renaser, el teléfono las borró.
 *
 * ## Cómo se decide
 *
 * - Sin alarmas programadas a futuro → `vivas` (no hay nada que perder).
 * - `ninguna` próxima alarma en el sistema → `borradas`.
 * - La próxima alarma es de Renaser → `vivas`.
 * - La próxima alarma es de otra app (el reloj de la persona): `getNextAlarmClock()` es global y solo ve la primera,
 *   así que no se puede decir nada → `no_se_sabe`. Tampoco con un APK sin la función nativa.
 * - Sin el permiso «Alarmas y recordatorios» (Android 12+) las alarmas no son del tipo despertador y no salen como
 *   «próxima alarma» aunque estén bien programadas → `no_se_sabe`. Es lo que evita avisar en falso a quien las
 *   programó antes de dar el permiso: el rearmado las convierte, pero todavía no habría corrido.
 *
 * ## Cuándo se mira: ANTES de rearmar, y una sola vez por proceso
 *
 * Rearmar deja las alarmas puestas otra vez, y entonces el sistema siempre diría «vivas». Por eso
 * {@link fotoDeLasAlarmasAlAbrir} se pide al inicio de la primera puesta al día (`ponerAlDiaLasAlarmas`) y guarda el
 * resultado: quien lo necesita después (`revisarDetencionForzada`) recibe la lectura de ANTES de rearmar. La lectura
 * del sistema es síncrona y se hace primero, antes de cualquier espera.
 *
 * Límite conocido: una alarma que otra parte de la app (eventos, acciones) programe en el mismo instante en que
 * arranca la app podría contar como «próxima alarma» de Renaser y esconder el borrado; el aviso simplemente no
 * sale esa vez (nunca sale en falso por esa vía). Nunca lanza.
 */

export type EstadoDeLasAlarmas = 'vivas' | 'borradas' | 'no_se_sabe';

export interface DependenciasDeAlarmasVivas {
  /** Si Android deja programar alarmas exactas (las únicas que son del tipo despertador). */
  permiso: () => EstadoDeAlarmaExacta;
  /** De quién es la próxima alarma del sistema. Síncrona: se lee antes de que el rearmado la toque. */
  proximaAlarmaPropia: () => ProximaAlarmaPropia;
  /** Lo que devuelve `getAllScheduledNotificationsAsync`. */
  programadas: () => Promise<readonly unknown[]>;
  ahora: () => number;
}

const porDefecto: DependenciasDeAlarmasVivas = {
  permiso: () => estadoDeAlarmaExacta(),
  proximaAlarmaPropia: () => proximaAlarmaPropia(),
  programadas: async () => (await cargarNotificaciones()?.getAllScheduledNotificationsAsync()) ?? [],
  ahora: () => Date.now(),
};

/** Disparadores que se repiten solos: siempre tienen una próxima vez. */
const DISPARADORES_QUE_SE_REPITEN = new Set(['daily', 'weekly', 'monthly', 'yearly', 'calendar']);

/**
 * ¿Hay alguna alarma programada para el futuro que Android debería tener como alarma del despertador? Cuentan las
 * diarias, semanales y de fecha por venir; no la prueba de sonido (intervalo de 3 s: no es despertador) ni nada que
 * no se entienda. Pura.
 */
export function hayAlarmasProgramadasAFuturo(programadas: readonly unknown[], ahoraMs: number): boolean {
  return programadas.some(alarma => {
    const disparador = (alarma as { trigger?: { type?: unknown; value?: unknown } } | null | undefined)?.trigger;
    if (!disparador || typeof disparador !== 'object') return false;
    if (typeof disparador.type === 'string' && DISPARADORES_QUE_SE_REPITEN.has(disparador.type)) return true;
    return disparador.type === 'date' && typeof disparador.value === 'number' && disparador.value > ahoraMs;
  });
}

export async function comprobarAlarmasVivas(deps: DependenciasDeAlarmasVivas = porDefecto): Promise<EstadoDeLasAlarmas> {
  try {
    // Lo del sistema se lee YA, antes de la primera espera: el rearmado corre a la par y lo cambiaría.
    const permiso = deps.permiso();
    const proxima = deps.proximaAlarmaPropia();
    if (!hayAlarmasProgramadasAFuturo(await deps.programadas(), deps.ahora())) return 'vivas';
    if (permiso !== 'concedido' && permiso !== 'no_hace_falta') return 'no_se_sabe';
    if (proxima === 'ninguna') return 'borradas';
    return proxima === 'propia' ? 'vivas' : 'no_se_sabe';
  } catch {
    return 'no_se_sabe';
  }
}

let foto: Promise<EstadoDeLasAlarmas> | null = null;

/**
 * La lectura de las alarmas tomada al abrir la app, ANTES de rearmar. La primera llamada del proceso la toma; las
 * siguientes devuelven la misma. Una detención forzada mata el proceso, así que la apertura que importa es siempre un
 * proceso nuevo con esto en blanco.
 */
export function fotoDeLasAlarmasAlAbrir(deps?: DependenciasDeAlarmasVivas): Promise<EstadoDeLasAlarmas> {
  foto ??= comprobarAlarmasVivas(deps);
  return foto;
}

/** Solo para las pruebas. */
export function olvidarLaFotoDeLasAlarmas(): void {
  foto = null;
}
