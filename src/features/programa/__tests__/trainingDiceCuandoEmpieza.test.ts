/**
 * Training dice cuándo empieza el programa de quien empieza mañana (issue #101, E2E del 2026-11-02).
 *
 * A quien activó su programa y su Día 1 es mañana, Training le mostraba un día cualquiera —«Hoy no tienes nada planificado.», la semana, un evento y dos
 * tercios de pantalla en blanco— mientras Hoy y Plan decían «Tu programa empieza el martes 3 de noviembre». Ahora Training lo dice arriba, con la MISMA
 * fila (`FilaCompacta`, ícono `calendarRange`) y el MISMO texto (`vistaDelProgramaQueEmpieza`).
 *
 * Contra el código anterior falla: no existían `programaQueEmpieza` ni `FilaDelProgramaQueEmpieza`, y `TrainingScreen` no decía nada.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

import { FilaDelProgramaQueEmpieza } from '../components/FilaDelProgramaQueEmpieza';
import type { ArranquePrograma } from '../hooks/useArranqueDelPrograma';
import { vistaDeLaFilaDelPrograma, vistaDelProgramaQueEmpieza } from '../utils/filaDelPrograma';
import { programaQueEmpieza } from '../utils/programaQueEmpieza';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EN_CURSO_CON_FECHA: ArranquePrograma = { estado: 'EN_CURSO', fechaInicio: '2026-11-03' };

describe('programaQueEmpieza (issue #101): cuándo Training tiene que decirlo', () => {
  it('activado, día 0 y Día 1 mañana: dice la fecha', () => {
    expect(programaQueEmpieza({ inscrito: true, diaPrograma: 0, arranque: EN_CURSO_CON_FECHA })).toEqual({ fechaInicio: '2026-11-03' });
  });

  it('activado, día 0, sin fecha del servidor: lo dice igual, sin inventar la fecha', () => {
    expect(programaQueEmpieza({ inscrito: true, diaPrograma: 0, arranque: { estado: 'EN_CURSO' } })).toEqual({ fechaInicio: null });
  });

  it.each([
    ['el programa ya corre (día 1)', { inscrito: true, diaPrograma: 1, arranque: EN_CURSO_CON_FECHA }],
    ['sin fila en el programa', { inscrito: false, diaPrograma: 0, arranque: EN_CURSO_CON_FECHA }],
    ['sin saber si tiene fila', { inscrito: undefined, diaPrograma: 0, arranque: EN_CURSO_CON_FECHA }],
    ['sin saber el día todavía', { inscrito: true, diaPrograma: null, arranque: EN_CURSO_CON_FECHA }],
    ['mientras se comprueba', { inscrito: true, diaPrograma: 0, arranque: { estado: 'CARGANDO' } as ArranquePrograma }],
    ['con la lectura fallida', { inscrito: true, diaPrograma: 0, arranque: { estado: 'ERROR', reintentar: () => undefined } as ArranquePrograma }],
    ['sin activar el programa (ya tiene su aviso)', { inscrito: true, diaPrograma: 0, arranque: { estado: 'PENDIENTE_ELEGIR' } as ArranquePrograma }],
    ['empieza pasado mañana o más tarde (ya tiene su aviso)', { inscrito: true, diaPrograma: 0, arranque: { estado: 'ESPERANDO_INICIO', fechaInicio: '2026-11-05' } as ArranquePrograma }],
  ])('no dice nada: %s', (_caso, entrada) => {
    expect(programaQueEmpieza(entrada)).toBeNull();
  });
});

describe('el texto es el de Hoy y Plan', () => {
  it('«Tu programa empieza el martes 3 de noviembre», y «pronto» sin fecha', () => {
    expect(vistaDelProgramaQueEmpieza('2026-11-03').titulo).toBe('Tu programa empieza el martes 3 de noviembre');
    expect(vistaDelProgramaQueEmpieza(null).titulo).toBe('Tu programa empieza pronto');
  });

  it('Hoy y Plan leen la misma frase de la misma función', () => {
    expect(vistaDeLaFilaDelPrograma({ entrada: 'ESPERANDO_INICIO', plazo: '90 días', fechaInicio: '2026-11-03' })).toEqual(
      vistaDelProgramaQueEmpieza('2026-11-03'),
    );
  });
});

describe('FilaDelProgramaQueEmpieza', () => {
  let raiz: ReactTestRenderer | null = null;
  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
  });

  it('es una línea informativa: el texto, el ícono del calendario, sin chevron ni botón', () => {
    act(() => {
      raiz = TestRenderer.create(React.createElement(FilaDelProgramaQueEmpieza, { fechaInicio: '2026-11-03' }));
    });
    const textos = raiz!.root.findAll(x => x.type === Text).map(x => [x.props.children].flat().join(''));
    expect(textos).toEqual(['Tu programa empieza el martes 3 de noviembre']);
    const iconos = raiz!.root.findAll(x => typeof x.props.name === 'string' && typeof x.props.size === 'number').map(x => x.props.name);
    expect(iconos).toEqual(['calendarRange']);
    expect(raiz!.root.findAll(x => x.props.accessibilityRole === 'button')).toHaveLength(0);
  });
});

describe('TrainingScreen', () => {
  const codigo = fs.readFileSync(path.resolve(__dirname, '../../../screens/TrainingScreen.tsx'), 'utf8');

  it('arriba de la lista del día dice cuándo empieza, con la fila compartida', () => {
    expect(codigo).toContain("from '../features/programa/components/FilaDelProgramaQueEmpieza'");
    expect(codigo).toMatch(/programaQueEmpieza\(\{ inscrito, diaPrograma: cargandoDiaPrograma \? null : diaPrograma, arranque \}\)/);
    const fila = codigo.indexOf('<FilaDelProgramaQueEmpieza');
    const lista = codigo.indexOf('<TrainingPorHora');
    expect(fila).toBeGreaterThan(-1);
    expect(lista).toBeGreaterThan(fila);
  });
});
