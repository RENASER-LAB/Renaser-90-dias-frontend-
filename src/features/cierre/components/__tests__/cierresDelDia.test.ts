import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Cierres del día» en la ficha de quien acompaña (spec 017): lo que dijo cada día de la semana, en solo lectura. La misma
 * política que «Tiempo libre de la semana»: una lectura por semana, nunca al futuro ni antes de la primera semana, y un
 * 403 o un 404 no dibujan la sección.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
/* `Aparicion` anima con el hilo nativo, que en Jest no existe: aparece ya puesta. */
jest.mock('../../../../components/Aparicion', () => ({
  Aparicion: ({ children }: { children: React.ReactNode }) => children,
}));

import { ApiError } from '../../../../services/http/apiClient';
import type { CargarCierres, CierresDeLaSemana, DiaDelCierre } from '../../types/cierre.types';
import { CierresDelDia, ETIQUETA_ANTERIOR, ETIQUETA_SIGUIENTE } from '../CierresDelDia';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ACTUAL = '2026-10-26';
const PRIMERA = '2026-10-12';

const PENDIENTE = (nota: string | null = 'Se alargó la reunión') => ({
  id: 'a-2',
  titulo: 'Revisar las facturas',
  horaInicio: '20:30',
  cumplida: false,
  cumplidaEn: null,
  cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota },
});
const CUMPLIDA = { id: 'a-1', titulo: 'Enviar la propuesta', horaInicio: '10:00', cumplida: true, cumplidaEn: '2026-10-28T15:20:00Z', cierre: null };

const dia = (fecha: string, extra: Partial<DiaDelCierre> = {}): DiaDelCierre => ({
  fecha,
  estado: 'CERRADO',
  cerradoEn: '2026-10-29T03:02:00Z',
  nota: null,
  acciones: [CUMPLIDA, PENDIENTE()],
  ...extra,
});

function semana(lunes: string, extra: Partial<CierresDeLaSemana> = {}): CierresDeLaSemana {
  return {
    semana: lunes,
    primeraSemana: PRIMERA,
    dias: [
      dia('2026-10-26', { estado: 'SIN_CERRAR', cerradoEn: null, acciones: [PENDIENTE(null)] }),
      dia('2026-10-27', { acciones: [] , nota: 'Un día tranquilo' }),
      dia('2026-10-28'),
      dia('2026-10-29', { estado: 'ABIERTO', cerradoEn: null, acciones: [CUMPLIDA] }),
    ],
    resumen: { cerrados: 2, sinCerrar: 1, motivos: [{ motivo: 'SIN_TIEMPO', veces: 4 }, { motivo: 'NUEVO', veces: 2 }] },
    ...extra,
  };
}

function cargarCon(respuestas: Partial<Record<string, CierresDeLaSemana>> = {}) {
  const llamadas: Array<string | null | undefined> = [];
  const cargar: CargarCierres = jest.fn(async (lunes?: string | null) => {
    llamadas.push(lunes);
    return respuestas[lunes ?? 'actual'] ?? semana(lunes ?? ACTUAL);
  });
  return { cargar, llamadas };
}

const vaciar = () => new Promise<void>(res => setImmediate(res));

async function dibujar(cargar: CargarCierres | null): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(CierresDelDia, { cargar }));
    await vaciar();
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

function nodoDe(r: ReactTestRenderer, etiqueta: string): ReactTestInstance {
  const nodo = r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];
  if (!nodo) throw new Error(`No hay un botón «${etiqueta}»`);
  return nodo;
}
async function tocar(r: ReactTestRenderer, etiqueta: string) {
  await act(async () => {
    nodoDe(r, etiqueta).props.onPress();
    await vaciar();
  });
}
const habilitada = (r: ReactTestRenderer, etiqueta: string) => nodoDe(r, etiqueta).props.accessibilityState?.disabled !== true;
const sinNada = (r: ReactTestRenderer) => r.root.findAll(n => typeof n.type === 'string').length === 0;

