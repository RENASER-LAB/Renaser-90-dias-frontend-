/**
 * Todo el onboarding dice el plazo de la formación de cada persona, no «90 días» (issue #103, identidad por formación en todo; ampliación del
 * 2026-11-02 sobre la ficha estándar). Un Diplomado de 3 meses o de 1 año veía «90 días» en el subtítulo de capítulo, el compromiso, la bienvenida,
 * los avisos y los campos del cuestionario. Con 90 días cada texto es EXACTAMENTE el de siempre.
 *
 * Contra el código anterior falla: los textos eran literales de 90 días, y `plazoEnFrases`, `usePlazoDeLaSesion` y las funciones del plazo no existían.
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

let mockPlazo = { plazo: '90 días', duracionDias: 90 };

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
jest.mock('../../../utils/tacto', () => ({
  tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined, toque: () => undefined },
}));
jest.mock('../../formaciones/hooks/usePlazoDeLaSesion', () => ({ usePlazoDeLaSesion: () => mockPlazo }));
jest.mock('../../../components/SignatureCanvas', () => ({ SignatureCanvas: () => null }));

import { alPlazo, diaDeLaEtapa, losProximos, plazoConArticulo } from '../../formaciones/utils/plazoEnFrases';
import { plazoDelObjetivo } from '../../objetivos/utils/nombreDelObjetivo';
import { ChapterCompromiso } from '../components/ChapterCompromiso';
import { ChapterCuerpo } from '../components/ChapterCuerpo';
import { ChapterNegocio } from '../components/ChapterNegocio';
import { CAMPOS_OBLIGATORIOS, textoDelAviso } from '../data/bloquesCuestionarioProfundo';
import { CHAPTERS_CONFIG, subtituloDelCapitulo } from '../data/chaptersConfig';
import { compromisosDelPacto, PACTO_COMPROMISOS } from '../data/pactoData';
import { BienvenidaScreen, etapasDelProgramaDe } from '../screens/BienvenidaScreen';
import { GongVictoriaScreen, hitosDeLaVictoria } from '../screens/GongVictoriaScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ESCUELA = { plazo: plazoDelObjetivo(90, 'ESCUELA'), duracionDias: 90 };
const DIPLOMADO_3 = { plazo: plazoDelObjetivo(90, 'DIPLOMADO'), duracionDias: 90 };
const DIPLOMADO_12 = { plazo: plazoDelObjetivo(365, 'DIPLOMADO'), duracionDias: 365 };

describe('el plazo dicho dentro de una frase', () => {
  it('artículo, contracción y «los próximos»: 90 días, 3 meses y 1 año', () => {
    expect([plazoConArticulo('90 días'), plazoConArticulo('3 meses'), plazoConArticulo('1 año')]).toEqual(['los 90 días', 'los 3 meses', 'el año']);
    expect([alPlazo('90 días'), alPlazo('3 meses'), alPlazo('1 año')]).toEqual(['a los 90 días', 'a los 3 meses', 'al año']);
    expect([losProximos('90 días'), losProximos('3 meses'), losProximos('1 año')]).toEqual([
      'los próximos 90 días',
      'los próximos 3 meses',
      'el próximo año',
    ]);
  });

  it('el día de una etapa se lleva a la duración de la persona: el Día 1 sigue siendo el 1 y el último es el último de SU programa', () => {
    expect([1, 30, 60, 90].map(d => diaDeLaEtapa(d, 90))).toEqual([1, 30, 60, 90]);
    expect([1, 30, 60, 90].map(d => diaDeLaEtapa(d, 365))).toEqual([1, 122, 243, 365]);
  });
});

describe('textos del onboarding que no se dibujan en esta versión, pero son del aprendiz', () => {
  it('el subtítulo del capítulo 3 dice el plazo de la formación; sin plazo, el de siempre', () => {
    const capitulo = CHAPTERS_CONFIG[2];
    expect(subtituloDelCapitulo(capitulo)).toBe('Capítulo 3 · Autorización de datos y decisión a 90 días');
    expect(subtituloDelCapitulo(capitulo, '3 meses')).toBe('Capítulo 3 · Autorización de datos y decisión a 3 meses');
    expect(subtituloDelCapitulo(capitulo, '1 año')).toBe('Capítulo 3 · Autorización de datos y decisión a 1 año');
    expect(subtituloDelCapitulo(CHAPTERS_CONFIG[0])).toBe('Capítulo 1 · Perfil personal, familiar y profesional');
  });

  it('los avisos del cuestionario nombran el plazo; los demás son texto fijo', () => {
    const avisos = Object.values(CAMPOS_OBLIGATORIOS)
      .flat()
      .map(x => x.aviso);
    const con90 = avisos.map(a => textoDelAviso(a, '90 días'));
    const con1Ano = avisos.map(a => textoDelAviso(a, '1 año'));
    expect(con90).toContain('Escribe tu objetivo SMART de Cuerpo a 90 días.');
    expect(con90).toContain('Escribe tu meta de facturación a 90 días (USD).');
    expect(con90).toContain('Ponle nombre a tu reto personal de 90 días.');
    expect(con1Ano).toContain('Escribe tu objetivo SMART de Negocio a 1 año.');
    expect(con1Ano.join(' ')).not.toMatch(/90/);
  });

  it('los compromisos del Pacto nombran el último día de SU programa', () => {
    expect(PACTO_COMPROMISOS[PACTO_COMPROMISOS.length - 1]).toBe('Llegar al Día 90 transformado, no entretenido.');
    const de365 = compromisosDelPacto(365);
    expect(de365[de365.length - 1]).toBe('Llegar al Día 365 transformado, no entretenido.');
  });

  it('el último hito de la victoria nombra el plazo', () => {
    const hitos90 = hitosDeLaVictoria('90 días');
    const hitos3 = hitosDeLaVictoria('3 meses');
    expect(hitos90[hitos90.length - 1]).toBe('Activaste tu protocolo innegociable de 90 días');
    expect(hitos3[hitos3.length - 1]).toBe('Activaste tu protocolo innegociable de 3 meses');
  });

  it('las etapas de la bienvenida: 01, 30, 60 y 90 con 90 días; 01, 122, 243 y 365 con un año', () => {
    expect(etapasDelProgramaDe(90).map(e => e.day)).toEqual(['DÍA 01', 'DÍA 30', 'DÍA 60', 'DÍA 90']);
    expect(etapasDelProgramaDe(365).map(e => e.day)).toEqual(['DÍA 01', 'DÍA 122', 'DÍA 243', 'DÍA 365']);
  });
});

/** Todo lo que se lee en una pantalla: el texto de cada `Text` y las propiedades de texto de los campos (etiqueta, ayuda, ejemplo, título). */
function loQueSeLee(raiz: ReactTestRenderer): string {
  const salida: string[] = [];
  for (const nodo of raiz.root.findAll(() => true)) {
    if (nodo.type === Text) {
      salida.push(
        [nodo.props.children]
          .flat(Infinity)
          .filter(x => typeof x === 'string' || typeof x === 'number')
          .join(''),
      );
    }
    for (const clave of ['label', 'placeholder', 'helperText', 'title', 'subtitle', 'accessibilityLabel'] as const) {
      if (typeof nodo.props[clave] === 'string') salida.push(nodo.props[clave] as string);
    }
  }
  return salida.join(' | ');
}

