import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Tiempo libre de la semana» en la ficha de quien acompaña (spec 015): lo ven el mentor, el líder, el administrador y el
 * alquimista con el mismo componente, cada uno con su manera de pedirlo. Una lectura por semana, nunca al futuro ni antes
 * de la primera semana, y un 403 o un 404 no dibujan la sección. Desde el 2026-10-29 se lee POR DÍA: siete columnas y la
 * agenda del día elegido.
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
import type { BloqueOcupado, CargarHuecos, DiaConHuecos, HuecosDeLaSemana } from '../../types/huecos.types';
import { sumarDias } from '../../utils/semanasDeHuecos';
import { TiempoLibreDeLaSemana } from '../TiempoLibreDeLaSemana';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ACTUAL = '2026-10-26';
const PRIMERA = '2026-10-12';
/** Jueves de la semana en curso: «hoy» para el servidor. */
const HOY = '2026-10-29';

const HUECO = { desde: '15:00', hasta: '17:00', minutos: 120 };

const AGENDA: BloqueOcupado[] = [
  { desde: '05:30', hasta: '06:00', tipo: 'HABITO', titulo: 'Despertar' },
  { desde: '09:00', hasta: '10:30', tipo: 'EVENTO', titulo: 'Reunión de equipo' },
  { desde: '14:00', hasta: '15:00', tipo: 'AGENDA', titulo: null },
];

/** La letra del sistema: en Jest vale 2; cada prueba la fija para que no dependa de eso. */
function conLetra(escala: number) {
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 360, height: 800, scale: 3, fontScale: escala } as never);
}

beforeEach(() => {
  conLetra(1);
});
afterEach(() => {
  jest.restoreAllMocks();
});

/** Un día de la semana en curso, como lo manda el servidor: con su agenda y lo cumplido. */
function dia(fecha: string, extra: Partial<DiaConHuecos> = {}): DiaConHuecos {
  return {
    fecha,
    ventana: { desde: '05:30', hasta: '22:30' },
    sinVentanaPor: null,
    minutosOcupados: 400,
    minutosLibres: 620,
    huecos: [HUECO],
    ocupados: AGENDA,
    cumplidosATiempo: 5,
    cumplidosTarde: 1,
    noCumplidos: 0,
    ...extra,
  };
}

/** Un día que sale de la foto de una semana cerrada: sin agenda ni lo cumplido de ese día. */
function diaCerrado(fecha: string, extra: Partial<DiaConHuecos> = {}): DiaConHuecos {
  return dia(fecha, { ocupados: null, cumplidosATiempo: null, cumplidosTarde: null, noCumplidos: null, ...extra });
}

