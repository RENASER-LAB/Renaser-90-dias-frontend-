/**
 * LA fuente de la app, en un solo archivo (2026-10-31, pedido del dueño: «una regla global, como un CSS global»).
 *
 * **Se pidió SF Pro, pero su licencia no permite usarla en Android, así que el dueño eligió Inter** (`@expo-google-fonts/inter`, de la
 * organización de Expo: `expo/google-fonts`, licencia MIT y OFL-1.1). Reemplaza a Jost (texto) y a Fraunces (display).
 *
 * ## La regla
 *
 * Ningún otro archivo de `src/` escribe el nombre de una fuente a mano. Todos piden un **rol**: `fuentes.regular`, `fuentes.media`,
 * `fuentes.seminegrita`, `fuentes.negrita` o `fuentes.display`; o usan los tokens `t.*` de `theme/tokens.ts`, que ya traen su rol.
 * Cambiar la fuente de toda la app es tocar **este archivo** (los cuatro nombres de abajo y los cuatro `require`) y nada más.
 * `theme/__tests__/fuenteUnica.test.ts` falla si alguien escribe `Inter_…`, `Jost_…` o `Fraunces_…` fuera de aquí.
 *
 * ## Qué trae Inter y qué no
 *
 * El paquete de Expo trae las 9 pesas estáticas con el **corte óptico de texto**; no trae «Inter Display» (el corte óptico más grande).
 * Por eso `display` apunta a la **Bold**, y los títulos grandes ganan el aire de display con el espaciado de letras negativo que ya
 * llevan `t.hero` y `t.screenTitle`. Si algún día se suma un corte Display, es cambiar `display` y su `require` acá.
 *
 * Se cargan solo las cuatro pesas que se usan (Regular, Medium, SemiBold, Bold): ~1,3 MB al APK, no las 18 del paquete.
 *
 * Cifras que cambian en pantalla: `fontVariant: ['tabular-nums']` (Inter las trae tabulares), igual que antes.
 */
export const fuentes = {
  /** Texto de lectura: párrafos, cláusulas, campos. */
  regular: 'Inter_400Regular',
  /** Etiquetas, botones, títulos de tarjeta chicos. */
  media: 'Inter_500Medium',
  /** Títulos de tarjeta (`t.cardTitle`). */
  seminegrita: 'Inter_600SemiBold',
  /** Énfasis: cifras, rótulos de sección, botones principales. */
  negrita: 'Inter_700Bold',
  /** Los títulos grandes de pantalla (`t.hero`, `t.screenTitle`). Inter no trae corte Display: la Bold. */
  display: 'Inter_700Bold',
} as const;

export type RolDeFuente = keyof typeof fuentes;

/**
 * Lo que `App.tsx` le pasa a `useFonts`: cada nombre de arriba con su archivo. Se importa archivo por archivo (no el índice del
 * paquete) para que Metro no empaquete las 18 pesas.
 */
export const FUENTES_A_CARGAR: Record<string, number> = {
  [fuentes.regular]: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  [fuentes.media]: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  [fuentes.seminegrita]: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  [fuentes.negrita]: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
};
