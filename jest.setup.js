/**
 * Reanimated no se puede cargar en Jest: arranca `react-native-worklets`, que necesita el módulo
 * nativo y revienta con `Cannot read properties of undefined (reading 'loadUnpackers')`. Desde que
 * la barra de pestañas se esconde al desplazar (2026-10-02) Reanimated entra por `TabBar`, el botón
 * del acompañante y `navigation/barraAlDesplazar`, y con ellos en casi cualquier pantalla probada.
 *
 * Se usan los dobles oficiales de las dos librerías, con un arreglo: el `useSharedValue` del doble
 * de Reanimated crea un valor NUEVO en cada render (no lo guarda como un hook), así que un valor
 * cambiado se perdía al volver a dibujar y una prueba podía pasar por casualidad. Acá se guarda con
 * `useRef`, como se comporta el de verdad. `withTiming` llega al destino al instante.
 */
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => {
  const doble = require('react-native-reanimated/mock');
  const { useRef } = require('react');
  return {
    ...doble,
    // El doble oficial no trae `useReducedMotion` (lo deja como «ADD ME IF NEEDED»). Lo usan los
    // pasos del alta y el onboarding para elegir entre deslizar y fundir (2026-10-05): en las
    // pruebas, sin reducir.
    useReducedMotion: () => false,
    useSharedValue: inicial => {
      const ref = useRef(null);
      if (ref.current === null) ref.current = doble.useSharedValue(inicial);
      return ref.current;
    },
  };
});

/**
 * `rive-react-native` (el fénix vivo, 2026-10-06) es un componente nativo: en Jest no hay vista que lo dibuje. El doble
 * es una `View` que guarda sus props y expone los métodos del ref que usa el fénix (`fireState`, `setInputState`) como
 * `jest.fn`, para que una prueba pueda simular `PHOENIX_READY` llamando a `onRiveEventReceived`.
 */
jest.mock('rive-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  /** El ref de cada vista montada, en orden: la prueba mira qué disparos e inputs recibió. */
  const instancias = [];
  const Rive = React.forwardRef((props, ref) => {
    const handle = React.useRef(null);
    if (handle.current === null) {
      handle.current = { fireState: jest.fn(), setInputState: jest.fn() };
      instancias.push(handle.current);
    }
    React.useImperativeHandle(ref, () => handle.current, []);
    return React.createElement(View, { testID: 'rive-del-fenix', ...props });
  });
  return {
    __esModule: true,
    default: Rive,
    Fit: { Contain: 'contain' },
    Alignment: { Center: 'center' },
    __instancias: instancias,
  };
});
