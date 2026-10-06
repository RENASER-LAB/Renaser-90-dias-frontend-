import React, { forwardRef } from 'react';
import type { ViewStyle } from 'react-native';
import Rive, { Alignment, Fit, type RiveGeneralEvent, type RiveOpenUrlEvent, type RiveRef, type RNRiveError } from 'rive-react-native';

/**
 * La vista Rive del fénix, solo en Android e iOS. En la web (`vistaRive.tsx`) no existe: `rive-react-native` usa un
 * componente nativo que la web no tiene, y el `.riv` (732 KB) no se empaqueta ahí. Ahí se muestra la imagen del ánimo.
 *
 * El archivo, el artboard y la máquina de estados son los de la entrega del diseñador (PHOENIX_MASTER v3.3, §8.1):
 * `assets/rive/phoenix_master_v3_3.riv`, `Phoenix_Main`, `PhoenixSM`. No se cambian acá: el contrato es del `.riv`.
 */
const ARCHIVO_DEL_FENIX = require('../../../../assets/rive/phoenix_master_v3_3.riv');

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
> | null = forwardRef<RiveRef, PropsDeLaVistaRive>(function VistaRiveDelFenix(props, ref) {
  return (
    <Rive
      ref={ref}
      source={ARCHIVO_DEL_FENIX}
      artboardName={ARTBOARD}
      stateMachineName={MAQUINA_DE_ESTADOS}
      autoplay
      fit={Fit.Contain}
      alignment={Alignment.Center}
      {...props}
    />
  );
});
