import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string, opciones?: { method?: string; body?: unknown }) => mockApiFetch(ruta, opciones),
}));

import { ApiError } from '../../../../services/http/apiClient';
import { responderTicketMentor } from '../../../tickets/api/ticketsApi';
import { pedirElReporteDelMes } from '../documentoSemanalApi';
import { avisarAlMentor, recordarConsulta } from '../accionesDelLiderApi';
import { asignarMentorDelLider, crearGrupoDelLider, obtenerGruposDelLider, sumarAprendicesAlGrupo } from '../gruposDelLiderApi';
import { obtenerPadron, obtenerPorResolver } from '../liderMentoresApi';

/**
 * Lo que la app lee y manda al servidor para el rol de líder (spec 056, contrato `contracts/api.md`): rutas, cuerpos, y que una cifra que no llega no se
 * vuelve un cero.
 */
beforeEach(() => {
  mockApiFetch.mockReset();
});

const mentorCrudo = (extra: Record<string, unknown> = {}) => ({
  userId: 'm-1',
  fullName: 'E2E Mentor',
  avatarUrl: null,
  groups: { source: 'OK', items: [] },
  traineeCount: 0,
  semaforo: { source: 'OK', summary: null },
  attention: { source: 'OK', open: 0, oldestOpenDays: null, answered: 0, medianResponseHours: null },
  evaluation: { source: 'OK', month: '2026-11', percentage: null, delivered: null, expected: null, traineesEvaluated: null, state: null },
  ...extra,
});
const padronCrudo = (mentores: unknown[]) => ({ month: '2026-11', timezone: 'America/Lima', cutoffAt: '2026-11-18T14:00:00Z', semaforoFrom: null, semaforoTo: null, mentors: mentores });

describe('el padrón con cupo y colores', () => {
  it('trae el cupo y los colores de cada mentor tal cual los manda el servidor', async () => { // spec 056 FR-003
    mockApiFetch.mockResolvedValue(padronCrudo([mentorCrudo({ cupo: { acompanados: 9, maximo: 10 }, porColor: { rojo: 5, ambar: 0, verde: 0, sinDatos: 4 } })]));
    const padron = await obtenerPadron();
    expect(padron.mentors[0].cupo).toEqual({ acompanados: 9, maximo: 10 });
    expect(padron.mentors[0].porColor).toEqual({ rojo: 5, ambar: 0, verde: 0, sinDatos: 4 });
  });

  it('si el servidor los manda en null, o no los manda, quedan en null: nunca un cero', async () => { // spec 056 FR-003
    mockApiFetch.mockResolvedValue(padronCrudo([mentorCrudo({ cupo: null, porColor: null }), mentorCrudo({ userId: 'm-2' })]));
    const [a, b] = (await obtenerPadron()).mentors;
    expect(a.cupo).toBeNull();
    expect(a.porColor).toBeNull();
    expect(b.cupo ?? null).toBeNull();
    expect(b.porColor ?? null).toBeNull();
  });

  it('una forma rara en esas dos cifras no tumba el padrón entero', async () => { // spec 056 FR-003
    mockApiFetch.mockResolvedValue(padronCrudo([mentorCrudo({ cupo: 'mucho', porColor: { rojo: 'x' } })]));
    const padron = await obtenerPadron();
    expect(padron.mentors).toHaveLength(1);
    expect(padron.mentors[0].cupo).toBeNull();
    expect(padron.mentors[0].porColor).toBeNull();
  });
});

describe('«Por resolver»', () => {
  it('lee grupos sin mentor, consultas con los días de la más vieja y el peor mentor', async () => { // spec 056 FR-002
    mockApiFetch.mockResolvedValue({ gruposSinMentor: 3, consultas: { cantidad: 3, diasDeLaMasVieja: 5 }, peorMentor: { id: 'm-1', nombre: 'E2E Mentor', evaluacion: 0 } });
    const p = await obtenerPorResolver();
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/mentors/por-resolver', undefined);
    expect(p.gruposSinMentor).toBe(3);
    expect(p.consultas).toEqual({ cantidad: 3, diasDeLaMasVieja: 5 });
    expect(p.peorMentor?.evaluacion).toBe(0);
  });

  it('una parte caída llega en null y se queda en null', async () => { // spec 056 FR-002
    mockApiFetch.mockResolvedValue({ gruposSinMentor: null, consultas: null, peorMentor: null });
    const p = await obtenerPorResolver();
    expect(p.gruposSinMentor).toBeNull();
    expect(p.consultas).toBeNull();
    expect(p.peorMentor).toBeNull();
  });
});

