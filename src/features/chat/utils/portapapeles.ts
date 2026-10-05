import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * «Copiar» del menú de un mensaje (2026-10-05), con `expo-clipboard`.
 *
 * **Por qué no se importa `expo-clipboard` arriba.** Trae código nativo y entró el 2026-10-05: el APK
 * instalado y el cliente de desarrollo del emulador no lo tienen, y la librería lo pide con
 * `requireNativeModule` al cargarse, que REVIENTA si falta. Importado arriba, abrir Comunidad en un
 * binario viejo tiraba la pantalla entera por una opción de un menú. Así, el módulo se carga recién
 * al copiar y, si falta, «Copiar» no se ofrece ({@link sePuedeCopiar}); en la web no hace falta nada
 * nativo (usa el portapapeles del navegador).
 */
type ModuloPortapapeles = { setStringAsync: (texto: string) => Promise<boolean> };

function cargarExpoClipboard(): ModuloPortapapeles {
  return require('expo-clipboard') as ModuloPortapapeles;
}

/** Si este binario puede copiar: la web siempre; Android e iOS, solo con el módulo nativo adentro. */
export function sePuedeCopiar(
  plataforma: string = Platform.OS,
  hayModulo: () => boolean = () => requireOptionalNativeModule('ExpoClipboard') != null,
): boolean {
  if (plataforma === 'web') return true;
  try {
    return hayModulo();
  } catch {
    return false;
  }
}

/** Copia el texto. `true` si quedó copiado; nunca lanza (un fallo se avisa, no rompe el chat). */
export async function copiarAlPortapapeles(
  texto: string,
  cargar: () => ModuloPortapapeles = cargarExpoClipboard,
): Promise<boolean> {
  try {
    await cargar().setStringAsync(texto);
    return true;
  } catch {
    return false;
  }
}
