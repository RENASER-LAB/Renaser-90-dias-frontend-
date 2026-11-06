import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { FilaCompacta } from '../../../components/FilaCompacta';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { descartarInvitacionDelSobrenombre } from '../api/sobrenombreApi';
import type { useMiSobrenombre } from '../hooks/useMiSobrenombre';
import { TEXTOS_DEL_SOBRENOMBRE as T } from '../utils/reglasDelSobrenombre';
import { HojaDelSobrenombre } from './HojaDelSobrenombre';

/**
 * Spec 046 (D1, D2): la invitación de Hoy desde el día 7, «Elige cómo te verán en el Muro · Tu sobrenombre ›», con «Ahora no» (✕)
 * que no la vuelve a mostrar (después se elige solo desde Yo). Quien decide si se dibuja es Hoy (`muestraLaFilaEnHoy`), para no dejar
 * un hueco vacío.
 */
export function FilaDelSobrenombre({ sobrenombre }: { sobrenombre: ReturnType<typeof useMiSobrenombre> }) {
  const { c } = useTheme();
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const descartando = useRef(false);
  const { mio, actualizar } = sobrenombre;

  const ahoraNo = () => {
    if (descartando.current || !mio) return;
    descartando.current = true;
    // Se esconde en el acto; si el servidor no responde, vuelve la próxima vez que se lea.
    actualizar({ ...mio, invitacionDescartada: true });
    void descartarInvitacionDelSobrenombre()
      .then(actualizar)
      .catch(() => undefined)
      .finally(() => {
        descartando.current = false;
      });
  };

  return (
    <>
      <FilaCompacta
        icono="pencil"
        titulo={T.filaTitulo}
        linea={T.filaLinea}
        onPress={() => setHojaAbierta(true)}
        accessibilityLabel={`${T.filaTitulo}. ${T.filaLinea}`}
        accionDerecha={
          <Presionable
            onPress={ahoraNo}
            accessibilityRole="button"
            accessibilityLabel="Ahora no. Puedes elegirlo después desde Yo."
            contenedorStyle={estilos.area}
            style={estilos.ahoraNo}
          >
            <Icon name="close" size={TAMANO_ICONO.chico} color={c.textSoft} />
          </Presionable>
        }
      />
      <HojaDelSobrenombre visible={hojaAbierta} mio={mio} alCerrar={() => setHojaAbierta(false)} alGuardar={actualizar} />
    </>
  );
}

const estilos = StyleSheet.create({
  area: { width: 48, height: 48 },
  ahoraNo: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
