/**
 * El momento de cumplir UN hábito (pedido del dueño, 2026-10-07): qué dispara cada cosa. El check se llena de dorado
 * con un rebote (nunca desde 0) y sube el «+N» del SERVIDOR («Registrado» con 0); el fénix del botón de SER da un
 * saltito sin montar Rive; con «reducir movimiento», solo check y puntos; la vibración la da la pantalla que cerró, una
 * vez; y nada de esto toca la celebración del día (una por día, la que ya existía).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { act } from 'react-test-renderer';

import { FenixDeSerQueSalta } from '../../../fenix/components/FenixDeSerQueSalta';
import { anotarCelebrador } from '../../../fenix/estado/celebracionEnElCentro';
import { crear, desmontarTodo } from '../../../fenix/__tests__/ayudasDePrueba';
import { completarRegistro } from '../../api/evidenciaHabitoApi';
import { alCumplirUnHabito, avisarHabitoCumplido, tomarPuntosDe } from '../../eventos/habitoCumplido';
import { CheckDelHabito } from '../CheckDelHabito';
import {
  ESCALA_INICIAL_DEL_CHECK,
  fenixSalta,
  planDelMomento,
  seCumplioRecien,
  textoDePuntos,
} from '../momentoDelHabito';

const mockSesion = { reducido: false };
/** Lo que se le pidió al hilo de la interfaz: cada `withSpring`/`withTiming` con su destino. */
const mockAnimaciones: { tipo: string; destino: number }[] = [];
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'TRAINEE' } }) }));
jest.mock('../../../../theme/ThemeContext', () => ({
  useTheme: () => ({ mode: 'light', c: { gold: '#B2924F', onGold: '#1A1509', goldInk: '#7A5F28' } }),
}));
jest.mock('react-native-reanimated', () => {
  // El doble oficial, con el `useSharedValue` que guarda su valor entre renders (como en jest.setup.js).
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
  };
});
const mockApiFetch = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  mockAnimaciones.length = 0;
});

afterEach(() => {
  desmontarTodo();
  mockSesion.reducido = false;
  tomarPuntosDe('r1');
});

describe('la decisión', () => {
  it('los puntos: el número del servidor; con 0 o sin dato no sale número, sale «Registrado»', () => {
    expect(textoDePuntos(10)).toBe('+10 pts');
    expect(textoDePuntos(0)).toBe('Registrado');
    expect(textoDePuntos(null)).toBe('Registrado');
    expect(textoDePuntos(undefined)).toBe('Registrado');
  });

  it('con movimiento: el check rebota y los puntos suben', () => {
    expect(planDelMomento(10, false)).toEqual({ check: 'rebote', puntos: '+10 pts', puntosSuben: true });
  });

  it('con «reducir movimiento»: solo check y puntos, sin rebote ni subida ni salto del fénix', () => {
    expect(planDelMomento(10, true)).toEqual({ check: 'fundido', puntos: '+10 pts', puntosSuben: false });
    expect(fenixSalta(true)).toBe(false);
    expect(fenixSalta(false)).toBe(true);
  });

  it('se juega solo al PASAR a cumplido: no al montarse cumplido ni con el cambio de día', () => {
    expect(seCumplioRecien(false, true)).toBe(true);
    expect(seCumplioRecien(true, true)).toBe(false);
    expect(seCumplioRecien(true, false)).toBe(false);
    expect(seCumplioRecien(false, false)).toBe(false);
  });

  it('el rebote nunca arranca desde la nada', () => {
    expect(ESCALA_INICIAL_DEL_CHECK).toBeGreaterThanOrEqual(0.8);
  });
});

describe('el aviso lleva el registro y los puntos del servidor', () => {
  it('completarRegistro avisa con el registro cerrado y los puntos que devolvió el servidor', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'r1', estado: 'COMPLETADO', puntosOtorgados: 15, respuestaTexto: null, completadoEn: null });
    const oyente = jest.fn();
    const quitar = alCumplirUnHabito(oyente);
    await completarRegistro('r1');
    expect(oyente).toHaveBeenCalledWith({ registroId: 'r1', puntosOtorgados: 15 });
    quitar();
  });

  it('los puntos se toman UNA vez: un check que se vuelve a dibujar no repite el «+N»', () => {
    avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 });
    expect(tomarPuntosDe('r1')).toBe(10);
    expect(tomarPuntosDe('r1')).toBeNull();
  });
});

function check(cumplido: boolean) {
  return React.createElement(CheckDelHabito, { registroId: 'r1', cumplido });
}

function textoDeLosPuntos(raiz: ReturnType<typeof crear>): string | null {
  const capa = raiz.root.findAll(n => n.props.testID === 'check-del-habito-puntos' && typeof n.type !== 'string');
  if (capa.length === 0) return null;
  return capa[0].findAll(n => typeof n.props.children === 'string')[0].props.children as string;
}

