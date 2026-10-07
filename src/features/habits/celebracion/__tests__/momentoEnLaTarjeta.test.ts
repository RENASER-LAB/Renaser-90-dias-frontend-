/**
 * Segunda vuelta del momento de cumplir un hábito (2026-10-07, el dueño: «No veo nada… lo quiero lo más fluido
 * posible»). En el emulador, tras tocar el check pasaban 1–2 s sin ningún cambio y después todo aparecía de golpe.
 * Estas pruebas fijan lo que corrige eso: el check responde en el mismo toque (antes de la respuesta), vuelve atrás si
 * el servidor falla, celebra UNA vez (check, brillo y tachado juntos), y con «reducir movimiento» solo hay fundidos.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { act } from 'react-test-renderer';

import { Presionable } from '../../../../components/Presionable';
import { crear, desmontarTodo } from '../../../fenix/__tests__/ayudasDePrueba';
import { avisarHabitoCumplido, tomarPuntosDe } from '../../eventos/habitoCumplido';
import { CheckDelHabito } from '../CheckDelHabito';
import {
  ALTURA_DEL_SALTO,
  ESCALA_APRETADO_DEL_CHECK,
  ESCALA_DEL_SALTO,
  ESCALA_REGISTRANDO,
  MOMENTO_MS,
  RELLENO_REGISTRANDO,
  SUBIDA_DE_LOS_PUNTOS,
  demoraDeLaCelebracion,
} from '../momentoDelHabito';
import {
  anunciarALaTarjeta,
  cerrarConRespuestaInmediata,
  escucharLaTarjeta,
  estaRegistrando,
  type EventoDeLaTarjeta,
} from '../momentoEnLaTarjeta';
import { BrilloDeLaTarjeta, TituloQueSeTacha } from '../TarjetaQueCelebra';

const mockSesion = { reducido: false };
/** Lo que se le pidió al hilo de la interfaz, en orden. */
const mockAnimaciones: { tipo: string; destino: number; demora?: number }[] = [];
jest.mock('../../../../theme/ThemeContext', () => ({
  useTheme: () => ({ mode: 'light', c: { gold: '#B2924F', onGold: '#1A1509', goldInk: '#7A5F28', cardBg: '#FFF' } }),
}));
jest.mock('react-native-reanimated', () => {
  const doble = require('react-native-reanimated/mock');
  const { useRef } = require('react');
  return {
    ...doble,
    useSharedValue: (inicial: number) => {
      const ref = useRef(null);
      if (ref.current === null) ref.current = doble.useSharedValue(inicial);
      return ref.current;
    },
    useReducedMotion: () => mockSesion.reducido,
    withSpring: (destino: number) => {
      mockAnimaciones.push({ tipo: 'spring', destino });
      return destino;
    },
    withTiming: (destino: number) => {
      mockAnimaciones.push({ tipo: 'timing', destino });
      return destino;
    },
    withRepeat: (animacion: number) => {
      mockAnimaciones.push({ tipo: 'repeat', destino: animacion });
      return animacion;
    },
    withDelay: (demora: number, animacion: number) => {
      mockAnimaciones.push({ tipo: 'delay', destino: animacion, demora });
      return animacion;
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const promesaQueNoVuelve = () => new Promise<never>(() => undefined);

beforeEach(() => {
  mockAnimaciones.length = 0;
});

afterEach(() => {
  desmontarTodo();
  mockSesion.reducido = false;
  tomarPuntosDe('r1');
  anunciarALaTarjeta('r1', { tipo: 'fallo' });
});

function check(cumplido: boolean) {
  return React.createElement(CheckDelHabito, { registroId: 'r1', cumplido });
}

function eventos(): EventoDeLaTarjeta[] {
  const vistos: EventoDeLaTarjeta[] = [];
  escucharLaTarjeta('r1', e => vistos.push(e));
  return vistos;
}

describe('respuesta inmediata al tocar (antes de que conteste el servidor)', () => {
  it('el check empieza a llenarse en el mismo toque, sin esperar la respuesta', () => {
    crear(check(false));
    act(() => void cerrarConRespuestaInmediata('r1', promesaQueNoVuelve));
    expect(estaRegistrando('r1')).toBe(true);
    expect(mockAnimaciones).toContainEqual({ tipo: 'timing', destino: RELLENO_REGISTRANDO });
    expect(mockAnimaciones).toContainEqual({ tipo: 'timing', destino: ESCALA_REGISTRANDO });
    // Respira mientras espera: un ciclo que se repite, no un spinner.
    expect(mockAnimaciones.some(a => a.tipo === 'repeat')).toBe(true);
  });

  it('el check se hunde a 0.92 al apoyar el dedo, y Training se lo pide al check', () => {
    expect(ESCALA_APRETADO_DEL_CHECK).toBe(0.92);
    const raiz = crear(
      React.createElement(Presionable, { escalaAlApretar: ESCALA_APRETADO_DEL_CHECK, onPress: () => undefined, children: null }),
    );
    const pressable = raiz.root.findAll(n => typeof n.props.onPressIn === 'function')[0];
    act(() => pressable.props.onPressIn({}));
    expect(mockAnimaciones).toContainEqual({ tipo: 'timing', destino: 0.92 });
    const training = fs.readFileSync(path.join(__dirname, '../../../../screens/TrainingScreen.tsx'), 'utf8');
    expect(training).toMatch(/escalaAlApretar=\{ESCALA_APRETADO_DEL_CHECK\}/);
  });

  it('los cierres directos de Training avisan a la tarjeta ANTES de esperar al servidor', () => {
    const training = fs.readFileSync(path.join(__dirname, '../../../../screens/TrainingScreen.tsx'), 'utf8');
    for (const funcion of ['registrarSoloHora', 'completarHabitoSimple']) {
      const cuerpo = training.split(`const ${funcion} = async`)[1].split('\n  };')[0];
      expect(cuerpo).toMatch(/await cerrarConRespuestaInmediata\(habit\.id, \(\) => cerrarUnaVez\(habit\.id\)\)/);
    }
  });
});

describe('si el servidor falla', () => {
  it('el check vuelve atrás (vacío y a su tamaño) y el error sigue hasta la pantalla', async () => {
    crear(check(false));
    const vistos = eventos();
    act(() => void cerrarConRespuestaInmediata('r1', promesaQueNoVuelve));
    mockAnimaciones.length = 0;
    await act(async () => {
      await expect(cerrarConRespuestaInmediata('r1', () => Promise.reject(new Error('409')))).rejects.toThrow('409');
    });
    expect(vistos.map(e => e.tipo)).toEqual(['registrando', 'registrando', 'fallo']);
    expect(estaRegistrando('r1')).toBe(false);
    expect(mockAnimaciones).toContainEqual({ tipo: 'timing', destino: 0 });
    expect(mockAnimaciones).toContainEqual({ tipo: 'timing', destino: 1 });
    expect(mockAnimaciones.some(a => a.tipo === 'spring')).toBe(false);
  });

  it('si sale bien no anuncia nada: celebra la tarjeta cuando pasa a cumplida', async () => {
    const vistos = eventos();
    await cerrarConRespuestaInmediata('r1', () => Promise.resolve('ok'));
    expect(vistos.map(e => e.tipo)).toEqual(['registrando']);
  });
});

describe('una sola celebración', () => {
  it('tocar → confirmar: «+10 pts» una vez, sin demora, y un solo aviso para el brillo y el tachado', () => {
    const raiz = crear(check(false));
    const vistos = eventos();
    act(() => void cerrarConRespuestaInmediata('r1', promesaQueNoVuelve));
    act(() => avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 }));
    act(() => raiz.update(check(true)));
    act(() => raiz.update(check(true)));
    expect(vistos.filter(e => e.tipo === 'celebrar')).toEqual([{ tipo: 'celebrar', demoraMs: 0 }]);
    const textos = raiz.root.findAll(n => n.props.testID === 'check-del-habito-puntos' && typeof n.type !== 'string');
    expect(textos).toHaveLength(1);
    // Ya no está «registrando»: un cierre que llegue después no arranca a medio llenar.
    expect(estaRegistrando('r1')).toBe(false);
  });

  it('el pop de la confirmación sale desde el medio llenado (no vuelve a 0.8) y rebota con resorte', () => {
    const raiz = crear(check(false));
    act(() => void cerrarConRespuestaInmediata('r1', promesaQueNoVuelve));
    mockAnimaciones.length = 0;
    act(() => raiz.update(check(true)));
    expect(mockAnimaciones).toContainEqual({ tipo: 'timing', destino: 1.15 });
    expect(mockAnimaciones).toContainEqual({ tipo: 'spring', destino: 1 });
    expect(mockAnimaciones).not.toContainEqual({ tipo: 'timing', destino: 0.8 });
  });

  it('desde una hoja (sin toque previo en el check), la celebración espera a que la hoja se vaya', () => {
    const raiz = crear(check(false));
    const vistos = eventos();
    act(() => raiz.update(check(true)));
    expect(vistos).toEqual([{ tipo: 'celebrar', demoraMs: MOMENTO_MS.esperaHoja }]);
    expect(demoraDeLaCelebracion(true)).toBe(0);
    expect(MOMENTO_MS.esperaHoja).toBeGreaterThanOrEqual(200);
  });

  it('el brillo del borde y el tachado arrancan con ese aviso, con su demora', () => {
    crear(React.createElement(BrilloDeLaTarjeta, { registroId: 'r1', color: '#B2924F', radio: 14 }));
    crear(
      React.createElement(TituloQueSeTacha, {
        registroId: 'r1',
        texto: 'AGUA TIBIA CON LIMÓN',
        cumplido: false,
        style: {},
        colorDeLaRaya: '#000',
      }),
    );
    act(() => anunciarALaTarjeta('r1', { tipo: 'celebrar', demoraMs: 220 }));
    expect(mockAnimaciones.filter(a => a.tipo === 'delay').map(a => a.demora)).toEqual([220, 220]);
  });
});

describe('se ve: tamaños y recorridos', () => {
  it('el «+N pts» se lee: 16 px, dorado, sube ~32 px en ~800 ms', () => {
    const raiz = crear(check(false));
    act(() => avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 }));
    act(() => raiz.update(check(true)));
    const texto = raiz.root.findAll(n => n.props.children === '+10 pts' && typeof n.type !== 'string')[0];
    const estilo = Object.assign({}, ...[texto.props.style].flat(2));
    expect(estilo.fontSize).toBeGreaterThanOrEqual(15);
    expect(estilo.fontSize).toBeLessThanOrEqual(17);
    expect(estilo.color).toBe('#7A5F28');
    expect(SUBIDA_DE_LOS_PUNTOS).toBeGreaterThanOrEqual(28);
    expect(SUBIDA_DE_LOS_PUNTOS).toBeLessThanOrEqual(36);
    expect(mockAnimaciones).toContainEqual({ tipo: 'timing', destino: -SUBIDA_DE_LOS_PUNTOS });
    expect(MOMENTO_MS.puntos).toBeGreaterThanOrEqual(650);
  });

  it('el saltito del fénix se nota: sube 10–12 px y crece ~1.1', () => {
    expect(ALTURA_DEL_SALTO).toBeGreaterThanOrEqual(10);
    expect(ALTURA_DEL_SALTO).toBeLessThanOrEqual(12);
    expect(ESCALA_DEL_SALTO).toBeCloseTo(1.1);
  });
});

