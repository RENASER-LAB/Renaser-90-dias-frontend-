import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Hábitos de hoy» y el Radar en una tarjeta (spec 016, opción A): dos mitades iguales, alineadas a la izquierda (29/10), la de hábitos lleva a
 * Training y la del Radar hace lo de cada caso de la spec (formulario, lo respondido, «Tu Radar de hoy», Yo → Mi Radar). Con la
 * letra grande se apilan. Sin Radar queda solo la de hábitos. La lectura (`useRadarEnHoy`) se reemplaza: lo que decide cada
 * caso se prueba en `mitadDelRadar.test.ts`.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
const ventana = { width: 390, height: 844, scale: 3, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => ventana }));

type PropsDeLaHoja = { visible: boolean; titulo: string; subtitulo?: string; pie?: React.ReactNode; alCerrar: () => void; alTerminarDeCerrar?: () => void; children: React.ReactNode };
const mockHojas: PropsDeLaHoja[] = [];
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return {
    HojaDesdeAbajo: (props: PropsDeLaHoja) => {
      mockHojas.push(props);
      return props.visible ? R.createElement(View, { accessibilityLabel: `hoja ${props.titulo}` }, props.pie, props.children) : null;
    },
  };
});

type PropsDelModal = { visible: boolean; obligatorio: boolean; textoDelPie?: string };
const mockModal: PropsDelModal[] = [];
jest.mock('../../../radar/components/CodigoRenaserModal', () => ({
  CodigoRenaserModal: (props: PropsDelModal) => {
    mockModal.push(props);
    return null;
  },
}));

const mockArgs: Array<{ diaPrograma: unknown; inscrito: unknown; hojaAbierta: boolean }> = [];
const mockRadar = { actual: undefined as unknown as ReturnType<typeof crearRadar> };
jest.mock('../../../radar/hooks/useRadarEnHoy', () => ({
  useRadarEnHoy: (args: { diaPrograma: unknown; inscrito: unknown; hojaAbierta: boolean }) => {
    mockArgs.push(args);
    return mockRadar.actual;
  },
}));

import type { LecturaDeMiRadar } from '../../../radar/hooks/useConfigDeMiRadar';
import type { MiRadarApi, RegistroRadarApi } from '../../../radar/types/radar.types';
import { mitadDelRadar, type EntradaDeLaMitad } from '../../../radar/utils/mitadDelRadar';
import { miRadarConHoras } from '../../../radar/__tests__/fixturasDeMiRadar';
import { TarjetaHabitoYRadar } from '../TarjetaHabitoYRadar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const slot = (h: number) => ({ hora: h, etiqueta: `${String(h).padStart(2, '0')}:00`, cierraA: `${String(h + 1).padStart(2, '0')}:00` });
const registro = (id: string, hora: number, extra: Partial<RegistroRadarApi> = {}): RegistroRadarApi => ({
  id, whatAmIDoing: 'Revisando propuestas', whatAmIThinking: 'En cerrar bien el día', whatAmIFeeling: 'Algo de cansancio',
  energyLevel: 7, whatAmIAvoiding: 'Llamar a un cliente', createdAt: new Date(2026, 9, 29, hora, 6).toISOString(), ...extra,
});
const ENCENDIDO: MiRadarApi = miRadarConHoras([9, 14, 20]);
const lista = (config: MiRadarApi): LecturaDeMiRadar => ({ estado: 'lista', config });

