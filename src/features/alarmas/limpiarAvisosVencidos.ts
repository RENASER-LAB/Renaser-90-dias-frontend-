import { leerNotaDeCumplido, type NotaDeCumplido } from '../habits/notificaciones/cumplidoDeHoy';
import { cargarNotificaciones } from '../habits/notificaciones/recordatoriosDeHabito';
import {
  avisoDeInicioVencido,
  fechaDelInstante,
  horaDelHabitoDelAviso,
  leerAvisoDeInicio,
  type ContenidoDeAviso,
} from '../habits/notificaciones/utils/vigenciaDelAviso';

/**
 * Quita de la bandeja del teléfono los avisos de inicio de un hábito que ya no sirven (issue #40, 2026-10-31).
 *
 * Un aviso de inicio vale hasta la hora del hábito (`vigenciaDelAviso.ts`). El que ya se mostró no se va solo de la
 * bandeja: «Te toca a las 07:00.» seguía ahí a las 08:58, o después de haber cumplido el hábito. Al abrir la app y al volver
 * al frente se revisan los avisos que hay y se quitan los que ya vencieron o cuyo hábito se cumplió ese día.
 *
 * - **Vencido**: pasó la hora del hábito (más la gracia de `GRACIA_DEL_AVISO_MIN`). El hábito se sigue registrando todo
 *   su día; lo que deja de tener sentido es el aviso.
 * - **Cumplido**: la nota «este hábito se cumplió hoy» (`cumplidoDeHoy.ts`, issue #33) es del mismo día que el aviso. Solo si
 *   la hora del hábito cae en ese día: un hábito de después de la medianoche (Dormir a las 00:10) se cumple en el registro
 *   del día anterior y su aviso, que es del día siguiente, no se quita por esto (sí cuando vence).
 *
 * Solo toca los avisos de inicio que la app programó (los reconoce por su cuerpo «Te toca a las …» y su ruta
 * `/habitos/…`, también los que muestra un grupo de avisos). Las repeticiones («Te tocaba a las …»), las acciones de los
 * objetivos, los eventos, el Código Renaser, los mensajes y los avisos que mandó el servidor no se tocan.
 *
 * Es barata (una lectura de la bandeja) y nunca lanza: limpiar es un refuerzo, no puede romper la puesta al día.
 */

/** Lo que devuelve `getPresentedNotificationsAsync`, solo lo que hace falta. */
export interface NotificacionEnLaBandeja {
  /** Cuándo se mostró, en ms (Android: el `postTime` del aviso). */
  date: number;
  request: { identifier: string; content: ContenidoDeAviso };
}

export type MotivoParaQuitar = 'vencido' | 'cumplido';

export interface AvisoParaQuitar {
  identifier: string;
  motivo: MotivoParaQuitar;
}

/**
 * Pura: qué avisos de la bandeja sobran. `notas` trae la nota de cumplido de cada hábito (por id) o `null`.
 */
export function avisosParaQuitar(
  bandeja: readonly NotificacionEnLaBandeja[],
  ahoraMs: number,
  notas: ReadonlyMap<string, NotaDeCumplido | null> = new Map(),
): AvisoParaQuitar[] {
  const quitar: AvisoParaQuitar[] = [];
  for (const aviso of bandeja) {
    const contenido = aviso?.request?.content;
    if (!contenido || typeof aviso.request.identifier !== 'string' || !Number.isFinite(aviso.date)) continue;
    const leido = leerAvisoDeInicio(contenido);
    if (!leido) continue;
    if (avisoDeInicioVencido(leido, aviso.date, ahoraMs)) {
      quitar.push({ identifier: aviso.request.identifier, motivo: 'vencido' });
      continue;
    }
    const nota = leido.habitoId ? notas.get(leido.habitoId) : null;
    const diaDelHabito = fechaDelInstante(horaDelHabitoDelAviso(aviso.date, leido.hora, leido.minutosAntes));
    if (nota && nota.dia === diaDelHabito) quitar.push({ identifier: aviso.request.identifier, motivo: 'cumplido' });
  }
  return quitar;
}

export interface DependenciasDeLaLimpieza {
  /** La bandeja de ahora, o `null` si no se puede leer (web, Expo Go, sin módulo). */
  bandeja: () => Promise<NotificacionEnLaBandeja[] | null>;
  quitar: (identifier: string) => Promise<void>;
  nota: (userId: string, habitoId: string) => Promise<NotaDeCumplido | null>;
}

const porDefecto: DependenciasDeLaLimpieza = {
  bandeja: async () => {
    const N = cargarNotificaciones();
    if (!N) return null;
    return (await N.getPresentedNotificationsAsync()) as unknown as NotificacionEnLaBandeja[];
  },
  quitar: async identifier => {
    await cargarNotificaciones()?.dismissNotificationAsync(identifier);
  },
  nota: leerNotaDeCumplido,
};

/**
 * Revisa la bandeja y quita lo que sobra. Devuelve cuántos avisos quitó. Sin `userId` (no hay sesión) solo quita los
 * vencidos: no hay notas de cumplido de nadie.
 */
export async function limpiarAvisosVencidos(
  userId: string | null,
  ahoraMs: number = Date.now(),
  deps: DependenciasDeLaLimpieza = porDefecto,
): Promise<number> {
  try {
    const bandeja = await deps.bandeja();
    if (!bandeja || bandeja.length === 0) return 0;
    const notas = new Map<string, NotaDeCumplido | null>();
    if (userId) {
      const habitos = new Set<string>();
      for (const aviso of bandeja) {
        const leido = aviso?.request?.content ? leerAvisoDeInicio(aviso.request.content) : null;
        if (leido?.habitoId) habitos.add(leido.habitoId);
      }
      for (const habitoId of habitos) notas.set(habitoId, await deps.nota(userId, habitoId).catch(() => null));
    }
    let quitados = 0;
    for (const { identifier } of avisosParaQuitar(bandeja, ahoraMs, notas)) {
      try {
        await deps.quitar(identifier);
        quitados++;
      } catch {
        // Uno que no se pudo quitar no impide los demás: queda hasta la próxima revisión.
      }
    }
    return quitados;
  } catch {
    return 0;
  }
}
