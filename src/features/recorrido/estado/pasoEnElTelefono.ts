import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Spec 045, D9 («se reiniciaba»): el paso más adelantado del recorrido, guardado también en el teléfono por cuenta. Si el paso no
 * llegó al servidor (sin red al avanzar) y la app se cierra, al reabrirla se sigue desde aquí y no desde un paso anterior.
 * Cualquier fallo del almacenamiento se lee como «no hay nada guardado».
 */
const clave = (usuarioId: string) => `renaser.recorrido.paso.${usuarioId}`;

export async function leerPasoDelTelefono(usuarioId: string): Promise<number> {
  try {
    const valor = Number(await AsyncStorage.getItem(clave(usuarioId)));
    return Number.isFinite(valor) && valor >= 1 ? Math.trunc(valor) : 1;
  } catch {
    return 1;
  }
}

export async function guardarPasoEnElTelefono(usuarioId: string, paso: number): Promise<void> {
  try {
    const antes = await leerPasoDelTelefono(usuarioId);
    if (paso > antes) await AsyncStorage.setItem(clave(usuarioId), String(paso));
  } catch {
    // Sin almacenamiento, queda lo del servidor.
  }
}
