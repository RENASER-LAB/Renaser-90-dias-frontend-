import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Tu 80/20» en la ficha de quien acompaña (spec 031, 031-2 A) y el periodo que dibuja la hoja de Plan: las cifras al día, el análisis
 * con sus cuatro partes cuando está listo, y por qué todavía no está cuando no lo está. Solo lectura. Respeta el interruptor «Código
 * Renaser en las fichas» (spec 034) y el de la IA de Soporte TI.
 */

const mockApagadas = new Set<string>();
const mockNoDisponibles = new Set<string>();

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../components/Aparicion', () => ({
  Aparicion: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../../plataforma/estado/useFuncionalidad', () => ({
  useFuncionalidad: (clave: string) => ({
    prendida: !mockApagadas.has(clave),
    aviso: mockApagadas.has(clave) ? 'Volvemos pronto' : null,
    disponible: !mockNoDisponibles.has(clave),
  }),
}));

import { ApiError } from '../../../../services/http/apiClient';
import { CLAVES } from '../../../plataforma/utils/clavesDeLaApp';
import type { CargarOchentaVeinte, VistaDelPeriodo } from '../../types/ochentaVeinte.types';
import { OchentaVeinteDeLaFicha } from '../OchentaVeinteDeLaFicha';
import { ETIQUETA_PERIODO_ANTERIOR, ETIQUETA_PERIODO_SIGUIENTE, PeriodoDelOchentaVeinte } from '../PeriodoDelOchentaVeinte';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
/* El primer dibujo carga el tema, los íconos y el control segmentado: en frío tarda más que los 5 s por defecto. */
jest.setTimeout(60_000);

const CIFRAS = {
  desde: '2026-10-26',
  hasta: '2026-11-01',
  planificadas: 12,
  cumplidas: 9,
  diasConAcciones: 5,
  porVenir: 0,
  impactoPlanificado: 60,
  impactoCumplido: 45,
  porcentajeCumplidas: 75,
  verdes: { planificadas: 5, cumplidas: 3, impactoCumplido: 25, porcentajeDelImpacto: 55 },
  veintePorCiento: { acciones: 2, impacto: 17, porcentajeDelImpacto: 38 },
  porEje: [{ eje: 'CUERPO', planificadas: 4, cumplidas: 3, impactoCumplido: 22, porcentajeDelImpacto: 49 }],
  lasQueMasMovieron: [{ eje: 'CUERPO', color: 'VERDE', impacto: 10, fecha: '2026-10-27', titulo: 'Entrenar' }],
  lasQueSeFueron: [{ eje: 'TRABAJO', color: 'VERDE', impacto: 9, fecha: '2026-10-29', titulo: 'Cerrar la propuesta' }],
  cumplioLoQueMenosMovia: true,
  cierre: null,
};

const LISTO: VistaDelPeriodo = {
  tipo: 'SEMANA',
  numero: 10,
  inicio: '2026-10-26',
  fin: '2026-11-01',
  cerrado: true,
  anterior: '2026-10-19',
  siguiente: null,
  cifras: CIFRAS,
  semanas: [],
  estado: 'LISTO',
  falta: [],
  minimoDeAcciones: 5,
  codigoRenaser: { respuestas: 12, dictadas: 3, energiaPromedio: 6.4, energiaMinima: 3, energiaMaxima: 9, manana: 7, tarde: 6, noche: null },
  analisis: {
    loQueMasMovio: 'Entrenar movió tu semana.',
    loQueSeTeFue: 'Se quedó la propuesta.',
    comoEstuviste: 'Tu energía estuvo estable.',
    proximosPasos: ['Agenda la propuesta temprano.'],
  },
  generadoEn: '2026-11-02T13:15:00Z',
};
const vista = (extra: Partial<VistaDelPeriodo> = {}): VistaDelPeriodo => ({ ...LISTO, ...extra });

beforeEach(() => {
  mockApagadas.clear();
  mockNoDisponibles.clear();
});

const vaciar = () => new Promise<void>(res => setImmediate(res));
async function dibujar(elemento: React.ReactElement): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(elemento);
    await vaciar();
  });
  return r;
}
const ficha = (cargar: CargarOchentaVeinte | null) => dibujar(React.createElement(OchentaVeinteDeLaFicha, { cargar }));
const periodo = (cargar: CargarOchentaVeinte | null, extra: Record<string, unknown> = {}) =>
  dibujar(React.createElement(PeriodoDelOchentaVeinte, { cargar, tipo: 'SEMANA', ...extra }));

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
const sinNada = (r: ReactTestRenderer) => r.root.findAll(n => typeof n.type === 'string').length === 0;
const cargarCon = (v: VistaDelPeriodo | ((tipo: string, inicio: string | null) => VistaDelPeriodo)): jest.Mock<CargarOchentaVeinte> =>
  jest.fn<CargarOchentaVeinte>(async (tipo, inicio) => (typeof v === 'function' ? v(tipo, inicio) : v));

