import React, { useCallback, useState } from 'react';
import { Modal } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { ActivarProgramaScreen } from '../../onboarding/screens/ActivarProgramaScreen';

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
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);
  const alActivar = useCallback(() => {
    setAbierto(false);
    onActivado();
  }, [onActivado]);

  return (
    <>
      <GoldButton label="Elegir mi Día 1" icon="calendar" onPress={() => setAbierto(true)} />
      <Modal visible={abierto} animationType="slide" onRequestClose={cerrar} statusBarTranslucent>
        {abierto ? <ActivarProgramaScreen alVolver={cerrar} onActivated={alActivar} /> : null}
      </Modal>
    </>
  );
}
