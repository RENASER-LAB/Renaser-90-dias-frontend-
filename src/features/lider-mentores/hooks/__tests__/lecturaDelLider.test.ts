import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { SemaforoDelGrupo } from '../../../semaforo/types/semaforo.types';
import type { InicioSemanal, LecturaDelGrupo } from '../../../semaforo/hooks/useLecturaPorSemana';
import { VIGENTE } from '../../../semaforo/utils/semanasDelSemaforo';
import type { SemanaDePersona } from '../../types/cumplimientoDelLider.types';

/**
 * Las lecturas del líder (spec 005, T026): una respuesta vieja nunca pisa a una nueva, y al cambiar de
 * persona o de semana no queda a la vista NI POR UN INSTANTE el dato de la anterior (SC-005). Cuando falla,
 * hay error con «Reintentar» y no datos viejos que parezcan de ahora.
 *
 * La lista del grupo y la ficha de la persona se mueven EXACTAMENTE como el resumen por grupos (decisión del dueño del
 * 2026-10-19): arrancan donde les diga `inicio`, sin fecha son la ventana vigente (los 7 días que terminan ayer), con
 * ‹ van a la última semana cerrada y de ahí de 7 en 7 días, y nunca llegan al futuro.
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

/** Hoy es el lunes 19 de octubre de 2026: la vigente va del lunes 12 al domingo 18 y la última cerrada, del 10 al 16. */
const VIGENTE_HASTA = '2026-10-18';
const VIGENTE_CON_ANCLA: InicioSemanal = { posicion: VIGENTE, hastaVigente: VIGENTE_HASTA };

