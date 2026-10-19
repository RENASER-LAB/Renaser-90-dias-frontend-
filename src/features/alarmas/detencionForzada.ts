import AsyncStorage from '@react-native-async-storage/async-storage';

import { detencionForzadaDesde, type DetencionForzada } from './alarmaExactaNativa';
import { fotoDeLasAlarmasAlAbrir, type EstadoDeLasAlarmas } from './alarmasVivas';

/**
 * ¿El teléfono detuvo Renaser a la fuerza desde la última vez que se revisó? Y, si sí, ¿hay que avisarlo
 * hoy? (spec 007, historia 2, FR-006 y FR-007; `data-model.md` §Transiciones).
 *
 * ## Por qué
 *
 * Honor y Huawei tratan «quitar de recientes» o el ahorro de batería como una detención forzada, y Android
 * borra todas las alarmas de la app hasta que se la vuelve a abrir. Con la app detenida tampoco llega el
 * push del servidor. Ningún tipo de alarma lo evita: lo único posible es que la persona se entere y cambie
 * un ajuste de su teléfono.
 *
 * ## Qué guarda (por cuenta; se borra al cerrar sesión con el resto de las alarmas)
 *
 * - `renaser.alarmas.detencionRevisada.<id>`: hasta qué instante (ms desde 1970) se miró el historial del
 *   sistema. La próxima vez solo cuenta lo posterior.
 * - `renaser.alarmas.avisoDetencion.<id>`: la fecha local (`AAAA-MM-DD`) en que se avisó por última vez.
 *   Como mucho un aviso por día.
 *
 * ## Qué decide
 *
 * `'avisar'` solo si hay señal de que el teléfono borró las alarmas y hoy no se avisó. Dos señales, cualquiera
 * de las dos basta (spec 007, refuerzo FR-020):
 *
 * 1. **El historial del sistema** dice que detuvo la app a la fuerza desde la última revisión (FR-006; en las
 *    marcas que detienen apps, también «quitar de recientes», FR-022).
 * 2. **Las alarmas ya no están**: la app tenía alarmas programadas a futuro y el sistema no tiene ninguna
 *    «próxima alarma» de Renaser (`alarmasVivas.ts`). Cubre a las marcas que no cuentan bien el motivo de salida.
 *    Se usa la lectura tomada al abrir la app, ANTES de rearmar.
 *
 * En todos los demás casos —sin señal, ya se avisó hoy, un APK sin la función nativa— `'nada'`. El instante
 * revisado se guarda siempre: la misma detención no vuelve a contar mañana.
 *
 * ## La primera revisión no avisa
 *
 * Sin una revisión anterior en este teléfono con esta cuenta (instalación nueva, primera sesión, o después
 * de cerrar sesión) solo se anota desde cuándo mirar. No hay «la última vez» con la que comparar, y un
 * teléfono nuevo para la app dice que ésta arrancó tras una detención forzada: Android deja toda app
 * recién instalada en estado «detenida» hasta que se la abre por primera vez. Avisar «tu teléfono cerró
 * Renaser y por eso no sonaron tus alarmas» a quien acaba de instalarla sería falso. Lo que cuesta: no se
 * avisa de una detención anterior a esta primera apertura, aunque las alarmas ya se vuelven a poner igual.
 *
 * Nunca lanza. Si el almacenamiento falla al guardar, devuelve `'nada'`: sin poder anotar que ya se
 * avisó, avisar en cada apertura sería insistir.
 */

const PREFIJO_DETENCION_REVISADA = 'renaser.alarmas.detencionRevisada.';
const PREFIJO_AVISO_DETENCION = 'renaser.alarmas.avisoDetencion.';

export type ResultadoDeLaRevision = 'avisar' | 'nada';

export interface DependenciasDeLaDetencion {
  /** La lectura del módulo nativo; ante un APK sin la función devuelve «sin detención». */
  consultar: (desdeMs: number) => DetencionForzada;
  /** Si las alarmas siguen vivas, leído al abrir la app antes de rearmar (FR-020). */
  alarmas: () => Promise<EstadoDeLasAlarmas>;
}

const porDefecto: DependenciasDeLaDetencion = {
  consultar: detencionForzadaDesde,
  alarmas: () => fotoDeLasAlarmasAlAbrir(),
};

/** Si no se pudo saber, no se avisa por esta vía: vale solo el historial del sistema. */
async function alarmasSegun(deps: DependenciasDeLaDetencion): Promise<EstadoDeLasAlarmas> {
  try {
    return await deps.alarmas();
  } catch {
    return 'no_se_sabe';
  }
}

/** La fecha de HOY en el teléfono (no la de UTC: a las 22:00 en Lima, UTC ya es mañana), `AAAA-MM-DD`. */
function fechaLocal(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** Hasta qué instante se miró la vez anterior, o `null` si nunca (o si lo guardado no sirve). */
async function ultimaRevision(userId: string): Promise<number | null> {
  const guardada = await AsyncStorage.getItem(PREFIJO_DETENCION_REVISADA + userId);
  if (guardada === null) return null;
  const instante = Number(guardada);
  return Number.isFinite(instante) && instante > 0 ? instante : null;
}

export async function revisarDetencionForzada(
  userId: string,
  ahora: Date = new Date(),
  deps: DependenciasDeLaDetencion = porDefecto,
): Promise<ResultadoDeLaRevision> {
  try {
    const desdeMs = await ultimaRevision(userId);
    if (desdeMs === null) {
      await AsyncStorage.setItem(PREFIJO_DETENCION_REVISADA + userId, String(ahora.getTime()));
      return 'nada';
    }
    const lectura = deps.consultar(desdeMs);
    const alarmasBorradas = (await alarmasSegun(deps)) === 'borradas';
    const hoy = fechaLocal(ahora);
    const yaAvisoHoy = (await AsyncStorage.getItem(PREFIJO_AVISO_DETENCION + userId)) === hoy;
    const avisar = (lectura.detenida || alarmasBorradas) && !yaAvisoHoy;

    // Lo revisado se anota siempre: la detención de hoy no cuenta otra vez mañana.
    const revisadoHasta = lectura.detenida && lectura.cuando !== null ? lectura.cuando : ahora.getTime();
    await AsyncStorage.setItem(PREFIJO_DETENCION_REVISADA + userId, String(revisadoHasta));
    if (avisar) await AsyncStorage.setItem(PREFIJO_AVISO_DETENCION + userId, hoy);
    return avisar ? 'avisar' : 'nada';
  } catch {
    return 'nada';
  }
}
