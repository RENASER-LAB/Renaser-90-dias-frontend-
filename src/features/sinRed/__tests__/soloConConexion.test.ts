/** Spec 048 (FR-005): sin señal, lo que necesita internet lo dice (sin hueco en blanco) y vuelve solo al volver la señal. */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import { ThemeProvider } from '../../../theme/ThemeContext';
import { SoloConConexion, TEXTO_NECESITAS_CONEXION } from '../components/SoloConConexion';
import { _reiniciarConexion, marcarConConexion, marcarSinConexion } from '../estadoDeConexion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const textos = (r: ReturnType<typeof TestRenderer.create>): string[] => JSON.stringify(r.toJSON()).match(/"[^"]*"/g)?.map(x => x.slice(1, -1)) ?? [];

beforeEach(() => _reiniciarConexion());

describe('SoloConConexion (spec 048)', () => {
  it('sin señal dice que necesita conexión, y con la señal vuelve a mostrar (y montar de nuevo) lo de adentro', async () => { // spec 048 FR-005
    let montajes = 0;
    function Contenido() {
      React.useEffect(() => {
        montajes++;
      }, []);
      return React.createElement(Text, null, 'Mensajes del chat');
    }
    let r!: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
      r = TestRenderer.create(React.createElement(ThemeProvider, null, React.createElement(SoloConConexion, null, React.createElement(Contenido))));
    });
    expect(textos(r)).toContain('Mensajes del chat');
    expect(textos(r)).not.toContain(TEXTO_NECESITAS_CONEXION);

    await act(async () => marcarSinConexion());
    expect(textos(r)).toContain(TEXTO_NECESITAS_CONEXION);
    expect(textos(r)).not.toContain('Mensajes del chat');

    await act(async () => marcarConConexion());
    expect(textos(r)).toContain('Mensajes del chat');
    expect(textos(r)).not.toContain(TEXTO_NECESITAS_CONEXION);
    expect(montajes).toBe(2);
  });
});