describe('el check de la tarjeta', () => {
  it('al cumplirse desde una hoja: el disco se llena, rebota con resorte desde 0.8 y sube «+10 pts»', () => {
    const raiz = crear(check(false));
    act(() => avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 }));
    act(() => raiz.update(check(true)));
    expect(textoDeLosPuntos(raiz)).toBe('+10 pts');
    expect(mockAnimaciones).toContainEqual({ tipo: 'timing', destino: ESCALA_INICIAL_DEL_CHECK });
    expect(mockAnimaciones).toContainEqual({ tipo: 'spring', destino: 1 });
    expect(mockAnimaciones.some(a => a.destino === 0 && a.tipo === 'spring')).toBe(false);
  });

  it('con 0 puntos no sale número: «Registrado»', () => {
    const raiz = crear(check(false));
    act(() => avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 0 }));
    act(() => raiz.update(check(true)));
    expect(textoDeLosPuntos(raiz)).toBe('Registrado');
  });

  it('montarse ya cumplido (abrir Training con el hábito hecho) no celebra', () => {
    const raiz = crear(check(true));
    expect(textoDeLosPuntos(raiz)).toBeNull();
    expect(mockAnimaciones.filter(a => a.tipo === 'spring')).toEqual([]);
  });

  it('con «reducir movimiento»: check y puntos, sin rebote', () => {
    mockSesion.reducido = true;
    const raiz = crear(check(false));
    act(() => avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 }));
    act(() => raiz.update(check(true)));
    expect(textoDeLosPuntos(raiz)).toBe('+10 pts');
    expect(mockAnimaciones.filter(a => a.tipo === 'spring')).toEqual([]);
    expect(mockAnimaciones).not.toContainEqual({ tipo: 'timing', destino: ESCALA_INICIAL_DEL_CHECK });
  });
});

function fenix() {
  return React.createElement(FenixDeSerQueSalta, { size: 64 });
}

describe('el fénix del botón de SER', () => {
  it('es la foto fija: nunca monta Rive', () => {
    const raiz = crear(fenix());
    act(() => avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 }));
    expect(raiz.root.findAll(n => n.props.testID === 'rive-del-fenix')).toEqual([]);
    expect(raiz.root.findAll(n => n.props.testID === 'fenix-de-ser-quieto').length).toBeGreaterThan(0);
  });

  it('al cumplirse un hábito da un saltito y vuelve a su lugar con un resorte', () => {
    crear(fenix());
    expect(mockAnimaciones).toEqual([]);
    act(() => avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 }));
    expect(mockAnimaciones).toContainEqual({ tipo: 'spring', destino: 0 });
    expect(mockAnimaciones).toContainEqual({ tipo: 'spring', destino: 1 });
  });

  it('con «reducir movimiento», quieto', () => {
    mockSesion.reducido = true;
    crear(fenix());
    act(() => avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 }));
    expect(mockAnimaciones).toEqual([]);
  });

  it('el botón flotante lleva el fénix que salta', () => {
    const fuente = fs.readFileSync(path.join(__dirname, '../../../renasia/components/RenasiaLauncher.tsx'), 'utf8');
    expect(fuente).toMatch(/<FenixDeSerQueSalta size=\{TAMANO_FENIX\}/);
  });
});

describe('la celebración del día no se duplica', () => {
  it('cumplir un hábito (check y fénix del botón) nunca pide la celebración corta', () => {
    const celebrar = jest.fn(() => Promise.resolve());
    const quitar = anotarCelebrador(celebrar);
    const raiz = crear(check(false));
    crear(fenix());
    act(() => avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 }));
    act(() => raiz.update(check(true)));
    expect(celebrar).not.toHaveBeenCalled();
    quitar();
  });

  it('nada del momento lee ni anota la celebración del día', () => {
    for (const archivo of ['../CheckDelHabito.tsx', '../momentoDelHabito.ts', '../../../fenix/components/FenixDeSerQueSalta.tsx']) {
      // Sin comentarios: la documentación puede nombrar la celebración para decir que no la toca.
      const codigo = fs
        .readFileSync(path.join(__dirname, archivo), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(codigo).not.toMatch(/celebradorDelCentro|tomarCelebracionDeHoy|celebrateShort|anotarCelebrador/);
    }
  });
});

describe('la vibración: una vez por cierre', () => {
  const leer = (relativo: string) => fs.readFileSync(path.join(__dirname, relativo), 'utf8');

  it('el check y el fénix no vibran: la vibración es de la pantalla que cerró (si no, serían dos)', () => {
    expect(leer('../CheckDelHabito.tsx')).not.toMatch(/tacto|Haptics/);
    expect(leer('../../../fenix/components/FenixDeSerQueSalta.tsx')).not.toMatch(/tacto|Haptics/);
  });

  it('los cierres directos de Training (sin `confirmar`) vibran con el logro una vez', () => {
    const training = leer('../../../../screens/TrainingScreen.tsx');
    for (const funcion of ['registrarSoloHora', 'completarHabitoSimple']) {
      const cuerpo = training.split(`const ${funcion} = async`)[1].split('\n  };')[0];
      expect(cuerpo.match(/tacto\.logro\(\)/g)).toHaveLength(1);
      expect(cuerpo).not.toMatch(/confirmar\(/);
    }
  });

  it('el registro con foto desde Hoy y desde el panel de SER vibra con el logro una vez', () => {
    for (const archivo of ['../../../../screens/HoyScreen.tsx', '../../../renasia/screens/RenasiaPanel.tsx']) {
      const cuerpo = leer(archivo).split('useRegistroConFoto({')[1].split('});')[0];
      expect(cuerpo.match(/tacto\.logro\(\)/g)).toHaveLength(1);
    }
  });
});
