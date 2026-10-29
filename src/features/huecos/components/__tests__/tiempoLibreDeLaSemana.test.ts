import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Tiempo libre de la semana» en la ficha de quien acompaña (spec 015): lo ven el mentor, el líder, el administrador y el
 * alquimista con el mismo componente, cada uno con su manera de pedirlo. Una lectura por semana, nunca al futuro ni antes
 * de la primera semana, y un 403 o un 404 no dibujan la sección.
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
import type { CargarHuecos, DiaConHuecos, HuecosDeLaSemana } from '../../types/huecos.types';
import { sumarDias } from '../../utils/semanasDeHuecos';
import { TiempoLibreDeLaSemana } from '../TiempoLibreDeLaSemana';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ACTUAL = '2026-10-26';
const PRIMERA = '2026-10-12';

const HUECO = { desde: '15:00', hasta: '17:00', minutos: 120 };

function dia(fecha: string, extra: Partial<DiaConHuecos> = {}): DiaConHuecos {
  return {
    fecha,
    ventana: { desde: '05:30', hasta: '22:30' },
    minutosOcupados: 400,
    minutosLibres: 380,
    huecos: [HUECO],
    ...extra,
  };
}

/** Una semana de siete días, cada uno con UN hueco (siete en total: todavía no se pliega). */
function semana(lunes: string, extra: Partial<HuecosDeLaSemana> = {}): HuecosDeLaSemana {
  return {
    semana: lunes,
    primeraSemana: PRIMERA,
    cerrada: lunes !== ACTUAL,
    dias: Array.from({ length: 7 }, (_, i) => dia(sumarDias(lunes, i))),
    resumen: {
      minutosOcupados: 2870,
      minutosLibres: 2730,
      huecosQueSeRepiten: [{ desde: '15:00', hasta: '17:00', dias: [1, 3, 4] }],
      cumplidosATiempo: 32,
      cumplidosTarde: 6,
      noCumplidos: 4,
    },
    ...extra,
  };
}

/** Un `cargar` que responde con la semana pedida (sin `semana`, la en curso) y recuerda con qué lo llamaron. */
function cargarCon(respuestas: Partial<Record<string, HuecosDeLaSemana>> = {}) {
  const llamadas: Array<string | null | undefined> = [];
  const cargar: CargarHuecos = jest.fn(async (lunes?: string | null) => {
    llamadas.push(lunes);
    return respuestas[lunes ?? 'actual'] ?? semana(lunes ?? ACTUAL);
  });
  return { cargar, llamadas };
}

const vaciar = () => new Promise<void>(res => setImmediate(res));

async function dibujar(cargar: CargarHuecos | null): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(TiempoLibreDeLaSemana, { cargar }));
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

function nodoDe(r: ReactTestRenderer, etiqueta: string | RegExp): ReactTestInstance {
  const coincide = (e: unknown) => (typeof e === 'string' ? (typeof etiqueta === 'string' ? e === etiqueta : etiqueta.test(e)) : false);
  const nodo = r.root.findAll(n => coincide(n.props.accessibilityLabel) && typeof n.props.onPress === 'function')[0];
  if (!nodo) throw new Error(`No hay un botón «${String(etiqueta)}»`);
  return nodo;
}

async function tocar(r: ReactTestRenderer, etiqueta: string | RegExp) {
  await act(async () => {
    nodoDe(r, etiqueta).props.onPress();
    await vaciar();
  });
}

function habilitada(r: ReactTestRenderer, etiqueta: string): boolean {
  return nodoDe(r, etiqueta).props.accessibilityState?.disabled !== true;
}

function sinNada(r: ReactTestRenderer): boolean {
  return r.root.findAll(n => typeof n.type === 'string').length === 0;
}