/** Arma lo que devolvería `useRadarEnHoy` para una entrada, con la regla real de la mitad. */
function crearRadar(entrada: Partial<EntradaDeLaMitad> = {}, config: MiRadarApi | null = null) {
  const ahora = entrada.ahora ?? new Date(2026, 9, 29, 13, 48);
  const completa: EntradaDeLaMitad = {
    diaPrograma: 3, inscrito: true, estadoDelDia: { tipo: 'abierto', slot: slot(13), minutosParaCerrar: 12 }, obligatorio: true,
    minutosParaAbrir: 0, miRadar: { estado: 'pendiente' }, registros: null, ahora, ...entrada,
  };
  return {
    usuarioId: 'u1', ahora, config, mitad: mitadDelRadar(completa),
    abrirFormularioDeLaSemanaUno: jest.fn(), registrar: jest.fn(async () => true), enviando: false, errorAlRegistrar: null,
    limpiarErrorAlRegistrar: jest.fn(), registros: (completa.registros ?? []) as RegistroRadarApi[], leyendoRegistros: false,
    falloAlLeerRegistros: false, releerRegistros: jest.fn(async () => undefined),
  };
}
const desdeElOcho = (extra: Partial<EntradaDeLaMitad> = {}, config: MiRadarApi = ENCENDIDO) =>
  crearRadar({ diaPrograma: 10, estadoDelDia: { tipo: 'apagado', motivo: 'etapa-terminada' }, miRadar: lista(config), registros: [], ...extra }, config);

const onAbrirTraining = jest.fn();
const onAbrirMiRadar = jest.fn();
let raiz: ReactTestRenderer | null = null;
function montar(diaPrograma = 3) {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(TarjetaHabitoYRadar, {
        habitos: { cifra: '8/18', titulo: 'RITUAL TIERRA - AGUA - FUEGO (mediodía)', etiquetaAccesible: 'Abrir Training: RITUAL' },
        onAbrirTraining,
        diaPrograma,
        inscrito: true,
        onAbrirMiRadar,
      }),
    );
  });
}
const textosDeNodos = (nodos: ReactTestInstance[]): string =>
  nodos
    .filter(x => (x.type as unknown) === 'Text')
    .map(x => React.Children.toArray(x.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
const textos = () => textosDeNodos(raiz!.root.findAll(() => true));
const botones = () => raiz!.root.findAll(x => x.props.accessibilityRole === 'button' && typeof x.props.onPress === 'function' && (x.type as unknown) !== 'View');
const mitadDe = (empieza: string) => botones().find(b => String(b.props.accessibilityLabel).startsWith(empieza));
const pulsar = (b: ReactTestInstance) => act(() => b.props.onPress());
const hojaActual = (titulo: string) => [...mockHojas].reverse().find(h => h.titulo === titulo)!;
const visible = (titulo: string) => hojaActual(titulo)?.visible === true;

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockHojas.length = 0;
  mockModal.length = 0;
  mockArgs.length = 0;
  ventana.fontScale = 1;
  onAbrirTraining.mockReset();
  onAbrirMiRadar.mockReset();
});

describe('sin línea de detalle (2026-10-31, pedido del dueño: «desaparece la información no relevante»)', () => {
  it('cada mitad queda con el ícono y el rótulo, la línea de estado y el título; sin «Te toca ahora…» ni «Cinco preguntas, un minuto…»', () => {
    mockRadar.actual = crearRadar();
    montar();
    const t = textos();
    for (const queda of ['Hábitos de hoy', '8/18', 'RITUAL TIERRA - AGUA - FUEGO (mediodía)', 'Código Renaser', '13:00 · Innegociable', '¿Dónde estás ahora mismo?']) {
      expect(t).toContain(queda);
    }
    for (const sobra of ['Te toca ahora', 'quedan', 'Cinco preguntas', 'Cierra a las', 'Responde hasta']) {
      expect({ sobra, esta: t.includes(sobra) }).toEqual({ sobra, esta: false });
    }
  });

  it('desde el día 8, ni «Cada hora entre tu Despertar…», ni «La siguiente a las…», ni «05:30 a 22:30 · 17 veces»', () => {
    mockRadar.actual = desdeElOcho();
    montar(10);
    const t = textos();
    for (const sobra of ['Cada hora entre', 'La siguiente a las', 'veces', 'Responde hasta', 'Toca para ver']) {
      expect({ sobra, esta: t.includes(sobra) }).toEqual({ sobra, esta: false });
    }
    expect(botones()).toHaveLength(2);
  });

  it('las dos mitades siguen siendo botones con el mismo alto mínimo y sin hueco propio abajo (sin un renglón vacío)', () => {
    mockRadar.actual = crearRadar();
    montar();
    for (const b of botones()) {
      const estilo = StyleSheet.flatten(b.props.style({ pressed: false }));
      expect(estilo).toMatchObject({ minHeight: 48, justifyContent: 'flex-start' });
      // El último hijo de cada mitad es el título o el estado: ningún `Text` vacío al final.
      const textosDeLaMitad = b.findAll(x => (x.type as unknown) === 'Text');
      expect(textosDeLaMitad.length).toBeGreaterThan(0);
      for (const tx of textosDeLaMitad) expect(React.Children.toArray(tx.props.children).join('').trim()).not.toBe('');
    }
  });
});

