/**
 * La Ficha Inicial dice el plazo de SU formación (issue #103, identidad por formación en todo).
 *
 * La ficha estándar —la que ve quien no tiene diagnóstico— decía «durante los 90 días», «me comprometo a los 90 días» y «compromiso a los 90
 * días» a todos, también a quien está en un Diplomado de 3 meses o de 1 año. Ahora el plazo sale de la formación de la persona
 * (`plazoDelObjetivo`, el mismo que usa «Tu programa empieza mañana»), y con 90 días las frases son EXACTAMENTE las de siempre.
 *
 * Contra el código anterior falla: los tres textos eran literales de 90 días.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../utils/tacto', () => ({
  tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined, toque: () => undefined },
}));

import { plazoDelObjetivo } from '../../../objetivos/utils/nombreDelObjetivo';
import { ChapterConsentimiento } from '../../components/ChapterConsentimiento';
import { INITIAL_FICHA_DATA } from '../chaptersConfig';
import { PASOS_FICHA, alPlazo, bajadaDelPaso, plazoConArticulo, validarCapitulo, validarPaso } from '../pasosFicha';
import type { FichaInicialData } from '../../types/onboarding.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Los tres plazos con que se nombra un programa, tal como los saca `plazoDelObjetivo` de lo que manda el servidor. */
const PLAZOS = {
  escuela: plazoDelObjetivo(90, 'ESCUELA'),
  diplomado3: plazoDelObjetivo(90, 'DIPLOMADO'),
  diplomado12: plazoDelObjetivo(365, 'DIPLOMADO'),
};

const SIN_COMPROMISO: FichaInicialData = {
  ...INITIAL_FICHA_DATA,
  consentimiento: { ...INITIAL_FICHA_DATA.consentimiento, autorizaUsoDatos: false, compromiso90Dias: false },
};

const paso = (id: string) => PASOS_FICHA.find(p => p.id === id)!;

describe('el plazo de cada formación', () => {
  it('«90 días» (Escuela), «3 meses» y «1 año» (Diplomado)', () => {
    expect(PLAZOS).toEqual({ escuela: '90 días', diplomado3: '3 meses', diplomado12: '1 año' });
  });

  it('con su artículo: «los 90 días», «los 3 meses», «el año»; y contraído: «a los 90 días», «a los 3 meses», «al año»', () => {
    expect(plazoConArticulo('90 días')).toBe('los 90 días');
    expect(plazoConArticulo('3 meses')).toBe('los 3 meses');
    expect(plazoConArticulo('1 año')).toBe('el año');
    expect(alPlazo('90 días')).toBe('a los 90 días');
    expect(alPlazo('3 meses')).toBe('a los 3 meses');
    expect(alPlazo('1 año')).toBe('al año');
  });
});

describe('«durante los 90 días» de «¿Qué esperas concretamente de Renaser?»', () => {
  it('sin plazo es la frase de siempre, palabra por palabra', () => {
    expect(bajadaDelPaso(paso('expectativa'))).toBe(
      'Detalla los cambios específicos que necesitas lograr en tu mente, cuerpo y negocio durante los 90 días.',
    );
  });

  it.each([
    ['Escuela', PLAZOS.escuela, 'durante los 90 días.'],
    ['Diplomado de 3 meses', PLAZOS.diplomado3, 'durante los 3 meses.'],
    ['Diplomado de 1 año', PLAZOS.diplomado12, 'durante el año.'],
  ])('%s: %s', (_formacion, plazo, final) => {
    const texto = bajadaDelPaso(paso('expectativa'), plazo)!;
    expect(texto.endsWith(final)).toBe(true);
    if (plazo !== '90 días') expect(texto).not.toContain('90');
  });

  it('las demás ayudas siguen siendo texto fijo', () => {
    expect(bajadaDelPaso(paso('nombre'))).toBe('Cómo deseas que te identifique tu mentor y el sistema');
    expect(bajadaDelPaso(paso('descanso'))).toBeUndefined();
  });
});

