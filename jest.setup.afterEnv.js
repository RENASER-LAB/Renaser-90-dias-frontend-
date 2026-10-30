/**
 * Al terminar cada archivo de pruebas se detienen las animaciones de `Animated` que siguen en marcha (issue #52).
 *
 * El problema: una `Animated.timing` o `Animated.spring` con `delay` arma un `setTimeout` REAL (el de `Aparicion` con
 * `retardo={300}`, el de `PodioRanking`…) y, si la prueba no desmonta lo que dibujó, ese temporizador sobrevive al archivo.
 * Jest reutiliza el proceso (worker) para el archivo siguiente y, cuando el temporizador se dispara, el entorno de aquel
 * archivo ya fue desmontado: `start` entra a `__startAnimationIfNative`, que pide `getNativeTagFromPublicInstance` a un
 * registro de módulos ya liberado y revienta con «ReactNativePrivateInterface.getNativeTagFromPublicInstance is not a
 * function». El error cae dentro de la prueba que esté corriendo en ese momento, que no tiene nada que ver, y solo se ve
 * con la máquina cargada, cuando el archivo siguiente arranca antes de que venza el retraso.
 *
 * Se dejó así y no se forzó el driver de JS (`shouldUseNativeDriver` → `false`): probado, arregla este caso pero convierte
 * TODAS las animaciones de las pruebas en animaciones que de verdad corren (con `requestAnimationFrame`), llenando la salida
 * de avisos «not wrapped in act(...)» y cambiando lo que ven las demás pruebas mientras corren. Acá no cambia nada durante
 * un archivo: solo se limpia lo pendiente justo antes de que Jest lo dé por terminado.
 *
 * Vive en `setupFilesAfterEnv` porque `afterAll` no existe todavía cuando corren los `setupFiles` (`jest.setup.js`).
 *
 * Se engancha `Animation.start` —la clase base de `TimingAnimation`, `SpringAnimation` y `DecayAnimation`, que llaman a
 * `super.start`— mediante un doble de módulo con fábrica, que es perezosa: un archivo que nunca carga `Animated` no paga nada.
 * Es una ruta interna de React Native; si una versión la mueve, `jest.requireActual` falla a la vista en el primer archivo
 * que anime (no se queda sin proteger en silencio) y `animacionesPendientes.test.ts` lo frena.
 */

/** Las animaciones que arrancaron en este archivo (el registro de módulos es nuevo en cada archivo, así que el conjunto también). */
const mockAnimacionesArrancadas = new Set();

jest.mock('react-native/Libraries/Animated/animations/Animation', () => {
  const real = jest.requireActual('react-native/Libraries/Animated/animations/Animation');
  const Animation = real.default;
  const arrancar = Animation.prototype.start;
  Animation.prototype.start = function start(...args) {
    const resultado = arrancar.apply(this, args);
    mockAnimacionesArrancadas.add(this);
    return resultado;
  };
  return real;
});

afterAll(() => {
  for (const animacion of mockAnimacionesArrancadas) {
    if (animacion.__active !== true) continue;
    try {
      // `stop` cancela el temporizador del retraso y el cuadro pendiente, igual que el `return () => animacion.stop()` de un
      // componente al desmontarse, y avisa `{ finished: false }` a quien esperaba el final.
      animacion.stop();
    } catch {
      // Es el fin del archivo: una animación que no se deja detener no debe tumbar una suite que ya pasó.
    }
  }
  mockAnimacionesArrancadas.clear();
});