describe('avisar al mentor, recordar una consulta y responderla', () => {
  it('«Avisar a su mentor» manda el texto limpio y la clave de operación a la ruta de la persona', async () => { // spec 056 FR-019
    mockApiFetch.mockResolvedValue(undefined);
    await avisarAlMentor('p 1', '  Escríbele hoy.  ', 'avisar-1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/people/p%201/avisar-al-mentor', { method: 'POST', body: { texto: 'Escríbele hoy.', operationKey: 'avisar-1' } });
  });

  it('«Recordar al mentor» manda solo la clave de operación a la ruta de la consulta', async () => { // spec 056 FR-029
    mockApiFetch.mockResolvedValue(undefined);
    await recordarConsulta('t-1', 'recordar-1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/tickets/t-1/recordar', { method: 'POST', body: { operationKey: 'recordar-1' } });
  });

  it('«Responder yo» usa la ruta de responder de siempre y lee quién respondió', async () => { // spec 056 FR-030
    mockApiFetch.mockResolvedValue({ id: 't-1', traineeProfileId: 'p-1', blockDescription: 'b', attemptedSolutions: 'a', smartGoalImpact: 's', status: 'ANSWERED', mentorAnswer: 'Sí', answeredAt: '2026-11-18T10:00:00Z', savedToLibrary: false, createdAt: '2026-11-10T10:00:00Z', respondidoPor: { id: 'l-1', nombre: 'Laura Líder' } });
    const t = await responderTicketMentor('t-1', ' Sí ');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/tickets/t-1/answer', { method: 'POST', body: { mentorAnswer: 'Sí' } });
    expect(t.respondidoPor).toEqual({ id: 'l-1', nombre: 'Laura Líder' });
  });

  it('una consulta sin `respondidoPor` (abierta o de antes) se lee igual', async () => { // spec 056 FR-030
    mockApiFetch.mockResolvedValue({ id: 't-1', traineeProfileId: 'p-1', blockDescription: 'b', attemptedSolutions: 'a', smartGoalImpact: 's', status: 'OPEN', createdAt: '2026-11-10T10:00:00Z' });
    expect((await responderTicketMentor('t-1', 'x')).respondidoPor ?? null).toBeNull();
  });

  it('el documento del reporte del mes se pide con el mes y devuelve su enlace', async () => { // spec 056 FR-032
    mockApiFetch.mockResolvedValue({ url: 'https://almacen.example/r.html', venceEn: '2026-11-18T22:10:00Z', reutilizado: true, semana: null });
    const d = await pedirElReporteDelMes('2026-11');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/leadership/report/documento', { method: 'POST', body: { month: '2026-11' } });
    expect(d).toMatchObject({ url: 'https://almacen.example/r.html', reutilizado: true });
  });
});

