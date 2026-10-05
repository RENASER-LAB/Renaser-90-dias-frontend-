/**
 * Grosor de los íconos en toda la app (decisión del dueño, 2026-10-05): el trazo se dibuja a 1,75 px
 * REALES a cualquier tamaño.
 *
 * Contra el código anterior falla: el trazo era `strokeWidth = 1.1` en la caja de 20, así que a 14 px
 * medía 1,1 × 14 / 20 = 0,77 px (y a 12 px el chevron, con su 1,4 fijo en una caja de 15, 1,1 px).
 *
 * El último bloque lee `Icon.tsx` como texto: un ícono en caja de 24 tiene que usar `s24`. Con `s`
 * (el de la caja de 20) saldría a 1,46 px, y es justo el error fácil al sumar un ícono de Lucide.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from 'react-native-svg';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { GROSOR_TRAZO_PX, Icon, grosorDelTrazo, type IconName } from '../Icon';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function dibujar(props: React.ComponentProps<typeof Icon>): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(Icon, props));
  });
  return raiz;
}

/** El lado de la caja que corresponde a `size`: el alto en el chevron (9 × 15 a `size` de alto), el ancho en los demás. */
function ladoDeLaCaja(svg: ReactTestInstance, nombre: IconName): number {
  const [, , ancho, alto] = String(svg.props.viewBox).split(' ').map(Number);
  return nombre === 'chevron' ? alto : ancho;
}

/** Los grosores reales (px de pantalla) de todo lo que se dibuja con trazo. */
function grososReales(nombre: IconName, size: number, strokeWidth?: number): number[] {
  const raiz = dibujar({ name: nombre, size, color: '#000', strokeWidth });
  const svg = raiz.root.findAll(n => n.type === Svg)[0];
  const lado = ladoDeLaCaja(svg, nombre);
  const conTrazo = [Path, Circle, Rect, Ellipse, Polygon]
    .flatMap(tipo => raiz.root.findAll(n => n.type === tipo))
    .filter(n => n.props.stroke !== undefined && n.props.strokeWidth !== undefined);
  return conTrazo.map(n => (Number(n.props.strokeWidth) * size) / lado);
}

const DE_LINEA: IconName[] = [
  'search', 'users', 'calendar', 'bell', 'trophy', 'lock', 'image', 'camera', 'thumbsUp', 'send', // caja de 20
  'clock', 'heart', 'brain', 'stack', // caja de 22
  'newspaper', 'bookOpen', 'quote', 'globe', 'headset', 'messageCircle', 'video', 'fileText', 'link', 'pencil', 'idCard', 'layoutGrid', // caja de 24
  'forward', 'imagePlus', 'smile', 'trash', 'checkCheck', 'reply', 'copy', // caja de 24, de las hojas y del chat (entraron en paralelo)
  'chevron', 'arrow', 'filter', 'volume',
];

describe('el trazo de los íconos', () => {
  it('mide 1,75 px reales en cualquier caja y a cualquier tamaño', () => {
    for (const lado of [15, 16, 20, 22, 24]) {
      for (const size of [12, 14, 16, 20, 24, 28, 40]) {
        expect((grosorDelTrazo({ lado, size }) * size) / lado).toBeCloseTo(GROSOR_TRAZO_PX, 6);
      }
    }
  });

  it('a 14 px ningún ícono de línea queda por debajo de 1,5 px (antes: 0,77)', () => {
    for (const nombre of DE_LINEA) {
      const grosores = grososReales(nombre, 14);
      expect(grosores.length).toBeGreaterThan(0);
      for (const g of grosores) expect({ nombre, g: g >= 1.5 }).toEqual({ nombre, g: true });
    }
  });

  it('es el mismo a 16, 20 y 24 (los tamaños de uso)', () => {
    for (const nombre of ['users', 'clock', 'newspaper', 'chevron'] as IconName[]) {
      const [a16, a20, a24] = [16, 20, 24].map(size => grososReales(nombre, size)[0]);
      expect(a16).toBeCloseTo(a20, 6);
      expect(a20).toBeCloseTo(a24, 6);
    }
  });

  it('respeta el énfasis de los que lo llevan (✓, +, ✕): 1,3 veces el normal', () => {
    for (const nombre of ['check', 'plus', 'close'] as IconName[]) {
      expect(grososReales(nombre, 20)[0]).toBeCloseTo(GROSOR_TRAZO_PX * 1.3, 6);
    }
  });

  it('respeta un strokeWidth explícito MÁS grueso (el ✓ sobre dorado), y nunca deja uno más fino', () => {
    // El ✓ de las casillas: 2 unidades × 1,3 a 26 px = 3,38 px, como siempre.
    expect(grososReales('check', 26, 2)[0]).toBeCloseTo((2 * 1.3 * 26) / 20, 6);
    // La lupa de un buscador pedía 1,4 a 16 px (1,12 px): ahora sube a 1,75.
    expect(grososReales('search', 16, 1.4)[0]).toBeCloseTo(GROSOR_TRAZO_PX, 6);
    expect(grosorDelTrazo({ lado: 20, size: 14, explicito: 1.1 })).toBeCloseTo(2.5, 6);
  });

  it('el chevron y la flecha no toman el strokeWidth de quien los usa (llevaban uno fijo)', () => {
    // `BotonBajarAlFinal` le pasa 1,8: en la caja de 15 a 24 px serían 2,9 px.
    expect(grososReales('chevron', 24, 1.8)[0]).toBeCloseTo(GROSOR_TRAZO_PX, 6);
    expect(grososReales('arrow', 24, 1.8)[0]).toBeCloseTo(GROSOR_TRAZO_PX, 6);
  });
});

describe('Icon.tsx: cada caja con su trazo', () => {
  const fuente = fs.readFileSync(path.resolve(__dirname, '..', 'Icon.tsx'), 'utf-8');
  /** Cada `<Svg …viewBox="0 0 N N">…</Svg>` con los trazos que usa. */
  const dibujos = [...fuente.matchAll(/<Svg[^>]*viewBox="0 0 (\d+) (\d+)"[^>]*>([\s\S]*?)<\/Svg>/g)].map(m => ({
    caja: `${m[1]}x${m[2]}`,
    trazos: [...m[3].matchAll(/\{\.\.\.(s\d*)\}/g)].map(t => t[1]),
  }));

  it('los de caja 24 usan s24, los de 22 s22 y los de 20 s', () => {
    const esperado: Record<string, string> = { '24x24': 's24', '22x22': 's22', '20x20': 's' };
    const mal = dibujos.flatMap(d =>
      esperado[d.caja] ? d.trazos.filter(t => t !== esperado[d.caja]).map(t => `${d.caja} usa ${t}`) : []
    );
    expect(mal).toEqual([]);
  });

  it('los íconos nuevos de Comunidad (tanda 1) están, en su bloque y en el tipo', () => {
    expect(fuente).toMatch(/\/\* Comunidad · tanda 1 \(íconos\) \*\//);
    for (const nombre of ['newspaper', 'bookOpen', 'quote', 'globe', 'headset', 'messageCircle', 'video', 'fileText', 'link', 'pencil', 'idCard', 'layoutGrid']) {
      expect(fuente).toContain(`case '${nombre}':`);
      expect(fuente).toMatch(new RegExp(`\\| '${nombre}'`));
    }
  });
});
