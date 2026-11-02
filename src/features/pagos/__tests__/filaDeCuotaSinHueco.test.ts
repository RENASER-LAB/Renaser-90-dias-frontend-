import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';

/**
 * #96 (visto por el dueño en Administración → Pagos: «tremendo espacio, ajustar»): la fila de una cuota llevaba calendario, fecha, monto y la pastilla de
 * estado en un mismo renglón con `flexWrap`; con un monto de cuatro o cinco cifras en 360 dp la pastilla bajaba SOLA a un segundo renglón, pegada a la
 * derecha, y dejaba un hueco. Ahora una cuota son dos renglones fijos: fecha + estado, y debajo el monto. Esto se prueba sobre el árbol dibujado.
 */

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

import type { CuotaDePago } from '../api/pagosSchemas';
import { DatosDeLaCuota } from '../components/DatosDeLaCuota';
import { FilaDeCuota } from '../components/FilaDeCuota';
import { cuotaVisible } from '../utils/vistaDeMiIngreso';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HOY = { dia: 2, mes: 11, anio: 2026 };
const visible = (monto: number, pagada: boolean) => {
  const cuota: CuotaDePago = { id: 'c1', venceEl: '2027-01-02', monto, pagada, marcadaEn: null, marcadaPor: null };
  return cuotaVisible(cuota, 'USD', HOY);
};

const esHost = (n: ReactTestInstance, tipo: string) => (n.type as unknown) === tipo;
const textoDe = (n: ReactTestInstance): string => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join('');
const textos = (raiz: ReactTestInstance) => raiz.findAll(n => esHost(n, 'Text'));
const textoQue = (raiz: ReactTestInstance, valor: string) => {
  const hallados = textos(raiz).filter(n => textoDe(n) === valor);
  expect(hallados).toHaveLength(1);
  return hallados[0];
};
const estilo = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};
const ancestros = (n: ReactTestInstance): ReactTestInstance[] => {
  const lista: ReactTestInstance[] = [];
  for (let p = n.parent; p; p = p.parent) lista.push(p);
  return lista;
};
/** El primer contenedor `View` (host) que tiene a los dos adentro. */
const contenedorComun = (a: ReactTestInstance, b: ReactTestInstance) => {
  const deB = new Set(ancestros(b));
  const comun = ancestros(a).find(p => deB.has(p) && esHost(p, 'View'));
  expect(comun).toBeDefined();
  return comun as ReactTestInstance;
};
const montar = (elemento: React.ReactElement) => {
  let r!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    r = TestRenderer.create(elemento);
  });
  return r;
};

describe.each([
  ['pendiente con cuatro cifras', visible(1000, false), 'Pendiente'],
  ['pendiente con cinco cifras', visible(12500, false), 'Pendiente'],
  ['pagada con seis cifras', visible(120000, true), 'Pagado'],
])('una cuota %s', (_nombre, cuota, estado) => {
  it('la fecha y el estado van en el MISMO renglón, sin `flexWrap`, y el monto va aparte (ninguna pastilla sola)', () => {
    const r = montar(React.createElement(DatosDeLaCuota, { cuota }));
    const fecha = textoQue(r.root, cuota.fecha);
    const pastilla = textoQue(r.root, estado);
    const monto = textoQue(r.root, cuota.monto);

    const renglon = contenedorComun(fecha, pastilla);
    expect(renglon.findAll(n => n === monto)).toHaveLength(0);
    expect(estilo(renglon)).toMatchObject({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' });
    expect(estilo(renglon).flexWrap).toBeUndefined();
  });

  it('el conjunto son exactamente dos renglones, uno debajo del otro: (fecha + estado) y el monto', () => {
    const r = montar(React.createElement(DatosDeLaCuota, { cuota }));
    const conjunto = r.root.findAll(n => esHost(n, 'View') && n.props.accessibilityLabel === cuota.etiqueta);
    expect(conjunto).toHaveLength(1);
    expect(React.Children.toArray(conjunto[0].props.children)).toHaveLength(2);
    expect(estilo(conjunto[0]).flexDirection).toBeUndefined();
    expect(estilo(conjunto[0]).flexWrap).toBeUndefined();
  });

  it('el monto va en grande, con cifras tabulares, sin encogerse ni achicarse de letra', () => {
    const r = montar(React.createElement(DatosDeLaCuota, { cuota }));
    const monto = textoQue(r.root, cuota.monto);
    expect(estilo(monto)).toMatchObject({ fontSize: 22, flexShrink: 0, fontVariant: ['tabular-nums'] });
    expect(monto.props.adjustsFontSizeToFit).toBeUndefined();
    expect(monto.props.numberOfLines).toBeUndefined();
  });

  it('la pastilla no se encoge ni se parte, y dice su palabra además de llevar el color', () => {
    const r = montar(React.createElement(DatosDeLaCuota, { cuota }));
    const pastilla = textoQue(r.root, estado);
    const caja = ancestros(pastilla).find(p => esHost(p, 'View'))!;
    expect(estilo(caja)).toMatchObject({ flexDirection: 'row', flexShrink: 0, minHeight: 36 });
    expect(pastilla.props.numberOfLines).toBeUndefined();
  });
});

describe('«Mi ingreso» dibuja la misma cuota', () => {
  it('la tarjeta no suma ningún renglón propio: fecha, estado y monto, y nada más', () => {
    const cuota = visible(1000, false);
    const r = montar(React.createElement(FilaDeCuota, { cuota }));
    expect(textos(r.root).map(textoDe)).toEqual([cuota.fecha, 'Pendiente', cuota.monto]);
    const renglon = contenedorComun(textoQue(r.root, cuota.fecha), textoQue(r.root, 'Pendiente'));
    expect(renglon.findAll(n => n === textoQue(r.root, cuota.monto))).toHaveLength(0);
    expect(r.root.findAll(n => esHost(n, 'View') && n.props.accessibilityLabel === cuota.etiqueta)).toHaveLength(1);
  });
});
