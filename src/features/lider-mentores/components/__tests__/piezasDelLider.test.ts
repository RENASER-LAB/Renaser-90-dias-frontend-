import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { altoDelToque, montar, porTestID, tocable, tocar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});

import { AnilloDeCupo } from '../AnilloDeCupo';
import { BarraDeColores } from '../BarraDeColores';
import { ContadoresPorColor } from '../ContadoresPorColor';
import { EstadoConForma } from '../EstadoConForma';
import { FilaPorResolver } from '../FilaPorResolver';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Las piezas de las pantallas del líder (spec 056, T050): el estado nunca va solo con color (FR-043), el cupo se dice con su número, y las
 * acciones son botones visibles de 44 a 48 de alto (FR-044).
 */
describe('EstadoConForma', () => {
  it('cada estado tiene su forma Y su símbolo propios: rojo cuadrado con ×, ámbar triángulo con !, verde círculo con ✓, sin datos círculo vacío con ·', async () => { // spec 056 FR-043
    const formas: Record<string, [string, string]> = {
      rojo: ['forma-cuadrado', 'simbolo-x'],
      ambar: ['forma-triangulo', 'simbolo-exclamacion'],
      verde: ['forma-circulo', 'simbolo-check'],
      sinDatos: ['forma-circulo-vacio', 'simbolo-punto'],
    };
    for (const [estado, [forma, simbolo]] of Object.entries(formas)) {
      const r = await montar(React.createElement(EstadoConForma, { estado: estado as 'rojo' }));
      expect(porTestID(r, forma)).toHaveLength(1);
      expect(porTestID(r, simbolo)).toHaveLength(1);
      /* Y ninguna de las otras formas. */
      for (const [otro, [otraForma]] of Object.entries(formas)) if (otro !== estado) expect(porTestID(r, otraForma)).toHaveLength(0);
    }
  });

  it('lleva una etiqueta para el lector de pantalla con la palabra del estado y, si hay cifra, la cifra', async () => { // spec 056 FR-043
    const r = await montar(React.createElement(EstadoConForma, { estado: 'rojo', cifra: 5 }));
    const nodo = r.root.findAll(n => n.props.accessibilityLabel === '5 en rojo');
    expect(nodo.length).toBeGreaterThan(0);
    const sin = await montar(React.createElement(EstadoConForma, { estado: 'sinDatos', cifra: 4 }));
    expect(sin.root.findAll(n => n.props.accessibilityLabel === '4 sin datos').length).toBeGreaterThan(0);
    const solo = await montar(React.createElement(EstadoConForma, { estado: 'ambar' }));
    expect(solo.root.findAll(n => n.props.accessibilityLabel === 'En ámbar').length).toBeGreaterThan(0);
  });

  it('escribe la cifra junto a la forma, para que el número también se lea', async () => { // spec 056 FR-003
    const r = await montar(React.createElement(EstadoConForma, { estado: 'verde', cifra: 12 }));
    expect(todoElTexto(r)).toContain('12');
  });
});

describe('AnilloDeCupo', () => {
  it('es un indicador de progreso con el cupo escrito «n/máx» y dicho en voz alta', async () => { // spec 056 FR-003
    const r = await montar(React.createElement(AnilloDeCupo, { acompanados: 9, maximo: 10 }));
    expect(todoElTexto(r)).toContain('9/10');
    const anillo = porTestID(r, 'anillo-de-cupo')[0];
    expect(anillo.props.accessibilityRole).toBe('progressbar');
    expect(anillo.props.accessibilityLabel).toBe('Cupo 9 de 10');
    expect(anillo.props.accessibilityValue).toMatchObject({ min: 0, max: 10, now: 9 });
  });

  it('con un cupo de cero no divide por cero: dibuja el anillo vacío con «0/0»', async () => { // spec 056 FR-004
    const r = await montar(React.createElement(AnilloDeCupo, { acompanados: 0, maximo: 0 }));
    expect(todoElTexto(r)).toContain('0/0');
    expect(porTestID(r, 'anillo-de-cupo')[0].props.accessibilityValue).toMatchObject({ min: 0, max: 0, now: 0 });
  });

  it('nunca pasa del anillo lleno, aunque haya más aprendices que cupo', async () => { // spec 056 FR-003
    const r = await montar(React.createElement(AnilloDeCupo, { acompanados: 12, maximo: 10 }));
    expect(porTestID(r, 'anillo-de-cupo')[0].props.accessibilityValue).toMatchObject({ max: 10, now: 10 });
    expect(todoElTexto(r)).toContain('12/10');
  });
});

