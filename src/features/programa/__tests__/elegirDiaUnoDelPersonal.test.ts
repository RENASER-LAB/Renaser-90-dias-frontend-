/**
 * «Elegir mi Día 1» para el personal (D-260, captura del dueño del 2026-10-07 con una cuenta ADMIN:
 * Training decía «Todavía no elegiste tu Día 1» y no había dónde elegirlo).
 *
 * Se prueba por rol —los cuatro del personal, con los dos nombres que la app recibe para el líder
 * de mentores y el alquimista— y por caso:
 *  - fila sin activar → «Elegir mi Día 1» abre el MISMO selector del onboarding y manda la fecha
 *    al MISMO `POST /onboarding/activate-program`;
 *  - sin fila → la invitación «Hacer mi programa de 90 días»;
 *  - «Ahora no» → Hoy deja de ofrecerla, Yo la sigue ofreciendo.
 *
 * Contra el código anterior falla: no existía ninguna entrada al selector fuera del onboarding, la
 * tarjeta de Training no tenía botón, Yo no ofrecía nada y, sin fila, Training mostraba el error con
 * el uuid.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Modal, Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

const mockConsultarActivacion = jest.fn<() => Promise<unknown>>();
const mockActivarPrograma = jest.fn<(input: { startDate: string }) => Promise<unknown>>();
const mockCapacidades = jest.fn<() => Promise<unknown>>();
const mockActivarPersonal = jest.fn<() => Promise<void>>();

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../utils/tacto', () => ({
  tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined, toque: () => undefined },
}));
jest.mock('../../../services/http/apiClient', () => ({
  mensajeDeError: (_e: unknown, porDefecto: string) => porDefecto,
}));
jest.mock('../../onboarding/api/onboardingApi', () => ({
  consultarActivacionPrograma: () => mockConsultarActivacion(),
  activarPrograma: (input: { startDate: string }) => mockActivarPrograma(input),
}));
jest.mock('../../mentor/api/mentorApi', () => ({
  capacidadesDePrograma: () => mockCapacidades(),
  activarProgramaPersonal: () => mockActivarPersonal(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EntradaAlProgramaPropio } from '../components/EntradaAlProgramaPropio';
import { entradaAlProgramaPropio } from '../utils/entradaAlProgramaPropio';
import { ROL_MENTOR } from '../../mentor/types/mentor.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** El rol como llega en `/auth/me` (dos idiomas) y si el servidor lo deja administrar. */
const PERSONAL: Array<{ rol: string; administra: boolean }> = [
  { rol: 'MENTOR', administra: false },
  { rol: 'MENTOR_LEAD', administra: false },
  { rol: 'LIDER_MENTORES', administra: false },
  { rol: 'ADMIN', administra: true },
  { rol: 'ALCHEMIST', administra: true },
  { rol: 'ALQUIMISTA', administra: true },
];

const FECHAS = ['2026-10-08', '2026-10-09', '2026-10-10'];
const USUARIO = 'usuario-1';

let raiz: ReactTestRenderer | null = null;

beforeEach(async () => {
  await AsyncStorage.clear();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

/** Monta la entrada como la monta Hoy (o Yo) para ese rol, y espera a que respondan los pedidos. */
async function montar(lugar: 'hoy' | 'yo', persona: { rol: string; administra: boolean }, puedeEmpezar: boolean, inscrito: boolean) {
  const capacidades = { programRequired: false, canStartProgram: puedeEmpezar, canAccompany: false, canAdminister: persona.administra };
  mockCapacidades.mockResolvedValue(capacidades);
  // El mismo `activo` que calculan las pantallas: Hoy con el rol (dos idiomas) o las capacidades; Yo, con la capacidad.
  const esMentor = (ROL_MENTOR as readonly string[]).includes(persona.rol);
  const activo = lugar === 'hoy' ? esMentor || capacidades.canAdminister || capacidades.canStartProgram : capacidades.canStartProgram;
  await act(async () => {
    raiz = TestRenderer.create(
      React.createElement(EntradaAlProgramaPropio, { lugar, activo, usuarioId: USUARIO, inscrito, diaPrograma: 0 }),
    );
  });
  // Capacidades, AsyncStorage (import dinámico) y la consulta del Día 1: varias vueltas de promesas.
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await new Promise(resolver => setTimeout(resolver, 0));
    });
  }
  return raiz!;
}

