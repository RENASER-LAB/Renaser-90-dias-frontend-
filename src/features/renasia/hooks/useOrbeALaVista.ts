import { useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { NavigationContext } from '@react-navigation/native';

/**
 * Si el orbe se está viendo: la pestaña donde vive tiene el foco Y la app está en primer plano.
 *
 * Existe por el lag del orbe en el Xiaomi del dueño (2026-09-26). Las pestañas de abajo dejan Hoy
 * MONTADO al pasar a Plan, Comunidad o Yo, y el reloj del orbe seguía dibujando la nube de puntos en
 * el hilo de UI mientras nadie la veía: le robaba cuadros al scroll de las otras pestañas.
 *
 * Se lee el contexto de navegación en vez de `useIsFocused` para no reventar fuera de un navegador
 * (una prueba, una vista previa): sin navegación se da por enfocado.
 */
export function useOrbeALaVista(): boolean {
  const navegacion = useContext(NavigationContext);
  const [enfocado, setEnfocado] = useState(() => navegacion?.isFocused() ?? true);
  const [enPrimerPlano, setEnPrimerPlano] = useState(() => AppState.currentState !== 'background');

  useEffect(() => {
    if (!navegacion) return;
    setEnfocado(navegacion.isFocused());
    const alEnfocar = navegacion.addListener('focus', () => setEnfocado(true));
    const alSalir = navegacion.addListener('blur', () => setEnfocado(false));
    return () => {
      alEnfocar();
      alSalir();
    };
  }, [navegacion]);

  useEffect(() => {
    // `inactive` (iOS: centro de control, llamada entrante) también pausa: el orbe no se ve entero.
    const suscripcion = AppState.addEventListener('change', estado => setEnPrimerPlano(estado === 'active'));
    return () => suscripcion.remove();
  }, []);

  return enfocado && enPrimerPlano;
}
