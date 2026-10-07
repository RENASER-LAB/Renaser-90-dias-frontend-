import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { ApiError } from '../../../../services/http/apiClient';
import { crearCierreSinRepetir, yaEstabaCompletado } from '../cierreDeRegistro';

/**
 * TRN-02 (e2e web del 27/09): doble toque en «Despertar». Salían dos `POST …/complete`, un 200 y un
 * 409, y la app mostraba «No pudimos registrar la hora / Este registro no puede completarse:
 * COMPLETADO» sobre algo que SÍ se había registrado (10 puntos, una vez).
 */
const completadoYa = () => new ApiError(409, 'Este registro no puede completarse: COMPLETADO');

describe('crearCierreSinRepetir', () => {
  it('dos toques seguidos hacen UN solo pedido', async () => {
    let soltar!: () => void;
    const completar = jest.fn((_id: string) => new Promise<void>(r => { soltar = r; }));
    const cerrar = crearCierreSinRepetir(completar);

    const primero = cerrar('track-despertar');
    const segundo = cerrar('track-despertar');
    await expect(segundo).resolves.toBe('en-curso');
    soltar();
    await expect(primero).resolves.toBe('cerrado');
    expect(completar).toHaveBeenCalledTimes(1);
  });

  it('otro registro no espera al primero', async () => {
    const completar = jest.fn(async (_id: string) => undefined);
    const cerrar = crearCierreSinRepetir(completar);
    await expect(Promise.all([cerrar('a'), cerrar('b')])).resolves.toEqual(['cerrado', 'cerrado']);
    expect(completar).toHaveBeenCalledTimes(2);
  });

  it('el 409 «no puede completarse: COMPLETADO» es un registro que ya estaba cerrado, no un error', async () => {
    const cerrar = crearCierreSinRepetir(async () => {
      throw completadoYa();
    });
    await expect(cerrar('track-despertar')).resolves.toBe('ya-estaba-cerrado');
  });

  it('cualquier otro error sigue siendo error, y después se puede reintentar', async () => {
    const vencido = new ApiError(409, 'El habito expiro — no se puede completar');
    const completar = jest
      .fn<(id: string) => Promise<void>>()
      .mockRejectedValueOnce(vencido)
      .mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor.'))
      .mockResolvedValueOnce(undefined);
    const cerrar = crearCierreSinRepetir(completar);

    await expect(cerrar('t')).rejects.toBe(vencido);
    await expect(cerrar('t')).rejects.toBeInstanceOf(ApiError);
    await expect(cerrar('t')).resolves.toBe('cerrado');
  });
});

describe('yaEstabaCompletado', () => {
  it('solo reconoce el 409 del registro ya COMPLETADO', () => {
    expect(yaEstabaCompletado(completadoYa())).toBe(true);
    expect(yaEstabaCompletado(new ApiError(409, 'Este registro no puede completarse: FALLIDO'))).toBe(false);
    expect(yaEstabaCompletado(new ApiError(500, 'Este registro no puede completarse: COMPLETADO'))).toBe(false);
    expect(yaEstabaCompletado(new Error('Este registro no puede completarse: COMPLETADO'))).toBe(false);
  });
});

describe('TrainingScreen', () => {
  const pantalla = fs.readFileSync(path.resolve(__dirname, '../../../../screens/TrainingScreen.tsx'), 'utf8');
  const cuerpoDe = (nombre: string) => {
    const desde = pantalla.indexOf(`const ${nombre} = async`);
    return desde < 0 ? '' : pantalla.slice(desde, pantalla.indexOf('\n  };', desde));
  };

  it('Despertar/Dormir y los hábitos sin evidencia cierran con el cierre sin repetir', () => {
    for (const nombre of ['registrarSoloHora', 'completarHabitoSimple']) {
      const cuerpo = cuerpoDe(nombre);
      // 2026-10-07: por `cerrarConRespuestaInmediata`, para que el check responda en el mismo toque (E-579).
      expect(cuerpo.includes('await cerrarConRespuestaInmediata(habit.id, () => cerrarUnaVez(habit.id))')).toBe(true);
      expect(cuerpo.includes('completarRegistro(')).toBe(false);
    }
  });

  it('un Despertar ya cumplido no vuelve a pedir el cierre (tocar la tarjeta o VER)', () => {
    expect(/if \(habit\.done\)/.test(cuerpoDe('registrarSoloHora'))).toBe(true);
  });
});