const decir = (n: ReactTestInstance) => [n.props.children].flat().join('');
const textos = (r: ReactTestRenderer): string[] => r.root.findAll(n => n.type === Text).map(decir);
const modal = (r: ReactTestRenderer) => r.root.findAll(n => n.type === Modal)[0];

/** Toca lo que dice `texto`: el tocable más profundo que lo contiene. */
async function tocar(r: ReactTestRenderer, texto: string) {
  const tocables = r.root.findAll(
    n => typeof n.props?.onPress === 'function' && n.findAll(m => m.type === Text && decir(m) === texto).length > 0,
  );
  const tocable = tocables[tocables.length - 1];
  if (!tocable) throw new Error(`No está «${texto}» en pantalla: ${textos(r).join(' | ')}`);
  await act(async () => {
    await tocable.props.onPress();
  });
  // Lo que el toque dispara sin esperarlo («Ahora no» guarda en AsyncStorage con un import dinámico).
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await new Promise(resolver => setTimeout(resolver, 0));
    });
  }
}

describe('entradaAlProgramaPropio (pura)', () => {
  it('fila sin Día 1 → elegir; sin fila → empezar; nada que hacer → nada', () => {
    expect(entradaAlProgramaPropio({ diaUnoPorElegir: true, puedeEmpezar: false })).toBe('ELEGIR_DIA_UNO');
    expect(entradaAlProgramaPropio({ diaUnoPorElegir: false, puedeEmpezar: true })).toBe('EMPEZAR');
    expect(entradaAlProgramaPropio({ diaUnoPorElegir: false, puedeEmpezar: false })).toBeNull();
  });
});

