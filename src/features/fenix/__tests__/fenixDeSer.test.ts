/**
 * El fénix de SER: ánimo del semáforo propio (neutral para el staff), estados de la conversación, y al cumplir UN
 * hábito solo asiente — nunca la celebración corta, que es de los hitos.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { avisarHabitoCumplido } from '../../habits/eventos/habitoCumplido';
import { semaforoVigente } from '../../semaforo/estado/useSemaforoVigente';
import { FenixDeSer } from '../components/FenixDeSer';
import { publicarEstadoDeSer } from '../estado/estadoDeSer';
import { crear, desmontarTodo, disparos, emitir, ultimaVistaRive, valoresDe, vistasRive } from './ayudasDePrueba';

const mockSesion = { rol: 'TRAINEE', reducido: false };
jest.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: mockSesion.rol } }) }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => ({ mode: 'light' }) }));
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => mockSesion.reducido,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function montar(lugar: 'boton' | 'panel') {
  const raiz = crear(React.createElement(FenixDeSer, { lugar, size: 64, etiqueta: 'Fénix de SER' }));
  const rive = ultimaVistaRive();
  act(() => emitir(vistasRive(raiz)[0], 'PHOENIX_READY'));
  return { raiz, rive };
}

afterEach(() => {
  desmontarTodo();
  mockSesion.rol = 'TRAINEE';
  mockSesion.reducido = false;
  act(() => {
    semaforoVigente.reiniciar();
    publicarEstadoDeSer('reposo');
  });
});

describe('ánimo del fénix de SER', () => {
  it('el aprendiz: el del semáforo vigente (ROJO → triste)', () => {
    act(() => semaforoVigente.publicar('ROJO'));
    const { raiz, rive } = montar('boton');
    expect(valoresDe(rive, 'mood')).toEqual([3]);
    act(() => raiz.unmount());
  });

  it('el staff (mentor): neutral aunque haya un color publicado', () => {
    mockSesion.rol = 'MENTOR';
    act(() => semaforoVigente.publicar('ROJO'));
    const { raiz, rive } = montar('boton');
    expect(valoresDe(rive, 'mood')).not.toContain(3);
    act(() => raiz.unmount());
  });
});

describe('al cumplir UN hábito', () => {
  it('el botón asiente (cara contenta, parpadeo) y no dispara la celebración corta', () => {
    const { raiz, rive } = montar('boton');
    act(() => avisarHabitoCumplido());
    expect(valoresDe(rive, 'emotion')).toContain(1);
    expect(disparos(rive)).toContain('trgBlink');
    expect(disparos(rive)).not.toContain('trgCelebrateShort');
    expect(disparos(rive)).not.toContain('trgSuccess');
    act(() => raiz.unmount());
  });

  it('con «reducir movimiento», nada', () => {
    mockSesion.reducido = true;
    const { raiz, rive } = montar('boton');
    rive.fireState.mockClear();
    act(() => avisarHabitoCumplido());
    expect(disparos(rive)).toEqual([]);
    act(() => raiz.unmount());
  });

  it('el fénix del panel no asiente (solo el del botón)', () => {
    const { raiz, rive } = montar('panel');
    rive.fireState.mockClear();
    act(() => avisarHabitoCumplido());
    expect(disparos(rive)).not.toContain('trgBlink');
    act(() => raiz.unmount());
  });
});

describe('la conversación', () => {
  it('pensando: cara de pensar y trgThinking; hablando: boca; al volver a reposo, cara neutral y boca cerrada', () => {
    const { raiz, rive } = montar('boton');
    act(() => publicarEstadoDeSer('pensando'));
    expect(disparos(rive)).toContain('trgThinking');
    expect(valoresDe(rive, 'emotion')).toContain(4);
    act(() => publicarEstadoDeSer('hablando'));
    expect(valoresDe(rive, 'isTalking')).toContain(true);
    act(() => publicarEstadoDeSer('reposo'));
    expect(valoresDe(rive, 'isTalking').at(-1)).toBe(false);
    act(() => raiz.unmount());
  });

  it('error: trgRetry', () => {
    const { raiz, rive } = montar('boton');
    act(() => publicarEstadoDeSer('error'));
    expect(disparos(rive)).toContain('trgRetry');
    act(() => raiz.unmount());
  });
});
