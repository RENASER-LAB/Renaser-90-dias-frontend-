import { fuentes } from '../../../../theme/fuentes';
import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'expo-image';

/**
 * La imagen del podio que se comparte (spec 006 del backend, T038): lienzo 9:16 de 540 × 960 dp (sale a
 * 1080 × 1920 px), con el fénix, la fecha, el nombre de la tabla, el podio de los tres primeros y del 4.º al
 * 10.º. Siempre en la paleta oscura de la marca, sin depender del tema.
 */

import type { EntradaRankingDto } from '../../api/rankingApi';
import { ALTO_DE_LA_TARJETA, ANCHO_DE_LA_TARJETA, SALIDA_PX } from '../../utils/medidasDelPodio';
import { podioParaCompartir } from '../../utils/podioParaCompartir';
import { TarjetaDelPodioParaCompartir } from '../TarjetaDelPodioParaCompartir';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const entrada = (n: number, fullName = `Persona ${n}`, puntaje = 100 - n): EntradaRankingDto => ({
  participanteId: `p-${n}`,
  fullName,
  posicion: n,
  puntaje,
});

const HOY = new Date(2026, 9, 19, 10, 0);
const DIEZ = Array.from({ length: 12 }, (_, i) => entrada(i + 1, `Participante número ${i + 1}`, 120 - i * 7));

let raiz: ReactTestRenderer | null = null;
function dibujar(entradas: EntradaRankingDto[], tabla: 'general' | 'kilometros' = 'general', onListo?: () => void) {
  const podio = podioParaCompartir(entradas, tabla, '2026-10-19', HOY);
  act(() => {
    raiz = TestRenderer.create(React.createElement(TarjetaDelPodioParaCompartir, { podio, onListo }));
  });
  return raiz!;
}

const textos = (r: ReactTestRenderer) =>
  r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''));
const estiloDe = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) as Record<string, unknown>;
/** La columna del podio con ese `testID` (los tipos mínimos de `react-test-renderer` no traen `findByProps`). */
const columna = (r: ReactTestRenderer, lado: 'oro' | 'plata' | 'bronce') =>
  r.root.findAll(n => n.props.testID === `podio-${lado}` && (n.type as unknown) === 'View')[0];
const textoNodo = (r: ReactTestRenderer, contenido: string) =>
  r.root.findAll(n => (n.type as unknown) === 'Text' && React.Children.toArray(n.props.children).join('') === contenido)[0];

describe('el lienzo', () => {
  it('es 9:16: 540 × 960 dp que salen a 1080 × 1920 px, el doble exacto', () => {
    expect(ANCHO_DE_LA_TARJETA / ALTO_DE_LA_TARJETA).toBeCloseTo(9 / 16, 10);
    expect(SALIDA_PX).toEqual({ ancho: 1080, alto: 1920 });
    expect(SALIDA_PX.ancho / ANCHO_DE_LA_TARJETA).toBe(2);
    expect(SALIDA_PX.alto / ALTO_DE_LA_TARJETA).toBe(2);
    const r = dibujar(DIEZ);
    const lienzo = r.root.findAll(n => n.props.collapsable === false)[0];
    expect(estiloDe(lienzo)).toMatchObject({ width: 540, height: 960 });
  });

  it('la vista a capturar no se «optimiza» fuera del árbol nativo (`collapsable={false}`)', () => {
    const r = dibujar(DIEZ);
    expect(r.root.findAll(n => n.props.collapsable === false).length).toBeGreaterThan(0);
  });
});

