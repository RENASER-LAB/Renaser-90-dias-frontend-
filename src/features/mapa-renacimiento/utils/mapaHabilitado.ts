/**
 * Si el Mapa de Renacimiento está encendido en este build: siempre en desarrollo, y en un build publicado solo si
 * alguien lo encendió a propósito con `EXPO_PUBLIC_MAPA_DIA7=on` (`eas.json` lo trae en `preview` y `production`).
 *
 * Es la misma regla que ya usaba la tarjeta del Mapa en Hoy, ahora en un solo lugar: Plan la necesita para no
 * pedirle a nadie un Mapa que ese build no ofrece (2026-10-27, issue #37). Sin el Mapa a la vista, los objetivos de
 * Plan se comportan como siempre.
 *
 * Es una función y no una constante para que las pruebas puedan cambiar la variable de entorno; el valor se lee de
 * `process.env`, que Expo reemplaza al compilar.
 */
export function mapaHabilitado(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_MAPA_DIA7 === 'on';
}
