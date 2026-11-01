import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { FiltrosDeLosHabitos, HabitosDeTodos, PersonaEnUnHabito, PersonasDeUnHabito } from '../../types/habitosDeTodos.types';

/**
 * Las tres lecturas de «Hábitos de todos» (spec 029): el resumen del día con turnos (solo la última escribe y nunca queda a la vista el dato
 * de otro día o de otro filtro), la lista de personas de un hábito (de a 30, búsqueda con espera, sin repetir a nadie) y la disponibilidad
 * de la fila (solo con 200).
 */

const mockDia = jest.fn<(filtros: FiltrosDeLosHabitos) => Promise<HabitosDeTodos>>();
const mockPersonas = jest.fn<(id: string, filtros: FiltrosDeLosHabitos, o?: { q?: string; pagina?: number; tamano?: number }) => Promise<PersonasDeUnHabito>>();
jest.mock('../../api/habitosDeTodosApi', () => ({
  TAMANO_DE_LA_PAGINA_DE_PERSONAS: 30,
  obtenerHabitosDeTodos: (f: FiltrosDeLosHabitos) => mockDia(f),
  obtenerPersonasDeUnHabito: (id: string, f: FiltrosDeLosHabitos, o?: { q?: string; pagina?: number; tamano?: number }) => mockPersonas(id, f, o),
}));

import { ApiError } from '../../../../services/http/apiClient';
import { useHabitosDeTodos } from '../useHabitosDeTodos';
import { useHabitosDeTodosDisponibles } from '../useHabitosDeTodosDisponibles';
import { usePersonasDeUnHabito } from '../usePersonasDeUnHabito';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SIN_FILTROS: FiltrosDeLosHabitos = { fecha: null, grupo: null, formacion: null, categoria: null };

function dia(fecha: string, parcial: Partial<HabitosDeTodos> = {}): HabitosDeTodos {
  return {
    fecha,
    esHoy: false,
    masAntigua: '2026-10-23',
    masReciente: '2026-10-30',
    totales: { alumnos: 10, conHabitos: 10, esperados: 20, cumplieron: 10, pendientes: 0, sinCumplir: 10 },
    habitos: [],
    ...parcial,
  };
}

function persona(id: string, parcial: Partial<PersonaEnUnHabito> = {}): PersonaEnUnHabito {
  return { personaId: id, nombre: `Persona ${id}`, fotoPath: null, grupoId: null, grupoNombre: null, estado: 'CUMPLIDO', motivo: null, horaPlanificada: null, cumplioA: null, evidenciaId: null, ...parcial };
}

function pagina(numero: number, personas: PersonaEnUnHabito[], hayMas: boolean): PersonasDeUnHabito {
  return { fecha: '2026-10-30', esHoy: true, habito: null, pagina: numero, tamano: 30, total: 100, hayMas, personas };
}

function diferido<T>() {
  let resolver!: (v: T) => void;
  let rechazar!: (e: unknown) => void;
  const promesa = new Promise<T>((ok, no) => {
    resolver = ok;
    rechazar = no;
  });
  return { promesa, resolver, rechazar };
}

beforeEach(() => {
  mockDia.mockReset();
  mockPersonas.mockReset();
});