/** Monta la pantalla con el plazo de esa formación, lee todo lo que dice y la desmonta. */
function leer(elemento: () => React.ReactElement, plazo: { plazo: string; duracionDias: number }): string {
  mockPlazo = plazo;
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(elemento());
  });
  const texto = loQueSeLee(raiz);
  act(() => raiz.unmount());
  return texto;
}

const PANTALLAS: Record<string, () => React.ReactElement> = {
  'ChapterCompromiso': () =>
    React.createElement(ChapterCompromiso, {
      data: { porqueAhora: '', razonPrincipal: '', costoFracaso: '', dispuestoSoltar: '', compromisoFirmado: false } as never,
      onChange: () => undefined,
    }),
  'ChapterCuerpo': () =>
    React.createElement(ChapterCuerpo, {
      data: { peso: '', estatura: '', horasSueno: '', calidadSueno: 5, medicacion: '', smartCuerpo: '' },
      onChange: () => undefined,
    }),
  'ChapterNegocio': () =>
    React.createElement(ChapterNegocio, { data: { metaFacturacion: '', smartNegocio: '' } as never, onChange: () => undefined }),
  'BienvenidaScreen': () => React.createElement(BienvenidaScreen, { onContinue: () => undefined }),
  'GongVictoriaScreen': () => React.createElement(GongVictoriaScreen, { onEnterApp: () => undefined }),
};

