import AsyncStorage from '@react-native-async-storage/async-storage';

import { type ModoDeTema } from './modoDeTema';

/**
 * Recuerda si la persona eligió a mano el modo claro u oscuro.
 *
 * La REGLA de qué tema se muestra vive en `modoDeTema.ts`; acá solo está el guardar y el leer.
 *
 * ## Por qué hace falta
 *
 * Hasta ahora el modo vivía SOLO en memoria (`useState` dentro de `ThemeProvider`): cerrar la app
 * lo perdía. Mientras el único interruptor era el botón de la cabecera eso se notaba poco; desde
 * que hay una fila "Modo oscuro" en Yo —un lugar donde uno espera que las cosas *queden*
 * elegidas— un ajuste que se olvida al reiniciar se lee directamente como un error.
 *
 * ## Solo se guarda la elección explícita
 *
 * Se escribe **únicamente** desde `toggle`/`setMode`, nunca desde la hidratación ni desde el valor
 * inicial. Si el modo derivado del sistema se guardara como si fuera una elección, el primer
 * arranque dejaría a la app clavada para siempre en el tema que el teléfono tenía ese día, y el
 * sistema no volvería a mandar nunca: un bug silencioso e imposible de deshacer desde la interfaz.
 *
 * ## Clave global, y no por usuario como el resto del almacenamiento local
 *
 * `almacenamientoLocal`, `borradorEspiritu` y `renombreDeHabito` usan clave por usuario, porque en
 * un mismo teléfono pasan varias cuentas y sus datos no deben filtrarse entre sí. Acá la clave es
 * global **a propósito**, por dos motivos:
 *
 * 1. `ThemeProvider` envuelve a `AuthProvider` (ver `App.tsx`), así que cuando el tema se resuelve
 *    todavía no hay sesión: no existe un `userId` que consultar. Meterlo adentro para poder usar
 *    una clave por usuario obligaría a reordenar el arranque entero de la app.
 * 2. Claro u oscuro no es un dato de la persona, es una preferencia **de la pantalla de este
 *    teléfono** —como el brillo—. Que la herede la siguiente cuenta que entre no es una filtración;
 *    es lo esperable.
 *
 * AsyncStorage y no `almacenamientoSeguro` (SecureStore): es una preferencia de pantalla, no una
 * credencial. Mismo criterio que `renombreDeHabito`.
 */

const CLAVE = 'renaser.tema.modo';

/** Ninguna operación de almacenamiento puede tumbar la app — degrada a "no eligió nada". */
async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

export const preferenciaDeTema = {
  /**
   * Devuelve el texto CRUDO, sin interpretar: quien decide qué significa es `modoDeArranque`, para
   * que la regla esté en un solo lugar —el que cubren las pruebas— y no repartida en dos archivos.
   * `null` = la clave todavía no existe.
   */
  leer: (): Promise<string | null> => sinRomper(() => AsyncStorage.getItem(CLAVE), null),

  /** Se llama SOLO cuando la persona cambia el modo a mano. Ver la nota de arriba sobre por qué. */
  guardar: (modo: ModoDeTema): Promise<void> => sinRomper(() => AsyncStorage.setItem(CLAVE, modo), undefined),
};