describe('TiempoLibreDeLaSemana: lo que muestra', () => {
  it('el título, la semana en curso, el resumen y los siete días', async () => {
    const { cargar } = cargarCon();
    const t = textos(await dibujar(cargar));
    expect(t).toContain('Tiempo libre de la semana');
    expect(t).toContain('Semana en curso');
    expect(t).toContain('Del 26 de octubre al 1 de noviembre');
    // El resumen: tiempo ocupado y libre, lo real y los huecos que se repiten.
    expect(t).toContain('Tiempo ocupado | 47 h 50 min');
    expect(t).toContain('Tiempo libre | 45 h 30 min');
    expect(t).toContain('32 a tiempo · 6 tarde · 4 sin cumplir');
    expect(t).toContain('Lun, mié y jue · 15:00–17:00');
    // Los días, cada uno con su ventana y sus huecos.
    expect(t).toContain('Lunes 26 | De 05:30 a 22:30');
    expect(t).toContain('Domingo 1');
    expect(t.split('15:00–17:00 · 2 h')).toHaveLength(8); // siete días con su hueco
  });

  it('un día sin Despertar ni Dormir (ventana nula) lo dice con las palabras del dueño', async () => {
    const { cargar } = cargarCon({
      actual: semana(ACTUAL, { dias: [dia(ACTUAL, { ventana: null })] }),
    });
    expect(textos(await dibujar(cargar))).toContain('Sin Despertar ni Dormir: todo el día');
  });

  it('un día sin huecos dice «Sin huecos de 30 min o más»', async () => {
    const { cargar } = cargarCon({
      actual: semana(ACTUAL, { dias: [dia(ACTUAL, { huecos: [] }), dia(sumarDias(ACTUAL, 1))] }),
    });
    const t = textos(await dibujar(cargar));
    expect(t).toContain('Sin huecos de 30 min o más');
    expect(t).toContain('15:00–17:00 · 2 h');
  });

  it('sin huecos que se repitan, lo dice; sin nada real que contar, no escribe ceros', async () => {
    const { cargar } = cargarCon({
      actual: semana(ACTUAL, {
        resumen: {
          minutosOcupados: 100,
          minutosLibres: 900,
          huecosQueSeRepiten: [],
          cumplidosATiempo: 0,
          cumplidosTarde: 0,
          noCumplidos: 0,
        },
      }),
    });
    const t = textos(await dibujar(cargar));
    expect(t).toContain('Ningún hueco se repite esta semana.');
    expect(t).not.toContain('Lo real de la semana');
    expect(t).not.toContain('a tiempo');
  });

  it('sin resumen (el servidor no lo mandó) se dibujan solo los días', async () => {
    const { cargar } = cargarCon({ actual: semana(ACTUAL, { resumen: null }) });
    const t = textos(await dibujar(cargar));
    expect(t).not.toContain('Tiempo ocupado');
    expect(t).not.toContain('Huecos que se repiten');
    expect(t).toContain('Lunes 26');
  });

  it('una semana sin días lo dice en una línea', async () => {
    const { cargar } = cargarCon({ actual: semana(ACTUAL, { dias: [] }) });
    expect(textos(await dibujar(cargar))).toContain('No hay días para mostrar en esta semana.');
  });

  it('«Semana cerrada» cuando el servidor dice que cerró', async () => {
    const { cargar } = cargarCon({ actual: semana(ACTUAL, { cerrada: true }) });
    const t = textos(await dibujar(cargar));
    expect(t).toContain('Semana cerrada');
    expect(t).not.toContain('Semana en curso');
  });

  it('las líneas largas se parten en renglones: ningún texto se corta con «…»', async () => {
    const { cargar } = cargarCon();
    const r = await dibujar(cargar);
    const cortados = r.root.findAll(
      n => (n.type as unknown) === 'Text' && (n.props.numberOfLines !== undefined || n.props.ellipsizeMode !== undefined),
    );
    expect(cortados).toHaveLength(0);
  });
});

