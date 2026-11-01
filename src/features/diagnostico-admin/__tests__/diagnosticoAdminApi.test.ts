import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import {
  asignarFicha,
  borrarSeccion,
  confirmarImportacion,
  crearPregunta,
  crearSeccion,
  duplicarPregunta,
  editarPregunta,
  editarSeccion,
  leerBorradorDelDiagnostico,
  leerFichaDeLaPersona,
  leerVersionesDelDiagnostico,
  leerVistaPreviaDelDiagnostico,
  moverPregunta,
  ordenarSecciones,
  publicarDiagnostico,
  quitarPreguntas,
  RUTA_DE_LA_EXPORTACION,
  RUTA_DE_LA_PLANTILLA,
  restaurarPregunta,
  revisarImportacion,
} from '../api/diagnosticoAdminApi';

/** Las rutas, los verbos y los cuerpos del contrato §5 (`diagnostico-api.md`). */
const BASE = '/api/v1/admin/diagnostico';

describe('diagnosticoAdminApi', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({});
  });

  const ultima = () => mockApiFetch.mock.calls[mockApiFetch.mock.calls.length - 1];

  it('lee el borrador', async () => {
    mockApiFetch.mockResolvedValue({ secciones: [] });
    expect(await leerBorradorDelDiagnostico()).not.toBeNull();
    expect(ultima()[0]).toBe(BASE);
  });

  it('la vista previa pide la formación y la duración, y sin parámetros no manda ninguno', async () => {
    mockApiFetch.mockResolvedValue({ version: 3, titulo: 'x', secciones: [] });
    await leerVistaPreviaDelDiagnostico({ formacion: 'DIPLOMADO', duracionDias: 365 });
    expect(ultima()[0]).toBe(`${BASE}/vista-previa?formacion=DIPLOMADO&duracionDias=365`);
    await leerVistaPreviaDelDiagnostico();
    expect(ultima()[0]).toBe(`${BASE}/vista-previa`);
  });

  it('secciones: crear, editar, borrar y ordenar', async () => {
    await crearSeccion({ titulo: 'Nueva', descripcion: null });
    expect(ultima()).toEqual([`${BASE}/secciones`, { method: 'POST', body: { titulo: 'Nueva', descripcion: null } }]);
    await editarSeccion(32, { titulo: 'Otra' });
    expect(ultima()).toEqual([`${BASE}/secciones/32`, { method: 'PUT', body: { titulo: 'Otra' } }]);
    await borrarSeccion(32);
    expect(ultima()).toEqual([`${BASE}/secciones/32`, { method: 'DELETE' }]);
    await ordenarSecciones([31, 33, 32]);
    expect(ultima()).toEqual([`${BASE}/secciones/orden`, { method: 'PUT', body: { ids: [31, 33, 32] } }]);
  });

  it('preguntas: crear, editar, mover, duplicar, quitar y restaurar', async () => {
    const cuerpo = { seccionId: 32, texto: 'x', tipo: 'TEXTO' as const, requerida: false, opciones: [] };
    await crearPregunta(cuerpo);
    expect(ultima()).toEqual([`${BASE}/preguntas`, { method: 'POST', body: cuerpo }]);
    await editarPregunta(812, cuerpo);
    expect(ultima()).toEqual([`${BASE}/preguntas/812`, { method: 'PUT', body: cuerpo }]);
    await moverPregunta(812, { seccionId: 33, posicion: 0 });
    expect(ultima()).toEqual([`${BASE}/preguntas/812/mover`, { method: 'PUT', body: { seccionId: 33, posicion: 0 } }]);
    await duplicarPregunta(812);
    expect(ultima()).toEqual([`${BASE}/preguntas/812/duplicar`, { method: 'POST' }]);
    await quitarPreguntas([1, 2]);
    expect(ultima()).toEqual([`${BASE}/preguntas/quitar`, { method: 'POST', body: { ids: [1, 2], quitarDependientes: false } }]);
    await quitarPreguntas([1, 2], true);
    expect(ultima()[1]).toMatchObject({ body: { ids: [1, 2], quitarDependientes: true } });
    await restaurarPregunta(900);
    expect(ultima()).toEqual([`${BASE}/preguntas/900/restaurar`, { method: 'POST' }]);
  });

  it('publicar manda la versión base; las versiones se leen del historial', async () => {
    mockApiFetch.mockResolvedValue({ version: 4 });
    expect(await publicarDiagnostico(3)).toMatchObject({ version: 4 });
    expect(ultima()).toEqual([`${BASE}/publicar`, { method: 'POST', body: { versionBase: 3 } }]);
    mockApiFetch.mockResolvedValue([{ version: 4, preguntas: 29 }]);
    expect(await leerVersionesDelDiagnostico()).toHaveLength(1);
    expect(ultima()[0]).toBe(`${BASE}/versiones`);
  });

  it('importar: revisar y confirmar con el modo', async () => {
    mockApiFetch.mockResolvedValue({ secciones: 1, preguntas: 2 });
    expect(await revisarImportacion('a\tb')).toMatchObject({ secciones: 1, preguntas: 2 });
    expect(ultima()[0]).toBe(`${BASE}/importacion/vista-previa`);
    expect(ultima()[1]).toMatchObject({ method: 'POST', body: { texto: 'a\tb' } });
    await confirmarImportacion('a\tb', 'REEMPLAZAR');
    expect(ultima()[0]).toBe(`${BASE}/importacion`);
    expect(ultima()[1]).toMatchObject({ method: 'POST', body: { texto: 'a\tb', modo: 'REEMPLAZAR' } });
  });

  it('los dos archivos de texto tienen su ruta (los baja la descarga con sesión, no apiFetch)', () => {
    expect(RUTA_DE_LA_PLANTILLA).toBe(`${BASE}/plantilla.csv`);
    expect(RUTA_DE_LA_EXPORTACION).toBe(`${BASE}/exportar.csv`);
  });

  it('la ficha de una persona y la asignación en lote', async () => {
    mockApiFetch.mockResolvedValue({ ficha: 'CON_DIAGNOSTICO', estado: 'EN_CURSO' });
    expect(await leerFichaDeLaPersona('u 1')).toMatchObject({ ficha: 'CON_DIAGNOSTICO', estado: 'EN_CURSO' });
    expect(ultima()[0]).toBe(`${BASE}/personas/u%201`);
    mockApiFetch.mockResolvedValue({ asignadas: 1, omitidas: [] });
    expect(await asignarFicha(['u1', 'u2'], 'CON_DIAGNOSTICO')).toEqual({ asignadas: 1, omitidas: [] });
    expect(ultima()).toEqual([`${BASE}/personas/ficha`, { method: 'POST', body: { ids: ['u1', 'u2'], ficha: 'CON_DIAGNOSTICO' } }]);
  });
});
