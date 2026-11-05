import type AsyncStorageTipo from '@react-native-async-storage/async-storage';

/**
 * AsyncStorage cargado al primer uso, no al importar: la fila de Training importa la entrada de la carrera, y cargar el módulo nativo
 * con solo importarla rompería las pruebas de Training que no lo simulan (y no hace falta hasta guardar algo).
 */
export function almacen(): typeof AsyncStorageTipo {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const m = require('@react-native-async-storage/async-storage');
  return (m.default ?? m) as typeof AsyncStorageTipo;
}
