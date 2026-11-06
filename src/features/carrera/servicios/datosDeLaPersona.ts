import { obtenerRocasMaestras } from '../../objetivos/api/objetivosApi';
import * as onboardingApi from '../../onboarding/api/onboardingApi';
import { figuraDelAvatar, type FiguraDelAvatar } from '../utils/fusionDelAvatar';
import { PESO_POR_DEFECTO_KG, pesoParaCalorias } from '../utils/ritmoYCalorias';

/**
 * Lo que la carrera necesita saber de la persona ANTES de la cuenta regresiva (nunca durante, FR-004): el peso para las calorías
 * (el del objetivo de 90 días de Cuerpo si es en kg, o 70 kg; decisión del dueño) y el sexo de la ficha para el avatar (FR-038).
 * Cada lectura tiene 4 s: si no llega, se sigue con los valores por defecto. Se recuerda en la sesión para no repetir lecturas.
 *
 * Se adelanta al mostrarse la fila de «Kilómetros diarios» (`calentarLaCarrera`): si al tocar «Correr» la lectura todavía va en
 * camino, se espera ESA misma (no se pide dos veces) y la cuenta no vuelve a esperar los 4 s.
 */

export interface DatosDeLaPersonaParaLaCarrera {
  pesoKg: number;
  figura: FiguraDelAvatar;
}

const recordados = new Map<string, DatosDeLaPersonaParaLaCarrera>();
const enCamino = new Map<string, Promise<DatosDeLaPersonaParaLaCarrera>>();

function conTope<T>(promesa: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promesa.catch(() => null), new Promise<null>(r => setTimeout(() => r(null), ms))]);
}

export function leerDatosDeLaPersona(cuentaId: string): Promise<DatosDeLaPersonaParaLaCarrera> {
  const ya = recordados.get(cuentaId);
  if (ya) return Promise.resolve(ya);
  const yendo = enCamino.get(cuentaId);
  if (yendo) return yendo;
  const lectura = leer(cuentaId).finally(() => enCamino.delete(cuentaId));
  enCamino.set(cuentaId, lectura);
  return lectura;
}

async function leer(cuentaId: string): Promise<DatosDeLaPersonaParaLaCarrera> {
  const [rocas, respuestas] = await Promise.all([
    conTope(obtenerRocasMaestras(), 4000),
    conTope(onboardingApi.obtenerRespuestas('ficha_inicial'), 4000),
  ]);
  const cuerpo = rocas?.find(r => r.eje === 'CUERPO') ?? null;
  let sexo: string | null = null;
  for (const seccion of respuestas?.sections ?? []) {
    for (const r of seccion.answers) if (r.questionKey === 'sex') sexo = r.textValue ?? null;
  }
  const datos = { pesoKg: cuerpo ? pesoParaCalorias(cuerpo) : PESO_POR_DEFECTO_KG, figura: figuraDelAvatar(sexo) };
  if (rocas !== null && respuestas !== null) recordados.set(cuentaId, datos);
  return datos;
}

export function olvidarDatosDeLaPersonaParaPruebas(): void {
  recordados.clear();
  enCamino.clear();
}
