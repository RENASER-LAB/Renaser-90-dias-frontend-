import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Modal, ScrollView } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El selector de hora sin huecos (issue #97). En «Yo → Alarmas → Recordatorios de pago → Cambiar la hora» ocupaba
 * toda la pantalla: sus dos carriles horizontales (`ScrollView`, con `flexGrow: 1` por defecto) se estiraban y dejaban
 * ~500 px en blanco entre «Hora» y «Minutos» y hasta el botón; y la fila de horas solo dejaba ver de 00 a 05.
 *
 * Lo que se fija: nada en el selector es un `ScrollView` horizontal ni un `ScrollView` que crezca; las 24 horas y los
 * 12 minutos son botones a la vista; y lo que se devuelve y las props son las de siempre (`HH:mm`, minutos de 5 en 5).
 */

const mockSeleccion = jest.fn();

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../../utils/tacto', () => ({
  tacto: { seleccion: () => mockSeleccion(), error: () => undefined, logro: () => undefined },
}));

import { HoraPickerModal } from '../HoraPickerModal';
import { Presionable } from '../../../../components/Presionable';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

type Props = React.ComponentProps<typeof HoraPickerModal>;

function montar(props: Partial<Props> = {}): { r: ReactTestRenderer; onConfirmar: jest.Mock<(h: string) => void>; onCerrar: jest.Mock<() => void> } {
  const onConfirmar = jest.fn<(h: string) => void>();
  const onCerrar = jest.fn<() => void>();
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(HoraPickerModal, {
        visible: true,
        tituloHabito: 'Hora de tus recordatorios de pago',
        horaInicial: '09:00',
        onConfirmar,
        onCerrar,
        ...props,
      }),
    );
  });
  return { r: raiz!, onConfirmar, onCerrar };
}

function boton(r: ReactTestRenderer, etiqueta: string): ReactTestInstance {
  const [nodo] = r.root.findAll(
    n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === etiqueta,
  );
  if (!nodo) throw new Error(`No hay un botón «${etiqueta}»`);
  return nodo;
}

/** Un nodo por botón de la grilla (el `Presionable`, no el `Pressable` que lleva adentro). */
const botonesDe = (r: ReactTestRenderer, unidad: string) =>
  r.root.findAll(
    n => n.type === Presionable && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.endsWith(` ${unidad}`),
  );

async function tocar(r: ReactTestRenderer, etiqueta: string) {
  const nodo = boton(r, etiqueta);
  await act(async () => {
    nodo.props.onPress();
  });
}

const marcado = (r: ReactTestRenderer, etiqueta: string): boolean => boton(r, etiqueta).props.accessibilityState.selected === true;

const textos = (r: ReactTestRenderer): string[] =>
  r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''));

async function guardar(r: ReactTestRenderer) {
  const [guardarHora] = r.root.findAll(n => n.props.label === 'GUARDAR HORA' && typeof n.props.onPress === 'function');
  if (!guardarHora) throw new Error('No hay botón «GUARDAR HORA»');
  await act(async () => {
    guardarHora.props.onPress();
  });
}

