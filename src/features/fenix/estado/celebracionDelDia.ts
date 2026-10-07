import AsyncStorage from '@react-native-async-storage/async-storage';

import { hayQueCelebrar } from '../../yo/utils/estadoDeLasFases';
import { claveDelDia, hitosDelDia, rachaCelebradaTrasMirar, type DatosDelDia, type HitoDelFenix } from '../utils/hitosDelFenix';

/**
 * «Máximo una pantalla de celebración por día por cuenta», guardado en el teléfono (AsyncStorage). Se anota en el
 * momento de DECIDIR, no al cerrar: si la app se cierra a mitad de la pantalla, no se repite.
 *
 * La última fase vista sigue en la clave de siempre (`yo.faseVista.<id>`, la que usaba el momento chico de Yo): quien
 * ya vio su fase en Yo no la vuelve a celebrar. Una fase nueva que llega con el día ya ocupado no se pierde: queda sin
 * anotar y se celebra al día siguiente.
 *
 * Sin almacenamiento disponible no se celebra: la celebración es un extra, nunca algo que pueda fallar.
 */
const PREFIJO = 'fenix.celebracion.';
const FASE_VISTA = 'yo.faseVista.';

type Registro = { dia: string | null; racha: number | null };

/** Lo que se muestra: la pantalla de mayor jerarquía y, como líneas, los otros hitos que coincidieron. */
export type CelebracionDeHoy = { principal: HitoDelFenix; otros: HitoDelFenix[] };

export type DatosParaCelebrar = Omit<DatosDelDia, 'faseNueva'> & {
  /** El número de la fase de `/home` (1–4), o `null` si no se sabe. */
  faseNumero: number | null;
};

async function leer(usuarioId: string): Promise<Registro> {
  const crudo = await AsyncStorage.getItem(PREFIJO + usuarioId);
  if (!crudo) return { dia: null, racha: null };
  try {
    const r = JSON.parse(crudo) as Partial<Registro>;
    return {
      dia: typeof r.dia === 'string' ? r.dia : null,
      racha: typeof r.racha === 'number' ? r.racha : null,
    };
  } catch {
    return { dia: null, racha: null };
  }
}

async function guardar(usuarioId: string, registro: Registro): Promise<void> {
  await AsyncStorage.setItem(PREFIJO + usuarioId, JSON.stringify(registro));
}

async function leerFaseVista(usuarioId: string): Promise<number | null> {
  const guardada = await AsyncStorage.getItem(FASE_VISTA + usuarioId);
  return guardada === null || !Number.isFinite(Number(guardada)) ? null : Number(guardada);
}

/**
 * La primera vez se anota la fase sin celebrar; una más alta se anota solo cuando se celebra (si el día ya estaba
 * ocupado, queda pendiente para mañana).
 */
async function anotarFase(usuarioId: string, vista: number | null, numero: number | null, celebrada: boolean) {
  if (numero === null) return;
  if (vista === null || (celebrada && numero > vista)) await AsyncStorage.setItem(FASE_VISTA + usuarioId, String(numero));
}

/** La celebración de hoy, o `null`. Si hay una, ya queda anotada: una segunda llamada el mismo día da `null`. */
export async function tomarCelebracionDeHoy(
  usuarioId: string,
  datos: DatosParaCelebrar,
  hoy: Date,
): Promise<CelebracionDeHoy | null> {
  const [registro, faseVista] = await Promise.all([leer(usuarioId), leerFaseVista(usuarioId)]);
  const dia = claveDelDia(hoy);
  const faseNueva = hayQueCelebrar(faseVista, datos.faseNumero);
  const hitos = registro.dia === dia ? [] : hitosDelDia({ ...datos, faseNueva }, registro.racha);
  const racha = rachaCelebradaTrasMirar(datos.rachaActual, registro.racha, hitos);
  if (hitos.length > 0 || racha !== registro.racha) {
    await guardar(usuarioId, { dia: hitos.length > 0 ? dia : registro.dia, racha });
  }
  await anotarFase(usuarioId, faseVista, datos.faseNumero, hitos.includes('fase'));
  if (hitos.length === 0) return null;
  return { principal: hitos[0], otros: hitos.slice(1) };
}
