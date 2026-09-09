import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldCircle } from '../../../components/ui';
import { useAuth } from '../../auth/context/AuthContext';
import { RenasiaPanel } from '../screens/RenasiaPanel';
import { useHayChatEnPantalla } from '../state/chatEnPantalla';

/**
 * Botón flotante que abre al ACOMPAÑANTE de los 90 días (`agent: 'COMPANION'`, D-102), más el
 * panel que abre. Sparkie, el tutor de cursos, NO entra por acá: su entrada es `ChatDelCurso`, al
 * pie del curso y de la lección.
 *
 * <p>Vive acá y no dentro de una pantalla de tab a propósito. `AGENTS.md` prohíbe alterar las
 * cinco pantallas principales, y además el acompañante tiene que poder abrirse desde cualquiera
 * de ellas, no solo desde una. Montándolo una vez por encima del navegador, se cumplen las dos
 * cosas y ninguna pantalla existente cambia una línea.
 *
 * <p>Solo aparece con sesión iniciada: en el login y durante el onboarding no tiene sentido, y
 * además el backend rechaza las rutas de `/renasia` sin sesión real.
 *
 * <p>Todo el estilo sale de los tokens del tema y de `GoldCircle`, el mismo componente que ya usa
 * el resto de la app. No hay un solo color ni medida inventada acá.
 */
export function RenasiaLauncher() {
  const { isAuthenticated, isOnboardingCompleted } = useAuth();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const hayChatEnPantalla = useHayChatEnPantalla();

  // El javadoc de esta clase ya decia "en el login y durante el onboarding no tiene sentido",
  // pero solo estaba implementada la mitad del login: durante la ficha inicial la sesion YA esta
  // iniciada, asi que `isAuthenticated` es true y el flotante aparecia encima del formulario
  // (2026-09-06, reportado por el dueno del proyecto).
  //
  // `isOnboardingCompleted` arranca en false y solo pasa a true con una respuesta confirmada del
  // servidor, asi que sirve tal cual: mientras no se sepa, el boton no esta. Preferir eso al
  // orden inverso — un flotante que aparece y desaparece al resolverse la consulta se ve roto.
  if (!isAuthenticated || !isOnboardingCompleted) return null;
  // D-101: con un chat abierto —el de un curso, o una conversacion de Comunidad— el flotante se
  // esconde. En el curso porque la entrada que corresponde es la de Sparkie; en Comunidad porque
  // se monta justo encima de la barra de escribir y tapa el boton de enviar, y porque una burbuja
  // de IA flotando sobre una conversacion entre personas no tiene por que estar ahi.
  // Se esconde el boton pero NO el panel: si la persona ya tenia abierto al acompanante, no se le
  // cierra en la cara.

  return (
    <>
      {/*
        Una sola vista absoluta del tamaño del botón, no una capa a pantalla completa: así no hay
        nada que pueda comerse los toques de la pantalla que esté debajo.
      */}
      {!hayChatEnPantalla && (
        <View style={[styles.posicion, { bottom: insets.bottom + ALTO_TAB_BAR + SEPARACION }]}>
          <GoldCircle size={DIAMETRO} icon="chat" onPress={() => setVisible(true)} />
        </View>
      )}

      <RenasiaPanel agent="COMPANION" visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

/**
 * Alto aproximado de `TabBar` sin contar el área segura, que se suma aparte. Si algún día la barra
 * cambia de alto, este número es lo único que hay que mover para que el botón no se le monte.
 */
const ALTO_TAB_BAR = 62;
const SEPARACION = 16;
const DIAMETRO = 52;

/**
 * Hueco que cada pantalla con scroll debe dejar al final de su contenido para que este boton
 * flotante no tape la ultima tarjeta ni, peor, un control pulsable (pasaba con "Compartir" en
 * el Muro). Se exporta desde aqui para que el dia que el boton cambie de tamano o de
 * separacion no haya que perseguir el numero por cinco pantallas.
 *
 * Cubre el minimo de 36 que pide AGENTS.md 2 con holgura.
 */
export const ESPACIO_PARA_LANZADOR = DIAMETRO + SEPARACION + 20;

const styles = StyleSheet.create({
  posicion: { position: 'absolute', right: 18 },
});
