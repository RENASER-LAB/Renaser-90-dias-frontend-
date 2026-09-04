import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldCircle } from '../../../components/ui';
import { useAuth } from '../../auth/context/AuthContext';
import { RenasiaPanel } from '../screens/RenasiaPanel';
import { useChatDeCursoVisible } from '../state/chatDeCursoVisible';

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
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const hayChatDeCurso = useChatDeCursoVisible();

  if (!isAuthenticated) return null;
  // D-101: con un curso abierto, la entrada visible es la de Sparkie al pie del curso. Se esconde
  // el boton pero NO el panel: si la persona ya tenia abierto al acompanante, no se le cierra en
  // la cara.

  return (
    <>
      {/*
        Una sola vista absoluta del tamaño del botón, no una capa a pantalla completa: así no hay
        nada que pueda comerse los toques de la pantalla que esté debajo.
      */}
      {!hayChatDeCurso && (
        <View style={[styles.posicion, { bottom: insets.bottom + ALTO_TAB_BAR + SEPARACION }]}>
          <GoldCircle size={52} icon="chat" onPress={() => setVisible(true)} />
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

const styles = StyleSheet.create({
  posicion: { position: 'absolute', right: 18 },
});