describe('lo que lee la persona en las pantallas del onboarding', () => {
  it('con 90 días: exactamente lo de siempre', () => {
    const compromiso = leer(PANTALLAS.ChapterCompromiso, ESCUELA);
    expect(compromiso).toContain('Ratifico mi compromiso con los 90 días de Renaser');
    expect(compromiso).toContain('La razón no negociable por la que llegarás al Día 90...');
    const cuerpo = leer(PANTALLAS.ChapterCuerpo, ESCUELA);
    expect(cuerpo).toContain('OBJETIVO SMART DE CUERPO A 90 DÍAS');
    expect(cuerpo).toContain('al Día 90"');
    const negocio = leer(PANTALLAS.ChapterNegocio, ESCUELA);
    expect(negocio).toContain('META DE FACTURACIÓN A 90 DÍAS (USD)');
    expect(negocio).toContain('OBJETIVO SMART DE NEGOCIO A 90 DÍAS');
    const bienvenida = leer(PANTALLAS.BienvenidaScreen, ESCUELA);
    expect(bienvenida).toContain('LOS PRÓXIMOS 90 DÍAS');
    expect(bienvenida).toContain('90 días de compromiso, disciplina innegociable y evolución en 5 dimensiones.');
    expect(bienvenida).toContain('DÍA 90');
    expect(leer(PANTALLAS.GongVictoriaScreen, ESCUELA)).toContain('Activaste tu protocolo innegociable de 90 días');
  });

  it.each(Object.keys(PANTALLAS))('%s: con un Diplomado de 3 meses no nombra «90 días» y con uno de 1 año no dice «90» en ningún texto', nombre => {
    // Los 90 días del Diplomado de 3 meses duran lo mismo que los de la Escuela (su último día sigue siendo el Día 90), pero se NOMBRAN «3 meses».
    const de3Meses = leer(PANTALLAS[nombre], DIPLOMADO_3);
    expect(de3Meses.length).toBeGreaterThan(20);
    expect(de3Meses).not.toMatch(/\b90\s*d[ií]as\b/i);
    const deUnAno = leer(PANTALLAS[nombre], DIPLOMADO_12);
    expect(deUnAno).not.toMatch(/90|noventa/i);
  });

  it('con un año: «el año», «Día 365» y «EL PRÓXIMO AÑO»', () => {
    const compromiso = leer(PANTALLAS.ChapterCompromiso, DIPLOMADO_12);
    expect(compromiso).toContain('Ratifico mi compromiso con el año de Renaser');
    expect(compromiso).toContain('llegarás al Día 365...');
    const bienvenida = leer(PANTALLAS.BienvenidaScreen, DIPLOMADO_12);
    expect(bienvenida).toContain('EL PRÓXIMO AÑO');
    expect(bienvenida).toContain('1 año de compromiso, disciplina innegociable y evolución en 5 dimensiones.');
    expect(bienvenida).toContain('DÍA 365');
  });

  it('con 3 meses: «los 3 meses», «LOS PRÓXIMOS 3 MESES» y «OBJETIVO SMART DE CUERPO A 3 MESES»', () => {
    expect(leer(PANTALLAS.ChapterCompromiso, DIPLOMADO_3)).toContain('Ratifico mi compromiso con los 3 meses de Renaser');
    expect(leer(PANTALLAS.BienvenidaScreen, DIPLOMADO_3)).toContain('LOS PRÓXIMOS 3 MESES');
    expect(leer(PANTALLAS.ChapterCuerpo, DIPLOMADO_3)).toContain('OBJETIVO SMART DE CUERPO A 3 MESES');
  });
});

describe('el barrido: en todo onboarding/ el código ya no escribe «90 días» ni «Día 90» a mano', () => {
  const RAIZ = path.resolve(__dirname, '..');
  const sinComentarios = (f: string) => f.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  function archivos(carpeta: string): string[] {
    const salida: string[] = [];
    for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
      const ruta = path.join(carpeta, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name !== '__tests__') salida.push(...archivos(ruta));
      } else if (/\.tsx?$/.test(entrada.name)) {
        salida.push(ruta);
      }
    }
    return salida;
  }
  const CODIGO = archivos(RAIZ).map(a => ({ archivo: path.relative(RAIZ, a), fuente: sinComentarios(fs.readFileSync(a, 'utf8')) }));

  it('el barrido encuentra el código del onboarding (si no, no vigila nada)', () => {
    expect(CODIGO.length).toBeGreaterThan(40);
    expect(CODIGO.some(c => c.archivo.endsWith('FichaInicialScreen.tsx'))).toBe(true);
  });

  it.each(CODIGO.map(c => [c.archivo, c.fuente] as const))('%s no escribe el plazo a mano', (_archivo, fuente) => {
    expect(fuente).not.toMatch(/\b90\s*d[ií]as\b/i);
    expect(fuente).not.toMatch(/\bd[ií]a\s*90\b/i);
  });

  it('las pantallas que nombran el plazo lo toman de la sesión, con un solo mecanismo (usePlazoDeLaSesion)', () => {
    const quienes = [
      'components/ChapterCompromiso.tsx',
      'components/ChapterCuerpo.tsx',
      'components/ChapterNegocio.tsx',
      'screens/BienvenidaScreen.tsx',
      'screens/GongVictoriaScreen.tsx',
      'screens/CuestionarioProfundoScreen.tsx',
      'screens/FichaInicialScreen.tsx',
    ];
    for (const q of quienes) expect(CODIGO.find(c => c.archivo === q)?.fuente).toContain('usePlazoDeLaSesion()');
  });
});
