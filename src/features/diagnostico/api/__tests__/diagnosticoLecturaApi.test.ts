import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
  ApiError: class ApiError extends Error {},
}));

import {
  lecturaParaAdministracion,
  lecturaParaElLider,
  lecturaParaElMentor,
  rutaDeLaLecturaParaAdministracion,
  rutaDeLaLecturaParaElLider,
  rutaDeLaLecturaParaElMentor,
} from '../diagnosticoLecturaApi';

const LECTURA = {
  persona: { id: 'p-1', nombre: 'María Pérez' },
  ficha: 'CON_DIAGNOSTICO',
  estado: 'COMPLETADO',
  version: 3,
  completadoEn: '2026-11-02T15:04:00Z',
  formacion: { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser' },
  secciones: [{ titulo: 'Tu vida hoy', preguntas: [{ id: 812, texto: '¿Tienes un negocio?', tipo: 'SELECCION_UNICA', retirada: false, respuesta: { texto: 'Sí.', valores: [], filas: [] } }] }],
};

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(LECTURA);
});

describe('las puertas de la lectura del diagnóstico de otra persona', () => {
  it('Administración y Alquimista leen por la persona, sin grupo', async () => {
    expect(rutaDeLaLecturaParaAdministracion('p-1')).toBe('/api/v1/admin/diagnostico/personas/p-1');
    await lecturaParaAdministracion('p-1');
    expect(mockApiFetch.mock.calls[0][0]).toBe('/api/v1/admin/diagnostico/personas/p-1');
  });

  it('el mentor o la guía leen por el grupo y el aprendiz', async () => {
    expect(rutaDeLaLecturaParaElMentor('g-1', 'u-2')).toBe('/api/v1/mentor/groups/g-1/learners/u-2/diagnostico');
    await lecturaParaElMentor('g-1', 'u-2');
    expect(mockApiFetch.mock.calls[0][0]).toBe('/api/v1/mentor/groups/g-1/learners/u-2/diagnostico');
  });

  it('el líder lee por el grupo y, sin grupo, por la persona', async () => {
    expect(rutaDeLaLecturaParaElLider('g-1', 'p-1')).toBe('/api/v1/leadership/groups/g-1/people/p-1/diagnostico');
    expect(rutaDeLaLecturaParaElLider(null, 'p-1')).toBe('/api/v1/leadership/people/p-1/diagnostico');
    await lecturaParaElLider('g-1', 'p-1');
    await lecturaParaElLider(null, 'p-1');
    expect(mockApiFetch.mock.calls.map(c => c[0])).toEqual([
      '/api/v1/leadership/groups/g-1/people/p-1/diagnostico',
      '/api/v1/leadership/people/p-1/diagnostico',
    ]);
  });

  it('un id con caracteres raros no cambia la ruta', () => {
    expect(rutaDeLaLecturaParaAdministracion('a/b?c')).toBe('/api/v1/admin/diagnostico/personas/a%2Fb%3Fc');
    expect(rutaDeLaLecturaParaElMentor('g/1', '../x')).toBe('/api/v1/mentor/groups/g%2F1/learners/..%2Fx/diagnostico');
  });

  it('devuelve la lectura leída con tolerancia', async () => {
    const lectura = await lecturaParaAdministracion('p-1');
    expect(lectura.persona?.nombre).toBe('María Pérez');
    expect(lectura.estado).toBe('COMPLETADO');
    expect(lectura.secciones[0].preguntas[0].respuesta?.texto).toBe('Sí.');
  });

  it('un cuerpo que no es una lectura queda como «sin diagnóstico», no revienta', async () => {
    mockApiFetch.mockResolvedValue('basura');
    const lectura = await lecturaParaElLider(null, 'p-1');
    expect(lectura.estado).toBe('NO_APLICA');
    expect(lectura.secciones).toEqual([]);
  });
});