describe('useHabitosDeTodos', () => {
  type Retorno = ReturnType<typeof useHabitosDeTodos>;
  function montar(filtros: FiltrosDeLosHabitos) {
    const lecturas: Retorno[] = [];
    function Sonda({ f }: { f: FiltrosDeLosHabitos }) {
      lecturas.push(useHabitosDeTodos(f));
      return null;
    }
    let raiz!: ReactTestRenderer;
    return {
      lecturas,
      async iniciar() {
        await act(async () => {
          raiz = TestRenderer.create(React.createElement(Sonda, { f: filtros }));
        });
      },
      async cambiar(f: FiltrosDeLosHabitos) {
        await act(async () => {
          raiz.update(React.createElement(Sonda, { f }));
        });
      },
      ultima: () => lecturas[lecturas.length - 1],
    };
  }

  it('lee el día de los filtros y lo entrega; antes de la respuesta está «cargando»', async () => {
    mockDia.mockResolvedValue(dia('2026-10-30', { esHoy: true }));
    const m = montar(SIN_FILTROS);
    await m.iniciar();
    expect(m.lecturas[0].cargando).toBe(true);
    expect(m.lecturas[0].datos).toBeNull();
    expect(m.ultima().cargando).toBe(false);
    expect(m.ultima().datos?.fecha).toBe('2026-10-30');
    expect(mockDia).toHaveBeenCalledWith(SIN_FILTROS);
  });

  it('al cambiar de día no queda a la vista el dato del día anterior, ni en el primer render', async () => {
    mockDia.mockResolvedValueOnce(dia('2026-10-30', { esHoy: true }));
    const m = montar(SIN_FILTROS);
    await m.iniciar();
    const otra = diferido<HabitosDeTodos>();
    mockDia.mockReturnValueOnce(otra.promesa);
    const antes = m.lecturas.length;
    await m.cambiar({ ...SIN_FILTROS, fecha: '2026-10-29' });
    const delCambio = m.lecturas.slice(antes);
    expect(delCambio.length).toBeGreaterThan(0);
    expect(delCambio.every(l => l.datos === null && l.cargando)).toBe(true);
    await act(async () => {
      otra.resolver(dia('2026-10-29'));
    });
    expect(m.ultima().datos?.fecha).toBe('2026-10-29');
  });

  it('solo la última lectura escribe: la respuesta de un día viejo que llega tarde se descarta', async () => {
    const lenta = diferido<HabitosDeTodos>();
    mockDia.mockReturnValueOnce(lenta.promesa);
    const m = montar({ ...SIN_FILTROS, fecha: '2026-10-28' });
    await m.iniciar();
    mockDia.mockResolvedValueOnce(dia('2026-10-29'));
    await m.cambiar({ ...SIN_FILTROS, fecha: '2026-10-29' });
    expect(m.ultima().datos?.fecha).toBe('2026-10-29');
    await act(async () => {
      lenta.resolver(dia('2026-10-28'));
    });
    expect(m.ultima().datos?.fecha).toBe('2026-10-29');
  });

  it('un cambio de filtro es otra lectura con sus filtros', async () => {
    mockDia.mockResolvedValue(dia('2026-10-30'));
    const m = montar(SIN_FILTROS);
    await m.iniciar();
    await m.cambiar({ ...SIN_FILTROS, grupo: 'none' });
    expect(mockDia).toHaveBeenLastCalledWith({ ...SIN_FILTROS, grupo: 'none' });
    expect(mockDia).toHaveBeenCalledTimes(2);
  });

  it('un fallo sin datos lo dice; recargar vuelve a pedir lo mismo', async () => {
    mockDia.mockRejectedValueOnce(new ApiError(500, 'caído'));
    const m = montar(SIN_FILTROS);
    await m.iniciar();
    expect(m.ultima().fallo).toBe('error');
    expect(m.ultima().datos).toBeNull();
    mockDia.mockResolvedValueOnce(dia('2026-10-30'));
    await act(async () => {
      await m.ultima().recargar();
    });
    expect(m.ultima().fallo).toBeNull();
    expect(m.ultima().datos?.fecha).toBe('2026-10-30');
  });

  it('una relectura que falla no borra lo que ya se ve', async () => {
    mockDia.mockResolvedValueOnce(dia('2026-10-30'));
    const m = montar(SIN_FILTROS);
    await m.iniciar();
    mockDia.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    await act(async () => {
      await m.ultima().recargar();
    });
    expect(m.ultima().datos?.fecha).toBe('2026-10-30');
    expect(m.ultima().fallo).toBeNull();
    expect(m.ultima().refrescando).toBe(false);
  });

  it('recuerda los límites de la navegación entre lecturas', async () => {
    mockDia.mockResolvedValueOnce(dia('2026-10-30', { masAntigua: '2026-10-23', masReciente: '2026-10-30' }));
    const m = montar(SIN_FILTROS);
    await m.iniciar();
    const otra = diferido<HabitosDeTodos>();
    mockDia.mockReturnValueOnce(otra.promesa);
    await m.cambiar({ ...SIN_FILTROS, fecha: '2026-10-29' });
    expect(m.ultima().datos).toBeNull();
    expect(m.ultima().limites).toEqual({ masAntigua: '2026-10-23', masReciente: '2026-10-30' });
  });
});