describe('los grupos del líder', () => {
  const tablero = [
    { id: 'g-1', name: 'Cupo 1314', cohortId: 'c-1', cohortName: 'N', cohortStatus: 'ACTIVE', memberCount: 9, mentor: { id: 'm-1', fullName: 'E2E Mentor', avatarUrl: null }, formation: 'ESCUELA', capacity: 10 },
    { id: 'g-2', name: 'Sin dueño', cohortId: 'c-1', cohortName: 'N', cohortStatus: 'ACTIVE', memberCount: 0, mentor: null, formation: 'ESCUELA', capacity: 10 },
    { id: 'g-3', name: 'Vieja', cohortId: 'c-1', cohortName: 'N', cohortStatus: 'ACTIVE', memberCount: 4, mentor: null, formation: 'ESCUELA', capacity: 10 },
    { id: 'g-4', name: 'Bienvenida', cohortId: 'c-1', cohortName: 'N', cohortStatus: 'ACTIVE', memberCount: 3, mentor: null, formation: 'ESCUELA', capacity: null },
  ];
  const lista = [
    { id: 'g-1', name: 'Cupo 1314', cohortId: 'c-1', videoCallUrl: null, nextSessionAt: null, memberCount: 9, mentor: null, status: 'VIGENTE', type: 'REGULAR', learnerCount: 8, capacity: 10 },
    { id: 'g-2', name: 'Sin dueño', cohortId: 'c-1', videoCallUrl: null, nextSessionAt: null, memberCount: 0, mentor: null, status: 'SIN_PERIODO', type: 'REGULAR', learnerCount: 0, capacity: 10 },
    { id: 'g-3', name: 'Vieja', cohortId: 'c-1', videoCallUrl: null, nextSessionAt: null, memberCount: 4, mentor: null, status: 'CERRADO', type: 'REGULAR', learnerCount: 4, capacity: 10 },
    { id: 'g-4', name: 'Bienvenida', cohortId: 'c-1', videoCallUrl: null, nextSessionAt: null, memberCount: 3, mentor: null, status: 'VIGENTE', type: 'RECEPCION', learnerCount: 3, capacity: null },
  ];

  it('une el tablero con el estado y el tipo de cada grupo, una lectura por generación', async () => { // spec 056 FR-006
    mockApiFetch.mockImplementation(async ruta => (ruta === '/api/v1/admin/cells/dashboard' ? tablero : lista));
    const grupos = await obtenerGruposDelLider();
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/cells?cohortId=c-1', undefined);
    expect(mockApiFetch.mock.calls.filter(([r]) => r.startsWith('/api/v1/admin/cells?'))).toHaveLength(1);
    const por = Object.fromEntries(grupos.map(g => [g.id, g]));
    expect(por['g-1']).toMatchObject({ nombre: 'Cupo 1314', mentorId: 'm-1', mentorNombre: 'E2E Mentor', aprendices: 8, cupo: 10, enCurso: true, esRecepcion: false, formacion: 'ESCUELA', cohorteActiva: true });
    expect(por['g-2']).toMatchObject({ mentorId: null, enCurso: true });
    expect(por['g-3'].enCurso).toBe(false);
    expect(por['g-4']).toMatchObject({ esRecepcion: true, cupo: null });
  });

  it('si la lectura de la generación cae, los grupos se leen con el tablero: en curso si su generación está activa', async () => { // spec 056 FR-006
    mockApiFetch.mockImplementation(async ruta => {
      if (ruta === '/api/v1/admin/cells/dashboard') return tablero;
      throw new ApiError(403, 'No es de tus formaciones.', { codigo: 'FUERA_DE_SU_ALCANCE' });
    });
    const grupos = await obtenerGruposDelLider();
    expect(grupos).toHaveLength(4);
    expect(grupos.every(g => g.enCurso)).toBe(true);
    expect(grupos.find(g => g.id === 'g-1')?.aprendices).toBe(9);
  });

  it('un rechazo del tablero (otra formación) llega con su motivo', async () => { // spec 056 FR-042
    mockApiFetch.mockRejectedValue(new ApiError(403, 'Ese grupo no es de tus formaciones.', { codigo: 'FUERA_DE_SU_ALCANCE' }));
    await expect(obtenerGruposDelLider()).rejects.toMatchObject({ status: 403, message: 'Ese grupo no es de tus formaciones.' });
  });

  it('crea un grupo regular sin período, con el nombre limpio y en la formación del líder', async () => { // spec 056 FR-008
    mockApiFetch.mockResolvedValue({ id: 'g-9', name: 'Nuevo', cohortId: 'c-1', videoCallUrl: null, nextSessionAt: null, mentor: null, members: [] });
    const g = await crearGrupoDelLider({ nombre: '  Nuevo  ', cohorteId: 'c-1', formacion: 'DIPLOMADO' });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/cells', { method: 'POST', body: { name: 'Nuevo', cohortId: 'c-1', type: 'REGULAR', formation: 'DIPLOMADO' } });
    expect(g.id).toBe('g-9');
  });
});