/** Una semana de siete días con la misma agenda; la en curso trae `hoy` y la agenda, las cerradas no. */
function semana(lunes: string, extra: Partial<HuecosDeLaSemana> = {}): HuecosDeLaSemana {
  const cerrada = lunes !== ACTUAL;
  return {
    semana: lunes,
    primeraSemana: PRIMERA,
    hoy: HOY,
    cerrada,
    dias: Array.from({ length: 7 }, (_, i) => (cerrada ? diaCerrado : dia)(sumarDias(lunes, i))),
    resumen: {
      minutosOcupados: 2870,
      minutosLibres: 4340,
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

/** Los nodos nativos (`View`) con ese `testID`. */
function conId(r: ReactTestRenderer, id: string): ReactTestInstance[] {
  return r.root.findAll(n => (n.type as unknown) === 'View' && n.props.testID === id);
}

/** Lo que dice el lector de pantalla de cada elemento accesible con esa etiqueta. */
function etiquetas(r: ReactTestRenderer): string[] {
  return r.root
    .findAll(n => (n.type as unknown) === 'View' && typeof n.props.accessibilityLabel === 'string')
    .map(n => n.props.accessibilityLabel as string);
}

function estiloDe(nodo: ReactTestInstance): Record<string, unknown> {
  return StyleSheet.flatten(nodo.props.style) as Record<string, unknown>;
}

describe('TiempoLibreDeLaSemana: lo que muestra', () => {
  it('el título, la semana en curso y las horas libres de toda ella', async () => {
    const { cargar } = cargarCon();
    const t = textos(await dibujar(cargar));
    expect(t).toContain('Tiempo libre de la semana');
    expect(t).toContain('Semana en curso');
    expect(t).toContain('Del 26 de octubre al 1 de noviembre');
    // Siete días de 10 h 20 min libres.
    expect(t).toContain('72 h 20 min | libres esta semana, de Despertar a Dormir');
  });

  it('siete columnas de lunes a domingo, cada una un botón con su nombre, lo libre y si es hoy', async () => {
    const { cargar } = cargarCon();
    const r = await dibujar(cargar);
    expect(nodoDe(r, 'Lunes 26, 10 horas 20 minutos libres').props.accessibilityRole).toBe('button');
    expect(nodoDe(r, 'Jueves 29, 10 horas 20 minutos libres, hoy')).toBeDefined();
    expect(nodoDe(r, 'Domingo 1, 10 horas 20 minutos libres')).toBeDefined();
    expect(r.root.findAll(n => /^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo) \d/.test(String(n.props.accessibilityLabel)) && typeof n.props.onPress === 'function' && (n.type as unknown) !== TiempoLibreDeLaSemana)
      .map(n => n.props.accessibilityLabel)
      .filter((v, i, todo) => todo.indexOf(v) === i)).toHaveLength(7);
    // Las iniciales: L M M J V S D.
    expect(textos(r)).toContain('L | ');
    expect(textos(r)).toContain('D');
  });

  it('abre en hoy: «Jueves 29 · hoy» con su ventana, y es la columna elegida', async () => {
    const { cargar } = cargarCon();
    const r = await dibujar(cargar);
    const t = textos(r);
    expect(t).toContain('Jueves 29 · hoy');
    expect(t).toContain('05:30 a 22:30');
    expect(nodoDe(r, /^Jueves 29,/).props.accessibilityState).toEqual({ selected: true });
    expect(nodoDe(r, /^Lunes 26,/).props.accessibilityState).toEqual({ selected: false });
  });

  it('el dorado de cada barra es la proporción libre de la ventana del día', async () => {
    const { cargar } = cargarCon({
      actual: semana(ACTUAL, {
        dias: [
          dia('2026-10-26', { minutosLibres: 510 }), // la mitad de 1020
          dia('2026-10-27', { minutosLibres: 1020 }),
          dia('2026-10-28', { minutosLibres: 0 }),
          dia('2026-10-29', { minutosLibres: 255 }),
          dia('2026-10-30', { minutosLibres: null }),
          dia('2026-10-31', { ventana: null, minutosLibres: 1440, sinVentanaPor: 'SIN_DESPERTAR' }),
          dia('2026-11-01', { minutosLibres: 765 }),
        ],
      }),
    });
    const r = await dibujar(cargar);
    const alto = (fecha: string) => conId(r, `libre-${fecha}`).map(n => estiloDe(n).height);
    expect(alto('2026-10-26')).toEqual(['50%']);
    expect(alto('2026-10-27')).toEqual(['100%']);
    expect(alto('2026-10-29')).toEqual(['25%']);
    expect(alto('2026-11-01')).toEqual(['75%']);
    // Vacío, sin dato y sin ventana: no se dibuja relleno (ni se inventa uno).
    expect(alto('2026-10-28')).toEqual([]);
    expect(alto('2026-10-30')).toEqual([]);
    expect(alto('2026-10-31')).toEqual([]);
  });

  it('las horas bajo cada barra son cortas, y un día sin dato o sin ventana dice «—»', async () => {
    const { cargar } = cargarCon({
      actual: semana(ACTUAL, {
        dias: [
          dia('2026-10-26', { minutosLibres: 270 }),
          dia('2026-10-27', { minutosLibres: 750 }),
          dia('2026-10-28', { minutosLibres: null }),
          dia('2026-10-29', { ventana: null, sinVentanaPor: 'SIN_DORMIR' }),
        ],
      }),
    });
    const t = textos(await dibujar(cargar));
    expect(t).toContain('4.5 h');
    expect(t).toContain('13 h');
    expect(t.split('—')).toHaveLength(3); // dos columnas sin cifra
  });

  it('la agenda del día: lo ocupado con su nombre, la agenda personal solo «Ocupado», y cada hueco con su duración y su rango', async () => {
    const { cargar } = cargarCon();
    const r = await dibujar(cargar);
    const t = textos(r);
    expect(t).toContain('Despertar');
    expect(t).toContain('Reunión de equipo');
    expect(t).toContain('Ocupado');
    expect(t).toContain('2 h | 15:00–17:00');
    // Las marcas de hora, cada 2 horas.
    for (const hora of ['06:00', '10:00', '14:00', '22:00']) expect(t).toContain(hora);
    expect(etiquetas(r)).toEqual(
      expect.arrayContaining([
        'Despertar, de 05:30 a 06:00',
        'Reunión de equipo, de 09:00 a 10:30',
        'Ocupado, de 14:00 a 15:00',
        'Libre 2 horas, de 15:00 a 17:00',
      ]),
    );
    expect(conId(r, 'bloque')).toHaveLength(3);
    expect(conId(r, 'hueco')).toHaveLength(1);
  });

  it('lo cumplido del día y sus horas libres, con número y palabra', async () => {
    const { cargar } = cargarCon();
    const t = textos(await dibujar(cargar));
    expect(t).toContain('5 a tiempo');
    expect(t).toContain('1 tarde');
    expect(t).toContain('0 sin cumplir');
    expect(t).toContain('10 h 20 min libres');
  });

  it('«Se repite»: los tramos que se repiten con el nombre de sus días', async () => {
    const { cargar } = cargarCon();
    const t = textos(await dibujar(cargar));
    expect(t).toContain('Se repite');
    expect(t).toContain('Lun, mié y jue | 15:00–17:00');
  });

  it('«Se repite» lleva tres filas como máximo y nada si no hay ninguna', async () => {
    const cuatro = cargarCon({
      actual: semana(ACTUAL, {
        resumen: {
          minutosOcupados: 1,
          minutosLibres: 1,
          cumplidosATiempo: 0,
          cumplidosTarde: 0,
          noCumplidos: 0,
          huecosQueSeRepiten: [
            { desde: '06:00', hasta: '07:00', dias: [1, 2, 3] },
            { desde: '08:00', hasta: '09:00', dias: [1, 2, 3, 4, 5] },
            { desde: '12:00', hasta: '13:00', dias: [6, 7] },
            { desde: '13:30', hasta: '14:30', dias: [1, 2, 3, 4, 5, 6] },
          ],
        },
      }),
    });
    const t = textos(await dibujar(cuatro.cargar));
    expect(t).toContain('Casi todos los días | 13:30–14:30');
    expect(t).toContain('Lunes a viernes | 08:00–09:00');
    expect(t).toContain('Lun, mar y mié | 06:00–07:00');
    expect(t).not.toContain('Fin de semana');

    const ninguno = cargarCon({
      actual: semana(ACTUAL, {
        resumen: { minutosOcupados: 1, minutosLibres: 1, huecosQueSeRepiten: [], cumplidosATiempo: 0, cumplidosTarde: 0, noCumplidos: 0 },
      }),
    });
    expect(textos(await dibujar(ninguno.cargar))).not.toContain('Se repite');
  });

  it('sin resumen (el servidor no lo mandó) se dibuja la semana igual, sin «Se repite»', async () => {
    const { cargar } = cargarCon({ actual: semana(ACTUAL, { resumen: null }) });
    const t = textos(await dibujar(cargar));
    expect(t).not.toContain('Se repite');
    expect(t).toContain('Jueves 29 · hoy');
  });

  it('un día por venir dice «Todavía no llega» y no escribe ceros como si fueran un resultado', async () => {
    const { cargar } = cargarCon({
      actual: semana(ACTUAL, { dias: semana(ACTUAL).dias.map(d => (d.fecha > HOY ? { ...d, cumplidosATiempo: 0, cumplidosTarde: 0, noCumplidos: 0 } : d)) }),
    });
    const r = await dibujar(cargar);
    await tocar(r, /^Viernes 30,/);
    const t = textos(r);
    expect(t).toContain('Viernes 30');
    expect(t).not.toContain('Viernes 30 · hoy');
    expect(t).toContain('Todavía no llega');
    expect(t).not.toContain('a tiempo');
    expect(t).toContain('10 h 20 min libres');
  });

  it('un día vivido sin nada que contar (tres ceros) no escribe «0 a tiempo · 0 tarde…»', async () => {
    const { cargar } = cargarCon({
      actual: semana(ACTUAL, { dias: semana(ACTUAL).dias.map(d => (d.fecha === '2026-10-27' ? { ...d, cumplidosATiempo: 0, cumplidosTarde: 0, noCumplidos: 0 } : d)) }),
    });
    const r = await dibujar(cargar);
    await tocar(r, /^Martes 27,/);
    expect(textos(r)).toContain('Martes 27');
    expect(textos(r)).not.toContain('a tiempo');
    expect(textos(r)).not.toContain('Todavía no llega');
  });

  it('un día sin nada planificado muestra el hueco de toda la ventana y ningún bloque', async () => {
    const { cargar } = cargarCon({
      actual: semana(ACTUAL, {
        dias: semana(ACTUAL).dias.map(d =>
          d.fecha === HOY ? { ...d, ocupados: [], minutosOcupados: 0, minutosLibres: 1020, huecos: [{ desde: '05:30', hasta: '22:30', minutos: 1020 }] } : d,
        ),
      }),
    });
    const r = await dibujar(cargar);
    expect(conId(r, 'bloque')).toHaveLength(0);
    expect(conId(r, 'hueco')).toHaveLength(1);
    expect(textos(r)).toContain('17 h | 05:30–22:30');
  });

  it('los bloques que se cruzan se dibujan lado a lado, en columnas de la misma anchura', async () => {
    const { cargar } = cargarCon({
      actual: semana(ACTUAL, {
        dias: semana(ACTUAL).dias.map(d =>
          d.fecha === HOY
            ? {
                ...d,
                ocupados: [
                  { desde: '09:00', hasta: '10:30', tipo: 'EVENTO', titulo: 'Reunión de equipo' },
                  { desde: '10:00', hasta: '10:30', tipo: 'ACCION', titulo: 'Enviar la propuesta' },
                ],
              }
            : d,
        ),
      }),
    });
    const r = await dibujar(cargar);
    const posiciones = conId(r, 'bloque').map(n => [estiloDe(n).left, estiloDe(n).width]);
    expect(posiciones).toEqual([['0%', '50%'], ['50%', '50%']]);
    expect(textos(r)).toContain('Reunión de equipo');
    expect(textos(r)).toContain('Enviar la propuesta');
  });

  it('un día se elige tocando su columna: cambia la agenda y la columna elegida', async () => {
    const { cargar } = cargarCon({
      actual: semana(ACTUAL, {
        dias: semana(ACTUAL).dias.map(d =>
          d.fecha === '2026-10-27'
            ? { ...d, ocupados: [{ desde: '08:00', hasta: '09:00', tipo: 'ACCION', titulo: 'Pagar al proveedor' }], huecos: [{ desde: '11:00', hasta: '12:30', minutos: 90 }] }
            : d,
        ),
      }),
    });
    const r = await dibujar(cargar);
    expect(textos(r)).not.toContain('Pagar al proveedor');
    await tocar(r, /^Martes 27,/);
    const t = textos(r);
    expect(t).toContain('Martes 27');
    expect(t).not.toContain('Jueves 29 · hoy');
    expect(t).toContain('Pagar al proveedor');
    expect(t).toContain('1 h 30 min | 11:00–12:30');
    expect(nodoDe(r, /^Martes 27,/).props.accessibilityState).toEqual({ selected: true });
    expect(nodoDe(r, /^Jueves 29,/).props.accessibilityState).toEqual({ selected: false });
  });

  it('sin `hoy` del servidor no se marca ningún día como hoy ni se afirma que uno no llega', async () => {
    const { cargar } = cargarCon({ actual: semana(ACTUAL, { hoy: null }) });
    const r = await dibujar(cargar);
    const t = textos(r);
    expect(t).not.toContain('· hoy');
    expect(t).not.toContain('Todavía no llega');
    // Abre en el primer día con ventana.
    expect(t).toContain('Lunes 26');
    expect(etiquetas(r).some(e => e.endsWith(', hoy'))).toBe(false);
  });
});

describe('TiempoLibreDeLaSemana: si falta la hora de Despertar o de Dormir', () => {
  const sinHoras = (motivo: DiaConHuecos['sinVentanaPor']) =>
    semana(ACTUAL, { dias: semana(ACTUAL).dias.map(d => ({ ...d, ventana: null, sinVentanaPor: motivo, minutosLibres: 1440, huecos: [{ desde: '00:00', hasta: '24:00', minutos: 1440 }] })) });

  it('toda la semana sin ventana: UNA tarjeta que dice qué falta y dónde se elige, y el total es «—»', async () => {
    const { cargar } = cargarCon({ actual: sinHoras('SIN_DESPERTAR') });
    const r = await dibujar(cargar);
    const t = textos(r);
    expect(t).toContain('Falta su hora de Despertar');
    expect(t).toContain('Training → Planificar');
    expect(t).toContain('— | libres esta semana');
    expect(etiquetas(r)).toContain('Tiempo libre de la semana: no se calcula');
    expect(t.split('Falta su hora de Despertar').length - 1).toBe(1);
  });

  it('no se dibuja el sueño como tiempo libre: ni columnas, ni agenda, ni huecos, ni «Se repite»', async () => {
    const { cargar } = cargarCon({ actual: sinHoras('SIN_DESPERTAR') });
    const r = await dibujar(cargar);
    const t = textos(r);
    expect(conId(r, 'linea-de-tiempo')).toHaveLength(0);
    expect(conId(r, 'hueco')).toHaveLength(0);
    expect(etiquetas(r)).not.toContain('Días de la semana');
    expect(t).not.toContain('1440');
    expect(t).not.toContain('24 h');
    expect(t).not.toContain('Se repite');
    expect(t).not.toContain('00:00–24:00');
  });

  const MOTIVOS: Array<[DiaConHuecos['sinVentanaPor'], string]> = [
    ['SIN_DORMIR', 'Falta su hora de Dormir'],
    ['SIN_DESPERTAR_NI_DORMIR', 'Faltan sus horas de Despertar y de Dormir'],
    ['DORMIR_ANTES_DE_DESPERTAR', 'Su hora de Dormir va antes que la de Despertar'],
    [null, 'Falta su hora de Despertar o de Dormir'],
  ];
  it.each(MOTIVOS)('cuando el motivo es %s dice «%s»', async (motivo, titulo) => {
    const { cargar } = cargarCon({ actual: sinHoras(motivo) });
    expect(textos(await dibujar(cargar))).toContain(titulo);
  });

  it('si solo ALGUNOS días no tienen ventana, el total los deja afuera y ese día lo dice en su agenda', async () => {
    const { cargar } = cargarCon({
      actual: semana(ACTUAL, {
        dias: semana(ACTUAL).dias.map(d =>
          d.fecha === '2026-10-27' ? { ...d, ventana: null, sinVentanaPor: 'SIN_DESPERTAR' as const, minutosLibres: 1440 } : d,
        ),
      }),
    });
    const r = await dibujar(cargar);
    // Seis días de 10 h 20 min: el día sin ventana no suma sus 24 h.
    expect(textos(r)).toContain('62 h | libres esta semana');
    expect(nodoDe(r, 'Martes 27, sin hora de Despertar o de Dormir')).toBeDefined();
    await tocar(r, /^Martes 27,/);
    const t = textos(r);
    expect(t).toContain('Falta su hora de Despertar. ');
    expect(conId(r, 'linea-de-tiempo')).toHaveLength(0);
    expect(t).not.toContain('libres | ');
  });
});

describe('TiempoLibreDeLaSemana: contra un servidor sin la agenda por día', () => {
  it('la semana en curso sin `ocupados` ni lo cumplido no dice que esté cerrada: dice que falta el detalle, y los huecos se ven', async () => {
    const antiguo = semana(ACTUAL, { hoy: null, dias: semana(ACTUAL).dias.map(d => diaCerrado(d.fecha)) });
    const { cargar } = cargarCon({ actual: antiguo });
    const r = await dibujar(cargar);
    const t = textos(r);
    expect(t).toContain('Todavía no hay detalle de lo que ocupa este día.');
    expect(t).not.toContain('De una semana cerrada');
    expect(t).toContain('Semana en curso');
    expect(conId(r, 'hueco')).toHaveLength(1);
    expect(t).toContain('libres esta semana');
  });
});

describe('TiempoLibreDeLaSemana: una semana cerrada', () => {
  it('sus días no traen agenda ni lo cumplido: se dibujan los huecos sobre un fondo liso, con una nota', async () => {
    const { cargar } = cargarCon({ actual: semana(ACTUAL, { cerrada: true, dias: semana('2026-10-19').dias.map((d, i) => ({ ...d, fecha: sumarDias(ACTUAL, i) })) }) });
    const r = await dibujar(cargar);
    const t = textos(r);
    expect(t).toContain('Semana cerrada');
    expect(t).toContain('De una semana cerrada solo queda guardado el tiempo libre.');
    expect(conId(r, 'bloque')).toHaveLength(0);
    expect(conId(r, 'hueco')).toHaveLength(1);
    expect(t).toContain('2 h | 15:00–17:00');
    // Sin conteos por día no se escriben chips de lo cumplido…
    expect(t).not.toContain('sin cumplir | ');
    // …pero lo real de la semana, que sí llega en el resumen, no se pierde.
    expect(t).toContain('32 a tiempo · 6 tarde · 4 sin cumplir en la semana');
  });

  it('con el `hoy` del servidor todos sus días son pasados: ninguno dice «Todavía no llega»', async () => {
    const { cargar } = cargarCon({ actual: semana(ACTUAL, { cerrada: true, hoy: '2026-11-03', dias: semana('2026-10-19').dias.map((d, i) => ({ ...d, fecha: sumarDias(ACTUAL, i) })) }) });
    const r = await dibujar(cargar);
    expect(textos(r)).not.toContain('Todavía no llega');
    expect(textos(r)).not.toContain('· hoy');
  });

  it('al ir a la semana anterior (cerrada) abre en el primer día y trae lo de la foto', async () => {
    const { cargar } = cargarCon();
    const r = await dibujar(cargar);
    await tocar(r, 'Tiempo libre: semana anterior');
    const t = textos(r);
    expect(t).toContain('Semana cerrada');
    expect(t).toContain('Lunes 19');
    expect(t).toContain('De una semana cerrada solo queda guardado el tiempo libre.');
    expect(t).toContain('32 a tiempo · 6 tarde · 4 sin cumplir en la semana');
  });

  it('el día elegido es de UNA semana: al volver a la en curso se abre otra vez hoy', async () => {
    const { cargar } = cargarCon();
    const r = await dibujar(cargar);
    await tocar(r, /^Martes 27,/);
    expect(textos(r)).toContain('Martes 27');
    await tocar(r, 'Tiempo libre: semana anterior');
    await tocar(r, 'Tiempo libre: semana siguiente');
    expect(textos(r)).toContain('Jueves 29 · hoy');
  });
});

describe('TiempoLibreDeLaSemana: con la letra del sistema grande', () => {
  /** Los dp de un minuto de la línea de tiempo con esa escala: 0,66 por la letra (hasta 1,6). */
  const altoDeLaLinea = (r: ReactTestRenderer) => estiloDe(conId(r, 'linea-de-tiempo')[0]).height as number;

  it('la línea de tiempo crece con la letra: un bloque de 30 minutos siempre cabe una línea de texto', async () => {
    const { cargar } = cargarCon();
    conLetra(1);
    const normal = await dibujar(cargar);
    conLetra(1.3);
    const grande = await dibujar(cargar);

    // 1020 minutos de ventana: el alto sigue a la letra, no es fijo.
    expect(altoDeLaLinea(grande)).toBeGreaterThan(altoDeLaLinea(normal));
    expect(altoDeLaLinea(grande) - 20).toBe(Math.round(1020 * 0.66 * 1.3));

    // Cada bloque con texto mide al menos la línea de ese texto (13 px × 1,2 × la letra): nada se corta.
    for (const [r, escala] of [[normal, 1], [grande, 1.3]] as const) {
      const linea = Math.ceil(13 * 1.2 * escala);
      for (const bloque of conId(r, 'bloque')) {
        const conTexto = bloque.findAll(n => (n.type as unknown) === 'Text').length > 0;
        if (conTexto) expect(estiloDe(bloque).height as number).toBeGreaterThanOrEqual(linea);
      }
      for (const hueco of conId(r, 'hueco')) {
        const conTexto = hueco.findAll(n => (n.type as unknown) === 'Text').length > 0;
        if (conTexto) expect(estiloDe(hueco).height as number).toBeGreaterThanOrEqual(linea);
      }
    }
  });

  it('con la letra al 130 % un hábito de 30 minutos sigue mostrando su nombre', async () => {
    conLetra(1.3);
    const { cargar } = cargarCon();
    const t = textos(await dibujar(cargar));
    expect(t).toContain('Despertar');
    expect(t).toContain('Reunión de equipo');
  });

  it('la cifra bajo cada barra se achica en vez de cortarse, y los nombres largos terminan en una línea con «…»', async () => {
    conLetra(1.3);
    const { cargar } = cargarCon();
    const r = await dibujar(cargar);
    const horas = r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.adjustsFontSizeToFit === true);
    expect(horas).toHaveLength(7);
    for (const h of horas) expect(h.props.numberOfLines).toBe(1);
  });

  it('el tope de la letra es 1,6: una letra al 200 % no alarga el día más allá', async () => {
    const { cargar } = cargarCon();
    conLetra(2);
    const r = await dibujar(cargar);
    expect(altoDeLaLinea(r) - 20).toBe(Math.round(1020 * 0.66 * 1.6));
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
    expect(textos(r)).toContain('libres esta semana');
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
    expect(textos(r)).toContain('libres esta semana');
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
    expect(t).not.toContain('libres esta semana');

    await act(async () => {
      resolver(semana('2026-10-19'));
      await vaciar();
    });
    t = textos(r);
    expect(t).not.toContain('Cargando');
    expect(t).toContain('Semana cerrada');
    expect(t).toContain('libres esta semana');
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
    expect(textos(a)).toContain('libres esta semana');
    expect(textos(b)).toContain('libres esta semana');
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
    expect(textos(segunda)).toContain('libres esta semana');
    await act(async () => vaciar());
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it('otra persona (otro `cargar`) empieza otra vez por su semana en curso y no hereda lo guardado de la anterior', async () => {
    const una = cargarCon();
    const otra = cargarCon({ actual: semana(ACTUAL, { dias: [dia(ACTUAL, { huecos: [{ desde: '09:00', hasta: '09:30', minutos: 30 }], ocupados: [] })] }) });
    const r = await dibujar(una.cargar);
    await tocar(r, 'Tiempo libre: semana anterior');
    const s = await dibujar(otra.cargar);
    expect(otra.llamadas).toEqual([null]);
    expect(textos(s)).toContain('30 min | 09:00–09:30');
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
