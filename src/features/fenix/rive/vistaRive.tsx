import type React from 'react';
import type { ViewStyle } from 'react-native';
import type { RiveGeneralEvent, RiveOpenUrlEvent, RiveRef, RNRiveError } from 'rive-react-native';

/**
 * Web: no hay vista Rive (ver `vistaRive.native.tsx`). `PhoenixMascot` muestra la imagen fija del ánimo, que es el
 * comportamiento que la entrega v3.3 define para la web (§8.3, «Respaldo de emergencia»).
 */
export const ARTBOARD = 'Phoenix_Main';
export const MAQUINA_DE_ESTADOS = 'PhoenixSM';

export type PropsDeLaVistaRive = {
  style: ViewStyle;
  onPlay: () => void;
  onRiveEventReceived: (evento: RiveGeneralEvent | RiveOpenUrlEvent) => void;
  onError: (error: RNRiveError) => void;
};

export const VistaRiveDelFenix: React.ForwardRefExoticComponent<
  PropsDeLaVistaRive & React.RefAttributes<RiveRef>
> | null = null;