describe('CierresDelDia: lo que muestra', () => {
  it('el título, la semana en curso, el resumen y los motivos que más se repiten', async () => {
    const t = textos(await dibujar(cargarCon().cargar));
    expect(t).toContain('Cierres del día');
    expect(t).toContain('Semana en curso');
    expect(t).toContain('Del 26 de octubre al 1 de noviembre');
    expect(t).toContain('2 cerrados · 1 sin cerrar');
    expect(t).toContain('Lo que más se repite');
    expect(t).toContain('No me alcanzó el tiempo · 4 veces');
    expect(t).not.toContain('NUEVO'); // un motivo que esta versión no conoce no se dibuja
  });

  it('cada día dice cómo quedó: «Cerrado», «Sin cerrar» (sin tono de falta) y «Hoy, todavía sin cerrar»', async () => {
    const t = textos(await dibujar(cargarCon().cargar));
    expect(t).toContain('Lunes 26 · Sin cerrar');
    expect(t).toContain('Martes 27 · Cerrado');
    expect(t).toContain('Jueves 29 · Hoy, todavía sin cerrar');
    expect(t).not.toMatch(/incumpl|falt[óa] a|no cumpli/i);
  });

  it('lo que dijo de cada pendiente, con su nota, y la nota del día', async () => {
    const t = textos(await dibujar(cargarCon().cargar));
    expect(t).toContain('«Revisar las facturas» quedó pendiente');
    expect(t).toContain('No me alcanzó el tiempo → Hacerla a otra hora');
    expect(t).toContain('«Se alargó la reunión»');
    expect(t).toContain('Nota del día: «Un día tranquilo»');
    expect(t).toContain('Ese día no tenía acciones.');
    expect(t).toContain('1 de 2 acciones cumplidas');
  });

  it('un día sin cerrar muestra sus pendientes sin respuesta, sin inventar una', async () => {
    const t = textos(await dibujar(cargarCon().cargar));
    expect(t).toContain('Lunes 26 · Sin cerrar | 0 de 1 acción cumplida | «Revisar las facturas» quedó pendiente');
  });

  it('sin resumen (el servidor no lo mandó) se dibujan solo los días', async () => {
    const t = textos(await dibujar(cargarCon({ actual: semana(ACTUAL, { resumen: null }) }).cargar));
    expect(t).not.toContain('cerrados');
    expect(t).toContain('Martes 27');
  });

  it('una semana sin días (todavía no eligió su Día 1) lo dice en una línea', async () => {
    const t = textos(await dibujar(cargarCon({ actual: semana(ACTUAL, { dias: [], primeraSemana: null, resumen: null }) }).cargar));
    expect(t).toContain('No hay días para mostrar en esta semana.');
  });

  it('es solo lectura: nada que tocar salvo las flechas', async () => {
    const r = await dibujar(cargarCon().cargar);
    const botones = r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel).map(n => n.props.accessibilityLabel);
    expect([...new Set(botones)].sort()).toEqual([ETIQUETA_ANTERIOR, ETIQUETA_SIGUIENTE].sort());
  });
});

describe('CierresDelDia: cuándo no aparece', () => {
  it.each([403, 404])('un %i (otro rol, ya no la acompaña, o un backend sin la spec 017) esconde la sección, sin error', async estado => {
    const r = await dibujar(async () => {
      throw new ApiError(estado, 'x');
    });
    expect(sinNada(r)).toBe(true);
  });

  it('sin a quién preguntarle (la persona no tiene grupo) no dibuja nada', async () => {
    expect(sinNada(await dibujar(null))).toBe(true);
  });

  it('mientras llega la PRIMERA lectura no dibuja nada; al llegar, aparece', async () => {
    let resolver!: (s: CierresDeLaSemana) => void;
    const cargar: CargarCierres = jest.fn(() => new Promise<CierresDeLaSemana>(res => (resolver = res)));
    const r = await dibujar(cargar);
    expect(sinNada(r)).toBe(true);
    await act(async () => {
      resolver(semana(ACTUAL));
      await vaciar();
    });
    expect(textos(r)).toContain('Cierres del día');
  });

  it('tras un 404 no se vuelve a pedir nada, ni al volver a dibujar la sección', async () => {
    const cargar: CargarCierres = jest.fn(async () => {
      throw new ApiError(404, 'x');
    });
    expect(sinNada(await dibujar(cargar))).toBe(true);
    expect(sinNada(await dibujar(cargar))).toBe(true);
    expect(cargar).toHaveBeenCalledTimes(1);
  });
});

