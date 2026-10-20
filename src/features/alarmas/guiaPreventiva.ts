import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { pedirLaGuiaPreventiva } from './pedidoDeLaGuia';
import { marcaDelTelefono, marcaQueDetieneApps, type MarcaDelTelefono } from './utils/marcaDelTelefono';

/**
 * La guía de la marca ANTES de que pase (spec 007, refuerzo FR-021, pedido del dueño del 19/10: «arregla en
 * general también, no es ese dispositivo, por si acaso»).
 *
 * ## Qué
 *
 * En las marcas que detienen apps (Honor, Huawei, Xiaomi/Redmi/POCO, Oppo/Realme/OnePlus, Vivo/iQOO y Samsung), la
 * PRIMERA vez que la persona activa un recordatorio en este teléfono se le ofrece, una sola vez, la misma hoja que
 * sale después del daño («Tu teléfono cerró Renaser»), pero con texto preventivo: «En tu teléfono, Renaser necesita
 * un ajuste para que tus alarmas suenen siempre.» más la línea de su marca y el botón que abre su pantalla. Otras
 * marcas: nada (la guía sigue en Yo → Alarmas).
 *
 * ## Dónde se engancha
 *
 * `PlanificarDimensionModal.guardarHora`, justo donde se decide pedir «Alarmas y recordatorios» al guardar un
 * recordatorio, y DESPUÉS de eso: si ese guardado ya pidió el permiso, no se le suma una segunda hoja encima; la
 * guía espera al próximo guardado (no se marca como ofrecida mientras no se muestra).
 *
 * ## Qué guarda
 *
 * `renaser.alarmas.guiaPreventiva.<userId>`: cuándo se ofreció. Una vez por cuenta en este teléfono; se borra al
 * cerrar sesión con el resto de lo local de las alarmas (`alarmasDeLaCuenta.ts`, `PREFIJOS_DE_ALARMAS`).
 *
 * Se anota ANTES de mostrar y se deshace si nadie la mostró: sin poder anotarlo, insistiría en cada guardado. Nunca
 * lanza.
 */

export const CLAVE_GUIA_PREVENTIVA = 'renaser.alarmas.guiaPreventiva.';

/** Los tres datos del teléfono que se inyectan para las pruebas; en la app se usan los reales. */
export interface DependenciasDeLaGuiaPreventiva {
  marca: () => MarcaDelTelefono;
  sistema: string;
  /** Pide la hoja. `true` si se mostró. */
  pedirLaHoja: () => boolean;
}

const porDefecto: DependenciasDeLaGuiaPreventiva = {
  marca: () => marcaDelTelefono(),
  sistema: Platform.OS,
  pedirLaHoja: pedirLaGuiaPreventiva,
};

/** ¿Corresponde ofrecerla? Marca que detiene apps, Android y todavía no se ofreció a esta cuenta. */
export async function hayQueOfrecerLaGuiaPreventiva(
  userId: string,
  marca: MarcaDelTelefono = marcaDelTelefono(),
  sistema: string = Platform.OS,
): Promise<boolean> {
  if (sistema !== 'android' || !marcaQueDetieneApps(marca)) return false;
  return (await AsyncStorage.getItem(CLAVE_GUIA_PREVENTIVA + userId)) === null;
}

/** Ofrece la guía si corresponde. `true` si se mostró; `false` en cualquier otro caso (incluido un error). */
export async function ofrecerLaGuiaPreventiva(
  userId: string,
  deps: DependenciasDeLaGuiaPreventiva = porDefecto,
): Promise<boolean> {
  try {
    if (!(await hayQueOfrecerLaGuiaPreventiva(userId, deps.marca(), deps.sistema))) return false;
    await AsyncStorage.setItem(CLAVE_GUIA_PREVENTIVA + userId, new Date().toISOString());
    if (deps.pedirLaHoja()) return true;
    // Nadie la mostró (sin hoja montada, u otra hoja abierta): se intentará la próxima vez.
    await AsyncStorage.removeItem(CLAVE_GUIA_PREVENTIVA + userId).catch(() => undefined);
    return false;
  } catch {
    return false;
  }
}
