/**
 * Registro con foto de los hábitos que exigen evidencia (pedido del dueño, 2026-09-26).
 */
import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import type { TrackDelDiaApi } from '../../types/habits.types';
import {
  avisoParaFoto,
  estadoParaFoto,
  registrarConFoto,
  respuestaValida,
  type DependenciasDelRegistro,
} from '../registroConFoto';

const AHORA = Date.parse('2026-09-26T15:00:00Z');

function track(extra: Partial<TrackDelDiaApi> = {}): TrackDelDiaApi {
  return {
    id: 'r-1',
    habitoId: 'h-1',
    fechaEjecucion: '2026-09-26',
    diaPrograma: 12,
    tipoDia: 'NORMAL',
    esOpcional: false,
    estado: 'PENDIENTE',
    puntosOtorgados: 0,
    respuestaTexto: null,
    calificacionProductividad: null,
    completadoEn: null,
    tituloHabito: 'Ducha fría',
    tipoHabito: 'CHECK',
    guia: null,
    horaDisparo: null,
    horaLimite: null,
    plazoEvidencia: '2026-09-26T23:00:00Z',
    tieneEvidencia: false,
    ...extra,
  };
}

const FOTO = { uri: 'file:///foto.jpg', mimeType: 'image/jpeg', tipo: 'FOTO' as const };

function dependencias(extra: Partial<DependenciasDelRegistro> = {}) {
  return {
    subirEvidencia: jest.fn(async () => ({ id: 'e-1' })),
    completar: jest.fn(async () => ({ puntosOtorgados: 10 })),
    tracksDeHoy: jest.fn(async () => [track()]),
    ...extra,
  };
}

describe('estadoParaFoto', () => {
  it('un registro pendiente de hoy está disponible', () => {
    expect(estadoParaFoto([track()], 'r-1', AHORA)).toEqual({ tipo: 'disponible', evidenciaYaSubida: false });
  });

  it('si el servidor ya tiene la evidencia, avisa que no hay que subirla de nuevo', () => {
    expect(estadoParaFoto([track({ tieneEvidencia: true })], 'r-1', AHORA)).toEqual({
      tipo: 'disponible',
      evidenciaYaSubida: true,
    });
  });

  it('completado, vencido o fallido no abren la cámara', () => {
    expect(estadoParaFoto([track({ estado: 'COMPLETADO' })], 'r-1', AHORA).tipo).toBe('completado');
    expect(estadoParaFoto([track({ estado: 'EXPIRADO' })], 'r-1', AHORA).tipo).toBe('vencido');
    expect(estadoParaFoto([track({ estado: 'FALLIDO' })], 'r-1', AHORA).tipo).toBe('vencido');
  });

  it('pasado el plazo cuenta como vencido aunque el estado no se haya actualizado', () => {
    expect(estadoParaFoto([track()], 'r-1', Date.parse('2026-09-26T23:00:01Z')).tipo).toBe('vencido');
  });

  it('un registro que ya no está entre los de hoy es de otro día (pantalla abierta pasada la medianoche)', () => {
    expect(estadoParaFoto([track({ id: 'r-2' })], 'r-1', AHORA).tipo).toBe('no-es-de-hoy');
    expect(avisoParaFoto({ tipo: 'no-es-de-hoy' })?.titulo).toBe('Tu día cambió');
    expect(avisoParaFoto({ tipo: 'disponible', evidenciaYaSubida: false })).toBeNull();
  });
});

describe('respuestaValida', () => {
  it('la respuesta es obligatoria: vacía o con puros espacios no vale', () => {
    expect(respuestaValida('')).toBe(false);
    expect(respuestaValida('   \n ')).toBe(false);
    expect(respuestaValida('Frío, pero bien')).toBe(true);
  });
});

