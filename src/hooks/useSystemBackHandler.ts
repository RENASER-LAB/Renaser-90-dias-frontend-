import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Hook universal para soportar gestos táctiles de retroceso del sistema
 * (Xiaomi Gesture Navigation / Android Edge Swipe / Hardware Back Button).
 *
 * @param onBack Callback a ejecutar cuando el usuario desliza desde el borde o pulsa atrás.
 * @param isEnabled Si el handler debe estar activo (ej. cuando hay un modal abierto o una subpantalla activa).
 */
export function useSystemBackHandler(onBack: () => boolean | void, isEnabled: boolean = true) {
  useEffect(() => {
    if (!isEnabled) return;

    const backAction = () => {
      const handled = onBack();
      // Si la función retorna true o void, previene el cierre de la app y maneja la navegación interna
      return handled !== false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [onBack, isEnabled]);
}
