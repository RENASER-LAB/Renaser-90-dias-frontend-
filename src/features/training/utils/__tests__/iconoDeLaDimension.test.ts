/**
 * El ícono de cada dimensión de Training, en un solo lugar (pedido del dueño, 2026-10-05).
 *
 * Contra el código anterior falla: `ICONO_DE_LA_DIMENSION` no existía; Training tenía su propia tabla
 * (`DIMENSIONES_CONFIG.icon`: Cuerpo `body`, Espíritu `spark`), el respaldo de los hábitos otra copia
 * (`ICONO_DE_LINEA_POR_CATEGORIA`), `sparkles` no era un ícono (caía al chevron del `default`),
 * `brain` y `heart` eran trazos propios en caja de 22, y el paso «Hitos» del Mapa dibujaba Salud con
 * el corazón y Relaciones con `users` (su propia tabla, no la de los ejes).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { GROSOR_TRAZO_PX, Icon, type IconName } from '../../../../components/Icon';
import { ICONO_DE_LINEA_POR_CATEGORIA, iconoDeLineaDeHabito } from '../../../habits/utils/iconosDeHabito';
import { ICONO_DEL_EJE } from '../../../objetivos/utils/iconoDelEje';
import { DIMENSION_POR_CATEGORIA } from '../dimensionDelHabito';
import { ICONO_DE_LA_DIMENSION, iconoDeLaDimension } from '../iconoDeLaDimension';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SRC = path.resolve(__dirname, '../../../..');
const leer = (relativo: string) => fs.readFileSync(path.join(SRC, relativo), 'utf-8');

/** Sin comentarios de bloque (también `{/* … *\/}` de JSX) ni de línea (sin tocar `https://`). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function dibujar(nombre: IconName, size: number): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(Icon, { name: nombre, size, color: '#000' }));
  });
  return raiz;
}

describe('ICONO_DE_LA_DIMENSION: la fuente única', () => {
  it('cada dimensión con su ícono', () => {
    expect(ICONO_DE_LA_DIMENSION).toEqual({
      CUERPO: 'activity',
      MENTE: 'brain',
      EMOCIONES: 'heart',
      'ESPÍRITU': 'sparkles',
      'VIDA Y NEGOCIO': 'briefcase',
    });
    expect(iconoDeLaDimension('ESPÍRITU')).toBe('sparkles');
  });

  it('un concepto, un dibujo: Cuerpo y Vida y negocio son los de los ejes Cuerpo y Negocio', () => {
    expect(ICONO_DE_LA_DIMENSION.CUERPO).toBe(ICONO_DEL_EJE.CUERPO);
    expect(ICONO_DE_LA_DIMENSION['VIDA Y NEGOCIO']).toBe(ICONO_DEL_EJE.TRABAJO);
  });

  it('son cinco dibujos distintos, ninguno el monigote ni el asterisco de antes', () => {
    const iconos = Object.values(ICONO_DE_LA_DIMENSION);
    expect(new Set(iconos).size).toBe(5);
    expect(iconos).not.toContain('body');
    expect(iconos).not.toContain('spark');
  });

  it('el respaldo de un hábito sin ícono propio es el de su dimensión (no una copia)', () => {
    for (const [categoria, dimension] of Object.entries(DIMENSION_POR_CATEGORIA)) {
      expect({ categoria, icono: ICONO_DE_LINEA_POR_CATEGORIA[categoria] }).toEqual({ categoria, icono: ICONO_DE_LA_DIMENSION[dimension] });
      expect(iconoDeLineaDeHabito({ iconKey: null, category: categoria })).toBe(ICONO_DE_LA_DIMENSION[dimension]);
    }
    expect(Object.keys(ICONO_DE_LINEA_POR_CATEGORIA).sort()).toEqual(['BODY', 'CONSCIENCE', 'MIND', 'SPIRIT']);
  });

  it('Training no tiene tabla propia: la lista y el detalle preguntan a la fuente única', () => {
    const training = sinComentarios(leer('screens/TrainingScreen.tsx'));
    expect(training).not.toMatch(/\bicon:\s*'/);
    expect((training.match(/<Icon name=\{iconoDeLaDimension\((d|selectedDimension)\.key\)\}/g) ?? []).length).toBe(2);
  });

  it('el paso «Hitos» del Mapa usa el ícono del eje, no una tabla propia', () => {
    const hitos = sinComentarios(leer('features/mapa-renacimiento/screens/HitosScreen.tsx'));
    expect(hitos).not.toMatch(/const ICONO\b/);
    expect(hitos).toContain('<Icon name={iconoDelEje(EJE_POR_AREA[area])}');
  });
});

describe('los dibujos de las dimensiones', () => {
  const ICONOS = leer('components/Icon.tsx');

  it('se dibujan en caja de 24 (no caen al chevron) con el trazo de 1,75 px a 16, 20 y 24', () => {
    for (const nombre of Object.values(ICONO_DE_LA_DIMENSION)) {
      for (const size of [16, 20, 24]) {
        const raiz = dibujar(nombre, size);
        const svg = raiz.root.findAll(n => n.type === Svg)[0];
        expect({ nombre, viewBox: svg.props.viewBox }).toEqual({ nombre, viewBox: nombre === 'briefcase' ? '0 0 22 22' : '0 0 24 24' });
        const lado = nombre === 'briefcase' ? 22 : 24;
        const trazos = [Path, Circle, Rect].flatMap(tipo => raiz.root.findAll(n => n.type === tipo));
        expect(trazos.length).toBeGreaterThan(0);
        for (const trazo of trazos) {
          expect((Number(trazo.props.strokeWidth) * size) / lado).toBeCloseTo(GROSOR_TRAZO_PX, 6);
        }
      }
    }
  });

  it('`brain`, `heart` y `sparkles` tienen la forma de Lucide y viven en el bloque «Dimensiones»', () => {
    const bloque = ICONOS.slice(ICONOS.indexOf('/* Dimensiones */'));
    expect(ICONOS).toContain('/* Dimensiones */');
    const forma: Record<string, string> = {
      brain: 'M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4',
      heart: 'M2 9.5a5.5 5.5 0 0 1 9.591-3.676',
      sparkles: 'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558',
    };
    for (const [nombre, trazo] of Object.entries(forma)) {
      expect(bloque).toContain(`case '${nombre}':`);
      expect((ICONOS.match(new RegExp(`case '${nombre}':`, 'g')) ?? []).length).toBe(1);
      const caso = bloque.slice(bloque.indexOf(`case '${nombre}':`));
      expect(caso.slice(0, caso.indexOf('</Svg>'))).toContain(trazo);
    }
    const linea = ICONOS.split('\n').find(l => /^\s*\| 'sparkles'/.test(l));
    expect(linea).toBeDefined();
  });

  it('`spark` y `body` siguen existiendo para lo que aún los usa (Sparkie, el Pacto, la firma, el onboarding, el Mapa)', () => {
    expect(ICONOS).toContain("case 'spark':");
    expect(ICONOS).toContain("case 'body':");
  });
});