function semana(hasta: string, cambios: Partial<SemanaDePersona> = {}): SemanaDePersona {
  const d = new Date(`${hasta}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 6);
  return {
    grupoId: 'g1',
    personaId: 'p1',
    nombre: 'Ana Pérez',
    avatarUrl: null,
    rol: 'TRAINEE',
    desde: d.toISOString().slice(0, 10),
    hasta,
    zona: 'America/Lima',
    semanaEnCurso: hasta === VIGENTE_HASTA,
    cerrada: hasta !== VIGENTE_HASTA,
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
function Sonda({ grupo, persona, inicio }: { grupo: string; persona: string; inicio?: InicioSemanal }) {
  ultima = useSemanaDePersona(grupo, persona, inicio);
  return null;
}

async function montar(props: { grupo?: string; persona?: string; inicio?: InicioSemanal } = {}): Promise<ReactTestRenderer> {
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

describe('la ventana de una persona', () => {
  it('sin inicio, abre la ventana vigente del servidor (sin fecha) y queda con sus datos y su ancla', async () => {
    mockSemana.mockResolvedValueOnce(semana(VIGENTE_HASTA));
    await montar();
    expect(mockSemana).toHaveBeenCalledWith('g1', 'p1', null);
    expect(ultima.datos?.hasta).toBe(VIGENTE_HASTA);
    expect(ultima.posicion).toEqual(VIGENTE);
    expect(ultima.inicio.hastaVigente).toBe(VIGENTE_HASTA);
    expect(ultima.cargando).toBe(false);
    expect(ultima.fallo).toBeNull();
  });

  it('con el inicio de la lista abre en esa misma posición: la vigente sin fecha, una semana con su viernes', async () => {
    mockSemana.mockResolvedValueOnce(semana(VIGENTE_HASTA));
    await montar({ inicio: VIGENTE_CON_ANCLA });
    expect(mockSemana).toHaveBeenLastCalledWith('g1', 'p1', null);

    mockSemana.mockResolvedValueOnce(semana('2026-10-09'));
    await montar({ persona: 'p2', inicio: { posicion: { modo: 'semana', semanaHasta: '2026-10-09' }, hastaVigente: VIGENTE_HASTA } });
    expect(mockSemana).toHaveBeenLastCalledWith('g1', 'p2', '2026-10-09');
    expect(ultima.datos?.hasta).toBe('2026-10-09');
  });

  it('mientras carga no hay datos, hay carga; y el rango ya dice los días de la posición pedida', async () => {
    const p = pendiente<SemanaDePersona>();
    mockSemana.mockReturnValueOnce(p.promesa);
    await montar({ inicio: { posicion: { modo: 'semana', semanaHasta: '2026-10-16' }, hastaVigente: VIGENTE_HASTA } });
    expect(ultima.datos).toBeNull();
    expect(ultima.cargando).toBe(true);
    expect(ultima.rango).toEqual({ desde: '2026-10-10', hasta: '2026-10-16' });

    const q = pendiente<SemanaDePersona>();
    mockSemana.mockReturnValueOnce(q.promesa);
    await montar({ persona: 'p2', inicio: VIGENTE_CON_ANCLA });
    expect(ultima.rango).toEqual({ desde: '2026-10-12', hasta: VIGENTE_HASTA });
  });

  it('desde la vigente, ‹ va a la última semana cerrada y el dato de la actual desaparece AL INSTANTE', async () => {
    mockSemana.mockResolvedValueOnce(semana(VIGENTE_HASTA));
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

  it('de ahí, de 7 en 7 días hacia atrás; y › vuelve hasta la vigente, que se pide sin fecha', async () => {
    mockSemana.mockResolvedValueOnce(semana(VIGENTE_HASTA));
    await montar();
    mockSemana.mockResolvedValueOnce(semana('2026-10-16'));
    await act(async () => {
      ultima.anterior();
    });
    mockSemana.mockResolvedValueOnce(semana('2026-10-09'));
    await act(async () => {
      ultima.anterior();
    });
    expect(mockSemana).toHaveBeenLastCalledWith('g1', 'p1', '2026-10-09');

    mockSemana.mockResolvedValueOnce(semana('2026-10-16'));
    await act(async () => {
      ultima.siguiente();
    });
    expect(mockSemana).toHaveBeenLastCalledWith('g1', 'p1', '2026-10-16');
    mockSemana.mockResolvedValueOnce(semana(VIGENTE_HASTA));
    await act(async () => {
      ultima.siguiente();
    });
    expect(mockSemana).toHaveBeenLastCalledWith('g1', 'p1', null);
    expect(ultima.datos?.hasta).toBe(VIGENTE_HASTA);
  });

  it('una respuesta que llega tarde NO pisa a la ventana que se pidió después', async () => {
    mockSemana.mockResolvedValueOnce(semana(VIGENTE_HASTA));
    await montar();
    const vieja = pendiente<SemanaDePersona>();
    const nueva = pendiente<SemanaDePersona>();
    mockSemana.mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
    await act(async () => {
      ultima.anterior(); // 16
    });
    await act(async () => {
      ultima.anterior(); // 9: se pide sin esperar la de 16
    });
    await act(async () => {
      nueva.resolver(semana('2026-10-09'));
    });
    await act(async () => {
      vieja.resolver(semana('2026-10-16'));
    });
    expect(ultima.datos?.hasta).toBe('2026-10-09');
  });

  it('no se puede ir más allá de la vigente (el futuro no se mide) ni antes de que empezara el programa', async () => {
    mockSemana.mockResolvedValueOnce(semana(VIGENTE_HASTA, { primeraSemana: '2026-10-10' }));
    await montar();
    expect(ultima.puedeSiguiente).toBe(false);
    const llamadas = mockSemana.mock.calls.length;
    await act(async () => {
      ultima.siguiente();
    });
    expect(mockSemana.mock.calls.length).toBe(llamadas);

    /* Empezó el sábado 10: su primera semana cierra el viernes 16, y de ahí para atrás no hay nada. */
    expect(ultima.puedeAnterior).toBe(true);
    mockSemana.mockResolvedValueOnce(semana('2026-10-16', { primeraSemana: '2026-10-10' }));
    await act(async () => {
      ultima.anterior();
    });
    expect(ultima.puedeAnterior).toBe(false);
    expect(ultima.puedeSiguiente).toBe(true);
    const antes = mockSemana.mock.calls.length;
    await act(async () => {
      ultima.anterior();
    });
    expect(mockSemana.mock.calls.length).toBe(antes);
  });

  it('quien empezó dentro de la ventana vigente no tiene una semana anterior a la que ir', async () => {
    mockSemana.mockResolvedValueOnce(semana(VIGENTE_HASTA, { primeraSemana: '2026-10-17' }));
    await montar();
    expect(ultima.puedeAnterior).toBe(false);
  });

  it('sin saber cuándo empezó (sin Día 1) no se inventa un tope: manda el límite de siempre', async () => {
    mockSemana.mockResolvedValueOnce(semana(VIGENTE_HASTA, { primeraSemana: null }));
    await montar();
    expect(ultima.puedeAnterior).toBe(true);
  });

  it('si falla: error con «Reintentar», sin datos viejos; reintentar vuelve a pedir lo mismo', async () => {
    mockSemana.mockResolvedValueOnce(semana(VIGENTE_HASTA));
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

  it('tras un fallo se puede seguir navegando (la posición pedida manda, no la última que cargó)', async () => {
    mockSemana.mockResolvedValueOnce(semana(VIGENTE_HASTA));
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
    mockSemana.mockResolvedValueOnce(semana(VIGENTE_HASTA));
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
      lenta.resolver(semana(VIGENTE_HASTA));
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
function SondaDelGrupo({ grupo, inicio }: { grupo: string | null; inicio?: InicioSemanal }) {
  lista = useGrupoDelLider(grupo, inicio);
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

  it('con el inicio del resumen abre en esa misma posición: la vigente sin fecha, una semana con su viernes', async () => {
    mockTabla.mockResolvedValueOnce(tabla('2026-10-18', ['Ana']));
    await act(async () => {
      TestRenderer.create(React.createElement(SondaDelGrupo, { grupo: 'g1', inicio: VIGENTE_CON_ANCLA }));
    });
    expect(mockTabla).toHaveBeenLastCalledWith('g1', null);

    mockTabla.mockResolvedValueOnce(tabla('2026-10-09', ['Ana']));
    await act(async () => {
      TestRenderer.create(
        React.createElement(SondaDelGrupo, {
          grupo: 'g2',
          inicio: { posicion: { modo: 'semana', semanaHasta: '2026-10-09' }, hastaVigente: VIGENTE_HASTA },
        }),
      );
    });
    expect(mockTabla).toHaveBeenLastCalledWith('g2', '2026-10-09');
    /* Y se mueve como el resumen: siguiente desde la semana pasada, de a 7 días, hasta volver a la vigente. */
    expect(lista.puedeSiguiente).toBe(true);
    expect(lista.puedeAnterior).toBe(true);
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
