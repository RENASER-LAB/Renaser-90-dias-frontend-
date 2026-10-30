import { afterAll, describe, expect, it, jest } from '@jest/globals';
import { Animated } from 'react-native';

/**
 * Issue #52: una `Animated.timing` con `delay` y `useNativeDriver: true` deja un `setTimeout` real; si la prueba no la
 * detiene, sobrevive al archivo, se dispara dentro de OTRO archivo del mismo worker y rompe una prueba que no tiene nada
 * que ver («ReactNativePrivateInterface.getNativeTagFromPublicInstance is not a function»).
 *
 * `jest.setup.afterEnv.js` detiene al final de cada archivo lo que siga en marcha. Esta prueba deja a propósito una
 * animación con un retraso de un minuto sin detener y comprueba, en su propio `afterAll` (que corre DESPUÉS del de la
 * configuración: se registra más tarde), que la limpieza la alcanzó: `stop` avisa `{ finished: false }` a quien esperaba
 * el final. Sin la limpieza el aviso nunca llega y este archivo falla.
 */

const alTerminar = jest.fn<(resultado: { finished: boolean }) => void>();

describe('animaciones con retraso que quedan pendientes al terminar el archivo', () => {
  it('una animación con retraso largo y driver nativo queda sin terminar mientras el archivo corre', () => {
    const valor = new Animated.Value(0);
    Animated.timing(valor, { toValue: 1, duration: 260, delay: 60_000, useNativeDriver: true }).start(alTerminar);
    expect(alTerminar).not.toHaveBeenCalled();
  });
});

afterAll(() => {
  expect(alTerminar).toHaveBeenCalledTimes(1);
  expect(alTerminar).toHaveBeenCalledWith({ finished: false });
});