describe('lo que dice', () => {
  it('el nombre de la tabla, la fecha y el podio: oro, plata y bronce con nombre y puntaje', () => {
    const r = dibujar(DIEZ);
    const t = textos(r);
    expect(t).toContain('Ranking general');
    expect(t).toContain('19 de octubre de 2026');
    expect(t).toContain('Renaser · 90 días');
    expect(t).toContain('Participante número 1');
    expect(t).toContain('Participante número 2');
    expect(t).toContain('Participante número 3');
    expect(textos({ root: columna(r, 'oro') } as unknown as ReactTestRenderer)).toEqual(['Participante número 1', '120 pts', '1']);
  });

  it('la lista va del 4.º al 10.º, con su número, nombre completo y puntaje; el 11.º y el 12.º no entran', () => {
    const r = dibujar(DIEZ);
    const t = textos(r);
    for (let n = 4; n <= 10; n += 1) {
      expect(t).toContain(`#${n}`);
      expect(t).toContain(`Participante número ${n}`);
    }
    expect(t).not.toContain('Participante número 11');
    expect(t).not.toContain('#11');
    expect(t).not.toContain('#3');
  });

  it('con menos de 10, solo las filas que hay; con 3 o menos, no hay lista; los lugares sin nadie quedan libres', () => {
    const cinco = textos(dibujar(DIEZ.slice(0, 5)));
    expect(cinco).toContain('#4');
    expect(cinco).toContain('#5');
    expect(cinco).not.toContain('#6');
    act(() => raiz?.unmount());

    const uno = dibujar(DIEZ.slice(0, 1));
    const t = textos(uno);
    expect(t.filter(x => x === 'Lugar libre')).toHaveLength(2);
    expect(t.filter(x => x === '—')).toHaveLength(2);
    expect(t.some(x => x.startsWith('#'))).toBe(false);
    expect(textos({ root: columna(uno, 'plata') } as unknown as ReactTestRenderer)).toEqual(['Lugar libre', '—', '2']);
  });

  it('en la tabla de kilómetros el puntaje lleva «km»', () => {
    const r = dibujar([entrada(1, 'Ana', 42.2), entrada(2, 'Beto', 7.5)], 'kilometros');
    const t = textos(r);
    expect(t).toContain('Ranking de kilómetros');
    expect(t.filter(x => /km$/.test(x))).toHaveLength(2);
  });

  it('un nombre largo llega con «…» y ni el podio ni la lista lo dejan pasar de su caja', () => {
    const largo = 'Juan Carlos Fernández Rodríguez de la Torre y Sánchez';
    const r = dibujar([entrada(1, largo), entrada(2, largo), entrada(3, largo), entrada(4, largo)]);
    const nombres = textos(r).filter(x => x.endsWith('…'));
    expect(nombres).toHaveLength(4);
    const enPodio = r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.numberOfLines === 2);
    const enLista = r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.numberOfLines === 1 && n.props.children === nombres[3]);
    expect(enPodio.length).toBe(3);
    expect(enLista).toHaveLength(1);
  });
});

describe('el diseño', () => {
  it('usa el fénix de Renaser y avisa cuando cargó o falló (captureRef no espera a las imágenes)', () => {
    let avisos = 0;
    const r = dibujar(DIEZ, 'general', () => {
      avisos += 1;
    });
    const fenix = r.root.findAll(n => n.type === Image)[0];
    expect(fenix.props.source).toBeTruthy();
    act(() => (fenix.props.onLoad as () => void)());
    act(() => (fenix.props.onError as () => void)());
    expect(avisos).toBe(2);
  });

  it('el título es la fuente display (≥ 24); todo lo demás, el resto de los roles en tipo oración y sin espaciar letras', () => {
    const r = dibujar(DIEZ);
    const todos = r.root.findAll(n => (n.type as unknown) === 'Text');
    const familias = new Set(todos.map(n => estiloDe(n).fontFamily));
    // `display` es la Bold (Inter no trae corte Display): el título se reconoce por su tamaño (≥ 24) y su espaciado negativo, y es el único así.
    expect([...familias].sort()).toEqual([fuentes.regular, fuentes.media, fuentes.negrita].sort());
    const conDisplay = todos.filter(n => estiloDe(n).fontFamily === fuentes.display && Number(estiloDe(n).fontSize) >= 24 && Number(estiloDe(n).letterSpacing ?? 0) < 0);
    expect(conDisplay).toHaveLength(1);
    for (const n of todos) expect(Number(estiloDe(n).letterSpacing ?? 0)).toBeLessThanOrEqual(0);
  });

  it('el texto se lee: nada de párrafo baja de 15 dp (30 px en la imagen) y las cifras son tabulares', () => {
    const r = dibujar(DIEZ);
    for (const n of r.root.findAll(nodo => (nodo.type as unknown) === 'Text')) {
      expect(estiloDe(n).fontSize as number).toBeGreaterThanOrEqual(15);
    }
    const puntaje = textoNodo(r, '120 pts');
    expect(estiloDe(puntaje).fontVariant).toEqual(['tabular-nums']);
  });

  it('no usa íconos ni emojis: se captura igual en Android, iOS y la web', () => {
    const r = dibujar(DIEZ);
    expect(textos(r).join('')).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(r.root.findAll(n => n.props.name !== undefined && n.props.size !== undefined)).toHaveLength(0);
  });
});
