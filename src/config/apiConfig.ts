/**
 * Configuración segura de APIs y servicios externos
 * Las variables con prefijo EXPO_PUBLIC_ se inyectan automáticamente desde el archivo .env
 */
export const API_CONFIG = {
  GOOGLE_PLACES_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '',
};
