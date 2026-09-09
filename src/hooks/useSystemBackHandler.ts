import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Retroceso del sistema en **Android**: boton fisico, barra de 3 botones y el deslizamiento
 * desde el borde de la navegacion por gestos (Xiaomi, Pixel, Samsung...). Todos llegan como
 * el mismo evento `hardwareBackPress`.
 *
 * ATENCION — esto NO cubre iOS. `BackHandler` es una API de Android: en iOS el listener se
 * registra y no se dispara nunca, porque no existe un "boton atras" del sistema. Verificado
 * revisando el arbol: los 25 `<Modal>` de la app declaran `onRequestClose` (correcto, y en
 * Android es lo que recoge el gesto), pero `onRequestClose` en iOS solo se dispara al
 * arrastrar hacia abajo un modal con `presentationStyle` "pageSheet"/"formSheet", y aqui
 * `presentationStyle` no se declara en ningun sitio: todos los modales son `transparent`,
 * que en iOS fuerza `overFullScreen` y no trae gesto de descarte.
 *
 * Consecuencia practica: en iOS la UNICA salida de un modal es el control en pantalla. Se
 * comprobo que todos lo tienen (boton de cerrar, botones de accion, o tocar el fondo), asi
 * que no hay pantallas sin salida, pero el gesto lateral que pide AGENTS.md 6 no esta
 * cubierto en iOS y no puede estarlo con este hook.
 *
 * Para cerrar ese hueco hay dos caminos, y ambos son decision de producto porque cambian el
 * aspecto o anaden dependencia:
 *   1. Pasar los modales a `presentationStyle="pageSheet"` (pierde el velo oscuro a pantalla
 *      completa y cambia el lenguaje visual de todos los modales).
 *   2. Un gesto propio con `react-native-gesture-handler` (dependencia nueva).
 *
 * En las pantallas dentro de un navegador de React Navigation el gesto lateral de iOS SI
 * funciona: lo aporta el propio navegador (`gestureEnabled`), no este hook.
 *
 * @param onBack Que hacer al retroceder. Devolver `false` deja pasar el evento al sistema.
 * @param isEnabled Si el manejador esta activo (p. ej. solo con el modal abierto).
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
