import { Platform } from "react-native";

/**
 * `expo-thinking-orbs` (MIT; Skia + Reanimated, sin código nativo propio) se carga opcional: si el
 * binario instalado no trae Skia o Reanimated, Hoy abre igual con el orbe simple. Mismo criterio
 * que la voz en `useDictado` ("Cannot find native module", 2026-09-23).
 *
 * En web no se carga nunca (E-255). Skia en web necesita CanvasKit (`LoadSkiaWeb`) antes de dibujar,
 * y la app no lo carga: el `require` funciona, pero Hoy queda en blanco al montar el orbe con
 * `TypeError: Cannot read properties of undefined (reading 'Paint')`. En web va el orbe simple.
 */
export function cargarOrbes(plataforma: string = Platform.OS): typeof import("expo-thinking-orbs") | null {
  if (plataforma === "web") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-thinking-orbs") as typeof import("expo-thinking-orbs");
  } catch {
    return null;
  }
}