describe('el periodo con su análisis listo', () => {
  it('muestra las cifras y las cuatro partes en este orden, con de dónde vienen', async () => {
    const t = textos(await periodo(cargarCon(LISTO)));
    expect(t).toContain('Semana 10');
    expect(t).toContain('Del 26 de octubre al 1 de noviembre');
    expect(t).toContain('9 de 12 acciones cumplidas · 75 %');
    expect(t).toContain('Acciones verdes: 3 de 5 cumplidas · el 55 % del impacto que cumpliste vino de ellas');
    expect(t).toContain('El 20 % que más movió: 2 acciones · el 38 % del impacto cumplido');
    const orden = ['Lo que más movió', 'Lo que se te fue', 'Cómo estuviste', 'Para la próxima semana'].map(p => t.lastIndexOf(p));
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
    expect(t).toContain('Entrenar movió tu semana.');
    expect(t).toContain('• Agenda la propuesta temprano.');
    expect(t).toContain('Análisis de SER · 2 de noviembre. No cambia tu plan: lo que sugiere lo decides tú.');
  });

  it('con el texto no repite debajo las listas de acciones: ya las dice el análisis', async () => {
    const t = textos(await periodo(cargarCon(LISTO)));
    expect(t).not.toContain('Entrenar · Cuerpo');
  });

  it('ir al periodo anterior pide el inicio que dijo el servidor; el siguiente está apagado en el actual', async () => {
    const cargar = cargarCon((_tipo, inicio) => (inicio === '2026-10-19' ? vista({ numero: 9, inicio: '2026-10-19', fin: '2026-10-25', anterior: null, siguiente: '2026-10-26' }) : LISTO));
    const r = await periodo(cargar);
    expect(nodoDe(r, ETIQUETA_PERIODO_SIGUIENTE).props.accessibilityState?.disabled).toBe(true);
    await tocar(r, ETIQUETA_PERIODO_ANTERIOR);
    expect(cargar).toHaveBeenLastCalledWith('SEMANA', '2026-10-19');
    expect(textos(r)).toContain('Semana 9');
  });
});

describe('el periodo sin análisis: dice por qué, sin culpa', () => {
  it('en curso: solo cifras y cuándo llega el análisis', async () => {
    const t = textos(await periodo(cargarCon(vista({ estado: 'EN_CURSO', cerrado: false, analisis: null, generadoEn: null }))));
    expect(t).toContain('9 de 12 acciones cumplidas');
    expect(t).toContain('Tu análisis llega cuando cierre la semana.');
    expect(t).toContain('Entrenar · Cuerpo'); // sin texto de la IA, los nombres de lo que movió se dicen en cifras
    expect(t).not.toContain('Análisis de SER');
  });

  it('pendiente: llega pronto, sin inventar nada', async () => {
    const t = textos(await periodo(cargarCon(vista({ estado: 'PENDIENTE', analisis: null }))));
    expect(t).toContain('Tu análisis estará listo en cuanto podamos generarlo.');
    expect(t).not.toContain('Cómo estuviste');
  });

  it('sin datos: dice cuántas acciones hacen falta', async () => {
    const t = textos(await periodo(cargarCon(vista({ estado: 'SIN_DATOS', analisis: null, falta: ['ACCIONES'], cifras: { ...CIFRAS, planificadas: 2, cumplidas: 1, porcentajeCumplidas: 50 } }))));
    expect(t).toContain('Con al menos 5 acciones planificadas analizamos la semana.');
  });

  it('sin acciones no hay un tablero de ceros: una línea y, en la hoja, «Agendar mis acciones»', async () => {
    const sinAcciones = vista({ estado: 'EN_CURSO', cerrado: false, analisis: null, cifras: { ...CIFRAS, planificadas: 0, cumplidas: 0, porcentajeCumplidas: null, verdes: null, veintePorCiento: null, porEje: [] } });
    const alAgendar = jest.fn();
    const r = await periodo(cargarCon(sinAcciones), { alAgendar });
    expect(textos(r)).toContain('Todavía no planificaste acciones en este periodo.');
    expect(textos(r)).not.toContain('0 de 0');
    await tocar(r, 'Agendar mis acciones');
    expect(alAgendar).toHaveBeenCalledTimes(1);
    /* en la ficha (sin `alAgendar`) la persona la ve en solo lectura: no hay botón */
    const lectura = await periodo(cargarCon(sinAcciones));
    expect(() => nodoDe(lectura, 'Agendar mis acciones')).toThrow();
  });
});

describe('Soporte TI: el interruptor de la IA', () => {
  it('con «ia.analisis» apagada las cifras se ven y el texto se cambia por el aviso de mantenimiento', async () => {
    mockApagadas.add(CLAVES.iaAnalisis);
    const t = textos(await periodo(cargarCon(LISTO)));
    expect(t).toContain('9 de 12 acciones cumplidas');
    expect(t).not.toContain('Entrenar movió tu semana.');
    expect(t).toContain('Volvemos pronto');
  });

  it('con «ia.analisis» no disponible para el rol no se dibuja ni el aviso ni el texto', async () => {
    mockNoDisponibles.add(CLAVES.iaAnalisis);
    const t = textos(await periodo(cargarCon(LISTO)));
    expect(t).toContain('9 de 12 acciones cumplidas');
    expect(t).not.toContain('Entrenar movió tu semana.');
    expect(t).not.toContain('Tu análisis estará listo');
  });
});