describe('con «reducir movimiento»: solo fundidos', () => {
  it('al tocar: el check se llena a medias por opacidad, sin escala ni respiración', () => {
    mockSesion.reducido = true;
    crear(check(false));
    act(() => void cerrarConRespuestaInmediata('r1', promesaQueNoVuelve));
    expect(mockAnimaciones).toContainEqual({ tipo: 'timing', destino: RELLENO_REGISTRANDO });
    expect(mockAnimaciones).not.toContainEqual({ tipo: 'timing', destino: ESCALA_REGISTRANDO });
    expect(mockAnimaciones.some(a => a.tipo === 'repeat')).toBe(false);
  });

  it('al confirmar: sin pop, sin resorte y sin subida de los puntos', () => {
    mockSesion.reducido = true;
    const raiz = crear(check(false));
    act(() => void cerrarConRespuestaInmediata('r1', promesaQueNoVuelve));
    act(() => avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 }));
    act(() => raiz.update(check(true)));
    expect(mockAnimaciones.some(a => a.tipo === 'spring')).toBe(false);
    expect(mockAnimaciones).not.toContainEqual({ tipo: 'timing', destino: 1.15 });
    expect(mockAnimaciones).not.toContainEqual({ tipo: 'timing', destino: -SUBIDA_DE_LOS_PUNTOS });
  });
});
