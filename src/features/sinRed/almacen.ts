/**
 * AsyncStorage cargado al usarlo, no al importar (igual que la cola de carreras): `apiClient` importa los módulos sin red, y un
 * módulo nativo que falta (pruebas, web antigua) no puede romper la app ni las pruebas al importarse. Sin almacenamiento, lo
 * sin red simplemente no guarda nada.
 */
type Almacen = {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
  removeItem(k: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(k: readonly string[]): Promise<void>;
};

let cargado: Almacen | null | undefined;

const VACIO: Almacen = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
  getAllKeys: async () => [],
  multiRemove: async () => undefined,
};

export function almacen(): Almacen {
  if (cargado === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const m = require('@react-native-async-storage/async-storage');
      cargado = (m?.default ?? m) as Almacen;
    } catch {
      cargado = null;
    }
  }
  return cargado ?? VACIO;
}