describe('TiempoLibreDeLaSemana: cuándo no aparece', () => {
  it.each([403, 404])('un %i esconde la sección, sin error', async estado => {
    const r = await dibujar(async () => {
      throw new ApiError(estado, 'x');
    });
    expect(sinNada(r)).toBe(true);
  });

  it('sin a quién preguntarle (la persona no tiene grupo) no dibuja nada ni pide nada', async () => {
    const r = await dibujar(null);
    expect(sinNada(r)).toBe(true);
  });

  it('mientras llega la PRIMERA lectura no dibuja nada (ni un «Cargando…» que se retire con un 404); al llegar, aparece', async () => {
    let resolver!: (s: HuecosDeLaSemana) => void;
    const cargar: CargarHuecos = jest.fn(() => new Promise<HuecosDeLaSemana>(res => (resolver = res)));
    const r = await dibujar(cargar);
    expect(sinNada(r)).toBe(true);
    expect(textos(r)).not.toContain('Cargando');
    await act(async () => {
      resolver(semana(ACTUAL));
      await vaciar();
    });
    expect(textos(r)).toContain('Tiempo libre de la semana');
  });

  it('tras un 404 no se vuelve a pedir nada, ni al volver a dibujar la sección', async () => {
    const cargar: CargarHuecos = jest.fn(async () => {
      throw new ApiError(404, 'x');
    });
    const a = await dibujar(cargar);
    expect(sinNada(a)).toBe(true);
    const b = await dibujar(cargar);
    expect(sinNada(b)).toBe(true);
    expect(cargar).toHaveBeenCalledTimes(1);
  });
});

describe('TiempoLibreDeLaSemana: si el pedido falla', () => {
  it('lo dice y ofrece «Reintentar», que pide la misma semana otra vez', async () => {
    let intento = 0;
    const cargar: CargarHuecos = jest.fn(async () => {
      intento += 1;
      if (intento === 1) throw new ApiError(500, 'caído');
      return semana(ACTUAL);
    });
    const r = await dibujar(cargar);
    expect(textos(r)).toContain('No se pudo cargar el tiempo libre de esta semana.');
    expect(textos(r)).toContain('Reintentar');
    // Un fallo no se vuelve a pedir solo en cada dibujo.
    expect(cargar).toHaveBeenCalledTimes(1);

    await tocar(r, 'Reintentar');
    expect(cargar).toHaveBeenCalledTimes(2);
    expect(textos(r)).toContain('Tiempo ocupado');
    expect(textos(r)).not.toContain('No se pudo cargar');
  });

  it('sin red lo dice distinto', async () => {
    const r = await dibujar(async () => {
      throw new ApiError(0, 'sin red');
    });
    expect(textos(r)).toContain('Revisa tu conexión.');
  });

  it('una respuesta que no se entiende también es un fallo con «Reintentar», no una sección que desaparece', async () => {
    const r = await dibujar(async () => {
      throw new Error('Respuesta inesperada de GET /huecos');
    });
    expect(textos(r)).toContain('No se pudo cargar el tiempo libre de esta semana.');
    expect(textos(r)).toContain('Reintentar');
  });

  it('si falla otra semana, las flechas siguen: se puede volver a la que sí cargó', async () => {
    const cargar: CargarHuecos = jest.fn(async (lunes?: string | null) => {
      if (lunes) throw new ApiError(500, 'caído');
      return semana(ACTUAL);
    });
    const r = await dibujar(cargar);
    await tocar(r, 'Tiempo libre: semana anterior');
    expect(textos(r)).toContain('No se pudo cargar el tiempo libre de esta semana.');
    expect(textos(r)).toContain('Del 19 de octubre al 25 de octubre');
    await tocar(r, 'Tiempo libre: semana siguiente');
    expect(textos(r)).toContain('Tiempo ocupado');
    expect(cargar).toHaveBeenCalledTimes(2); // la en curso y la anterior, nada más
  });
});

