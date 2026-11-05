import { obtenerRocasMaestras } from '../../objetivos/api/objetivosApi';
import * as onboardingApi from '../../onboarding/api/onboardingApi';
import { figuraDelAvatar, type FiguraDelAvatar } from '../utils/fusionDelAvatar';
import { PESO_POR_DEFECTO_KG, pesoParaCalorias } from '../utils/ritmoYCalorias';

/**
 * Lo que la carrera necesita saber de la persona ANTES de la cuenta regresiva (nunca durante, FR-004): el peso para las calorías
 * (el del objetivo de 90 días de Cuerpo si es en kg, o 70 kg; decisión del dueño) y el sexo de la ficha para el avatar (FR-038).
 * Cada lectura tiene 4 s: si no llega, se sigue con los valores por defecto. Se recuerda en la sesión para no repetir lecturas.
 */

export interface DatosDeLaPersonaParaLaCarrera {
  pesoKg: number;
  figura: FiguraDelAvatar;
}

const recordados = new Map<string, DatosDeLaPersonaParaLaCarrera>();

function conTope<T>(promesa: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promesa.catch(() => null), new Promise<null>(r => setTimeout(() => r(null), ms))]);
}

export async function leerDatosDeLaPersona(cuentaId: string): Promise<DatosDeLaPersonaParaLaCarrera> {
  const ya = recordados.get(cuentaId);
  if (ya) return ya;
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
