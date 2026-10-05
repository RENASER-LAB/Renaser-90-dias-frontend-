import { useEffect, type RefObject } from 'react';
import type { TextInput } from 'react-native';
import { DURACION_MS } from '../theme/movimiento';

/**
 * Pone el cursor en un campo (y abre el teclado) un instante DESPUÉS de que la pantalla llega
 * (alta y onboarding nativos, 2026-10-05).
 *
 * Por qué no `autoFocus`: visto en el emulador, con `autoFocus` el campo quedaba marcado como
 * enfocado (borde dorado) pero Android NO abría el teclado — el foco llega mientras la vista recién
 * se está montando y la ventana todavía no lo atiende. Además, abrir el teclado en el mismo cuadro
 * en que el paso entra deslizándose movería todo dos veces. Se espera a que termine la entrada del
 * paso (`DURACION_MS.paso`) y recién ahí se enfoca: el teclado sube sobre una pantalla quieta.
 */
const RETARDO_MS = DURACION_MS.paso + 40;

export function useEnfocarAlLlegar(campo: RefObject<TextInput | null>, activo: boolean = true) {
  useEffect(() => {
    if (!activo) return;
    const temporizador = setTimeout(() => campo.current?.focus(), RETARDO_MS);
    return () => clearTimeout(temporizador);
  }, [activo, campo]);
}
