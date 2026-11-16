/**
 * iPhone: la salud conectada es la app Salud de Apple, HealthKit (spec 037, D-310, FR-016). Es el único archivo de iOS que elige la
 * implementación: la librería nativa (`@kingstinct/react-native-healthkit`) solo la importa `saludDeApple.ts`, que Metro empaqueta
 * únicamente para iOS (el APK de Android no la lleva). Misma forma que `saludConectada.ts` (Android) y `saludConectada.web.ts`.
 */
export * from './saludDeApple';
