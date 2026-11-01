/**
 * El ranking de la Comunidad con la formación (spec 024): cada formación compara solo a los suyos; quien ve todas lo lee en «Todas»,
 * agrupado por formación, con las posiciones que mandó el servidor. La imagen del podio lleva el nombre de la formación que se mira.
 */
import { describe, expect, it } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { EntradaRankingDto } from '../../api/rankingApi';
import { agruparPorFormacion } from '../agruparPorFormacion';
import { podioParaCompartir } from '../podioParaCompartir';
import { TarjetaDelPodioParaCompartir } from '../../components/TarjetaDelPodioParaCompartir';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fila = (id: string, posicion: number, formation?: string | null, puntaje = 100 - posicion): EntradaRankingDto => ({
  participanteId: id,
  fullName: `Persona ${id}`,
  posicion,
  puntaje,
  ...(formation === undefined ? {} : { formation }),
});

describe('agrupar el ranking por formación', () => {
  it('reparte las filas sin reordenar ni recalcular: la posición es la que mandó el servidor, dentro de su formación', () => {
    const grupos = agruparPorFormacion([
      fila('d1', 1, 'DIPLOMADO'),
      fila('e1', 1, 'ESCUELA'),
      fila('d2', 2, 'DIPLOMADO'),
      fila('c1', 1, 'CERTIFICACION'),
      fila('e2', 2, 'ESCUELA'),
    ]);
    expect(grupos?.map(g => g.formacion)).toEqual(['ESCUELA', 'DIPLOMADO', 'CERTIFICACION']);
    expect(grupos?.map(g => g.entradas.map(e => `${e.participanteId}:${e.posicion}`))).toEqual([['e1:1', 'e2:2'], ['d1:1', 'd2:2'], ['c1:1']]);
  });

  it('una formación sin filas no aparece, y una fila sin formación (mezclada) cae en la Escuela', () => {
    const grupos = agruparPorFormacion([fila('d1', 1, 'DIPLOMADO'), fila('x', 2, null), fila('y', 3)]);
    expect(grupos?.map(g => g.formacion)).toEqual(['ESCUELA', 'DIPLOMADO']);
    expect(grupos?.[0].entradas.map(e => e.participanteId)).toEqual(['x', 'y']);
  });

  it('sin ninguna formación (un servidor anterior) o sin filas no hay grupos: la tabla es la de siempre', () => {
    expect(agruparPorFormacion([fila('a', 1), fila('b', 2)])).toBeNull();
    expect(agruparPorFormacion([fila('a', 1, null), fila('b', 2, '   ')])).toBeNull();
    expect(agruparPorFormacion([])).toBeNull();
  });
});

describe('la imagen del podio lleva la formación que se mira', () => {
  const HOY = new Date(2026, 9, 19, 10, 0);
  const filas = [fila('a', 1), fila('b', 2)];

  it('el nombre va en la cabecera y en el nombre del archivo', () => {
    const podio = podioParaCompartir(filas, 'general', '2026-10-19', HOY, 'Diplomado Renaser');
    expect(podio.formacion).toBe('Diplomado Renaser');
    expect(podio.nombreDelArchivo).toBe('podio-general-diplomado-renaser-2026-10-19.png');
    expect(podioParaCompartir(filas, 'kilometros', '2026-10-19', HOY, 'Certificación Renaser').nombreDelArchivo).toBe(
      'podio-kilometros-certificacion-renaser-2026-10-19.png',
    );
  });

  it('sin formación conocida (un backend anterior) la imagen y el archivo son los de siempre', () => {
    const podio = podioParaCompartir(filas, 'general', '2026-10-19', HOY);
    expect(podio.formacion).toBeNull();
    expect(podio.nombreDelArchivo).toBe('podio-general-2026-10-19.png');
    expect(podioParaCompartir(filas, 'general', '2026-10-19', HOY, '  ').formacion).toBeNull();
  });

  it('la tarjeta escribe la formación donde antes decía «Renaser · 90 días»', () => {
    let raiz: ReactTestRenderer | null = null;
    const textos = () =>
      raiz!.root
        .findAll(n => (n.type as unknown) === 'Text')
        .map(n => React.Children.toArray(n.props.children).join(''));
    act(() => {
      raiz = TestRenderer.create(
        React.createElement(TarjetaDelPodioParaCompartir, { podio: podioParaCompartir(filas, 'general', '2026-10-19', HOY, 'Diplomado Renaser') }),
      );
    });
    expect(textos()).toContain('Diplomado Renaser');
    expect(textos()).not.toContain('Renaser · 90 días');
    act(() => {
      raiz!.update(React.createElement(TarjetaDelPodioParaCompartir, { podio: podioParaCompartir(filas, 'general', '2026-10-19', HOY) }));
    });
    expect(textos()).toContain('Renaser · 90 días');
    act(() => raiz?.unmount());
  });
});