describe('registrarConFoto', () => {
  it('sube la foto, avisa que quedó y recién ahí cierra con la respuesta', async () => {
    const orden: string[] = [];
    const completar = jest.fn(async (_id: string, _respuesta: string) => {
      orden.push('completar');
      return { puntosOtorgados: 10 };
    });
    const deps = dependencias({
      subirEvidencia: async () => {
        orden.push('subir');
        return {};
      },
      completar,
    });

    const resultado = await registrarConFoto(
      { registroId: 'r-1', archivo: FOTO, respuesta: '  Frío, pero bien ', evidenciaYaSubida: false },
      () => orden.push('confirmada'),
      deps
    );

    expect(orden).toEqual(['subir', 'confirmada', 'completar']);
    expect(completar).toHaveBeenCalledWith('r-1', 'Frío, pero bien');
    expect(resultado).toEqual({ puntosOtorgados: 10, yaEstabaCompletado: false });
  });

  it('un reintento con la evidencia ya subida solo cierra: no la duplica', async () => {
    const deps = dependencias();

    await registrarConFoto(
      { registroId: 'r-1', archivo: FOTO, respuesta: 'Bien', evidenciaYaSubida: true },
      () => undefined,
      deps
    );

    expect(deps.subirEvidencia).not.toHaveBeenCalled();
    expect(deps.completar).toHaveBeenCalledTimes(1);
  });

  it('si el cierre falla, la evidencia ya quedó marcada para no volver a subirla', async () => {
    const deps = dependencias({ completar: jest.fn(async () => Promise.reject(new ApiError(0, 'Sin conexión'))) });
    const alConfirmar = jest.fn();

    await expect(
      registrarConFoto({ registroId: 'r-1', archivo: FOTO, respuesta: 'Bien', evidenciaYaSubida: false }, alConfirmar, deps)
    ).rejects.toThrow('Sin conexión');
    expect(alConfirmar).toHaveBeenCalledTimes(1);
  });

  it('si la subida falla, no cierra ni marca la evidencia', async () => {
    const deps = dependencias({ subirEvidencia: jest.fn(async () => Promise.reject(new Error('S3 403'))) });
    const alConfirmar = jest.fn();

    await expect(
      registrarConFoto({ registroId: 'r-1', archivo: FOTO, respuesta: 'Bien', evidenciaYaSubida: false }, alConfirmar, deps)
    ).rejects.toThrow('S3 403');
    expect(alConfirmar).not.toHaveBeenCalled();
    expect(deps.completar).not.toHaveBeenCalled();
  });

  it('si el servidor rechaza el cierre porque ya estaba completado, lo da por bueno', async () => {
    const deps = dependencias({
      completar: jest.fn(async () => Promise.reject(new ApiError(409, 'Ya completado'))),
      tracksDeHoy: jest.fn(async () => [track({ estado: 'COMPLETADO', puntosOtorgados: 8 })]),
    });

    const resultado = await registrarConFoto(
      { registroId: 'r-1', archivo: null, respuesta: 'Bien', evidenciaYaSubida: true },
      () => undefined,
      deps
    );

    expect(resultado).toEqual({ puntosOtorgados: 8, yaEstabaCompletado: true });
  });

  it('un rechazo con el registro todavía abierto se informa tal cual', async () => {
    const deps = dependencias({ completar: jest.fn(async () => Promise.reject(new ApiError(400, 'Venció'))) });

    await expect(
      registrarConFoto({ registroId: 'r-1', archivo: null, respuesta: 'Bien', evidenciaYaSubida: true }, () => undefined, deps)
    ).rejects.toThrow('Venció');
  });

  it('sin respuesta no llama a nadie', async () => {
    const deps = dependencias();

    await expect(
      registrarConFoto({ registroId: 'r-1', archivo: FOTO, respuesta: '  ', evidenciaYaSubida: false }, () => undefined, deps)
    ).rejects.toThrow();
    expect(deps.subirEvidencia).not.toHaveBeenCalled();
  });
});
