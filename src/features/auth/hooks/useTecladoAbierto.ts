import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/** Menos que esto no es un teclado en pantalla: la barrita flotante de un teclado físico también dispara el evento. */
const ALTO_MINIMO_DE_UN_TECLADO = 120;

/** Si hay un teclado de verdad en pantalla. Dos eventos por apertura, no por cuadro; no anima nada. */
export function useTecladoAbierto(): boolean {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    const alAbrir = Keyboard.addListener('keyboardDidShow', evento =>
      setAbierto(evento.endCoordinates.height > ALTO_MINIMO_DE_UN_TECLADO),
    );
    const alCerrar = Keyboard.addListener('keyboardDidHide', () => setAbierto(false));
    return () => {
      alAbrir.remove();
      alCerrar.remove();
    };
  }, []);
  return abierto;
}