describe.each(PERSONAL)('$rol', persona => {
  it.each(['hoy', 'yo'] as const)('con la fila sin activar, en %s: «Elegir mi Día 1» abre el selector y elige', async lugar => {
    mockConsultarActivacion.mockResolvedValue({ activated: false, validStartDates: FECHAS, startDate: null });
    mockActivarPrograma.mockResolvedValue({});
    const r = await montar(lugar, persona, false, true);

    expect(textos(r)).toContain('Todavía no elegiste tu Día 1');
    expect(modal(r).props.visible).toBe(false);

    await tocar(r, 'Elegir mi Día 1');
    expect(modal(r).props.visible).toBe(true);
    // El selector del onboarding, con las fechas del servidor y el texto de siempre.
    expect(textos(r)).toContain('Elige tu Día 1');
    expect(textos(r)).toContain('Jueves 8 de octubre');

    await tocar(r, 'Sábado 10 de octubre');
    // Ya eligió: la próxima consulta dice activado y la tarjeta se va.
    mockConsultarActivacion.mockResolvedValue({ activated: true, validStartDates: [], startDate: '2026-10-10' });
    await tocar(r, 'CONFIRMAR MI DÍA 1');
    expect(mockActivarPrograma).toHaveBeenCalledWith({ startDate: '2026-10-10' });
    expect(textos(r)).not.toContain('Todavía no elegiste tu Día 1');
  });

  it('con la fila sin activar, volver cierra el selector sin elegir', async () => {
    mockConsultarActivacion.mockResolvedValue({ activated: false, validStartDates: FECHAS, startDate: null });
    const r = await montar('hoy', persona, false, true);

    await tocar(r, 'Elegir mi Día 1');
    const [volver] = r.root.findAll(n => n.props?.accessibilityLabel === 'Volver sin elegir' && typeof n.props.onPress === 'function');
    await act(async () => {
      volver.props.onPress();
    });

    expect(modal(r).props.visible).toBe(false);
    expect(mockActivarPrograma).not.toHaveBeenCalled();
  });

  it('sin fila: Hoy invita a elegir el Día 1, con «Ahora no»; Yo invita sin «Ahora no»', async () => {
    const hoy = await montar('hoy', persona, true, false);
    expect(textos(hoy)).toEqual(expect.arrayContaining(['Hacer mi programa de 90 días', 'Elegir mi Día 1', 'Ahora no']));
    // D-261: ya no hay «Empezar» (activate-tracking, arrancaba hoy).
    expect(textos(hoy)).not.toContain('Empezar');
    // Sin fila no hay Día 1 que consultar al montar: el pedido solo se hace al abrir el selector.
    expect(mockConsultarActivacion).not.toHaveBeenCalled();
    act(() => raiz?.unmount());

    const yo = await montar('yo', persona, true, false);
    expect(textos(yo)).toEqual(expect.arrayContaining(['Hacer mi programa de 90 días', 'Elegir mi Día 1']));
    expect(textos(yo)).not.toContain('Ahora no');
  });

  /**
   * D-261 (decisión del dueño del 2026-10-07: «que elija el día como los demás»). Contra el código
   * anterior falla: el botón era «Empezar» y llamaba a `POST /mentor/activate-tracking`.
   */
  it.each(['hoy', 'yo'] as const)('sin fila, en %s: la invitación abre el selector, elige con el servidor y no llama a activate-tracking', async lugar => {
    mockConsultarActivacion.mockResolvedValue({ activated: false, validStartDates: FECHAS, startDate: null });
    mockActivarPrograma.mockResolvedValue({});
    const r = await montar(lugar, persona, true, false);
    expect(modal(r).props.visible).toBe(false);

    await tocar(r, 'Elegir mi Día 1');
    expect(modal(r).props.visible).toBe(true);
    expect(textos(r)).toContain('Elige tu Día 1');
    expect(textos(r)).toContain('Jueves 8 de octubre');

    await tocar(r, 'Viernes 9 de octubre');
    await tocar(r, 'CONFIRMAR MI DÍA 1');

    expect(mockActivarPrograma).toHaveBeenCalledWith({ startDate: '2026-10-09' });
    expect(mockActivarPersonal).not.toHaveBeenCalled();
    expect(textos(r)).not.toContain('Hacer mi programa de 90 días');
  });

  it('sin fila, volver del selector deja la invitación como estaba', async () => {
    mockConsultarActivacion.mockResolvedValue({ activated: false, validStartDates: FECHAS, startDate: null });
    const r = await montar('hoy', persona, true, false);

    await tocar(r, 'Elegir mi Día 1');
    const [volver] = r.root.findAll(n => n.props?.accessibilityLabel === 'Volver sin elegir' && typeof n.props.onPress === 'function');
    await act(async () => {
      volver.props.onPress();
    });

    expect(modal(r).props.visible).toBe(false);
    expect(mockActivarPrograma).not.toHaveBeenCalled();
    expect(mockActivarPersonal).not.toHaveBeenCalled();
    expect(textos(r)).toEqual(expect.arrayContaining(['Hacer mi programa de 90 días', 'Ahora no']));
  });

  it('«Ahora no» en Hoy: Hoy deja de ofrecerlo y Yo lo sigue ofreciendo', async () => {
    // Las dos pestañas montadas a la vez, como en la app (el navegador de pestañas no las desmonta).
    // El «Ahora no» guardado en el teléfono no se puede probar acá: `useProgramaPersonal` lee
    // AsyncStorage con un `import()` dinámico que Jest no resuelve (cae al `catch`, «se ofrece»).
    // Lo que sí se prueba es lo que cambió: Yo no mira el pospuesto (`puedeActivar`, no `visible`).
    const capacidades = { programRequired: false, canStartProgram: true, canAccompany: false, canAdminister: persona.administra };
    mockCapacidades.mockResolvedValue(capacidades);
    const esMentor = (ROL_MENTOR as readonly string[]).includes(persona.rol);
    await act(async () => {
      raiz = TestRenderer.create(
        React.createElement(React.Fragment, null,
          React.createElement(EntradaAlProgramaPropio, { key: 'hoy', lugar: 'hoy', activo: esMentor || capacidades.canAdminister || capacidades.canStartProgram, usuarioId: USUARIO, inscrito: false, diaPrograma: 0 }),
          React.createElement(EntradaAlProgramaPropio, { key: 'yo', lugar: 'yo', activo: capacidades.canStartProgram, usuarioId: USUARIO, inscrito: false, diaPrograma: 0 }),
        ),
      );
    });
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await new Promise(resolver => setTimeout(resolver, 0));
      });
    }
    expect(textos(raiz!).filter((t: string) => t === 'Hacer mi programa de 90 días')).toHaveLength(2);

    await tocar(raiz!, 'Ahora no');

    // Queda una sola invitación, la de Yo, y sin «Ahora no».
    expect(textos(raiz!).filter((t: string) => t === 'Hacer mi programa de 90 días')).toHaveLength(1);
    expect(textos(raiz!)).toContain('Elegir mi Día 1');
    expect(textos(raiz!)).not.toContain('Ahora no');
    expect(mockActivarPersonal).not.toHaveBeenCalled();
  });
});

