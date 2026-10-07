import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * La respuesta háptica de la app, en un solo lugar (alta y onboarding nativos, 2026-10-05).
 *
 * **Por qué un envoltorio y no `expo-haptics` directo en cada pantalla.** Tres razones:
 *
 * 1. **Un APK sin el módulo nativo no puede reventar.** `expo-haptics` entró el 2026-10-05 y trae
 *    código nativo: el APK que ya está instalado (y el cliente de desarrollo del emulador) no lo
 *    tiene. La librería lo carga con `requireOptionalNativeModule` y, sin él, cada llamada
 *    *rechaza* la promesa. Acá se traga ese rechazo: sin módulo, no vibra y no pasa nada más.
 * 2. **En Android se usa la vía que respeta el ajuste del sistema.** `performAndroidHapticsAsync`
 *    va por `View.performHapticFeedback`, que obedece a «Respuesta táctil» del teléfono — quien la
 *    apagó no siente nada, que es lo correcto. Las otras funciones de la librería usan el vibrador
 *    directo y se saltan ese ajuste.
 * 3. **Los nombres dicen el momento, no el motor.** `seleccion`, `error`, `logro`: así una pantalla
 *    no elige entre veinte constantes de Android, y las tres se pueden afinar acá sin tocar JSX.
 *
 * Reglas de uso (las de `animate-expo`/`apple-design`): **una por acción del usuario**, en el mismo
 * instante en que cambia lo que se ve, y **nunca como única señal** — muchos teléfonos la tienen
 * apagada, así que la parte visual tiene que bastar sola.
 */

/** Algunas constantes de Android existen desde la API 30 o 34; la de respaldo, desde siempre. */
function vibrarEnAndroid(primaria: Haptics.AndroidHaptics, respaldo: Haptics.AndroidHaptics): void {
  Haptics.performAndroidHapticsAsync(primaria).catch(() =>
    Haptics.performAndroidHapticsAsync(respaldo).catch(() => undefined),
  );
}

function sinRomper(promesa: Promise<unknown>): void {
  promesa.catch(() => undefined);
}

export const tacto = {
  /** Elegir una opción: una tarjeta, un chip, un segmento, una casilla. Un «tic» corto. */
  seleccion(): void {
    if (Platform.OS === 'android') {
      vibrarEnAndroid(Haptics.AndroidHaptics.Segment_Tick, Haptics.AndroidHaptics.Clock_Tick);
    } else if (Platform.OS === 'ios') {
      sinRomper(Haptics.selectionAsync());
    }
  },

  /** Falta algo para seguir (la validación de un paso). Acompaña a la alerta, no la reemplaza. */
  error(): void {
    if (Platform.OS === 'android') {
      vibrarEnAndroid(Haptics.AndroidHaptics.Reject, Haptics.AndroidHaptics.Long_Press);
    } else if (Platform.OS === 'ios') {
      sinRomper(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    }
  },

  /** Algo quedó guardado de verdad: un capítulo de la ficha, la firma, el Día 1. */
  logro(): void {
    if (Platform.OS === 'android') {
      vibrarEnAndroid(Haptics.AndroidHaptics.Confirm, Haptics.AndroidHaptics.Virtual_Key);
    } else if (Platform.OS === 'ios') {
      sinRomper(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    }
  },

  /**
   * Un momento grande (la pantalla completa de celebración, 2026-10-07): el logro con un segundo golpe más pesado
   * detrás, para que se distinga del logro de cada hábito. Una sola vez, al aparecer la pantalla.
   */
  hito(): void {
    if (Platform.OS === 'android') {
      vibrarEnAndroid(Haptics.AndroidHaptics.Confirm, Haptics.AndroidHaptics.Virtual_Key);
      setTimeout(() => vibrarEnAndroid(Haptics.AndroidHaptics.Long_Press, Haptics.AndroidHaptics.Long_Press), 110);
    } else if (Platform.OS === 'ios') {
      sinRomper(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      setTimeout(() => sinRomper(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 110);
    }
  },

  /* Comunidad · chat (2026-10-05). */

  /** Mantener presionado abrió un menú (el de un mensaje del chat): el «toc» del sistema. */
  mantener(): void {
    if (Platform.OS === 'android') {
      vibrarEnAndroid(Haptics.AndroidHaptics.Long_Press, Haptics.AndroidHaptics.Long_Press);
    } else if (Platform.OS === 'ios') {
      sinRomper(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    }
  },

  /** Se tiró algo a propósito (la nota de voz que se estaba grabando): un golpe seco, sin alerta. */
  descartar(): void {
    if (Platform.OS === 'android') {
      vibrarEnAndroid(Haptics.AndroidHaptics.Virtual_Key, Haptics.AndroidHaptics.Long_Press);
    } else if (Platform.OS === 'ios') {
      sinRomper(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    }
  },
};
