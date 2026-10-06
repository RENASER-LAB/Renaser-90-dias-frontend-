import AsyncStorage from '@react-native-async-storage/async-storage';

import { claveDelDia, hitoDelDia, rachaCelebradaTrasMirar, type DatosDelDia, type HitoDelFenix } from '../utils/hitosDelFenix';

/**
 * «Máximo una celebración por día por usuario», guardado en el teléfono (AsyncStorage, como `yo.faseVista`). Se anota
 * en el momento de DECIDIR, no al terminar: si la app se cierra a mitad del salto, no se repite.
 *
 * Sin almacenamiento disponible no se celebra: la celebración es un extra, nunca algo que pueda fallar.
 */
const PREFIJO = 'fenix.celebracion.';

type Registro = { dia: string | null; racha: number | null };

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

/** El hito a celebrar hoy, o `null`. Si hay uno, ya queda anotado: una segunda llamada el mismo día da `null`. */
export async function tomarCelebracionDeHoy(usuarioId: string, datos: DatosDelDia, hoy: Date): Promise<HitoDelFenix | null> {
  const registro = await leer(usuarioId);
  const dia = claveDelDia(hoy);
  const yaHubo = registro.dia === dia;
  const hito = yaHubo ? null : hitoDelDia(datos, registro.racha);
  const racha = rachaCelebradaTrasMirar(datos.rachaActual, registro.racha, hito);
  if (hito || racha !== registro.racha) await guardar(usuarioId, { dia: hito ? dia : registro.dia, racha });
  return hito;
}

/**
 * Otra celebración de la app ocupó el día (el momento «¡Entraste en la Fase N!» de Yo): el fénix no suma otra encima.
 */
export async function registrarCelebracionFuera(usuarioId: string, hoy: Date): Promise<void> {
  try {
    const registro = await leer(usuarioId);
    await guardar(usuarioId, { ...registro, dia: claveDelDia(hoy) });
  } catch {
    /* sin almacenamiento: a lo sumo, el fénix celebra algo el mismo día */
  }
}