describe('CierresDelDia: si el pedido falla', () => {
  it('lo dice y ofrece «Reintentar», que pide la misma semana otra vez; sin red lo dice distinto', async () => {
    let intento = 0;
    const cargar: CargarCierres = jest.fn(async () => {
      intento += 1;
      if (intento === 1) throw new ApiError(500, 'caído');
      return semana(ACTUAL);
    });
    const r = await dibujar(cargar);
    expect(textos(r)).toContain('No se pudieron cargar los cierres de esta semana.');
    expect(cargar).toHaveBeenCalledTimes(1);
    await tocar(r, 'Reintentar');
    expect(cargar).toHaveBeenCalledTimes(2);
    expect(textos(r)).toContain('2 cerrados · 1 sin cerrar');

    const sinRed = await dibujar(async () => {
      throw new ApiError(0, 'sin red');
    });
    expect(textos(sinRed)).toContain('Revisa tu conexión.');
  });

  it('una respuesta que no se entiende es un fallo con «Reintentar», no una sección que desaparece', async () => {
    const r = await dibujar(async () => {
      throw new Error('Respuesta inesperada de GET /cierres');
    });
    expect(textos(r)).toContain('No se pudieron cargar los cierres de esta semana.');
    expect(textos(r)).toContain('Reintentar');
  });
});

describe('CierresDelDia: las semanas', () => {
  it('abre en la semana en curso: › apagado, ‹ prendido; las flechas tienen sus propios nombres', async () => {
    const { cargar, llamadas } = cargarCon();
    const r = await dibujar(cargar);
    expect(llamadas).toEqual([null]);
    expect(habilitada(r, ETIQUETA_ANTERIOR)).toBe(true);
    expect(habilitada(r, ETIQUETA_SIGUIENTE)).toBe(false);
    expect(ETIQUETA_ANTERIOR).not.toBe('Tiempo libre: semana anterior');
    expect(ETIQUETA_ANTERIOR).not.toBe('Semana anterior');
  });

  it('‹ llega hasta la primera semana y ahí se apaga; › nunca llega al futuro', async () => {
    const { cargar, llamadas } = cargarCon();
    const r = await dibujar(cargar);
    await tocar(r, ETIQUETA_ANTERIOR); // 19
    await tocar(r, ETIQUETA_ANTERIOR); // 12 = primera
    expect(textos(r)).toContain('Del 12 de octubre al 18 de octubre');
    expect(habilitada(r, ETIQUETA_ANTERIOR)).toBe(false);
    await tocar(r, ETIQUETA_ANTERIOR);
    expect(llamadas).toEqual([null, '2026-10-19', '2026-10-12']);
    await tocar(r, ETIQUETA_SIGUIENTE);
    await tocar(r, ETIQUETA_SIGUIENTE);
    expect(textos(r)).toContain('Semana en curso');
    expect(habilitada(r, ETIQUETA_SIGUIENTE)).toBe(false);
    expect(llamadas.every(l => l == null || l <= ACTUAL)).toBe(true);
  });

  it('sin saber la primera semana (todavía no eligió su Día 1) no se puede ir atrás: no se inventa un tope', async () => {
    const { cargar, llamadas } = cargarCon({ actual: semana(ACTUAL, { primeraSemana: null }) });
    const r = await dibujar(cargar);
    expect(habilitada(r, ETIQUETA_ANTERIOR)).toBe(false);
    await tocar(r, ETIQUETA_ANTERIOR);
    expect(llamadas).toEqual([null]);
  });

  it('una lectura por semana: ir y volver sale de lo guardado', async () => {
    const { cargar, llamadas } = cargarCon();
    const r = await dibujar(cargar);
    for (let vuelta = 0; vuelta < 3; vuelta += 1) {
      await tocar(r, ETIQUETA_ANTERIOR);
      await tocar(r, ETIQUETA_SIGUIENTE);
    }
    expect(llamadas).toEqual([null, '2026-10-19']);
  });

  it('mientras llega otra semana dice «Cargando…» sin mostrar los datos de la anterior', async () => {
    let resolver!: (s: CierresDeLaSemana) => void;
    const cargar: CargarCierres = jest.fn((lunes?: string | null) =>
      lunes ? new Promise<CierresDeLaSemana>(res => (resolver = res)) : Promise.resolve(semana(ACTUAL)),
    );
    const r = await dibujar(cargar);
    await tocar(r, ETIQUETA_ANTERIOR);
    expect(textos(r)).toContain('Cargando los cierres…');
    expect(textos(r)).not.toContain('2 cerrados');
    await act(async () => {
      resolver(semana('2026-10-19'));
      await vaciar();
    });
    expect(textos(r)).toContain('2 cerrados · 1 sin cerrar');
  });

  it('dos secciones de la misma persona a la vez comparten el pedido', async () => {
    let resolver!: (s: CierresDeLaSemana) => void;
    const cargar: CargarCierres = jest.fn(() => new Promise<CierresDeLaSemana>(res => (resolver = res)));
    let a!: ReactTestRenderer;
    let b!: ReactTestRenderer;
    await act(async () => {
      a = TestRenderer.create(React.createElement(CierresDelDia, { cargar }));
      b = TestRenderer.create(React.createElement(CierresDelDia, { cargar }));
      await vaciar();
    });
    expect(cargar).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolver(semana(ACTUAL));
      await vaciar();
    });
    expect(textos(a)).toContain('Cierres del día');
    expect(textos(b)).toContain('Cierres del día');
  });
});

