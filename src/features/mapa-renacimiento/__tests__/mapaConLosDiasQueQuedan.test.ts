import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Los «83 días» escritos a mano en los pasos del Mapa (pedido del dueño del 2026-10-05, mismo bug que el
 * «DÍA 7» de la apertura): la pregunta de la prioridad (V02), la de Relaciones (V05), el aviso de carga
 * del sistema de ejecución (V06) y el cierre (V11, su texto y su botón «Comenzar mis 83 días»). Eran
 * 90 − 7, de cuando el Mapa vivía en el Día 7; una cuenta en el día 15 leía 75 en Hoy y 83 acá.
 *
 * Contra el código anterior falla: las pantallas dibujaban «83 días» sin importar el día, y
 * `avisosDeCarga` no recibía nada con qué decir otro número.
 */

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

import { CierreScreen } from '../screens/CierreScreen';
import { ObjetivoRelacionesScreen } from '../screens/ObjetivoRelacionesScreen';
import { PrioridadScreen } from '../screens/PrioridadScreen';
import type { PropsPaso } from '../screens/props';
import { avisosDeCarga, LIMITES } from '../reglas';
import { textosConLosDiasQueQuedan, type ProgramaParaElMapa } from '../textosDeApertura';
import { mapaVacio, type AccionMotora } from '../tipos';
import { diasQueQuedan, diasQueQuedanSiSeSabe, lapsoQueQueda } from '../../home/utils/diasQueQuedan';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DIA_15: ProgramaParaElMapa = { diaPrograma: 15, inscrito: true, loading: false };
const CARGANDO: ProgramaParaElMapa = { diaPrograma: 0, inscrito: false, loading: true };
const SIN_LECTURA: ProgramaParaElMapa = { diaPrograma: 0, inscrito: false, loading: false };
const DIA_89: ProgramaParaElMapa = { diaPrograma: 89, inscrito: true, loading: false };

const PANTALLAS = { PrioridadScreen, ObjetivoRelacionesScreen, CierreScreen } as const;

function montar(nombre: keyof typeof PANTALLAS, programa: ProgramaParaElMapa): ReactTestRenderer {
  const estado = {
    mapa: mapaVacio(),
    actualizar: () => undefined,
    siguiente: () => undefined,
    anterior: () => undefined,
  };
  const props: PropsPaso = { estado: estado as never, onSalir: () => undefined, dias: textosConLosDiasQueQuedan(programa) };
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(PANTALLAS[nombre], props));
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