describe('TiempoLibreDeLaSemana: las semanas', () => {
  it('abre en la semana en curso: › apagado, ‹ prendido', async () => {
    const { cargar, llamadas } = cargarCon();
    const r = await dibujar(cargar);
    expect(llamadas).toEqual([null]);
    expect(habilitada(r, 'Tiempo libre: semana anterior')).toBe(true);
    expect(habilitada(r, 'Tiempo libre: semana siguiente')).toBe(false);
  });

  it('‹ pide la semana anterior por su lunes; mientras llega dice «Cargando…» sin mostrar la semana de antes', async () => {
    let resolver!: (s: HuecosDeLaSemana) => void;
    const cargar: CargarHuecos = jest.fn((lunes?: string | null) =>
      lunes ? new Promise<HuecosDeLaSemana>(res => (resolver = res)) : Promise.resolve(semana(ACTUAL)),
    );
    const r = await dibujar(cargar);
    await tocar(r, 'Tiempo libre: semana anterior');
    expect(cargar).toHaveBeenLastCalledWith('2026-10-19');
    let t = textos(r);
    expect(t).toContain('Cargando el tiempo libre…');
    expect(t).toContain('Del 19 de octubre al 25 de octubre');
    // Lo de la semana anterior en la pantalla (el resumen) todavía no está, y tampoco queda lo de la semana en curso.
    expect(t).not.toContain('Tiempo ocupado');

    await act(async () => {
      resolver(semana('2026-10-19'));
      await vaciar();
    });
    t = textos(r);
    expect(t).not.toContain('Cargando');
    expect(t).toContain('Semana cerrada');
    expect(t).toContain('Tiempo ocupado');
  });

  it('‹ llega hasta la primera semana de su programa y ahí se apaga; no pide nada antes', async () => {
    const { cargar, llamadas } = cargarCon();
    const r = await dibujar(cargar);
    await tocar(r, 'Tiempo libre: semana anterior'); // 19
    expect(habilitada(r, 'Tiempo libre: semana anterior')).toBe(true);
    await tocar(r, 'Tiempo libre: semana anterior'); // 12 = primera
    expect(textos(r)).toContain('Del 12 de octubre al 18 de octubre');
    expect(habilitada(r, 'Tiempo libre: semana anterior')).toBe(false);
    // Aunque algo llamara a la flecha apagada, no se va a una semana anterior a la primera.
    await tocar(r, 'Tiempo libre: semana anterior');
    expect(llamadas).toEqual([null, '2026-10-19', '2026-10-12']);
    expect(textos(r)).toContain('Del 12 de octubre al 18 de octubre');
  });

  it('› nunca llega al futuro: vuelve a la semana en curso y ahí se apaga', async () => {
    const { cargar, llamadas } = cargarCon();
    const r = await dibujar(cargar);
    await tocar(r, 'Tiempo libre: semana anterior');
    await tocar(r, 'Tiempo libre: semana siguiente');
    expect(textos(r)).toContain('Semana en curso');
    expect(habilitada(r, 'Tiempo libre: semana siguiente')).toBe(false);
    await tocar(r, 'Tiempo libre: semana siguiente');
    expect(textos(r)).toContain('Del 26 de octubre al 1 de noviembre');
    expect(llamadas.every(l => l == null || l <= ACTUAL)).toBe(true);
  });

  it('sin saber la primera semana (todavía no eligió su Día 1) no se puede ir atrás: no se inventa un tope', async () => {
    const { cargar, llamadas } = cargarCon({ actual: semana(ACTUAL, { primeraSemana: null }) });
    const r = await dibujar(cargar);
    expect(habilitada(r, 'Tiempo libre: semana anterior')).toBe(false);
    await tocar(r, 'Tiempo libre: semana anterior');
    expect(llamadas).toEqual([null]);
  });

  it('tocar varias veces la misma semana hace UN solo pedido: ir y volver sale de lo guardado', async () => {
    const { cargar, llamadas } = cargarCon();
    const r = await dibujar(cargar);
    for (let vuelta = 0; vuelta < 3; vuelta += 1) {
      await tocar(r, 'Tiempo libre: semana anterior');
      await tocar(r, 'Tiempo libre: semana anterior');
      await tocar(r, 'Tiempo libre: semana siguiente');
      await tocar(r, 'Tiempo libre: semana siguiente');
    }
    expect(llamadas).toEqual([null, '2026-10-19', '2026-10-12']);
  });

  it('al volver a la semana ya leída aparece en el acto, sin «Cargando…»', async () => {
    const { cargar } = cargarCon();
    const r = await dibujar(cargar);
    await tocar(r, 'Tiempo libre: semana anterior');
    await act(async () => {
      nodoDe(r, 'Tiempo libre: semana siguiente').props.onPress();
    });
    // Sin esperar ni un tick: la semana en curso ya estaba guardada.
    expect(textos(r)).not.toContain('Cargando');
    expect(textos(r)).toContain('Semana en curso');
  });

  it('dos secciones de la misma persona montadas a la vez comparten el pedido', async () => {
    let resolver!: (s: HuecosDeLaSemana) => void;
    const cargar: CargarHuecos = jest.fn(() => new Promise<HuecosDeLaSemana>(res => (resolver = res)));
    let a!: ReactTestRenderer;
    let b!: ReactTestRenderer;
    await act(async () => {
      a = TestRenderer.create(React.createElement(TiempoLibreDeLaSemana, { cargar }));
      b = TestRenderer.create(React.createElement(TiempoLibreDeLaSemana, { cargar }));
      await vaciar();
    });
    expect(cargar).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolver(semana(ACTUAL));
      await vaciar();
    });
    expect(textos(a)).toContain('Tiempo ocupado');
    expect(textos(b)).toContain('Tiempo ocupado');
  });

  it('volver a montar la sección de la misma persona (la ficha pasó por «Avisar a su mentor») no pide nada y aparece ya puesta', async () => {
    const { cargar } = cargarCon();
    const primera = await dibujar(cargar);
    await tocar(primera, 'Tiempo libre: semana anterior');
    act(() => primera.unmount());
    expect(cargar).toHaveBeenCalledTimes(2);

    let segunda!: ReactTestRenderer;
    // Sin esperar ni un tick: ya estaba guardada.
    act(() => {
      segunda = TestRenderer.create(React.createElement(TiempoLibreDeLaSemana, { cargar }));
    });
    expect(textos(segunda)).toContain('Semana en curso');
    expect(textos(segunda)).toContain('Tiempo ocupado');
    await act(async () => vaciar());
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it('otra persona (otro `cargar`) empieza otra vez por su semana en curso y no hereda lo guardado de la anterior', async () => {
    const una = cargarCon();
    const otra = cargarCon({ actual: semana(ACTUAL, { dias: [dia(ACTUAL, { huecos: [{ desde: '09:00', hasta: '09:30', minutos: 30 }] })] }) });
    const r = await dibujar(una.cargar);
    await tocar(r, 'Tiempo libre: semana anterior');
    const s = await dibujar(otra.cargar);
    expect(otra.llamadas).toEqual([null]);
    expect(textos(s)).toContain('09:00–09:30 · 30 min');
    expect(textos(s)).toContain('Semana en curso');
  });

  it('cambiar de persona en la misma sección vuelve a su semana en curso', async () => {
    const una = cargarCon();
    const otra = cargarCon();
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(React.createElement(TiempoLibreDeLaSemana, { cargar: una.cargar }));
      await vaciar();
    });
    await tocar(r, 'Tiempo libre: semana anterior');
    expect(textos(r)).toContain('Del 19 de octubre al 25 de octubre');
    await act(async () => {
      r.update(React.createElement(TiempoLibreDeLaSemana, { cargar: otra.cargar }));
      await vaciar();
    });
    expect(otra.llamadas).toEqual([null]);
    expect(textos(r)).toContain('Del 26 de octubre al 1 de noviembre');
  });

  it('volver a dibujar la sección con la misma función no pide nada más', async () => {
    const { cargar } = cargarCon();
    const r = await dibujar(cargar);
    await act(async () => {
      r.update(React.createElement(TiempoLibreDeLaSemana, { cargar }));
      r.update(React.createElement(TiempoLibreDeLaSemana, { cargar }));
      await vaciar();
    });
    expect(cargar).toHaveBeenCalledTimes(1);
  });
});

