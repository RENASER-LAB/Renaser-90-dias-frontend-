import AsyncStorage from '@react-native-async-storage/async-storage';
import { FichaInicialData } from '../../features/onboarding/types/onboarding.types';

/**
 * Borrador local de la Ficha Inicial del onboarding — para sobrevivir a que el teléfono se apague
 * o la app se cierre a la fuerza a mitad de completarla. Antes de esto, nada se guardaba hasta
 * tocar "Siguiente" (que sí persiste en el backend, capítulo por capítulo vía
 * `usePersistenciaOnboarding.guardarCapitulo`); si la persona no llegaba a tocarlo, perdía todo.
 *
 * AsyncStorage y no `almacenamientoSeguro` (SecureStore): esto no es una credencial, es un
 * borrador de formulario — no hace falta el cifrado del sistema operativo, y SecureStore tiene un
 * límite de ~2 KB por valor que un formulario con varios campos de texto libre (expectativa,
 * temor, dirección...) puede superar.
 *
 * Clave por usuario: en el mismo dispositivo pueden pasar distintas cuentas (como en este mismo
 * proyecto durante pruebas) — el borrador de una no debe filtrarse a la sesión de otra.
 */

interface BorradorFicha {
  formData: FichaInicialData;
  currentChapter: number;
  guardadoEn: string;
}

const PREFIJO_CLAVE = 'renaser.onboarding.borrador.ficha.';

/** Ninguna operación de almacenamiento debe poder tumbar la app — degradar a "no hay borrador". */
async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

export const almacenamientoLocal = {
  guardarBorradorFicha: (userId: string, formData: FichaInicialData, currentChapter: number): Promise<void> =>
    sinRomper(async () => {
      const borrador: BorradorFicha = { formData, currentChapter, guardadoEn: new Date().toISOString() };
      await AsyncStorage.setItem(PREFIJO_CLAVE + userId, JSON.stringify(borrador));
    }, undefined),

  /** `null` si no hay borrador guardado o si el JSON quedó corrupto (degrada, no revienta). */
  leerBorradorFicha: (userId: string): Promise<BorradorFicha | null> =>
    sinRomper(async () => {
      const crudo = await AsyncStorage.getItem(PREFIJO_CLAVE + userId);
      if (!crudo) return null;
      try {
        return JSON.parse(crudo) as BorradorFicha;
      } catch {
        return null;
      }
    }, null),

  /** Se llama al terminar la Ficha Inicial (ya quedó todo guardado en el backend, capítulo por capítulo). */
  borrarBorradorFicha: (userId: string): Promise<void> =>
    sinRomper(() => AsyncStorage.removeItem(PREFIJO_CLAVE + userId), undefined),
};