describe('Training y el onboarding (código fuente)', () => {
  const RAIZ = path.resolve(__dirname, '..', '..', '..');
  const sinComentarios = (codigo: string) =>
    codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const TRAINING = sinComentarios(fs.readFileSync(path.join(RAIZ, 'screens/TrainingScreen.tsx'), 'utf-8'));
  const ONBOARDING = sinComentarios(fs.readFileSync(path.join(RAIZ, 'features/onboarding/screens/OnboardingFlow.tsx'), 'utf-8'));

  it('la tarjeta «Todavía no elegiste tu Día 1» trae el botón que abre el selector', () => {
    const tarjeta = TRAINING.slice(TRAINING.indexOf("'Todavía no elegiste tu Día 1'"));
    const hastaElCatalogo = tarjeta.slice(0, tarjeta.indexOf('selectedDimension === null && ('));
    expect(hastaElCatalogo).toMatch(/arranque\.estado === 'PENDIENTE_ELEGIR' \? \(\s*<View[^>]*>\s*<BotonElegirDiaUno/);
  });

  it('sin fila no muestra el error con el uuid: muestra la invitación', () => {
    expect(TRAINING).toContain('!cargandoBackend && errorBackend !== null && !sinProgramaPropio && (');
    expect(TRAINING).toMatch(/sinProgramaPropio && selectedDimension === null \? \(\s*<InvitacionProgramaPropio/);
    expect(TRAINING).toContain('useProgramaPersonal(!cargandoDiaPrograma && !inscrito');
  });

  it('ninguna pantalla llama a POST /mentor/activate-tracking (D-261): el personal sin fila elige su Día 1', () => {
    const archivos: string[] = [];
    const recorrer = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const ruta = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== '__tests__') recorrer(ruta);
        } else if (/\.tsx?$/.test(e.name)) {
          archivos.push(ruta);
        }
      }
    };
    recorrer(RAIZ);
    const llaman = archivos.filter(a => sinComentarios(fs.readFileSync(a, 'utf-8')).includes('/mentor/activate-tracking'));
    expect(llaman).toEqual([]);
  });

  it('el onboarding del aprendiz no cambia: el selector va sin «volver»', () => {
    expect(ONBOARDING).toContain('<ActivarProgramaScreen onActivated={handleProgramaActivado} />');
  });
});
