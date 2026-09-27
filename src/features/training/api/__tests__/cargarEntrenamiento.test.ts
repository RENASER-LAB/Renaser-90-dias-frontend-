import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string) => mockApiFetch(ruta),
  mensajeDeError: (_e: unknown, porDefecto: string) => porDefecto,
}));

import { cargarEntrenamiento } from '../cargarEntrenamiento';

const HABITO = {
  id: 'h-agua',
  title: 'Tomar agua',
  description: null,
  habitType: 'DAILY',
  category: 'BODY',
  evidenceRequirement: 'OPTIONAL',
  isOptional: false,
  isSystemHabit: true,
  isDeactivatable: true,
};

/** Lo que respondería el backend por cada ruta: lo mínimo que pasa la validación de esquema. */
function responderSegunRuta(ruta: string): Promise<unknown> {
  if (ruta === '/api/v1/habits') return Promise.resolve([HABITO]);
  if (ruta === '/api/v1/habit-preferences') return Promise.resolve({ habits: [] });
  if (ruta === '/api/v1/habit-unlocks') return Promise.resolve({ enabled: true, items: [] });
  if (ruta === '/api/v1/habit-tracks/today') return Promise.resolve([]);
  if (ruta === '/api/v1/rocks/today') return Promise.resolve([]);
  if (ruta.startsWith('/api/v1/evidence')) return Promise.resolve({ evidencias: [], nextCursor: null });
  return Promise.reject(new Error(`ruta no esperada: ${ruta}`));
}

/**
 * V-1 (retroalimentación del 26/09/2026): Training tardaba ~3 s porque pedía en DOS rondas en
 * serie y repetía `GET /api/v1/habits` tres veces. Estas pruebas fijan la orquestación nueva.
 */
describe('cargarEntrenamiento', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation(responderSegunRuta);
  });

  it('hace seis pedidos, y el catálogo de hábitos UNA sola vez', async () => {
    await cargarEntrenamiento();

    const rutas = mockApiFetch.mock.calls.map(([ruta]) => ruta);
    expect(rutas).toHaveLength(6);
    expect(rutas.filter(r => r === '/api/v1/habits')).toHaveLength(1);
    expect(new Set(rutas)).toEqual(
      new Set([
        '/api/v1/habits',
        '/api/v1/habit-preferences',
        '/api/v1/habit-unlocks',
        '/api/v1/habit-tracks/today',
        '/api/v1/rocks/today',
        '/api/v1/evidence?tipoDestino=ROCA_DIARIA',
      ]),
    );
  });

  it('los seis salen en la MISMA ronda: ninguno espera la respuesta de otro', async () => {
    // Nada responde hasta que se liberan todos juntos: si hubiera una segunda ronda, sus pedidos
    // recién saldrían DESPUÉS de liberar, y el conteo previo quedaría corto.
    const pendientes: Array<() => void> = [];
    mockApiFetch.mockImplementation(
      ruta => new Promise(resolver => pendientes.push(() => resolver(responderSegunRuta(ruta)))),
    );

    const carga = cargarEntrenamiento();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockApiFetch).toHaveBeenCalledTimes(6);

    pendientes.forEach(liberar => liberar());
    await carga;
    expect(mockApiFetch).toHaveBeenCalledTimes(6);
  });

  it('el mismo catálogo alimenta a Training y al inventario de Plan', async () => {
    const datos = await cargarEntrenamiento();

    expect(datos.catalogo.map(h => h.id)).toEqual(['h-agua']);
    expect(datos.planHabits.map(h => h.id)).toEqual(['h-agua']);
  });

  it('si falla la roca del día, degrada a vacío y lo demás llega igual', async () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockApiFetch.mockImplementation(ruta =>
      ruta === '/api/v1/rocks/today' ? Promise.reject(new Error('500')) : responderSegunRuta(ruta),
    );

    const datos = await cargarEntrenamiento();

    expect(datos.rocas).toEqual([]);
    expect(datos.planHabits).toHaveLength(1);
    aviso.mockRestore();
  });

  it('si falla el catálogo, la carga entera falla (la pantalla muestra su error)', async () => {
    mockApiFetch.mockImplementation(ruta =>
      ruta === '/api/v1/habits' ? Promise.reject(new Error('sin red')) : responderSegunRuta(ruta),
    );

    await expect(cargarEntrenamiento()).rejects.toThrow('sin red');
  });
});
