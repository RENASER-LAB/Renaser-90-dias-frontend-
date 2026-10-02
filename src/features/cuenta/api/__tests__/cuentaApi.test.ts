import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Contratos y llamadas de la eliminación de cuenta (D-243), y el campo nuevo `deletionScheduledFor`
 * de Administración, que tiene que aceptar un backend viejo (ausente) y `null`.
 */

const mockApiFetch = jest.fn(async (_ruta: string, _opciones?: unknown): Promise<unknown> => undefined);
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import { aprendizAdminSchema, detalleAprendizSchema } from '../../../admin/api/adminSchemas';
import { eliminarCuentaDePersona, recuperarCuentaDePersona } from '../../../admin/api/adminApi';
import {
  confirmarConCodigo,
  eliminarMiCuenta,
  enviarmeCodigoParaEliminar,
  leerComoSeConfirma,
  pedirCodigoPorCorreo,
} from '../cuentaApi';
import { comoSeConfirmaSchema, cuentaCerradaSchema } from '../cuentaSchemas';

const CERRADA = { cerradaEn: '2026-10-02T15:00:00Z', seBorraEl: '2026-11-01T15:00:00Z', diasDeGracia: 30 };

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('esquemas', () => {
  it('cómo se confirma: CONTRASENA o CODIGO, nada más', () => {
    expect(comoSeConfirmaSchema.safeParse({ confirmaCon: 'CONTRASENA', diasDeGracia: 30 }).success).toBe(true);
    expect(comoSeConfirmaSchema.safeParse({ confirmaCon: 'CODIGO', diasDeGracia: 30 }).success).toBe(true);
    expect(comoSeConfirmaSchema.safeParse({ confirmaCon: 'SMS', diasDeGracia: 30 }).success).toBe(false);
  });

  it('cuenta cerrada', () => {
    expect(cuentaCerradaSchema.safeParse(CERRADA).success).toBe(true);
    expect(cuentaCerradaSchema.safeParse({ cerradaEn: 'x' }).success).toBe(false);
  });

  it('deletionScheduledFor: ausente (backend viejo), null o una fecha, en la fila y en el detalle', () => {
    const fila = { id: '1', fullName: 'Ana', email: 'a@b.co', status: 'ACTIVE', programDay: 3, cellId: null, mentorId: null };
    expect(aprendizAdminSchema.safeParse(fila).success).toBe(true);
    expect(aprendizAdminSchema.safeParse({ ...fila, deletionScheduledFor: null }).success).toBe(true);
    const conFecha = aprendizAdminSchema.parse({ ...fila, deletionScheduledFor: '2026-11-01T15:00:00Z' });
    expect(conFecha.deletionScheduledFor).toBe('2026-11-01T15:00:00Z');

    const detalle = { id: '1', programDay: 3 };
    expect(detalleAprendizSchema.safeParse(detalle).success).toBe(true);
    const leido = detalleAprendizSchema.parse({ ...detalle, email: 'a@b.co', role: 'TRAINEE', deletionScheduledFor: null });
    expect(leido.role).toBe('TRAINEE');
    expect(leido.deletionScheduledFor).toBeNull();
  });
});

describe('llamadas con sesión (Yo)', () => {
  it('lee cómo se confirma', async () => {
    mockApiFetch.mockResolvedValueOnce({ confirmaCon: 'CODIGO', diasDeGracia: 30 });
    await expect(leerComoSeConfirma()).resolves.toEqual({ confirmaCon: 'CODIGO', diasDeGracia: 30 });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/users/me/account-deletion', undefined);
  });

  it('pide el código y elimina con contraseña o código', async () => {
    await enviarmeCodigoParaEliminar();
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/users/me/account-deletion/code', { method: 'POST' });

    mockApiFetch.mockResolvedValueOnce(CERRADA);
    await expect(eliminarMiCuenta({ contrasena: 'secreta' })).resolves.toEqual(CERRADA);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/users/me/account-deletion', {
      method: 'POST',
      body: { contrasena: 'secreta' },
    });

    mockApiFetch.mockResolvedValueOnce(CERRADA);
    await eliminarMiCuenta({ codigo: '123456' });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/users/me/account-deletion', {
      method: 'POST',
      body: { codigo: '123456' },
    });
  });
});

describe('llamadas sin sesión (web pública)', () => {
  it('no mandan el token aunque haya sesión', async () => {
    await pedirCodigoPorCorreo('ana@correo.com');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/account-deletion/request-code', {
      method: 'POST',
      body: { email: 'ana@correo.com' },
      conSesion: false,
    });
    mockApiFetch.mockResolvedValueOnce(CERRADA);
    await confirmarConCodigo('ana@correo.com', '123456');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/account-deletion/confirm', {
      method: 'POST',
      body: { email: 'ana@correo.com', codigo: '123456' },
      conSesion: false,
    });
  });
});

describe('Administración', () => {
  it('eliminar con el correo escrito, y recuperar', async () => {
    await eliminarCuentaDePersona('u 1', 'ana@correo.com');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/users/u%201/account-deletion', {
      method: 'POST',
      body: { confirmEmail: 'ana@correo.com' },
    });
    await recuperarCuentaDePersona('u1');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/users/u1/account-deletion/recover', { method: 'POST' });
  });
});
