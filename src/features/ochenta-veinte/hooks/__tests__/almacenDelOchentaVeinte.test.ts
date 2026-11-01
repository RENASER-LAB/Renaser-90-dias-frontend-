import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import type { CargarOchentaVeinte, VistaDelPeriodo } from '../../types/ochentaVeinte.types';
import { AlmacenDelOchentaVeinte } from '../useOchentaVeinte';

/**
 * La política de lectura de «Tu 80/20» (spec 031): cada periodo se pide UNA vez mientras la hoja o la ficha está abierta; un fallo no
 * se guarda como dato ni se reintenta solo; un 403 o un 404 esconden la sección entera. Abrir un periodo cerrado muchas veces cuesta
 * una lectura, y ninguna llama a la IA (eso lo hace el barrido del servidor).
 */

function vista(inicio: string, extra: Partial<VistaDelPeriodo> = {}): VistaDelPeriodo {
  return {
    tipo: 'SEMANA',
    numero: 1,
    inicio,
    fin: inicio,
    cerrado: true,
    anterior: null,
    siguiente: null,
    cifras: {
      desde: inicio,
      hasta: inicio,
      planificadas: 0,
      cumplidas: 0,
      diasConAcciones: 0,
      porVenir: 0,
      impactoPlanificado: 0,
      impactoCumplido: 0,
      porcentajeCumplidas: null,
      verdes: null,
      veintePorCiento: null,
      porEje: [],
      lasQueMasMovieron: [],
      lasQueSeFueron: [],
      cumplioLoQueMenosMovia: false,
      cierre: null,
    },
    semanas: [],
    estado: 'EN_CURSO',
    falta: [],
    minimoDeAcciones: 5,
    codigoRenaser: null,
    analisis: null,
    generadoEn: null,
    ...extra,
  };
}

describe('AlmacenDelOchentaVeinte', () => {
  it('pide cada periodo una sola vez y la segunda vez no hay nada que esperar', async () => {
    const cargar = jest.fn<CargarOchentaVeinte>(async (_tipo, inicio) => vista(inicio ?? '2026-10-26'));
    const a = new AlmacenDelOchentaVeinte(cargar);
    await a.pedir('SEMANA', null);
    expect(a.pedir('SEMANA', null)).toBeNull();
    expect(a.datosDe('SEMANA', null)?.inicio).toBe('2026-10-26');
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('dos pedidos juntos comparten el mismo vuelo', async () => {
    const cargar = jest.fn<CargarOchentaVeinte>(async () => vista('2026-10-26'));
    const a = new AlmacenDelOchentaVeinte(cargar);
    const uno = a.pedir('SEMANA', null);
    const dos = a.pedir('SEMANA', null);
    await Promise.all([uno, dos]);
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('el periodo en curso queda guardado también con su fecha: volver a él con las flechas no repite el pedido', async () => {
    const cargar = jest.fn<CargarOchentaVeinte>(async () => vista('2026-10-26'));
    const a = new AlmacenDelOchentaVeinte(cargar);
    await a.pedir('SEMANA', null);
    expect(a.pedir('SEMANA', '2026-10-26')).toBeNull();
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('semana y mes son lecturas distintas', async () => {
    const cargar = jest.fn<CargarOchentaVeinte>(async (tipo, inicio) => vista(inicio ?? '2026-10-26', { tipo }));
    const a = new AlmacenDelOchentaVeinte(cargar);
    await a.pedir('SEMANA', null);
    await a.pedir('MES', null);
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it('un fallo de red no se guarda como dato, no se reintenta solo y «Reintentar» lo vuelve a pedir', async () => {
    let falla = true;
    const cargar = jest.fn<CargarOchentaVeinte>(async () => {
      if (falla) throw new ApiError(0, 'sin red');
      return vista('2026-10-26');
    });
    const a = new AlmacenDelOchentaVeinte(cargar);
    await a.pedir('SEMANA', null);
    expect(a.falloDe('SEMANA', null)).toBe('sin_red');
    expect(a.datosDe('SEMANA', null)).toBeNull();
    expect(a.pedir('SEMANA', null)).toBeNull();
    expect(a.oculto).toBe(false);

    falla = false;
    a.olvidarFallo('SEMANA', null);
    await a.pedir('SEMANA', null);
    expect(a.falloDe('SEMANA', null)).toBeNull();
    expect(a.datosDe('SEMANA', null)).not.toBeNull();
  });

  it.each([
    [404, 'no_disponible'],
    [403, 'sin_permiso'],
  ])('un %s esconde la sección entera para esa persona', async (status, fallo) => {
    const cargar = jest.fn<CargarOchentaVeinte>(async () => {
      throw new ApiError(status, 'no');
    });
    const a = new AlmacenDelOchentaVeinte(cargar);
    await a.pedir('SEMANA', null);
    expect(a.falloDe('SEMANA', null)).toBe(fallo);
    expect(a.oculto).toBe(true);
    expect(a.pedir('MES', null)).toBeNull(); // oculta: ni siquiera pregunta por el mes
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('un 500 es un fallo que se puede reintentar, no oculta nada', async () => {
    const cargar = jest.fn<CargarOchentaVeinte>(async () => {
      throw new ApiError(500, 'boom');
    });
    const a = new AlmacenDelOchentaVeinte(cargar);
    await a.pedir('SEMANA', null);
    expect(a.falloDe('SEMANA', null)).toBe('error');
    expect(a.oculto).toBe(false);
  });
});
