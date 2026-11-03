import React, { useCallback, useState } from 'react';
import { Modal } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { ActivarProgramaScreen } from '../../onboarding/screens/ActivarProgramaScreen';

/** Lo que dice el botón que abre «Tu programa empieza mañana» (spec 036): en Training, Plan, Yo y Mi Radar. */
export const TEXTO_DEL_BOTON_EMPEZAR = 'Empezar mañana';

/** El texto del botón dorado en tipo oración: 16 px y sin espaciado entre letras (AGENTS.md §4). */
export const TEXTO_DEL_BOTON = { fontSize: 16, letterSpacing: 0 } as const;

/**
 * «Empezar mañana» fuera del onboarding (D-260, pedido del dueño del 2026-10-07; spec 036, D-309, 2026-11-02: antes se llamaba «Elegir mi Día 1»).
 *
 * El personal (MENTOR, LÍDER DE MENTORES, ADMIN, ALQUIMISTA) no pasa por el onboarding, que es el
 * único lugar donde estaba este paso. Quien tenía la fila del programa sin activar veía «Todavía no empezaste
 * tu programa» en Training y no tenía dónde empezarlo.
 *
 * Ya no hay nada que elegir: el programa empieza mañana para todos. Abre `ActivarProgramaScreen` tal cual («Tu programa empieza mañana … Entendido»,
 * la misma regla que el aprendiz, el mismo `POST /onboarding/activate-program`), a pantalla completa y con la flecha para volver sin activar.
 *
 * Los nombres de este archivo (`BotonElegirDiaUno`, `useSelectorDelDiaUno`, `SelectorDelDiaUno`) se conservan a propósito: renombrarlos tocaría
 * una docena de archivos y de pruebas sin cambiar nada de lo que se ve.
 */
export function BotonElegirDiaUno({ onActivado }: { onActivado: () => void }) {
  const selector = useSelectorDelDiaUno(onActivado);

  return (
    <>
      {/* Tipo oración: sin el espaciado de los rótulos en versales (11 px, 2,2) que trae GoldButton; igual que «Empezar ahora ›» de Hoy (#84). */}
      <GoldButton label={TEXTO_DEL_BOTON_EMPEZAR} icon="calendar" onPress={selector.abrir} textStyle={TEXTO_DEL_BOTON} />
      <SelectorDelDiaUno {...selector} />
    </>
  );
}

/**
 * El estado de la pantalla «Tu programa empieza mañana» y su apertura: separado del botón dorado para que otra entrada —la fila compacta de Hoy
 * y de Plan, `FilaDelProgramaPropio`— abra EXACTAMENTE la misma pantalla, sin copiar el modal.
 */
export function useSelectorDelDiaUno(onActivado: () => void) {
  const [abierto, setAbierto] = useState(false);
  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);
  const alActivar = useCallback(() => {
    setAbierto(false);
    onActivado();
  }, [onActivado]);
  return { abierto, abrir, cerrar, alActivar };
}

/** El modal con `ActivarProgramaScreen`, a pantalla completa y con la flecha para volver sin activar. */
export function SelectorDelDiaUno({
  abierto,
  cerrar,
  alActivar,
}: {
  abierto: boolean;
  cerrar: () => void;
  alActivar: () => void;
}) {
  return (
    <Modal visible={abierto} animationType="slide" onRequestClose={cerrar} statusBarTranslucent>
      {abierto ? <ActivarProgramaScreen alVolver={cerrar} onActivated={alActivar} /> : null}
    </Modal>
  );
}