describe('asignar o cambiar el mentor de un grupo (E-372: el mentor conserva sus otros grupos)', () => {
  const respuestaDeGrupo = { id: 'g-1', name: 'G', cohortId: 'c-1', videoCallUrl: null, nextSessionAt: null, mentor: null, members: [] };
  beforeEach(() => {
    mockApiFetch.mockResolvedValue(respuestaDeGrupo);
  });
  const llamadas = () => mockApiFetch.mock.calls.map(([ruta, op]) => `${op?.method ?? 'GET'} ${ruta}`);

  it('sin otros grupos es el traslado de siempre: una sola operación (PUT …/mentor)', async () => { // spec 056 FR-009
    const r = await asignarMentorDelLider({ id: 'g-1', nombre: 'G', mentorId: null }, { userId: 'm-2', fullName: 'Ana', grupos: [] });
    expect(r).toBe('asignado');
    expect(llamadas()).toEqual(['PUT /api/v1/admin/cells/g-1/mentor']);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/cells/g-1/mentor', { method: 'PUT', body: { leaderUserId: 'm-2' } });
  });

  it('con otros grupos SUMA (POST …/additional-mentor) y no se los quita', async () => { // spec 056 FR-009
    await asignarMentorDelLider({ id: 'g-1', nombre: 'G', mentorId: null }, { userId: 'm-2', fullName: 'Ana', grupos: ['g-7'] });
    expect(llamadas()).toEqual(['POST /api/v1/admin/cells/g-1/additional-mentor']);
  });

  it('si el grupo tenía otro mentor, antes se lo quita (DELETE) y después suma', async () => { // spec 056 FR-009
    await asignarMentorDelLider({ id: 'g-1', nombre: 'G', mentorId: 'm-9' }, { userId: 'm-2', fullName: 'Ana', grupos: ['g-7'] });
    expect(llamadas()).toEqual(['DELETE /api/v1/admin/cells/g-1/mentor', 'POST /api/v1/admin/cells/g-1/additional-mentor']);
  });

  it('si la segunda operación falla tras quitar al anterior, dice que el grupo quedó sin mentor', async () => { // spec 056 FR-009
    mockApiFetch.mockImplementation(async (ruta, op) => {
      if (op?.method === 'POST') throw new ApiError(409, 'Cupo lleno.', { codigo: 'CUPO_LLENO' });
      return respuestaDeGrupo;
    });
    await expect(asignarMentorDelLider({ id: 'g-1', nombre: 'Cupo 1314', mentorId: 'm-9' }, { userId: 'm-2', fullName: 'Ana', grupos: ['g-7'] })).rejects.toThrow('Cupo 1314 quedó sin mentor: no se pudo sumar a Ana. Vuelve a elegirlo.');
  });

  it('si ya es su mentor no pide nada y lo dice', async () => { // spec 056 FR-009
    const r = await asignarMentorDelLider({ id: 'g-1', nombre: 'G', mentorId: 'm-2' }, { userId: 'm-2', fullName: 'Ana', grupos: ['g-1'] });
    expect(r).toBe('nada');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('un rechazo del servidor sin quitar a nadie llega tal cual, con su motivo', async () => { // spec 056 FR-042
    mockApiFetch.mockRejectedValue(new ApiError(403, 'Ese mentor no es de tus formaciones.', { codigo: 'FUERA_DE_SU_ALCANCE' }));
    await expect(asignarMentorDelLider({ id: 'g-1', nombre: 'G', mentorId: null }, { userId: 'm-2', fullName: 'Ana', grupos: ['g-7'] })).rejects.toMatchObject({ status: 403 });
  });
});

describe('sumar aprendices a un grupo', () => {
  it('los suma de a uno, en orden, a la ruta de alta de siempre', async () => { // spec 056 FR-009
    mockApiFetch.mockResolvedValue({ id: 'g-1', name: 'G', cohortId: 'c-1', videoCallUrl: null, nextSessionAt: null, mentor: null, members: [] });
    const r = await sumarAprendicesAlGrupo('g-1', ['a-1', 'a-2']);
    expect(r).toEqual({ sumados: 2, fallo: null });
    expect(mockApiFetch.mock.calls.map(([ruta, op]) => [ruta, op?.body])).toEqual([
      ['/api/v1/admin/cells/g-1/trainees', { traineeId: 'a-1' }],
      ['/api/v1/admin/cells/g-1/trainees', { traineeId: 'a-2' }],
    ]);
  });

  it('se detiene en el primer rechazo y dice cuántos entraron y por qué paró', async () => { // spec 056 FR-009
    const lleno = new ApiError(409, 'El grupo ya está lleno.', { codigo: 'CUPO_LLENO' });
    mockApiFetch.mockResolvedValueOnce({ id: 'g-1', name: 'G', cohortId: 'c-1', videoCallUrl: null, nextSessionAt: null, mentor: null, members: [] }).mockRejectedValueOnce(lleno);
    const r = await sumarAprendicesAlGrupo('g-1', ['a-1', 'a-2', 'a-3']);
    expect(r.sumados).toBe(1);
    expect(r.fallo).toBe(lleno);
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });
});