describe('TiempoLibreDeLaSemana: una semana larga se pliega por día', () => {
  /** Ocho huecos en la semana (lunes y miércoles con dos, martes con ninguno): ya es largo. */
  function semanaLarga(): HuecosDeLaSemana {
    const base = semana(ACTUAL);
    return {
      ...base,
      dias: base.dias.map((d, i) =>
        i === 0 || i === 2
          ? { ...d, huecos: [HUECO, { desde: '19:00', hasta: '20:30', minutos: 90 }] }
          : i === 1
            ? { ...d, huecos: [] }
            : d,
      ),
    };
  }

  it('con menos de 8 huecos no hay nada que tocar: todo se lee de corrido', async () => {
    const { cargar } = cargarCon();
    const r = await dibujar(cargar);
    expect(r.root.findAll(n => n.props.accessibilityHint && n.props.accessibilityState?.expanded !== undefined)).toHaveLength(0);
  });

  it('con 8 o más, cada día es un botón plegado con una línea que dice cuántos huecos tiene', async () => {
    const { cargar } = cargarCon({ actual: semanaLarga() });
    const r = await dibujar(cargar);
    const t = textos(r);
    expect(t).toContain('2 huecos');
    expect(t).toContain('1 hueco');
    expect(t).toContain('Sin huecos de 30 min o más');
    // Plegado: los renglones de los huecos no se ven.
    expect(t).not.toContain('15:00–17:00 · 2 h');
    expect(nodoDe(r, /^Lunes 26\./).props.accessibilityState).toEqual({ expanded: false });
  });

  it('tocar un día lo abre y muestra sus huecos; tocarlo otra vez lo pliega', async () => {
    const { cargar } = cargarCon({ actual: semanaLarga() });
    const r = await dibujar(cargar);
    await tocar(r, /^Lunes 26\./);
    let t = textos(r);
    expect(t).toContain('15:00–17:00 · 2 h');
    expect(t).toContain('19:00–20:30 · 1 h 30 min');
    expect(nodoDe(r, /^Lunes 26\./).props.accessibilityState).toEqual({ expanded: true });
    // Los otros días siguen plegados: solo se ve el hueco de ese lunes.
    expect(t.split('15:00–17:00 · 2 h')).toHaveLength(2);

    await tocar(r, /^Lunes 26\./);
    t = textos(r);
    expect(t).not.toContain('19:00–20:30');
  });

  it('un día abierto sin huecos lo dice con palabras (una sola vez: la línea plegada pasa a ser el renglón)', async () => {
    const { cargar } = cargarCon({ actual: semanaLarga() });
    const r = await dibujar(cargar);
    const cuantas = () => textos(r).split('Sin huecos de 30 min o más').length - 1;
    expect(cuantas()).toBe(1);
    await tocar(r, /^Martes 27\./);
    expect(nodoDe(r, /^Martes 27\./).props.accessibilityState).toEqual({ expanded: true });
    expect(cuantas()).toBe(1);
  });

  it('al cambiar de semana los días vuelven a estar plegados', async () => {
    const { cargar } = cargarCon({ actual: semanaLarga(), '2026-10-19': { ...semanaLarga(), semana: '2026-10-19', cerrada: true, dias: semanaLarga().dias.map((d, i) => ({ ...d, fecha: sumarDias('2026-10-19', i) })) } });
    const r = await dibujar(cargar);
    await tocar(r, /^Lunes 26\./);
    expect(textos(r)).toContain('19:00–20:30 · 1 h 30 min');
    await tocar(r, 'Tiempo libre: semana anterior');
    expect(textos(r)).not.toContain('19:00–20:30');
    expect(nodoDe(r, /^Lunes 19\./).props.accessibilityState).toEqual({ expanded: false });
  });
});