describe('CierresDelDia: lo que ve quien acompaña de una persona que trabaja de noche o cierra a otra hora', () => {
  // Jueves 29 empezó su turno de noche y no cerró antes de la medianoche; el viernes 30 (el día nuevo) sí cerró. Solo se
  // DESCRIBE lo que dice el servidor: no hay regla de «el día de quien trabaja de noche».
  const TURNO_DE_NOCHE = (): CierresDeLaSemana =>
    semana(ACTUAL, {
      dias: [
        dia('2026-10-29', { estado: 'SIN_CERRAR', cerradoEn: null, acciones: [PENDIENTE(null)] }),
        dia('2026-10-30', { estado: 'CERRADO', cerradoEn: '2026-10-30T07:10:00Z', acciones: [PENDIENTE('Terminé el turno a las 2') ] }),
      ],
      resumen: { cerrados: 1, sinCerrar: 1, motivos: [{ motivo: 'SIN_TIEMPO', veces: 2 }] },
    });

  it('el día en que cerró después de la medianoche dice «Cerrado» y el anterior «Sin cerrar» (sin tono de falta)', async () => {
    const t = textos(await dibujar(cargarCon({ actual: TURNO_DE_NOCHE() }).cargar));
    expect(t).toContain('Jueves 29 · Sin cerrar');
    expect(t).toContain('Viernes 30 · Cerrado');
    expect(t).toContain('1 cerrado · 1 sin cerrar');
    expect(t).toContain('«Terminé el turno a las 2»');
    expect(t).not.toMatch(/incumpl|falt[óa] a|no cumpli/i);
  });

  it('un día cerrado temprano y cuya acción se cumplió después ya no muestra lo que dijo de ella', async () => {
    const cumplidaDespues = { ...PENDIENTE(), cumplida: true, cumplidaEn: '2026-10-29T17:00:00Z', cierre: null };
    const t = textos(await dibujar(cargarCon({ actual: semana(ACTUAL, { dias: [dia('2026-10-29', { acciones: [cumplidaDespues] })] }) }).cargar));
    expect(t).toContain('Jueves 29 · Cerrado');
    expect(t).toContain('1 de 1 acción cumplida');
    expect(t).not.toContain('quedó pendiente');
    expect(t).not.toContain('→');
  });

  it('un día normal cerrado a las 21:00 se ve «Cerrado» con lo que dijo de cada pendiente', async () => {
    const normal = semana(ACTUAL, {
      dias: [dia('2026-10-29', { cerradoEn: '2026-10-30T02:00:00Z', acciones: [CUMPLIDA, PENDIENTE('Se alargó la reunión')] })],
      resumen: { cerrados: 1, sinCerrar: 0, motivos: [{ motivo: 'SIN_TIEMPO', veces: 1 }] },
    });
    const t = textos(await dibujar(cargarCon({ actual: normal }).cargar));
    expect(t).toContain('Jueves 29 · Cerrado');
    expect(t).toContain('No me alcanzó el tiempo → Hacerla a otra hora');
    expect(t).toContain('«Se alargó la reunión»');
  });
});
