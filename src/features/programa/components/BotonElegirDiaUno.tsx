import React, { useCallback, useState } from 'react';
import { Modal } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { ActivarProgramaScreen } from '../../onboarding/screens/ActivarProgramaScreen';

/** El texto del botón dorado en tipo oración: 16 px y sin espaciado entre letras (AGENTS.md §4). */
export const TEXTO_DEL_BOTON = { fontSize: 16, letterSpacing: 0 } as const;

/**
 * «Elegir mi Día 1» fuera del onboarding (D-260, pedido del dueño del 2026-10-07).
 *
 * El personal (MENTOR, LÍDER DE MENTORES, ADMIN, ALQUIMISTA) no pasa por el onboarding, que es el
 * único lugar donde estaba el selector del Día 1. Quien tenía la fila del programa sin activar veía
 * «Todavía no elegiste tu Día 1» en Training y no tenía dónde elegirlo.
 *
 * No hay un selector nuevo: abre `ActivarProgramaScreen` tal cual (las mismas fechas que da el
 * servidor, la misma regla que el aprendiz, el mismo `POST /onboarding/activate-program`), a
 * pantalla completa y con la flecha para volver sin elegir.
 */
export function BotonElegirDiaUno({ onActivado }: { onActivado: () => void }) {
  const selector = useSelectorDelDiaUno(onActivado);

  return (
    <>
      {/* Tipo oración: sin el espaciado de los rótulos en versales (11 px, 2,2) que trae GoldButton; igual que «Empezar ahora ›» de Hoy (#84). */}
      <GoldButton label="Elegir mi Día 1" icon="calendar" onPress={selector.abrir} textStyle={TEXTO_DEL_BOTON} />
      <SelectorDelDiaUno {...selector} />
    </>
  );
}

/**
 * El estado del selector del Día 1 y su apertura: separado del botón dorado para que otra entrada —la fila compacta de Hoy y de Plan,
 * `FilaDelProgramaPropio`— abra EXACTAMENTE el mismo selector, sin copiar el modal.
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

/** El modal con `ActivarProgramaScreen`, a pantalla completa y con la flecha para volver sin elegir. */
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
