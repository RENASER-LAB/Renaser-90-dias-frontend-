import { useEffect, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * El alto máximo del cuerpo desplazable de una `HojaDesdeAbajo` de tamaño `contenido` que lleva
 * campos de texto (evidencia, cambiar nombre, clase diaria de Training; 2026-10-05).
 *
 * Una hoja `contenido` mide lo que lleva. Si lo que lleva no entra —el teclado abierto se come media
 * pantalla—, la hoja se recorta por abajo y el botón del pie queda fuera. Con este tope el cuerpo va
 * en un `ScrollView` que se acorta: el título y el botón quedan siempre a la vista.
 *
 * `reserva`: lo que ocupan la cabecera (agarradera, título, subtítulo) y el pie de esa hoja.
 */
export function useAltoMaximoDelCuerpo(reserva: number): number {
  const { height: altoVentana } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [teclado, setTeclado] = useState(0);

  useEffect(() => {
    const abrir = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', e =>
      setTeclado(e.endCoordinates?.height ?? 0),
    );
    const cerrar = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setTeclado(0));
    return () => {
      abrir.remove();
      cerrar.remove();
    };
  }, []);

  return altoMaximoDelCuerpo({ altoVentana, arriba: insets.top, teclado, reserva });
}

/** La cuenta, sin React: lo que queda de pantalla menos el teclado y la cabecera y el pie. */
export function altoMaximoDelCuerpo({
  altoVentana,
  arriba,
  teclado,
  reserva,
}: {
  altoVentana: number;
  arriba: number;
  teclado: number;
  reserva: number;
}): number {
  /* 8 de aire arriba (el de `HojaDesdeAbajo`) y nunca menos de 120: con menos no se ve ni un campo. */
  return Math.max(120, Math.round(altoVentana - arriba - 8 - teclado - reserva));
}
