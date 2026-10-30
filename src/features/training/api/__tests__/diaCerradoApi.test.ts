import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...(jest.requireActual('../../../../services/http/apiClient') as object),
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));
import { leerDiaCerrado, obtenerDiaCerrado } from '../diaCerradoApi';

/** Un registro como los de `/habit-tracks/today`, con los campos que `/day` manda en null. */
const registro = (extra: Record<string, unknown> = {}) => ({
  id: 'r1',
  habitoId: 'h1',
  fechaEjecucion: '2026-10-28',
  diaPrograma: 5,
  tipoDia: 'TODOS',
  esOpcional: false,
  estado: 'COMPLETADO',
  puntosOtorgados: 8,
  completadoEn: '2026-10-28T11:12:00Z',
  respuestaTexto: null,
  calificacionProductividad: null,
  guia: null,
  tituloHabito: 'Agua tibia',
  tipoHabito: 'CHECKBOX',
  horaDisparo: '06:00:00',
  horaLimite: null,
  puntosEnJuego: null,
  puntosMaximos: null,
  plazoEvidencia: null,
  rachaDias: null,
  ...extra,
});

describe('GET /habit-tracks/day?date= — esquema tolerante (spec 014)', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('pide la fecha pedida, con un tiempo de espera, y nada más', async () => {
    mockApiFetch.mockResolvedValue([registro()]);
    await obtenerDiaCerrado('2026-10-28');
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    const [ruta, opciones] = mockApiFetch.mock.calls[0];
    expect(ruta).toBe('/api/v1/habit-tracks/day?date=2026-10-28');
    expect(opciones).toEqual({ timeoutMs: 15_000 });
  });

  it('acepta puntosEnJuego y rachaDias en null (así los manda /day en un día pasado)', () => {
    const lista = leerDiaCerrado([registro()], '2026-10-28');
    expect(lista).toHaveLength(1);
    expect(lista?.[0].puntosEnJuego).toBeNull();
    expect(lista?.[0].rachaDias).toBeNull();
  });

  it('acepta también los campos ausentes (un servidor que no los manda)', () => {
    const { puntosEnJuego, puntosMaximos, plazoEvidencia, rachaDias, ...sinEllos } = registro();
    expect(leerDiaCerrado([sinEllos], '2026-10-28')).toHaveLength(1);
  });

  it('un día sin registros ([]) es una lista vacía, no «sin datos»', () => {
    expect(leerDiaCerrado([], '2026-10-28')).toEqual([]);
  });

  it('acepta { tracks: [...] } como el snapshot de hoy', () => {
    expect(leerDiaCerrado({ tracks: [registro()] }, '2026-10-28')).toHaveLength(1);
  });

  it('lo que no es una lista de registros es «sin datos» (null), sin lanzar', () => {
    expect(leerDiaCerrado(null, '2026-10-28')).toBeNull();
    expect(leerDiaCerrado('hola', '2026-10-28')).toBeNull();
    expect(leerDiaCerrado({ message: 'Fecha fuera de rango' }, '2026-10-28')).toBeNull();
    expect(leerDiaCerrado({ tracks: 'no' }, '2026-10-28')).toBeNull();
  });

  it('un registro que no calza con el esquema es «sin datos»', () => {
    expect(leerDiaCerrado([registro({ estado: undefined })], '2026-10-28')).toBeNull();
    expect(leerDiaCerrado([registro({ tituloHabito: 7 })], '2026-10-28')).toBeNull();
  });

  it('un registro de otra fecha es «sin datos»: no se muestra como si fuera de ese día', () => {
    expect(leerDiaCerrado([registro({ fechaEjecucion: '2026-10-29' })], '2026-10-28')).toBeNull();
  });
});