describe('usePersonasDeUnHabito', () => {
  type Retorno = ReturnType<typeof usePersonasDeUnHabito>;
  function montar() {
    const lecturas: Retorno[] = [];
    function Sonda() {
      lecturas.push(usePersonasDeUnHabito('h-1', { ...SIN_FILTROS, fecha: '2026-10-30', categoria: 'CUERPO' }));
      return null;
    }
    return {
      lecturas,
      async iniciar() {
        await act(async () => {
          TestRenderer.create(React.createElement(Sonda));
        });
      },
      ultima: () => lecturas[lecturas.length - 1],
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('pide la primera página al montarse, con el día y los filtros del hábito', async () => {
    mockPersonas.mockResolvedValue(pagina(0, [persona('1'), persona('2')], false));
    const m = montar();
    await m.iniciar();
    expect(mockPersonas).toHaveBeenCalledWith('h-1', { fecha: '2026-10-30', grupo: null, formacion: null, categoria: 'CUERPO' }, { q: '', pagina: 0 });
    expect(m.ultima().personas.map(p => p.personaId)).toEqual(['1', '2']);
    expect(m.ultima().cargando).toBe(false);
    expect(m.ultima().hayMas).toBe(false);
  });

  it('pide la página siguiente sin repetir a nadie, y no pide si no hay más', async () => {
    mockPersonas.mockResolvedValueOnce(pagina(0, [persona('1'), persona('2')], true));
    const m = montar();
    await m.iniciar();
    mockPersonas.mockResolvedValueOnce(pagina(1, [persona('2'), persona('3')], false));
    await act(async () => {
      await m.ultima().pedirMas();
    });
    expect(mockPersonas).toHaveBeenLastCalledWith('h-1', expect.anything(), { q: '', pagina: 1 });
    expect(m.ultima().personas.map(p => p.personaId)).toEqual(['1', '2', '3']);
    expect(m.ultima().hayMas).toBe(false);
    const llamadas = mockPersonas.mock.calls.length;
    await act(async () => {
      await m.ultima().pedirMas();
    });
    expect(mockPersonas).toHaveBeenCalledTimes(llamadas);
  });

  it('si falla una página, lo leído se queda y se puede reintentar', async () => {
    mockPersonas.mockResolvedValueOnce(pagina(0, [persona('1')], true));
    const m = montar();
    await m.iniciar();
    mockPersonas.mockRejectedValueOnce(new ApiError(500, 'x'));
    await act(async () => {
      await m.ultima().pedirMas();
    });
    expect(m.ultima().falloAlPedirMas).toBe(true);
    expect(m.ultima().personas.map(p => p.personaId)).toEqual(['1']);
    mockPersonas.mockResolvedValueOnce(pagina(1, [persona('2')], false));
    await act(async () => {
      await m.ultima().pedirMas();
    });
    expect(m.ultima().falloAlPedirMas).toBe(false);
    expect(m.ultima().personas.map(p => p.personaId)).toEqual(['1', '2']);
  });

  it('la búsqueda se manda 300 ms después de la última tecla, y vuelve a la página 0', async () => {
    mockPersonas.mockResolvedValue(pagina(0, [persona('1')], false));
    const m = montar();
    await m.iniciar();
    expect(mockPersonas).toHaveBeenCalledTimes(1);
    await act(async () => {
      m.ultima().setTexto('An');
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
      m.ultima().setTexto('Ana');
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(mockPersonas).toHaveBeenCalledTimes(1);
    mockPersonas.mockResolvedValueOnce(pagina(0, [persona('9', { nombre: 'Ana' })], false));
    await act(async () => {
      jest.advanceTimersByTime(150);
    });
    expect(mockPersonas).toHaveBeenCalledTimes(2);
    expect(mockPersonas).toHaveBeenLastCalledWith('h-1', expect.anything(), { q: 'Ana', pagina: 0 });
    expect(m.ultima().personas.map(p => p.nombre)).toEqual(['Ana']);
    expect(m.ultima().buscando).toBe(true);
  });

  it('la respuesta de una búsqueda vieja no pisa a la nueva', async () => {
    const lenta = diferido<PersonasDeUnHabito>();
    mockPersonas.mockResolvedValueOnce(pagina(0, [persona('1')], false));
    const m = montar();
    await m.iniciar();
    mockPersonas.mockReturnValueOnce(lenta.promesa);
    await act(async () => {
      m.ultima().setTexto('A');
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    mockPersonas.mockResolvedValueOnce(pagina(0, [persona('7')], false));
    await act(async () => {
      m.ultima().setTexto('Ab');
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(m.ultima().personas.map(p => p.personaId)).toEqual(['7']);
    await act(async () => {
      lenta.resolver(pagina(0, [persona('8')], false));
    });
    expect(m.ultima().personas.map(p => p.personaId)).toEqual(['7']);
  });

  it('un fallo de la primera página deja la lista vacía y dice por qué; un 404 es «no disponible»', async () => {
    mockPersonas.mockRejectedValueOnce(new ApiError(404, 'no'));
    const m = montar();
    await m.iniciar();
    expect(m.ultima().fallo).toBe('no_disponible');
    expect(m.ultima().personas).toEqual([]);
    expect(m.ultima().cargando).toBe(false);
    mockPersonas.mockResolvedValueOnce(pagina(0, [persona('1')], false));
    await act(async () => {
      await m.ultima().recargar();
    });
    expect(m.ultima().fallo).toBeNull();
    expect(m.ultima().personas).toHaveLength(1);
  });
});

describe('useHabitosDeTodosDisponibles', () => {
  function Sonda({ activo, alLeer }: { activo: boolean; alLeer: (v: boolean | null) => void }) {
    alLeer(useHabitosDeTodosDisponibles(activo));
    return null;
  }
  async function leer(activo: boolean) {
    const lecturas: Array<boolean | null> = [];
    await act(async () => {
      TestRenderer.create(React.createElement(Sonda, { activo, alLeer: v => lecturas.push(v) }));
    });
    return lecturas;
  }

  it('con 200 la fila se ofrece; antes de saberlo, no (sin parpadeo)', async () => {
    mockDia.mockResolvedValue(dia('2026-10-30'));
    const lecturas = await leer(true);
    expect(lecturas[0]).toBeNull();
    expect(lecturas.at(-1)).toBe(true);
    expect(lecturas).not.toContain(false);
  });

  it('pregunta por el día de hoy, sin filtros', async () => {
    mockDia.mockResolvedValue(dia('2026-10-30'));
    await leer(true);
    expect(mockDia).toHaveBeenCalledTimes(1);
    expect(mockDia).toHaveBeenCalledWith(SIN_FILTROS);
  });

  it.each([404, 403, 500, 0])('con %s (backend anterior, otro rol o caído) no se ofrece', async status => {
    mockDia.mockRejectedValue(new ApiError(status, 'no'));
    expect((await leer(true)).at(-1)).toBe(false);
  });

  it('una respuesta que no es un día tampoco la ofrece', async () => {
    mockDia.mockRejectedValue(new Error('Respuesta inesperada de GET /leadership/habits'));
    expect((await leer(true)).at(-1)).toBe(false);
  });

  it('para otros roles no se pregunta nada', async () => {
    const lecturas = await leer(false);
    expect(mockDia).not.toHaveBeenCalled();
    expect(lecturas.every(v => v === null)).toBe(true);
  });
});
