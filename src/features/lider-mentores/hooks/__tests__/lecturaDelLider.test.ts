import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { SemaforoDelGrupo } from '../../../semaforo/types/semaforo.types';
import type { LecturaDelGrupo } from '../../../semaforo/hooks/useLecturaPorSemana';
import type { SemanaDePersona } from '../../types/cumplimientoDelLider.types';

/**
 * Las lecturas del líder (spec 005, T026): una respuesta vieja nunca pisa a una nueva, y al cambiar de
 * persona o de semana no queda a la vista NI POR UN INSTANTE el dato de la anterior (SC-005). Cuando falla,
 * hay error con «Reintentar» y no datos viejos que parezcan de ahora.
 */

const mockSemana = jest.fn<(grupoId: string, personaId: string, semanaHasta?: string | null) => Promise<SemanaDePersona>>();
const mockTabla = jest.fn<(grupoId: string, semanaHasta?: string | null) => Promise<SemaforoDelGrupo>>();
jest.mock('../../api/cumplimientoDelLiderApi', () => ({
  obtenerSemanaDePersona: (g: string, p: string, s?: string | null) => mockSemana(g, p, s),
  obtenerTablaDelLider: (g: string, s?: string | null) => mockTabla(g, s),
}));

import { useGrupoDelLider } from '../useGrupoDelLider';
import { useSemanaDePersona, type LecturaDeLaSemana } from '../useSemanaDePersona';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function semana(hasta: string, cambios: Partial<SemanaDePersona> = {}): SemanaDePersona {
  const d = new Date(`${hasta}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 6);
  return {
    grupoId: 'g1',
    personaId: 'p1',
    nombre: 'Ana Pérez',
    avatarUrl: null,
    desde: d.toISOString().slice(0, 10),
    hasta,
    zona: 'America/Lima',
    semanaEnCurso: false,
    primeraSemana: '2026-08-29',
    mentor: { id: 'm1', nombre: 'Luisa' },
    resumen: null,
    color: 'AMARILLO',
    etiqueta: null,
    noSeMide: false,
    porcentaje: 70,
    dias: [],
    ...cambios,
  };
}

/** Una promesa que se resuelve o rechaza cuando la prueba quiere, para controlar quién llega primero. */
function pendiente<T>() {
  let resolver!: (v: T) => void;
  let rechazar!: (e: unknown) => void;
  const promesa = new Promise<T>((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
}

let ultima: LecturaDeLaSemana;
function Sonda({ grupo, persona, inicio }: { grupo: string; persona: string; inicio?: string | null }) {
  ultima = useSemanaDePersona(grupo, persona, inicio);
  return null;
}

async function montar(props: { grupo?: string; persona?: string; inicio?: string | null } = {}): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(Sonda, { grupo: 'g1', persona: 'p1', ...props }));
  });
  return r;
}

beforeEach(() => {
  mockSemana.mockReset();
  mockTabla.mockReset();
});

describe('la semana de una persona', () => {
  it('sin semana pedida, abre la semana en curso del servidor y queda con sus datos', async () => {
    mockSemana.mockResolvedValueOnce(semana('2026-10-23', { semanaEnCurso: true }));
    await montar();
    expect(mockSemana).toHaveBeenCalledWith('g1', 'p1', null);
    expect(ultima.datos?.hasta).toBe('2026-10-23');
    expect(ultima.cargando).toBe(false);
    expect(ultima.fallo).toBeNull();
  });

  it('mientras carga no hay datos, hay carga; y el rótulo ya dice la semana pedida', async () => {
    const p = pendiente<SemanaDePersona>();
    mockSemana.mockReturnValueOnce(p.promesa);
    await montar({ inicio: '2026-10-16' });
    expect(ultima.datos).toBeNull();
    expect(ultima.cargando).toBe(true);
    expect(ultima.rotulo.rango).toBe('Del sábado 10 al viernes 16 de octubre');
  });

  it('al ir a la semana anterior, el dato de la actual desaparece AL INSTANTE (no se ve con el rótulo nuevo)', async () => {
    mockSemana.mockResolvedValueOnce(semana('2026-10-23', { semanaEnCurso: true }));
    await montar();
    const lenta = pendiente<SemanaDePersona>();
    mockSemana.mockReturnValueOnce(lenta.promesa);
    await act(async () => {
      ultima.anterior();
    });
    expect(ultima.datos).toBeNull();
    expect(ultima.cargando).toBe(true);
    expect(mockSemana).toHaveBeenLastCalledWith('g1', 'p1', '2026-10-16');
    await act(async () => {
      lenta.resolver(semana('2026-10-16'));
    });
    expect(ultima.datos?.hasta).toBe('2026-10-16');
    expect(ultima.cargando).toBe(false);
  });

  it('una respuesta que llega tarde NO pisa a la semana que se pidió después', async () => {
    mockSemana.mockResolvedValueOnce(semana('2026-10-23', { semanaEnCurso: true }));
    await montar();
    const vieja = pendiente<SemanaDePersona>();
    const nueva = pendiente<SemanaDePersona>();
    mockSemana.mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
    await act(async () => {
      ultima.anterior(); // 16
    });
    await act(async () => {
      ultima.anterior(); // 9: se pide sin esperar la de 16 (la rotulada es la última pedida)
    });
    await act(async () => {
      nueva.resolver(semana('2026-10-09'));
    });
    await act(async () => {
      vieja.resolver(semana('2026-10-16'));
    });
    expect(ultima.datos?.hasta).toBe('2026-10-09');
  });

  it('no se puede ir más allá de la semana en curso ni antes de que empezara el programa', async () => {
    mockSemana.mockResolvedValueOnce(semana('2026-10-23', { semanaEnCurso: true }));
    await montar();
    expect(ultima.puedeSiguiente).toBe(false);
    expect(ultima.puedeAnterior).toBe(true);
    const llamadas = mockSemana.mock.calls.length;
    await act(async () => {
      ultima.siguiente();
    });
    expect(mockSemana.mock.calls.length).toBe(llamadas);

    mockSemana.mockResolvedValueOnce(semana('2026-09-04', { primeraSemana: '2026-08-29' }));
    await montar({ inicio: '2026-09-04' });
    expect(ultima.puedeAnterior).toBe(false);
    expect(ultima.puedeSiguiente).toBe(true);
  });

  it('desde una semana pasada, «siguiente» llega hasta la semana en curso', async () => {
    mockSemana.mockResolvedValueOnce(semana('2026-10-16'));
    await montar({ inicio: '2026-10-16' });
    mockSemana.mockResolvedValueOnce(semana('2026-10-23', { semanaEnCurso: true }));
    await act(async () => {
      ultima.siguiente();
    });
    expect(ultima.datos?.semanaEnCurso).toBe(true);
    expect(ultima.puedeSiguiente).toBe(false);
  });

  it('desde una semana pasada hay un atajo a la semana en curso; en la en curso no hace falta', async () => {
    mockSemana.mockResolvedValueOnce(semana('2026-10-23', { semanaEnCurso: true }));
    await montar();
    expect(ultima.puedeVolverAEstaSemana).toBe(false);
    mockSemana.mockResolvedValueOnce(semana('2026-10-16'));
    await act(async () => {
      ultima.anterior();
    });
    mockSemana.mockResolvedValueOnce(semana('2026-10-09'));
    await act(async () => {
      ultima.anterior();
    });
    expect(ultima.puedeVolverAEstaSemana).toBe(true);
    mockSemana.mockResolvedValueOnce(semana('2026-10-23', { semanaEnCurso: true }));
    await act(async () => {
      ultima.volverAEstaSemana();
    });
    // La en curso se pide sin fecha: la define el servidor.
    expect(mockSemana).toHaveBeenLastCalledWith('g1', 'p1', null);
    expect(ultima.datos?.semanaEnCurso).toBe(true);
    expect(ultima.puedeVolverAEstaSemana).toBe(false);
  });

  it('si falla: error con «Reintentar», sin datos viejos; reintentar vuelve a pedir lo mismo', async () => {
    mockSemana.mockResolvedValueOnce(semana('2026-10-23', { semanaEnCurso: true }));
    await montar();
    mockSemana.mockRejectedValueOnce(new Error('Sin conexión'));
    await act(async () => {
      ultima.anterior();
    });
    expect(ultima.datos).toBeNull();
    expect(ultima.fallo).toBe('error');
    expect(ultima.cargando).toBe(false);

    mockSemana.mockResolvedValueOnce(semana('2026-10-16'));
    await act(async () => {
      ultima.recargar();
    });
    expect(mockSemana).toHaveBeenLastCalledWith('g1', 'p1', '2026-10-16');
    expect(ultima.datos?.hasta).toBe('2026-10-16');
    expect(ultima.fallo).toBeNull();
  });

  it('tras un fallo se puede seguir navegando (la semana pedida manda, no la última que cargó)', async () => {
    mockSemana.mockResolvedValueOnce(semana('2026-10-23', { semanaEnCurso: true }));
    await montar();
    mockSemana.mockRejectedValueOnce(new Error('x'));
    await act(async () => {
      ultima.anterior(); // 16, falla
    });
    expect(ultima.puedeAnterior).toBe(true);
    mockSemana.mockResolvedValueOnce(semana('2026-10-09'));
    await act(async () => {
      ultima.anterior(); // 9
    });
    expect(mockSemana).toHaveBeenLastCalledWith('g1', 'p1', '2026-10-09');
  });

  it('al cambiar de persona no queda a la vista el dato de la anterior ni por un instante', async () => {
    mockSemana.mockResolvedValueOnce(semana('2026-10-23', { semanaEnCurso: true }));
    const r = await montar();
    expect(ultima.datos?.nombre).toBe('Ana Pérez');
    const lenta = pendiente<SemanaDePersona>();
    mockSemana.mockReturnValueOnce(lenta.promesa);
    await act(async () => {
      r.update(React.createElement(Sonda, { grupo: 'g1', persona: 'p2' }));
    });
    expect(ultima.datos).toBeNull();
    expect(ultima.cargando).toBe(true);
    expect(mockSemana).toHaveBeenLastCalledWith('g1', 'p2', null);
  });

  it('lo que llega después de desmontar no escribe nada (no hay aviso de actualizar un componente muerto)', async () => {
    const lenta = pendiente<SemanaDePersona>();
    mockSemana.mockReturnValueOnce(lenta.promesa);
    const r = await montar();
    const errores = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => {
      r.unmount();
    });
    await act(async () => {
      lenta.resolver(semana('2026-10-23'));
    });
    expect(errores).not.toHaveBeenCalled();
    errores.mockRestore();
  });

  it('el 403 y el 404 se distinguen: no son «reintentar»', async () => {
    const { ApiError } = jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient');
    mockSemana.mockRejectedValueOnce(new ApiError(404, 'No existe'));
    await montar();
    expect(ultima.fallo).toBe('no_disponible');
    mockSemana.mockRejectedValueOnce(new ApiError(403, 'No'));
    await montar({ persona: 'p3' });
    expect(ultima.fallo).toBe('sin_permiso');
  });
});

function tabla(hasta: string, nombres: string[]): SemaforoDelGrupo {
  return {
    grupoId: 'g1',
    grupoNombre: 'Fénix',
    desde: hasta,
    hasta,
    cerrada: false,
    resumen: null,
    aprendices: nombres.map((nombre, i) => ({
      aprendizId: `u${i}`,
      nombre,
      avatarUrl: null,
      porcentaje: 50,
      color: 'AMARILLO' as const,
      etiqueta: null,
      diasConDatos: 5,
      dias: [],
    })),
  };
}

let lista: LecturaDelGrupo;
function SondaDelGrupo({ grupo }: { grupo: string | null }) {
  lista = useGrupoDelLider(grupo);
  return null;
}

describe('la lista del grupo', () => {
  it('sin grupo no pregunta nada; con grupo pide la ventana vigente', async () => {
    await act(async () => {
      TestRenderer.create(React.createElement(SondaDelGrupo, { grupo: null }));
    });
    expect(mockTabla).not.toHaveBeenCalled();
    mockTabla.mockResolvedValueOnce(tabla('2026-10-18', ['Ana']));
    await act(async () => {
      TestRenderer.create(React.createElement(SondaDelGrupo, { grupo: 'g1' }));
    });
    expect(mockTabla).toHaveBeenCalledWith('g1', null);
    expect(lista.datos?.aprendices.map(a => a.nombre)).toEqual(['Ana']);
  });

  it('al ir a una semana anterior, la lista de la actual desaparece y se pide esa semana', async () => {
    mockTabla.mockResolvedValueOnce(tabla('2026-10-18', ['Ana']));
    await act(async () => {
      TestRenderer.create(React.createElement(SondaDelGrupo, { grupo: 'g1' }));
    });
    const lenta = pendiente<SemaforoDelGrupo>();
    mockTabla.mockReturnValueOnce(lenta.promesa);
    await act(async () => {
      lista.anterior();
    });
    expect(lista.datos).toBeNull();
    expect(lista.cargando).toBe(true);
    expect(mockTabla.mock.calls[1][1]).toBe('2026-10-16');
    await act(async () => {
      lenta.resolver(tabla('2026-10-16', ['Luis']));
    });
    expect(lista.datos?.aprendices[0].nombre).toBe('Luis');
  });

  it('si falla se dice y se puede reintentar', async () => {
    mockTabla.mockRejectedValueOnce(new Error('caído'));
    await act(async () => {
      TestRenderer.create(React.createElement(SondaDelGrupo, { grupo: 'g1' }));
    });
    expect(lista.datos).toBeNull();
    expect(lista.fallo).toBe('error');
    mockTabla.mockResolvedValueOnce(tabla('2026-10-18', ['Ana']));
    await act(async () => {
      lista.recargar();
    });
    expect(lista.datos?.aprendices).toHaveLength(1);
  });
});
