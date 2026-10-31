/**
 * El título de una línea en la fila de Training quedaba ~7 dp más arriba que la hora y el botón (E2E del 31/10, capturas
 * `04-training-*`). La cuenta lo explica sin mirar la pantalla: el área de la fila mide 48 como mínimo con 6 de relleno, o sea
 * 36 de alto útil, y el texto mide 22: (36 − 22) / 2 = 7. El título estaba arriba porque su caja (`flex: 1` dentro de una
 * columna) crecía a lo alto que sobraba y el texto se quedaba en su borde de arriba; con dos líneas (44) no sobra nada y se
 * veía centrado. Acá se fija que esa caja ya no crece y que la columna del nombre centra lo que tiene.
 */
import { describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import React from 'react';

import { crear } from '../../../fenix/__tests__/ayudasDePrueba';
import { TituloQueSeTacha } from '../../../habits/celebracion/TarjetaQueCelebra';

jest.mock('react-native-reanimated', () => {
  const doble = require('react-native-reanimated/mock');
  return { ...doble, useReducedMotion: () => false };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const estiloPlano = (estilo: unknown) => Object.assign({}, ...[estilo].flat(3).filter(Boolean));

describe('el título de la fila de Training', () => {
  it('mide lo que mide su texto: la caja que lo envuelve no crece hacia abajo', () => {
    const raiz = crear(
      React.createElement(TituloQueSeTacha, {
        registroId: 'r1',
        texto: 'Kilómetros diarios',
        cumplido: false,
        style: { fontSize: 16, lineHeight: 22 },
        colorDeLaRaya: '#000',
      }),
    );
    const caja = raiz.root.findAll(n => (n.type as unknown) === 'View')[0];
    const estilo = estiloPlano(caja.props.style);
    expect(estilo.flex).toBeUndefined();
    expect(estilo.flexGrow).toBeUndefined();
    expect(estilo.flexShrink).toBe(1);
  });

  it('la columna del nombre lo centra si el área de la fila le sobra alto', () => {
    const fuente = fs.readFileSync(path.resolve(__dirname, '..', 'FilaDelDia.tsx'), 'utf-8');
    expect(fuente).toMatch(/texto:\s*\{[^}]*justifyContent:\s*'center'/);
  });
});
