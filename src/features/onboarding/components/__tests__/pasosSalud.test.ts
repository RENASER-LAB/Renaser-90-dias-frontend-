import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { TextInput } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Dos errores del capítulo «Descanso y salud» que estaban en producción y se vieron en el emulador
 * el 2026-10-05 al pasar la ficha a un paso por pantalla (bitácora del backend). Las dos pruebas
 * fallan contra el `ChapterSalud` de antes:
 *
 * 1. **La medicación no se podía escribir.** El campo llamaba a `onChange` DOS veces seguidas con
 *    la misma `data` (una por `especificacionMedicacion`, otra por `motivoMedicacion`); la segunda
 *    pisaba a la primera y el texto volvía a quedar vacío. Quien tomaba medicación no podía pasar
 *    del capítulo («Medicación requerida»).
 * 2. **Arrastrar la calidad del sueño borraba las horas recién escritas.** El `PanResponder` del
 *    deslizador guardaba el `onChange` del dibujo en que se midió el riel, con la ficha de ESE
 *    momento adentro.
 */

const mockTacto = { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() };

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../utils/tacto', () => ({
  get tacto() {
    return mockTacto;
  },
}));

import { PasoDescanso, PasoMedicacion } from '../ChapterSalud';
import { INITIAL_FICHA_DATA } from '../../data/chaptersConfig';
import type { FichaSaludData } from '../../types/onboarding.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

beforeEach(() => {
  mockTacto.seleccion.mockReset();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

/** Un toque falso para el `PanResponder`: lo único que usa el deslizador es `locationX`. */
function toqueEn(x: number) {
  const toque = {
    touchActive: true,
    startPageX: x,
    startPageY: 0,
    startTimeStamp: 0,
    currentPageX: x,
    currentPageY: 0,
    currentTimeStamp: 1,
    previousPageX: x,
    previousPageY: 0,
    previousTimeStamp: 0,
  };
  return {
    nativeEvent: { locationX: x, touches: [], changedTouches: [] },
    touchHistory: { numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: 1, touchBank: [toque] },
  };
}

describe('Medicación', () => {
  it('lo que se escribe queda escrito: un solo cambio, con los dos campos', () => {
    const onChange = jest.fn<(data: FichaSaludData) => void>();
    const data: FichaSaludData = { ...INITIAL_FICHA_DATA.salud, tomaMedicacionRegular: true };
    act(() => {
      raiz = TestRenderer.create(React.createElement(PasoMedicacion, { data, onChange }));
    });

    const campo = raiz!.root.findAll(
      n => n.type === TextInput && n.props.accessibilityLabel === 'Especifica tu medicación y motivo de la toma',
    )[0];
    act(() => campo.props.onChangeText('Levotiroxina'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ especificacionMedicacion: 'Levotiroxina', motivoMedicacion: 'Levotiroxina' }),
    );
  });
});

describe('Calidad del sueño', () => {
  it('arrastrar el deslizador no devuelve las horas al valor de antes', () => {
    const primero = jest.fn<(data: FichaSaludData) => void>();
    const data: FichaSaludData = { ...INITIAL_FICHA_DATA.salud, horasSueno: '7.5', calidadSueno: 5 };
    act(() => {
      raiz = TestRenderer.create(React.createElement(PasoDescanso, { data, onChange: primero }));
    });

    // El riel se mide (esto rearma el `PanResponder`)…
    const riel = () => raiz!.root.findAll(n => typeof n.props.onResponderGrant === 'function' && typeof n.props.onLayout === 'function')[0];
    act(() => riel().props.onLayout({ nativeEvent: { layout: { width: 300, height: 32, x: 0, y: 0 } } }));

    // …y DESPUÉS la persona escribe 6 horas: llega una `data` nueva con su `onChange` nuevo.
    const despues = jest.fn<(data: FichaSaludData) => void>();
    act(() => raiz!.update(React.createElement(PasoDescanso, { data: { ...data, horasSueno: '6' }, onChange: despues })));

    act(() => {
      riel().props.onResponderGrant(toqueEn(300));
    });

    expect(primero).not.toHaveBeenCalled();
    expect(despues).toHaveBeenLastCalledWith(expect.objectContaining({ horasSueno: '6', calidadSueno: 10 }));
    // Un «tic» háptico por el punto nuevo que cruzó el dedo.
    expect(mockTacto.seleccion).toHaveBeenCalledTimes(1);
  });
});
