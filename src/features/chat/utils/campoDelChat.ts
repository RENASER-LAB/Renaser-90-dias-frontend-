import { Platform } from 'react-native';

/**
 * El campo de escribir del chat en una sola línea mientras no se escriba más (rediseño de Comunidad,
 * 2026-10-05; revisión del coordinador: «la barra se ve alta, con «Mensaje» arriba y los íconos
 * abajo»).
 *
 * En la web, `react-native-web` dibuja un `TextInput` multilínea como un `<textarea>` y, sin `rows`,
 * el navegador le da DOS renglones: el campo medía ~72 px con el texto de ayuda pegado arriba y los
 * botones abajo. Con `rows: 1` mide lo mismo que en el teléfono (50 px) y el texto de ayuda queda a
 * la altura de los íconos. En la web el campo no crece al escribir varias líneas: se desplaza por
 * dentro, como antes (antes eran dos renglones fijos).
 *
 * En Android e iOS no se pasa nada: ahí el campo multilínea arranca en un renglón y crece solo hasta
 * el `maxHeight`. `rows` en Android fijaría la altura, que es justo lo que no se quiere.
 */
export function propsDelCampoDelChat(plataforma: string = Platform.OS): { rows?: number } {
  return plataforma === 'web' ? { rows: 1 } : {};
}