describe('las dos mitades', () => {
  it('hábitos y Radar lado a lado, cada una con su rótulo, y la de hábitos lleva a Training', () => {
    mockRadar.actual = crearRadar();
    montar();
    const t = textos();
    for (const esperado of ['Hábitos de hoy', '8/18', 'RITUAL TIERRA - AGUA - FUEGO (mediodía)', 'Código Renaser', '13:00 · Innegociable', '¿Dónde estás ahora mismo?']) {
      expect(t).toContain(esperado);
    }
    expect(botones()).toHaveLength(2);
    pulsar(mitadDe('Abrir Training')!);
    expect(onAbrirTraining).toHaveBeenCalledTimes(1);
  });

  it('miden lo mismo (reparto parejo del ancho) y su contenido va a la izquierda y arriba, como antes (dueño, 29/10)', () => {
    mockRadar.actual = crearRadar();
    montar();
    for (const b of botones()) {
      const e = StyleSheet.flatten(b.props.style({ pressed: false }));
      expect(e).toMatchObject({ flex: 1, alignItems: 'stretch', justifyContent: 'flex-start' });
    }
    const textos = raiz!.root.findAll(x => (x.type as unknown) === 'Text' && StyleSheet.flatten(x.props.style)?.textAlign != null);
    expect(textos.length).toBeGreaterThanOrEqual(4);
    expect(textos.every(x => StyleSheet.flatten(x.props.style)?.textAlign === 'left')).toBe(true);
    expect(raiz!.root.findAll(x => StyleSheet.flatten(x.props.style)?.flexDirection === 'row' && x.props.accessibilityRole === undefined).length).toBeGreaterThan(0);
  });

  it('con la letra grande las mitades pasan una debajo de la otra y ninguna pide ancho repartido', () => {
    ventana.fontScale = 1.3;
    mockRadar.actual = crearRadar();
    montar();
    for (const b of botones()) expect(StyleSheet.flatten(b.props.style({ pressed: false })).flex).toBeUndefined();
    const contenedor = raiz!.root.findAll(x => StyleSheet.flatten(x.props.style)?.flexDirection === 'column' && x.findAll(h => h.props.accessibilityRole === 'button').length >= 2);
    expect(contenedor.length).toBeGreaterThan(0);
    expect(botones()).toHaveLength(2);
  });

  it('sin Radar (sin Día 1, backend sin Mi Radar o aún sin saber) queda solo la mitad de hábitos', () => {
    mockRadar.actual = crearRadar({ inscrito: false });
    montar();
    expect(textos()).toContain('Hábitos de hoy');
    expect(textos()).not.toContain('Código Renaser');
    expect(botones()).toHaveLength(1);
  });

  it('la hora que no es botón (En espera) se lee pero no se toca', () => {
    mockRadar.actual = crearRadar({ estadoDelDia: { tipo: 'fuera-de-ventana', proximaHora: 8 } });
    montar();
    expect(textos()).toContain('En espera');
    expect(botones()).toHaveLength(1);
  });

  it('el fondo lavado de oro es de la mitad que pide una respuesta', () => {
    mockRadar.actual = crearRadar();
    montar();
    expect(StyleSheet.flatten(mitadDe('Código Renaser')!.props.style({ pressed: false })).backgroundColor).not.toBe('transparent');
    expect(StyleSheet.flatten(mitadDe('Abrir Training')!.props.style({ pressed: false })).backgroundColor).toBe('transparent');
  });
});

