import { Platform } from 'react-native';

/**
 * Los pasos del teléfono para la carrera (FR-031, FR-036): `expo-sensors` Pedometer. Entregan el total desde que se empezó a
 * escuchar; acá se convierte en «pasos nuevos» para el motor y el avatar.
 *
 * El permiso de actividad física es opcional: sin él, o sin sensor, la carrera funciona igual y el avatar se mueve con el GPS.
 *
 * **Límite a confirmar en un teléfono real (investigación 3 del plan):** en Android el Pedometer de Expo lee el contador de
 * pasos del sistema (`TYPE_STEP_COUNTER`), que algunos teléfonos agrupan cada pocos segundos. Si en el teléfono el avatar tarda más
 * de 500 ms en reaccionar, hace falta un módulo nativo chico con `TYPE_STEP_DETECTOR`. La lógica (`fusionDelAvatar`) ya responde
 * en el mismo instante en que llega el paso.
 */

type ModuloSensores = typeof import('expo-sensors');

function cargar(): ModuloSensores | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-sensors') as ModuloSensores;
  } catch {
    return null;
  }
}

/** Pide el permiso y dice si hay pasos. Nunca lanza. */
export async function prepararPodometro(): Promise<boolean> {
  const m = cargar();
  if (!m) return false;
  try {
    if (!(await m.Pedometer.isAvailableAsync())) return false;
    const actual = await m.Pedometer.getPermissionsAsync();
    if (actual.granted) return true;
    return (await m.Pedometer.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Escucha los pasos y entrega cuántos llegaron desde la lectura anterior. Devuelve cómo dejar de escuchar. */
export function escucharPasos(alDarPasos: (nuevos: number, ahora: number) => void): () => void {
  const m = cargar();
  if (!m) return () => undefined;
  let anterior = 0;
  try {
    const sub = m.Pedometer.watchStepCount(r => {
      const nuevos = r.steps - anterior;
      anterior = r.steps;
      if (nuevos > 0) alDarPasos(nuevos, Date.now());
    });
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}