beforeEach(() => {
  mockSeleccion.mockReset();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('el selector ya no tiene carriles que se estiren ni que se arrastren de lado', () => {
  it('ningún ScrollView es horizontal: las horas y los minutos no se buscan arrastrando', () => {
    const { r } = montar();
    const horizontales = r.root.findAll(n => (n.type as unknown) === ScrollView && n.props.horizontal === true);
    expect(horizontales).toHaveLength(0);
  });

  it('el ScrollView que queda (vertical, por si la pantalla es baja) no crece: `flexGrow: 0` y tope de alto', () => {
    const { r } = montar();
    const scrolls = r.root.findAll(n => (n.type as unknown) === ScrollView);
    expect(scrolls.length).toBeGreaterThan(0);
    for (const scroll of scrolls) {
      const estilo = StyleSheetFlatten(scroll.props.style);
      expect(estilo.flexGrow).toBe(0);
      expect(typeof estilo.maxHeight).toBe('number');
    }
  });

  it('es una hoja desde abajo (un Modal) y no una tarjeta a pantalla completa', () => {
    const { r } = montar();
    expect(r.root.findAll(n => n.type === Modal)).toHaveLength(1);
    expect(r.root.findAll(n => n.props.testID === 'hoja-fondo').length).toBeGreaterThan(0);
  });

  it('el código no trae un ScrollView horizontal ni la tarjeta centrada de antes', () => {
    const fuente = fs
      .readFileSync(path.join(__dirname, '..', 'HoraPickerModal.tsx'), 'utf8')
      .split('\n')
      .filter(linea => !/^\s*(\/\*|\*|\/\/)/.test(linea))
      .join('\n');
    expect(fuente).not.toMatch(/\bhorizontal\b/);
    expect(fuente).not.toMatch(/VeloModal/);
    expect(fuente).toMatch(/flexGrow: 0/);
  });
});

describe('las 24 horas y los 12 minutos, a la vista', () => {
  it('hay un botón por cada hora de 00 a 23, sin tener que desplazar para encontrarlos', () => {
    const { r } = montar();
    const horas = botonesDe(r, 'horas');
    expect(horas.map(n => n.props.accessibilityLabel)).toEqual(
      Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')} horas`),
    );
  });

  it('hay un botón por cada minuto de 5 en 5: 00, 05 … 55', () => {
    const { r } = montar();
    const minutos = botonesDe(r, 'minutos');
    expect(minutos.map(n => n.props.accessibilityLabel)).toEqual(
      Array.from({ length: 12 }, (_, i) => `${String(i * 5).padStart(2, '0')} minutos`),
    );
  });

  it('la hora de la que parte aparece marcada y en grande, con su momento del día', () => {
    const { r } = montar({ horaInicial: '09:00' });
    expect(marcado(r, '09 horas')).toBe(true);
    expect(marcado(r, '00 minutos')).toBe(true);
    expect(marcado(r, '10 horas')).toBe(false);
    expect(textos(r)).toContain('09:00');
    expect(textos(r)).toContain('de la mañana');
  });

  it('el título del hábito se ve en tipo oración bajo «Elegir hora»', () => {
    const { r } = montar({ tituloHabito: 'AGUA TIBIA CON LIMÓN' });
    expect(textos(r)).toContain('Elegir hora');
    expect(textos(r)).toContain('Agua tibia con limón');
  });
});

describe('lo que devuelve es lo de siempre: «HH:mm» con minutos de 5 en 5', () => {
  it('elegir la hora 11 (antes escondida detrás de arrastrar de lado) y los minutos 35, y guardar', async () => {
    const { r, onConfirmar } = montar();
    await tocar(r, '11 horas');
    await tocar(r, '35 minutos');
    expect(textos(r)).toContain('11:35');
    expect(marcado(r, '11 horas')).toBe(true);
    expect(marcado(r, '09 horas')).toBe(false);
    await guardar(r);
    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).toHaveBeenCalledWith('11:35');
  });

  it('se puede llegar a cualquiera de las 24 horas: 00:00 y 23:55', async () => {
    const { r, onConfirmar } = montar();
    await tocar(r, '00 horas');
    await tocar(r, '00 minutos');
    await guardar(r);
    expect(onConfirmar).toHaveBeenLastCalledWith('00:00');

    await tocar(r, '23 horas');
    await tocar(r, '55 minutos');
    expect(textos(r)).toContain('de la noche');
    await guardar(r);
    expect(onConfirmar).toHaveBeenLastCalledWith('23:55');
  });

  it('sin tocar nada devuelve la hora de la que partió, con el minuto llevado al múltiplo de 5', async () => {
    const { r, onConfirmar } = montar({ horaInicial: '07:58' });
    await guardar(r);
    expect(onConfirmar).toHaveBeenCalledWith('07:00');
  });

  it('cambiar la hora no toca el minuto y viceversa', async () => {
    const { r, onConfirmar } = montar({ horaInicial: '14:20' });
    await tocar(r, '15 horas');
    expect(marcado(r, '20 minutos')).toBe(true);
    await tocar(r, '45 minutos');
    expect(marcado(r, '15 horas')).toBe(true);
    await guardar(r);
    expect(onConfirmar).toHaveBeenCalledWith('15:45');
  });

  it('un «tic» por cambio de elección; tocar lo que ya está elegido no vibra', async () => {
    const { r } = montar({ horaInicial: '09:00' });
    await tocar(r, '09 horas');
    expect(mockSeleccion).not.toHaveBeenCalled();
    await tocar(r, '10 horas');
    expect(mockSeleccion).toHaveBeenCalledTimes(1);
  });

  it('cerrar con la ✕ avisa y no entrega nada', async () => {
    const { r, onConfirmar, onCerrar } = montar();
    await tocar(r, '12 horas');
    await tocar(r, 'Cerrar el selector de hora');
    expect(onCerrar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('al volver a abrirse parte otra vez de la hora que le pasan, no de lo que se movió la vez anterior', async () => {
    const { r, onConfirmar } = montar({ visible: true, horaInicial: '09:00' });
    await tocar(r, '18 horas');
    act(() => {
      r.update(
        React.createElement(HoraPickerModal, { visible: false, tituloHabito: 'x', horaInicial: '09:00', onConfirmar, onCerrar: () => undefined }),
      );
    });
    act(() => {
      r.update(
        React.createElement(HoraPickerModal, { visible: true, tituloHabito: 'x', horaInicial: '21:15', onConfirmar, onCerrar: () => undefined }),
      );
    });
    expect(marcado(r, '21 horas')).toBe(true);
    expect(marcado(r, '15 minutos')).toBe(true);
    expect(textos(r)).toContain('21:15');
  });
});

/** Aplana un estilo de React Native (objeto o lista anidada) a un solo objeto. */
function StyleSheetFlatten(estilo: unknown): { flexGrow?: number; maxHeight?: number } {
  const salida: Record<string, unknown> = {};
  const recorrer = (e: unknown) => {
    if (Array.isArray(e)) e.forEach(recorrer);
    else if (e && typeof e === 'object') Object.assign(salida, e);
  };
  recorrer(estilo);
  return salida as { flexGrow?: number; maxHeight?: number };
}
