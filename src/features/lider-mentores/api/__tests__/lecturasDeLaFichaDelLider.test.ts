import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import { ApiError } from '../../../../services/http/apiClient';
import {
  obtenerDiasDeLaPersona,
  obtenerObjetivosDeLaPersona,
  obtenerSemanaDeLaFicha,
  rutaDeLosDiasDeLaPersona,
  rutaDeLosObjetivosDeLaPersona,
  rutaDeLaSemanaDeLaFicha,
} from '../cumplimientoDelLiderApi';

/**
 * Las tres lecturas nuevas del líder para la ficha compartida (spec 056, contrato `api.md`, «Persona»): la semana de sábado a viernes
 * con `diaUno`, los colores de los días y los objetivos. Mismo criterio que las demás: validación tolerante, y un campo raro se
 * pierde él solo, no la ficha.
 */
beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('las rutas (contrato)', () => {
  it('semana, días y objetivos cuelgan de /leadership/people/{p}, sin puerta de grupo', () => { // spec 056 FR-017
    expect(rutaDeLaSemanaDeLaFicha('p1')).toBe('/api/v1/leadership/people/p1/semana');
    expect(rutaDeLaSemanaDeLaFicha('p1', '2026-11-20')).toBe('/api/v1/leadership/people/p1/semana?semanaHasta=2026-11-20');
    expect(rutaDeLosDiasDeLaPersona('p1', '2026-11-01', '2026-11-30')).toBe('/api/v1/leadership/people/p1/dias?desde=2026-11-01&hasta=2026-11-30');
    expect(rutaDeLosObjetivosDeLaPersona('p1')).toBe('/api/v1/leadership/people/p1/objetivos');
  });

  it('un id con «/» o «%» no cambia a qué ruta se llama', () => { // spec 056 FR-017
    expect(rutaDeLaSemanaDeLaFicha('a/b%c')).toBe('/api/v1/leadership/people/a%2Fb%25c/semana');
  });
});

describe('la semana de la ficha', () => {
  it('trae el día uno y dice quién es aunque el servidor no lo repita', async () => { // spec 056 FR-014
    mockApiFetch.mockResolvedValueOnce({ desde: '2026-11-14', hasta: '2026-11-20', diaUno: '2026-11-10', dias: [] });
    const semana = await obtenerSemanaDeLaFicha('p1', '2026-11-20');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/people/p1/semana?semanaHasta=2026-11-20', undefined);
    expect(semana.personaId).toBe('p1');
    expect(semana.diaUno).toBe('2026-11-10');
  });

  it('sin día uno (todavía no empieza su programa) es null, no un error', async () => { // spec 056 FR-014
    mockApiFetch.mockResolvedValueOnce({ desde: '2026-11-14', hasta: '2026-11-20', dias: [] });
    expect((await obtenerSemanaDeLaFicha('p1')).diaUno).toBeNull();
  });

  it('el pilar de cada hábito llega, y un valor que no es texto se lee como «sin pilar»', async () => { // spec 056 FR-014
    mockApiFetch.mockResolvedValueOnce({
      desde: '2026-11-14',
      hasta: '2026-11-20',
      dias: [
        {
          fecha: '2026-11-17',
          obligaciones: [
            { registroId: 'r1', titulo: 'Caminata', estadoHabito: 'COMPLETADO', pilar: 'cuerpo' },
            { registroId: 'r2', titulo: 'Oración', estadoHabito: 'PENDIENTE', pilar: null },
          ],
        },
      ],
    });
    const semana = await obtenerSemanaDeLaFicha('p1');
    expect(semana.dias[0].obligaciones.map(o => o.pilar)).toEqual(['CUERPO', null]);
  });

  it('una respuesta sin fechas no se dibuja a medias, y el motivo del servidor llega tal cual', async () => { // spec 056 FR-014
    mockApiFetch.mockResolvedValueOnce({ dias: [] });
    await expect(obtenerSemanaDeLaFicha('p1')).rejects.toThrow(/inesperad/);
    mockApiFetch.mockRejectedValueOnce(new ApiError(404, 'Esta persona no sigue su programa.', { codigo: 'SIN_PROGRAMA' }));
    await expect(obtenerSemanaDeLaFicha('p1')).rejects.toMatchObject({ status: 404, codigo: 'SIN_PROGRAMA' });
  });
});