describe('la mitad del Radar, días 1 a 7', () => {
  it('hora pendiente: abre el formulario de siempre (el obligatorio de RadarContext)', () => {
    mockRadar.actual = crearRadar();
    montar();
    pulsar(mitadDe('Código Renaser')!);
    expect(mockRadar.actual.abrirFormularioDeLaSemanaUno).toHaveBeenCalledTimes(1);
    expect(mockModal).toHaveLength(0);
  });

  it('hora registrada: abre una hoja con lo respondido y cuándo es el siguiente', () => {
    mockRadar.actual = crearRadar({ estadoDelDia: { tipo: 'respondido', slot: slot(13), proximaHora: 14 }, registros: [registro('r', 13)] });
    montar();
    expect(textos()).toContain('13:00 · Registrado');
    expect(mockArgs[mockArgs.length - 1].hojaAbierta).toBe(false);
    pulsar(mitadDe('Código Renaser')!);
    expect(visible('Ya lo registraste')).toBe(true);
    expect(hojaActual('Ya lo registraste').subtitulo).toBe('Código Renaser · 13:00');
    // Se lee lo respondido: así los días 1 a 7 también leen el historial, solo ahora.
    expect(mockArgs[mockArgs.length - 1].hojaAbierta).toBe(true);
    const t = textos();
    for (const esperado of ['Registrado a las 13:06 · energía 7 de 10', '¿Qué hago?', 'Revisando propuestas', '¿Qué evito?', 'Llamar a un cliente', 'Una vez por hora: ya no se puede cambiar. El siguiente a las 14:00.']) {
      expect(t).toContain(esperado);
    }
    expect(raiz!.root.findAll(x => x.props.accessibilityLabel === 'Entendido' && typeof x.props.onPress === 'function').length).toBeGreaterThan(0);
  });

  it('la hoja de lo respondido mientras se lee y si no se pudo leer', () => {
    mockRadar.actual = { ...crearRadar({ estadoDelDia: { tipo: 'respondido', slot: slot(13), proximaHora: 14 } }), leyendoRegistros: true };
    montar();
    pulsar(mitadDe('Código Renaser')!);
    expect(textos()).toContain('Cargando tus respuestas…');
    act(() => raiz?.unmount());
    mockRadar.actual = { ...crearRadar({ estadoDelDia: { tipo: 'respondido', slot: slot(13), proximaHora: 14 } }), falloAlLeerRegistros: true };
    montar();
    pulsar(mitadDe('Código Renaser')!);
    expect(textos()).toContain('No pudimos cargar tus respuestas.');
    const reintentar = raiz!.root.findAll(x => x.props.accessibilityLabel === 'Reintentar' && typeof x.props.onPress === 'function')[0];
    pulsar(reintentar);
    expect(mockRadar.actual.releerRegistros).toHaveBeenCalledTimes(1);
  });
});