describe('los pasos del Mapa con los días que de verdad quedan', () => {
  it('en el día 15 dicen 75, la cuenta de Hoy, y ninguno dice 83', () => {
    expect(diasQueQuedan(15)).toBe(75);
    const prioridad = textos(montar('PrioridadScreen', DIA_15));
    expect(prioridad).toContain('Si durante los próximos 75 días solo pudieras transformar profundamente un área');
    const relaciones = textos(montar('ObjetivoRelacionesScreen', DIA_15));
    expect(relaciones).toContain('¿Qué relación quieres fortalecer o transformar durante los próximos 75 días?');
    const cierre = textos(montar('CierreScreen', DIA_15));
    expect(cierre).toContain('resultados observables durante los próximos 75 días.');
    expect(cierre).toContain('Comenzar mis 75 días');
    for (const texto of [prioridad, relaciones, cierre]) expect(texto).not.toMatch(/83/);
  });

  it('mientras no se sabe el día (cargando o sin lectura) no muestran ningún número y la frase no queda rota', () => {
    for (const programa of [CARGANDO, SIN_LECTURA]) {
      const prioridad = textos(montar('PrioridadScreen', programa));
      const relaciones = textos(montar('ObjetivoRelacionesScreen', programa));
      const cierre = textos(montar('CierreScreen', programa));
      // «Próximo control: 7 días» es la revisión semanal del cierre, no los días del programa.
      for (const texto of [prioridad, relaciones, cierre.replace('Próximo control: 7 días', '')]) {
        expect(texto).not.toMatch(/\d+ días/);
      }
      expect(prioridad).toContain('Si durante lo que queda del programa solo pudieras');
      expect(relaciones).toContain('durante lo que queda del programa?');
      expect(cierre).toContain('resultados observables durante lo que queda del programa.');
      expect(cierre).toContain('Comenzar mi ruta');
    }
  });

  it('con un día por delante no dice «los próximos 1 días»', () => {
    const cierre = textos(montar('CierreScreen', DIA_89));
    expect(cierre).toContain('durante el día que queda.');
    expect(cierre).toContain('Comenzar mi último día');
    expect(cierre).not.toMatch(/1 días/);
  });

  it('el aviso de carga del sistema de ejecución (V06) dice los mismos días', () => {
    const pesada: AccionMotora[] = [7, 7, 7, 7, 7].map((frecuenciaSemanal, i) => ({
      id: `a${i}`, area: 'salud', texto: 'Caminar 30 minutos', frecuenciaSemanal, dias: [], momento: null, evidencia: null,
    }));
    expect(pesada.reduce((s, a) => s + a.frecuenciaSemanal, 0)).toBeGreaterThan(LIMITES.cargaSemanalMaxima);
    expect(avisosDeCarga(pesada, textosConLosDiasQueQuedan(DIA_15).lapso)[0].mensaje)
      .toBe('Revisa si esta frecuencia puede sostenerse durante los próximos 75 días.');
    expect(avisosDeCarga(pesada, textosConLosDiasQueQuedan(CARGANDO).lapso)[0].mensaje)
      .toBe('Revisa si esta frecuencia puede sostenerse durante lo que queda del programa.');
    // Sin días, tampoco inventa un número.
    expect(avisosDeCarga(pesada)[0].mensaje).not.toMatch(/\d/);
    expect(avisosDeCarga(pesada.slice(0, 1), 'los próximos 75 días')).toEqual([]);
  });

  it('el flujo lee el día UNA vez y se lo pasa a cada paso; la pantalla de V06 usa ese lapso', () => {
    const raiz = path.resolve(__dirname, '..');
    const flujo = fs.readFileSync(path.join(raiz, 'MapaRenacimientoFlow.tsx'), 'utf-8');
    expect(flujo).toContain('const dias = textosConLosDiasQueQuedan(useProgramaDia());');
    expect(flujo).toContain('const props = { estado, onSalir, dias };');
    const v06 = fs.readFileSync(path.join(raiz, 'screens', 'SistemaEjecucionScreen.tsx'), 'utf-8');
    expect(v06).toContain('avisosDeCarga(mapa.acciones, dias.lapso)');
    // Ninguna pantalla del Mapa vuelve a leer el día por su cuenta ni a escribir «83».
    for (const archivo of fs.readdirSync(path.join(raiz, 'screens'))) {
      const codigo = fs.readFileSync(path.join(raiz, 'screens', archivo), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
      expect({ archivo, leeElDia: codigo.includes('useProgramaDia(') }).toEqual({ archivo, leeElDia: false });
      expect({ archivo, ochentaYTres: /\b83\b/.test(codigo) }).toEqual({ archivo, ochentaYTres: false });
    }
  });
});

describe('la cuenta compartida con Hoy', () => {
  it('sin día conocido, sin inscripción o cargando, no hay número', () => {
    expect(diasQueQuedanSiSeSabe({ diaPrograma: 15, inscrito: true, cargando: false })).toBe(75);
    expect(diasQueQuedanSiSeSabe({ diaPrograma: 0, inscrito: true, cargando: false })).toBe(90);
    expect(diasQueQuedanSiSeSabe({ diaPrograma: undefined, inscrito: undefined, cargando: false })).toBeNull();
    expect(diasQueQuedanSiSeSabe({ diaPrograma: 15, inscrito: false, cargando: false })).toBeNull();
    expect(diasQueQuedanSiSeSabe({ diaPrograma: 15, inscrito: true, cargando: true })).toBeNull();
  });

  it('dicha en palabras', () => {
    expect(lapsoQueQueda(75)).toBe('los próximos 75 días');
    expect(lapsoQueQueda(1)).toBe('el día que queda');
    expect(lapsoQueQueda(null)).toBe('lo que queda del programa');
  });
});