describe('BarraDeColores', () => {
  it('reparte el ancho en proporción a cada color y dice las cuatro cifras', async () => { // spec 056 FR-003
    const r = await montar(React.createElement(BarraDeColores, { rojo: 5, ambar: 0, verde: 1, sinDatos: 4 }));
    const flex = (id: string) => (porTestID(r, id)[0]?.props.style as { flex?: number } | undefined)?.flex;
    expect(flex('barra-rojo')).toBe(5);
    expect(flex('barra-verde')).toBe(1);
    expect(flex('barra-sin-datos')).toBe(4);
    expect(porTestID(r, 'barra-ambar')).toHaveLength(0);
    const barra = porTestID(r, 'barra-de-colores')[0];
    expect(barra.props.accessibilityLabel).toBe('5 en rojo, 1 en verde, 4 sin datos');
  });

  it('sin nadie (todo en cero) no dibuja una barra vacía', async () => { // spec 056 FR-003
    const r = await montar(React.createElement(BarraDeColores, { rojo: 0, ambar: 0, verde: 0, sinDatos: 0 }));
    expect(porTestID(r, 'barra-de-colores')).toHaveLength(0);
  });
});

describe('ContadoresPorColor', () => {
  it('muestra los cuatro estados con su forma y su cifra, en el orden rojo, ámbar, verde, sin datos', async () => { // spec 056 FR-003
    const r = await montar(React.createElement(ContadoresPorColor, { rojo: 5, ambar: 0, verde: 0, sinDatos: 4 }));
    for (const forma of ['forma-cuadrado', 'forma-triangulo', 'forma-circulo', 'forma-circulo-vacio']) expect(porTestID(r, forma)).toHaveLength(1);
    expect(todoElTexto(r).replace(/\s/g, '')).toContain('5|0|0|4');
  });

  it('con la variante de tarjetas pone la palabra de cada estado debajo de su cifra', async () => { // spec 056 FR-012
    const r = await montar(React.createElement(ContadoresPorColor, { rojo: 5, ambar: 0, verde: 0, sinDatos: 4, variante: 'tarjetas' }));
    const texto = todoElTexto(r);
    for (const palabra of ['rojo', 'ámbar', 'verde', 'sin datos']) expect(texto).toContain(palabra);
  });
});

describe('FilaPorResolver', () => {
  it('lleva el símbolo del estado, una cifra corta y un botón visible que hace una sola cosa', async () => { // spec 056 FR-002
    const alTocar = jest.fn();
    const r = await montar(React.createElement(FilaPorResolver, { estado: 'rojo', texto: '3 grupos sin mentor', boton: 'Asignar', onPress: alTocar }));
    expect(porTestID(r, 'forma-cuadrado')).toHaveLength(1);
    expect(todoElTexto(r)).toContain('3 grupos sin mentor');
    expect(altoDelToque(tocable(r, 'Asignar'))).toBeGreaterThanOrEqual(44);
    await tocar(r, 'Asignar');
    expect(alTocar).toHaveBeenCalledTimes(1);
  });

  it('el botón dice a qué se refiere para el lector de pantalla', async () => { // spec 056 FR-043
    const r = await montar(React.createElement(FilaPorResolver, { estado: 'ambar', texto: '3 consultas · 5 días', boton: 'Recordar', onPress: () => undefined }));
    expect(tocable(r, 'Recordar').props.accessibilityLabel).toContain('3 consultas · 5 días');
  });
});