describe('los fallos', () => {
  it('un 404 o un 403 no dibujan nada: sin error, sin aviso', async () => {
    for (const status of [404, 403]) {
      const cargar = jest.fn<CargarOchentaVeinte>(async () => {
        throw new ApiError(status, 'no');
      });
      expect(sinNada(await periodo(cargar))).toBe(true);
    }
  });

  it('sin red lo dice y ofrece «Reintentar», que vuelve a pedir', async () => {
    let falla = true;
    const cargar = jest.fn<CargarOchentaVeinte>(async () => {
      if (falla) throw new ApiError(0, 'sin red');
      return LISTO;
    });
    const r = await periodo(cargar);
    expect(textos(r)).toContain('No pudimos cargar tu 80/20. Revisa tu conexión.');
    falla = false;
    await tocar(r, 'Reintentar');
    expect(textos(r)).toContain('Semana 10');
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it('sin `cargar` no hay nada a quién preguntarle', async () => {
    expect(sinNada(await periodo(null))).toBe(true);
  });
});

describe('la sección de la ficha', () => {
  it('muestra «Su 80/20» con Semana y Mes, y empieza por la semana en curso', async () => {
    const cargar = cargarCon(LISTO);
    const r = await ficha(cargar);
    const t = textos(r);
    expect(t).toContain('Su 80/20');
    expect(t).not.toContain('Tu 80/20');
    expect(t).toContain('Semana');
    expect(t).toContain('Mes');
    expect(t).toContain('Semana 10');
    expect(cargar).toHaveBeenCalledWith('SEMANA', null);
  });

  it('E2E J2-8: lo lee su mentor sobre otra persona, así que todo va en tercera persona (las flechas, el aviso, el análisis y su pie)', async () => {
    const r = await ficha(cargarCon(LISTO));
    const t = textos(r);
    expect(nodoDe(r, 'Su 80/20: periodo anterior')).toBeTruthy();
    expect(nodoDe(r, 'Su 80/20: periodo siguiente')).toBeTruthy();
    expect(t).toContain('Lo que se le fue');
    expect(t).toContain('Cómo estuvo');
    expect(t).toContain('Análisis de SER · 2 de noviembre. No cambia su plan: lo que sugiere lo decide la persona.');
    expect(t).not.toContain('Lo que se te fue');
    expect(t).not.toContain('No cambia tu plan');
    const enCurso = textos(await ficha(cargarCon(vista({ estado: 'EN_CURSO', cerrado: false, analisis: null, generadoEn: null }))));
    expect(enCurso).toContain('Estas son sus cifras al día. Su análisis llega cuando cierre la semana.');
    expect(enCurso).not.toContain('tus cifras');
  });

  it('cambiar a Mes pide el mes y no el de otra persona', async () => {
    const cargar = cargarCon((tipo, inicio) => vista({ tipo: tipo as 'SEMANA' | 'MES', numero: tipo === 'MES' ? 3 : 10, inicio: inicio ?? '2026-10-26' }));
    const r = await ficha(cargar);
    await tocar(r, 'Mes');
    expect(cargar).toHaveBeenCalledWith('MES', null);
    expect(textos(r)).toContain('Mes 3');
  });

  it('con «Código Renaser en las fichas» apagado ni se dibuja ni se pide (spec 034)', async () => {
    mockApagadas.add(CLAVES.radarFichas);
    const cargar = cargarCon(LISTO);
    const r = await ficha(cargar);
    expect(sinNada(r)).toBe(true);
    expect(cargar).not.toHaveBeenCalled();
  });

  it('con esa entrada no disponible para el rol tampoco', async () => {
    mockNoDisponibles.add(CLAVES.radarFichas);
    const cargar = cargarCon(LISTO);
    expect(sinNada(await ficha(cargar))).toBe(true);
    expect(cargar).not.toHaveBeenCalled();
  });

  it('un 403 o un 404 esconden la sección sin error, y mientras llega la primera lectura no hay marco', async () => {
    const cargar = jest.fn<CargarOchentaVeinte>(async () => {
      throw new ApiError(404, 'no');
    });
    expect(sinNada(await ficha(cargar))).toBe(true);
    let r!: ReactTestRenderer;
    const lenta = jest.fn<CargarOchentaVeinte>(() => new Promise(() => undefined));
    await act(async () => {
      r = TestRenderer.create(React.createElement(OchentaVeinteDeLaFicha, { cargar: lenta }));
    });
    expect(sinNada(r)).toBe(true);
  });

  it('sin `cargar` (no hay a quién preguntarle) no hay sección', async () => {
    expect(sinNada(await ficha(null))).toBe(true);
  });
});