describe('los días con color', () => {
  it('lee los colores del día igual que el mentor: un color que no se conoce es «sin datos», nunca verde', async () => { // spec 056 FR-018
    mockApiFetch.mockResolvedValueOnce({
      zona: 'America/Lima',
      diaUno: '2026-11-10',
      dias: [
        { fecha: '2026-11-10', color: 'verde', porcentaje: 100, estado: 'medido' },
        { fecha: '2026-11-11', color: 'ROJO', porcentaje: 0, estado: 'MEDIDO' },
        { fecha: '2026-11-12', color: 'AZUL', porcentaje: null },
        { fecha: '2026-11-13', estado: 'PAUSADO' },
      ],
    });
    const r = await obtenerDiasDeLaPersona('p1', '2026-11-01', '2026-11-30');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/people/p1/dias?desde=2026-11-01&hasta=2026-11-30', undefined);
    expect(r.zona).toBe('America/Lima');
    expect(r.diaUno).toBe('2026-11-10');
    expect(r.dias.map(d => [d.fecha, d.color, d.estado])).toEqual([
      ['2026-11-10', 'VERDE', 'MEDIDO'],
      ['2026-11-11', 'ROJO', 'MEDIDO'],
      ['2026-11-12', 'SIN_DATOS', 'SIN_DATOS'],
      ['2026-11-13', 'SIN_DATOS', 'PAUSADO'],
    ]);
  });
});

describe('los objetivos', () => {
  it('lee los del programa, el del mes y el de la semana', async () => { // spec 056 FR-016
    mockApiFetch.mockResolvedValueOnce({
      noventaDias: [
        { id: 'o1', titulo: 'Bajar a 75 kg', avance: 40 },
        { id: 'o2', titulo: 'Recuperar la confianza con mi hijo', avance: null },
      ],
      mes: { titulo: 'Caminar 20 días', avance: 55 },
      semana: { titulo: 'Tres caminatas', planificadas: 5, cumplidas: 3 },
    });
    const o = await obtenerObjetivosDeLaPersona('p1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/people/p1/objetivos', undefined);
    expect(o.noventaDias).toEqual([
      { id: 'o1', titulo: 'Bajar a 75 kg', avance: 40 },
      { id: 'o2', titulo: 'Recuperar la confianza con mi hijo', avance: null },
    ]);
    expect(o.mes).toEqual({ titulo: 'Caminar 20 días', avance: 55 });
    expect(o.semana).toEqual({ titulo: 'Tres caminatas', planificadas: 5, cumplidas: 3 });
  });

  it('sin mes ni semana quedan en null, y una lista ausente es vacía', async () => { // spec 056 FR-027
    mockApiFetch.mockResolvedValueOnce({ mes: null });
    expect(await obtenerObjetivosDeLaPersona('p1')).toEqual({ duracionDias: null, fase: null, noventaDias: [], mes: null, semana: null });
  });

  it('es tolerante: el avance se acota a 0–100, un avance que no es número es «sin cifra» y un objetivo sin título se descarta', async () => { // spec 056 FR-027
    mockApiFetch.mockResolvedValueOnce({
      noventaDias: [
        { id: 'o1', titulo: 'Uno', avance: 140 },
        { id: 'o2', titulo: 'Dos', avance: -5 },
        { id: 'o3', titulo: 'Tres', avance: 'mucho' },
        { id: 'o4', titulo: '   ', avance: 10 },
        { id: 'o5', avance: 10 },
      ],
      semana: { titulo: 'Cuatro', planificadas: 3, cumplidas: 9 },
    });
    const o = await obtenerObjetivosDeLaPersona('p1');
    expect(o.noventaDias.map(x => [x.titulo, x.avance])).toEqual([
      ['Uno', 100],
      ['Dos', 0],
      ['Tres', null],
    ]);
    /* Más cumplidas que planificadas no se dice: se acota. */
    expect(o.semana).toEqual({ titulo: 'Cuatro', planificadas: 3, cumplidas: 3 });
  });

  it('un 404 o un 403 llegan como ApiError, para que quien la muestra no dibuje nada', async () => { // spec 056 FR-027
    mockApiFetch.mockRejectedValueOnce(new ApiError(404, 'No existe'));
    await expect(obtenerObjetivosDeLaPersona('p1')).rejects.toMatchObject({ status: 404 });
    mockApiFetch.mockRejectedValueOnce(new ApiError(403, 'Fuera de su alcance', { codigo: 'FUERA_DE_SU_ALCANCE' }));
    await expect(obtenerObjetivosDeLaPersona('p1')).rejects.toMatchObject({ status: 403, codigo: 'FUERA_DE_SU_ALCANCE' });
  });
});