describe('«compromiso a los 90 días» del aviso de la casilla', () => {
  it('sin plazo es el aviso de siempre, palabra por palabra', () => {
    expect(validarPaso('consentimiento', SIN_COMPROMISO)).toEqual({
      titulo: 'Compromiso requerido',
      mensaje: 'Por favor marca la casilla de autorización de datos y compromiso a los 90 días para continuar.',
    });
  });

  it.each([
    [PLAZOS.diplomado3, 'compromiso a los 3 meses para continuar.'],
    [PLAZOS.diplomado12, 'compromiso al año para continuar.'],
  ])('con %s dice el de su formación', (plazo, final) => {
    const aviso = validarPaso('consentimiento', SIN_COMPROMISO, undefined, plazo);
    expect(aviso?.mensaje.endsWith(final)).toBe(true);
    expect(aviso?.mensaje).not.toContain('90');
  });

  it('el aviso de todo el capítulo también lo dice con el plazo de la persona', () => {
    const pendiente = validarCapitulo(2, SIN_COMPROMISO, undefined, PLAZOS.diplomado3);
    expect(pendiente?.aviso.mensaje).toContain('compromiso a los 3 meses');
  });
});

describe('«me comprometo a los 90 días» de la casilla del consentimiento', () => {
  let raiz: ReactTestRenderer | null = null;
  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
  });

  const montar = (plazo?: string) => {
    act(() => {
      raiz = TestRenderer.create(
        React.createElement(ChapterConsentimiento, { data: SIN_COMPROMISO.consentimiento, onChange: () => undefined, plazo }),
      );
    });
    const textos = raiz!.root.findAll(x => x.type === Text).map(x => [x.props.children].flat().join(''));
    const casilla = raiz!.root.findAll(x => x.props.accessibilityRole === 'checkbox')[0];
    return { textos, etiqueta: casilla.props.accessibilityLabel as string };
  };

  it('sin plazo dice lo de siempre', () => {
    const { textos, etiqueta } = montar();
    expect(textos).toContain('Autorizo el uso de mis datos y me comprometo a los 90 días');
    expect(etiqueta).toBe('Consentimiento y compromiso de 90 días');
  });

  it.each([
    [PLAZOS.diplomado3, 'Autorizo el uso de mis datos y me comprometo a los 3 meses', 'Consentimiento y compromiso de 3 meses'],
    [PLAZOS.diplomado12, 'Autorizo el uso de mis datos y me comprometo al año', 'Consentimiento y compromiso de 1 año'],
  ])('con %s dice el de su formación, también para el lector de pantalla', (plazo, texto, etiquetaEsperada) => {
    const { textos, etiqueta } = montar(plazo);
    expect(textos).toContain(texto);
    expect(etiqueta).toBe(etiquetaEsperada);
    expect(textos.join(' ')).not.toContain('90');
  });
});

describe('FichaInicialScreen', () => {
  const codigo = fs.readFileSync(path.resolve(__dirname, '../../screens/FichaInicialScreen.tsx'), 'utf8');

  it('toma el plazo de la formación de la sesión y lo pasa a la validación, a la ayuda del paso y a la casilla', () => {
    expect(codigo).toContain('useFormacionDeLaSesion()');
    expect(codigo).toContain('plazoDelObjetivo(formacion?.duracionDias, formacion?.activa?.codigo)');
    expect(codigo).toContain('validarPaso(paso.id, formData, undefined, plazo)');
    expect(codigo).toContain('validarCapitulo(capitulo, formData, undefined, plazo)');
    expect(codigo).toContain('bajadaDelPaso(paso, plazo)');
    expect(codigo).toContain('plazo={plazo}');
  });

  it('ninguno de los tres textos de la ficha estándar vuelve a ser un literal de 90 días', () => {
    const datos = fs.readFileSync(path.resolve(__dirname, '../pasosFicha.ts'), 'utf8');
    const casilla = fs.readFileSync(path.resolve(__dirname, '../../components/ChapterConsentimiento.tsx'), 'utf8');
    const sinComentarios = (f: string) => f.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(sinComentarios(datos)).not.toMatch(/durante los 90 días|compromiso a los 90 días/);
    expect(sinComentarios(casilla)).not.toMatch(/me comprometo a los 90 días|compromiso de 90 días/);
  });
});
