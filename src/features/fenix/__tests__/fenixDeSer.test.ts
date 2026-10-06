/**
 * El fénix vivo del centro de Hoy: ánimo del semáforo propio (neutral para el staff), fase de la voz, saludo, toque,
 * asentir al cumplir UN hábito (nunca la celebración corta) y celebración de los hitos por su canal. El botón y el
 * panel de SER son foto fija: nunca montan Rive.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { act } from 'react-test-renderer';

import { avisarHabitoCumplido } from '../../habits/eventos/habitoCumplido';
import { semaforoVigente } from '../../semaforo/estado/useSemaforoVigente';
import { FenixDeSer, olvidarSaludoParaPruebas, type FenixDeSerHandle } from '../components/FenixDeSer';
import { FenixDeSerQuieto } from '../components/FenixDeSerQuieto';
import { celebradorDelCentro } from '../estado/celebracionEnElCentro';
import { PHOENIX_STATIC_IMAGES } from '../rive/PhoenixMascot';
import { PhoenixDirector } from '../rive/phoenixMaster';
import type { EstadoDeSer } from '../utils/conversacionDeSer';
import { crear, desmontarTodo, disparos, emitir, ultimaVistaRive, valoresDe, vistasRive } from './ayudasDePrueba';

const mockSesion = { rol: 'TRAINEE', reducido: false };
jest.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: mockSesion.rol } }) }));
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => ({ mode: 'light' }) }));
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => mockSesion.reducido,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function elemento(estado: EstadoDeSer, ref?: React.Ref<FenixDeSerHandle>) {
  return React.createElement(FenixDeSer, { ref, estado, size: 160, etiqueta: 'Fénix, tu acompañante' });
}

function montar(estado: EstadoDeSer = 'reposo', ref?: React.Ref<FenixDeSerHandle>) {
  const raiz = crear(elemento(estado, ref));
  const rive = ultimaVistaRive();
  act(() => emitir(vistasRive(raiz)[0], 'PHOENIX_READY'));
  return { raiz, rive };
}

beforeEach(() => olvidarSaludoParaPruebas());

afterEach(() => {
  desmontarTodo();
  mockSesion.rol = 'TRAINEE';
  mockSesion.reducido = false;
  act(() => semaforoVigente.reiniciar());
});

describe('ánimo y vida', () => {
  it('el aprendiz: el del semáforo vigente (ROJO → triste), con la vida autónoma encendida', () => {
    act(() => semaforoVigente.publicar('ROJO'));
    const { rive } = montar();
    expect(valoresDe(rive, 'mood')).toEqual([3]);
  });

  it('el staff (mentor): neutral aunque haya un color publicado', () => {
    mockSesion.rol = 'MENTOR';
    act(() => semaforoVigente.publicar('ROJO'));
    const { rive } = montar();
    expect(valoresDe(rive, 'mood')).not.toContain(3);
  });
});

describe('momentos', () => {
  it('saluda la primera vez en la sesión, no al volver a montarse', () => {
    const saludo = jest.spyOn(PhoenixDirector.prototype, 'react');
    montar();
    expect(saludo.mock.calls.map(c => c[0])).toEqual(['welcome']);
    desmontarTodo();
    montar();
    expect(saludo).toHaveBeenCalledTimes(1);
    saludo.mockRestore();
  });

  it('el toque dispara trgTap', () => {
    const ref = React.createRef<FenixDeSerHandle>();
    const { rive } = montar('reposo', ref);
    act(() => ref.current!.tocado());
    expect(disparos(rive)).toContain('trgTap');
  });

  it('UN hábito: asiente (cara contenta, parpadeo) y no dispara la celebración corta', () => {
    const { rive } = montar();
    act(() => avisarHabitoCumplido());
    expect(valoresDe(rive, 'emotion')).toContain(1);
    expect(disparos(rive)).toContain('trgBlink');
    expect(disparos(rive)).not.toContain('trgCelebrateShort');
    expect(disparos(rive)).not.toContain('trgSuccess');
  });

  it('los hitos se celebran en él: se anota como celebrador y dispara trgCelebrateShort', () => {
    const { rive } = montar();
    const celebrar = celebradorDelCentro();
    expect(celebrar).not.toBeNull();
    act(() => void celebrar!());
    expect(disparos(rive)).toContain('trgCelebrateShort');
    desmontarTodo();
    expect(celebradorDelCentro()).toBeNull();
  });

  it('con «reducir movimiento»: ni toque, ni asentir, ni celebrador', () => {
    mockSesion.reducido = true;
    const ref = React.createRef<FenixDeSerHandle>();
    const { rive } = montar('reposo', ref);
    rive.fireState.mockClear();
    act(() => {
      ref.current!.tocado();
      avisarHabitoCumplido();
    });
    expect(disparos(rive)).toEqual([]);
    expect(celebradorDelCentro()).toBeNull();
  });
});

describe('la voz', () => {
  it('pensando: cara de pensar y trgThinking; hablando: boca; al volver a reposo, boca cerrada', () => {
    const { raiz, rive } = montar();
    act(() => raiz.update(elemento('pensando')));
    expect(disparos(rive)).toContain('trgThinking');
    expect(valoresDe(rive, 'emotion')).toContain(4);
    act(() => raiz.update(elemento('hablando')));
    expect(valoresDe(rive, 'isTalking')).toContain(true);
    act(() => raiz.update(elemento('reposo')));
    expect(valoresDe(rive, 'isTalking').at(-1)).toBe(false);
  });
});

describe('el botón flotante y el panel de SER: foto fija', () => {
  const RAIZ = path.resolve(__dirname, '../../..');
  const leer = (r: string) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

  it('no montan el fénix vivo, solo la foto del ánimo', () => {
    for (const archivo of ['features/renasia/components/RenasiaLauncher.tsx', 'features/renasia/screens/RenasiaPanel.tsx']) {
      const fuente = leer(archivo);
      expect(fuente).not.toMatch(/<FenixDeSer[\s>]/);
      expect(fuente).not.toMatch(/<FenixVivo|<PhoenixMascot/);
      expect(fuente).toMatch(/<FenixDeSerQuieto /);
    }
  });

  it('la foto sigue al semáforo y no monta Rive', () => {
    act(() => semaforoVigente.publicar('AMARILLO'));
    const raiz = crear(React.createElement(FenixDeSerQuieto, { size: 64 }));
    expect(raiz.root.findAll(n => n.props.testID === 'fenix-de-ser-quieto')[0].props.source).toBe(PHOENIX_STATIC_IMAGES.serio);
    expect(raiz.root.findAll(n => n.props.testID === 'rive-del-fenix')).toHaveLength(0);
  });

  it('sin dato, neutral; y para el staff, neutral aunque haya color', () => {
    const foto = () =>
      crear(React.createElement(FenixDeSerQuieto, { size: 44 })).root.findAll(n => n.props.testID === 'fenix-de-ser-quieto')[0];
    expect(foto().props.source).toBe(PHOENIX_STATIC_IMAGES.neutral);
    mockSesion.rol = 'ADMIN';
    act(() => semaforoVigente.publicar('VERDE'));
    expect(foto().props.source).toBe(PHOENIX_STATIC_IMAGES.neutral);
  });
});
