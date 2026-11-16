import React from 'react';
import { Modal, type ModalProps } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * Un `Modal` de React Native con su propio `SafeAreaProvider` (#215, 2026-11-16).
 *
 * En iOS un `Modal` abre una ventana nativa aparte. El `SafeAreaProvider` de la raíz de la app no llega ahí, así que un
 * `SafeAreaView` adentro mide 0 de margen: la cabecera se mete debajo de la isla y el pie queda tapado por la barrita de
 * inicio. Lo pide la documentación de react-native-safe-area-context. En Android la ventana recibe los márgenes igual.
 *
 * Mismas props que `Modal`. Úsalo siempre que la ventana lleve `SafeAreaView` (`modalesConZonaSegura.test.ts` lo exige).
 */
export function ModalConZonaSegura({ children, ...props }: ModalProps) {
  // En la app siempre existe. Solo falta en las pruebas que simulan react-native-safe-area-context sin él (más de 100):
  // ahí se dibuja el contenido tal cual, que es lo que esas pruebas miran.
  const Proveedor = SafeAreaProvider ?? React.Fragment;
  return (
    <Modal {...props}>
      <Proveedor>{children}</Proveedor>
    </Modal>
  );
}
