/**
 * Training abre en MAÑANA en el Día 0 (issue #107, E2E final del 2026-11-02): a quien su programa empieza mañana la lista de hoy le quedaba vacía
 * («Hoy no tienes nada planificado.», media pantalla en blanco); ahora abre en la vista de un día que viene, con lo planificado, y la fila «Tu programa
 * empieza el …» sigue arriba.
 *
 * Contra el código anterior falla: no existían `diaInicialDeTraining` ni `useDiaInicialDeTraining`, y Training abría siempre en hoy.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { diaInicialDeTraining } from '../../utils/diaInicialDeTraining';
import { useDiaInicialDeTraining } from '../useDiaInicialDeTraining';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// 2026-11-02 es lunes: 03 martes … 08 domingo.
describe('diaInicialDeTraining', () => {
  it('el programa empieza mañana: abre en mañana', () => {
    expect(diaInicialDeTraining({ hoyIso: '2026-11-02', fechaDeInicio: '2026-11-03' })).toBe('2026-11-03');
    expect(diaInicialDeTraining({ hoyIso: '2026-11-07', fechaDeInicio: '2026-11-08' })).toBe('2026-11-08');
  });

  it.each([
    ['sin fecha de inicio (el programa ya corre, o no se sabe)', null],
    ['sin dato todavía', undefined],
    ['empieza hoy', '2026-11-02'],
    ['empieza pasado mañana', '2026-11-04'],
    ['ya empezó', '2026-10-20'],
  ])('%s: se queda en hoy', (_caso, fechaDeInicio) => {
    expect(diaInicialDeTraining({ hoyIso: '2026-11-02', fechaDeInicio })).toBeNull();
  });

  it('hoy es domingo: mañana es de otra semana, que Training no muestra, así que se queda en hoy', () => {
    expect(diaInicialDeTraining({ hoyIso: '2026-11-08', fechaDeInicio: '2026-11-09' })).toBeNull();
  });

  it('cruza de mes y de año', () => {
    expect(diaInicialDeTraining({ hoyIso: '2026-12-30', fechaDeInicio: '2026-12-31' })).toBe('2026-12-31');
    expect(diaInicialDeTraining({ hoyIso: '2026-10-30', fechaDeInicio: '2026-10-31' })).toBe('2026-10-31');
  });
});

describe('useDiaInicialDeTraining', () => {
  let raiz: ReactTestRenderer | null = null;
  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
  });

  type Props = { hoyIso: string; fechaDeInicio: string | null | undefined; hayDiaElegido: boolean };
  const alElegir = jest.fn<(iso: string) => void>();
  function Sonda(props: Props) {
    useDiaInicialDeTraining({ ...props, alElegir });
    return null;
  }
  const montar = (props: Props) => {
    alElegir.mockClear();
    act(() => {
      raiz = TestRenderer.create(React.createElement(Sonda, props));
    });
  };
  const actualizar = (props: Props) => act(() => raiz!.update(React.createElement(Sonda, props)));

  it('el programa empieza mañana: elige mañana, una sola vez', () => {
    montar({ hoyIso: '2026-11-02', fechaDeInicio: '2026-11-03', hayDiaElegido: false });
    expect(alElegir).toHaveBeenCalledTimes(1);
    expect(alElegir).toHaveBeenCalledWith('2026-11-03');
    actualizar({ hoyIso: '2026-11-02', fechaDeInicio: '2026-11-03', hayDiaElegido: true });
    expect(alElegir).toHaveBeenCalledTimes(1);
  });

  it('si la persona toca hoy después, no se la vuelve a llevar a mañana', () => {
    montar({ hoyIso: '2026-11-02', fechaDeInicio: '2026-11-03', hayDiaElegido: false });
    // Elige hoy (`diaElegido` vuelve a `null`): el hook no insiste.
    actualizar({ hoyIso: '2026-11-02', fechaDeInicio: '2026-11-03', hayDiaElegido: true });
    actualizar({ hoyIso: '2026-11-02', fechaDeInicio: '2026-11-03', hayDiaElegido: false });
    expect(alElegir).toHaveBeenCalledTimes(1);
  });

  it('mientras no se sabe cuándo empieza no hace nada, y cuando llega la fecha, lo aplica', () => {
    montar({ hoyIso: '2026-11-02', fechaDeInicio: undefined, hayDiaElegido: false });
    expect(alElegir).not.toHaveBeenCalled();
    actualizar({ hoyIso: '2026-11-02', fechaDeInicio: '2026-11-03', hayDiaElegido: false });
    expect(alElegir).toHaveBeenCalledWith('2026-11-03');
  });

  it('si la persona ya eligió otro día antes de que llegara la fecha, no se le cambia', () => {
    montar({ hoyIso: '2026-11-02', fechaDeInicio: undefined, hayDiaElegido: true });
    actualizar({ hoyIso: '2026-11-02', fechaDeInicio: '2026-11-03', hayDiaElegido: true });
    expect(alElegir).not.toHaveBeenCalled();
  });

  it('con el programa en marcha (sin fecha de inicio) o empezando hoy, no hace nada', () => {
    montar({ hoyIso: '2026-11-02', fechaDeInicio: null, hayDiaElegido: false });
    actualizar({ hoyIso: '2026-11-02', fechaDeInicio: '2026-11-02', hayDiaElegido: false });
    expect(alElegir).not.toHaveBeenCalled();
  });

  it('al pasar la medianoche decide de nuevo para el día nuevo', () => {
    montar({ hoyIso: '2026-11-02', fechaDeInicio: '2026-11-03', hayDiaElegido: false });
    actualizar({ hoyIso: '2026-11-03', fechaDeInicio: '2026-11-03', hayDiaElegido: false });
    // El Día 1 ya es hoy: no hay nada que elegir, y la decisión de ayer no se arrastra.
    expect(alElegir).toHaveBeenCalledTimes(1);
  });
});

describe('TrainingScreen', () => {
  const codigo = fs.readFileSync(path.resolve(__dirname, '../../../../screens/TrainingScreen.tsx'), 'utf8');

  it('abre en mañana con el hook, usando la fecha de inicio de «Tu programa empieza…» y la fila sigue arriba', () => {
    expect(codigo).toContain("from '../features/training/hooks/useDiaInicialDeTraining'");
    expect(codigo).toMatch(/useDiaInicialDeTraining\(\{[\s\S]*?fechaDeInicio: programaQueEmpiezaPronto\?\.fechaInicio,[\s\S]*?alElegir: alElegirDia,/);
    expect(codigo).toContain('<FilaDelProgramaQueEmpieza');
  });
});
