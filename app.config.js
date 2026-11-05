/**
 * Configuración dinámica de Expo: parte de `app.json` (que sigue siendo la fuente de todo) y solo agrega lo que sale de variables de
 * entorno, para no versionar secretos en un repositorio público.
 *
 * Spec 042 (Kilómetros en vivo con GPS): la clave de Google Maps SDK for Android sale de la variable de EAS
 * `GOOGLE_MAPS_ANDROID_KEY` (restringida al paquete `com.renaser.app` y a las huellas SHA-1 de la llave de subida y la de firma de
 * Play). Sin la variable, el APK sale igual: el plugin de `react-native-maps` no escribe la clave y la app lo sabe por
 * `extra.mapaGoogle`, así la pantalla de la carrera dibuja un fondo neutro en vez de un mapa gris roto.
 */
module.exports = ({ config }) => {
  const clave = (process.env.GOOGLE_MAPS_ANDROID_KEY || '').trim();
  const plugins = [...(config.plugins || [])];
  plugins.push(['react-native-maps', clave ? { androidGoogleMapsApiKey: clave } : {}]);
  return {
    ...config,
    plugins,
    extra: { ...(config.extra || {}), mapaGoogle: clave.length > 0 },
  };
};