describe('la mitad del Radar, desde el día 8', () => {
  it('apagado: «Planifica tu Radar» lleva a Yo → Mi Radar', () => {
    mockRadar.actual = desdeElOcho({}, miRadarConHoras([], false));
    montar(10);
    expect(textos()).toContain('Mi Radar');
    expect(textos()).toContain('Planifica tu Radar');
    pulsar(mitadDe('Mi Radar')!);
    expect(onAbrirMiRadar).toHaveBeenCalledTimes(1);
    expect(mockHojas.some(h => h.visible)).toBe(false);
  });

  it('un día sin Radar: «Hoy no tienes Mi Radar» lleva a Yo → Mi Radar', () => {
    mockRadar.actual = desdeElOcho({ ahora: new Date(2026, 9, 29, 14, 10) }, miRadarConHoras([9, 14, 20], true, { 4: { horas: [], sinRadar: true } }));
    montar(10);
    expect(textos()).toContain('Hoy no tienes Mi Radar');
    pulsar(mitadDe('Mi Radar')!);
    expect(onAbrirMiRadar).toHaveBeenCalledTimes(1);
  });

  it('una hora elegida pendiente: el formulario ahí mismo, que se puede cerrar', () => {
    mockRadar.actual = desdeElOcho({ ahora: new Date(2026, 9, 29, 14, 10) });
    montar(10);
    expect(mockModal[mockModal.length - 1].visible).toBe(false);
    pulsar(mitadDe('Mi Radar 14:00')!);
    const modal = mockModal[mockModal.length - 1];
    expect(modal.visible).toBe(true);
    expect(modal.obligatorio).toBe(false);
    expect(modal.textoDelPie).toBe('Puedes cerrarlo; tu borrador queda guardado en este teléfono.');
    expect(mockRadar.actual.abrirFormularioDeLaSemanaUno).not.toHaveBeenCalled();
  });

  it('sin hora ahora: «Tu Radar de hoy» con las horas y su estado', () => {
    const ahora = new Date(2026, 9, 29, 16, 30);
    mockRadar.actual = desdeElOcho({ ahora, registros: [registro('a', 9, { horaPrevista: 9 }), registro('b', 14, { horaPrevista: 14 })] });
    montar(10);
    expect(textos()).toContain('Próxima a las 20:00');
    pulsar(mitadDe('Mi Radar')!);
    expect(visible('Tu Radar de hoy')).toBe(true);
    const t = textos();
    for (const esperado of ['09:00', 'Respondida 09:06', '14:00', 'Respondida 14:06', '20:00', 'Prevista', 'Registrar ahora', 'Abrir Mi Radar']) {
      expect(t).toContain(esperado);
    }
  });

  it('«Registrar ahora» abre el formulario cuando la hoja ya se fue', () => {
    mockRadar.actual = desdeElOcho({ ahora: new Date(2026, 9, 29, 16, 30), registros: [] });
    montar(10);
    pulsar(mitadDe('Mi Radar')!);
    pulsar(raiz!.root.findAll(x => x.props.accessibilityLabel === 'Registrar ahora' && typeof x.props.onPress === 'function')[0]);
    expect(mockModal[mockModal.length - 1].visible).toBe(false);
    act(() => hojaActual('Tu Radar de hoy').alTerminarDeCerrar?.());
    expect(mockModal[mockModal.length - 1].visible).toBe(true);
  });

  it('«Abrir Mi Radar» lleva a Yo → Mi Radar cuando la hoja ya se fue', () => {
    mockRadar.actual = desdeElOcho({ ahora: new Date(2026, 9, 29, 16, 30) });
    montar(10);
    pulsar(mitadDe('Mi Radar')!);
    pulsar(raiz!.root.findAll(x => x.props.accessibilityLabel === 'Abrir Mi Radar' && typeof x.props.onPress === 'function')[0]);
    expect(onAbrirMiRadar).not.toHaveBeenCalled();
    act(() => hojaActual('Tu Radar de hoy').alTerminarDeCerrar?.());
    expect(onAbrirMiRadar).toHaveBeenCalledTimes(1);
  });

  it('si esta hora ya tiene registro no se ofrece «Registrar ahora» y se dice por qué', () => {
    // Las 16:30 no es una hora elegida, pero ya hay un registro de esta hora.
    mockRadar.actual = desdeElOcho({ ahora: new Date(2026, 9, 29, 16, 30), registros: [registro('x', 16)] });
    montar(10);
    pulsar(mitadDe('Mi Radar')!);
    expect(textos()).toContain('Ya registraste esta hora');
    expect(raiz!.root.findAll(x => x.props.accessibilityLabel === 'Registrar ahora')).toHaveLength(0);
  });

  it('el formulario de Mi Radar solo existe desde el día 8', () => {
    mockRadar.actual = crearRadar();
    montar(3);
    expect(mockModal).toHaveLength(0);
  });
});
