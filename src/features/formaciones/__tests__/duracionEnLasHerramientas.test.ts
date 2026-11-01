import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../admin/api/adminApi', () => ({ obtenerDetalleAprendiz: jest.fn() }));

import { obtenerDetalleAprendiz } from '../../admin/api/adminApi';
import { useDuracionDelPrograma } from '../../admin/hooks/useDuracionDelPrograma';
import {
  DIA_MAXIMO,
  acotarDia,
  mensajeDelErrorDeCambio,
  moverDia,
  ultimoDiaAjustable,
  validarCambioDeDia,
} from '../../admin/utils/diaDelPrograma';
import { ApiError } from '../../../services/http/apiClient';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const raizDelRepo = path.resolve(__dirname, '../../../..');
const fuente = (ruta: string) => fs.readFileSync(path.join(raizDelRepo, ruta), 'utf8');

describe('el último día que se puede fijar a mano es el de SU programa', () => {
  it('89 en la Escuela, 364 en el Diplomado de un año, y 89 si no se sabe', () => {
    expect(ultimoDiaAjustable(90)).toBe(89);
    expect(ultimoDiaAjustable(365)).toBe(364);
    expect(ultimoDiaAjustable(null)).toBe(DIA_MAXIMO);
    expect(ultimoDiaAjustable(undefined)).toBe(DIA_MAXIMO);
    expect(ultimoDiaAjustable(0)).toBe(DIA_MAXIMO);
  });

  it('los botones mueven y acotan con el máximo de la persona', () => {
    expect(acotarDia(500)).toBe(89);
    expect(acotarDia(500, 364)).toBe(364);
    expect(moverDia(363, 5, 364)).toBe(364);
    expect(moverDia(2, -9, 364)).toBe(1);
    expect(moverDia(88, 5)).toBe(89);
  });

  it('el día 200 vale en un año y no en 90; el último día no se fija en ninguno', () => {
    expect(validarCambioDeDia({ diaActual: 300, diaNuevo: 200, motivo: 'Viajó', diaMaximo: 364 })).toEqual({
      ok: true,
      cuerpo: { programDay: 200, motivo: 'Viajó' },
    });
    const enLaEscuela = validarCambioDeDia({ diaActual: 80, diaNuevo: 200, motivo: 'Viajó' });
    expect(enLaEscuela).toEqual({ ok: false, error: 'Escribe un día entre 1 y 89.' });
    expect(validarCambioDeDia({ diaActual: 80, diaNuevo: 365, motivo: 'x', diaMaximo: 364 })).toEqual({
      ok: false,
      error: 'Escribe un día entre 1 y 364.',
    });
  });

  it('el aviso de un rechazo del servidor dice el rango de la persona', () => {
    expect(mensajeDelErrorDeCambio(new ApiError(400, 'x'), 364)).toContain('entre 1 y 364');
    expect(mensajeDelErrorDeCambio(new ApiError(400, 'x'))).toContain('entre 1 y 89');
  });
});

describe('useDuracionDelPrograma', () => {
  const detalle = obtenerDetalleAprendiz as jest.MockedFunction<typeof obtenerDetalleAprendiz>;
  let raiz: ReactTestRenderer | null = null;
  let valor = 0;
  const Sonda = ({ conocida }: { conocida: number | null | undefined }) => {
    valor = useDuracionDelPrograma('p1', conocida);
    return null;
  };

  beforeEach(() => {
    detalle.mockReset();
    valor = 0;
  });
  afterEach(() => {
    act(() => raiz?.unmount());
    raiz = null;
  });

  it('si la ficha ya la sabe, se usa y no se pide nada', async () => {
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(Sonda, { conocida: 365 }));
    });
    expect(valor).toBe(365);
    expect(detalle).not.toHaveBeenCalled();
  });

  it('si no la sabe (el aviso de emergencia del chat), la lee del detalle; mientras tanto y si falla, 90', async () => {
    let soltar: (d: { programDuration: number }) => void = () => undefined;
    detalle.mockReturnValueOnce(new Promise(resolver => { soltar = resolver as never; }) as never);
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(Sonda, { conocida: undefined }));
    });
    expect(valor).toBe(90);
    await act(async () => soltar({ programDuration: 365 }));
    expect(valor).toBe(365);

    act(() => raiz?.unmount());
    detalle.mockRejectedValueOnce(new Error('sin red'));
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(Sonda, { conocida: null }));
    });
    expect(valor).toBe(90);
  });
});

describe('dónde se usan los días de SU programa', () => {
  it('«Cambiar día del programa» acota con la duración de la persona y la ficha se la pasa', () => {
    const pantalla = fuente('src/features/admin/screens/CambiarDiaScreen.tsx');
    expect(pantalla).toContain('useDuracionDelPrograma(aprendizId, duracionDias)');
    expect(pantalla).toContain('ultimoDiaAjustable(duracion)');
    expect(pantalla).not.toContain('de 90.');
    expect(fuente('src/features/admin/screens/FichaAprendizScreen.tsx')).toContain('duracionDias={programa.detalle.programDuration}');
  });

  it('El Método dice los días y el rango de las fases de SU programa', () => {
    const yo = fuente('src/screens/YoScreen.tsx');
    expect(yo).toContain('metodoFasesDe(duracionDelPrograma)');
    expect(yo).toContain('${metodoFases.length} fases en ${duracionDelPrograma} días');
  });
});
