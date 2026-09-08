import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MapaRenacimiento } from './tipos';
import { mapaVacio } from './tipos';

/**
 * Borrador local del Mapa de Renacimiento, por usuario.
 *
 * El manual (§2.1 "Guardado", §5.4 "Sin conexión") pide autoguardado local inmediato y
 * sincronización al servidor después. Hoy existe solo la mitad local: el backend todavía no
 * tiene las entidades del mapa (`docs/MAPA_RENACIMIENTO_DIA7.md`). Cuando exista, este archivo
 * sigue siendo la primera capa —lo que se escribe antes de que la red responda— y la
 * sincronización se agrega encima, sin cambiar las pantallas.
 *
 * AsyncStorage y no SecureStore, por el mismo motivo que el borrador de la Ficha Inicial: no es
 * una credencial, y SecureStore tiene un tope de ~2 KB que un mapa con nueve textos supera.
 * Clave por usuario: en un mismo dispositivo pueden pasar cuentas distintas.
 */
/**
 * v2 reinicia los borradores locales creados durante la integración inicial. El mapa todavía no
 * tiene persistencia en backend; mantener un `v1` de pruebas con `estado: "activo"` haría que una
 * cuenta que recién entra aparezca como si ya hubiera terminado el flujo. La clave sigue estando
 * separada por usuario para que una cuenta no herede el mapa de otra.
 */
const PREFIJO_CLAVE = 'renaser.mapa-renacimiento.v2.';

async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

/** Un borrador viejo o corrupto no puede tumbar la pantalla: se completa con los defaults. */
function normalizar(crudo: unknown): MapaRenacimiento | null {
  if (!crudo || typeof crudo !== 'object') return null;
  const base = mapaVacio();
  const leido = crudo as Partial<MapaRenacimiento>;
  if (leido.version !== 1) return null;
  return {
    ...base,
    ...leido,
    salud: { ...base.salud, ...(leido.salud ?? {}) },
    negocio: { ...base.negocio, ...(leido.negocio ?? {}) },
    relaciones: { ...base.relaciones, ...(leido.relaciones ?? {}) },
    acciones: Array.isArray(leido.acciones) ? leido.acciones : [],
    reemplazos: Array.isArray(leido.reemplazos) ? leido.reemplazos : [],
    hitos: Array.isArray(leido.hitos) ? leido.hitos : [],
    habitosCreados: leido.habitosCreados && typeof leido.habitosCreados === 'object' ? leido.habitosCreados : {},
  };
}

export const almacenMapa = {
  leer: (userId: string): Promise<MapaRenacimiento | null> =>
    sinRomper(async () => {
      const crudo = await AsyncStorage.getItem(PREFIJO_CLAVE + userId);
      if (!crudo) return null;
      try {
        return normalizar(JSON.parse(crudo));
      } catch {
        return null;
      }
    }, null),

  guardar: (userId: string, mapa: MapaRenacimiento): Promise<void> =>
    sinRomper(() => AsyncStorage.setItem(PREFIJO_CLAVE + userId, JSON.stringify(mapa)), undefined),

  borrar: (userId: string): Promise<void> =>
    sinRomper(() => AsyncStorage.removeItem(PREFIJO_CLAVE + userId), undefined),
};
