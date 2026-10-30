import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Yo → Mi Radar (spec 019): «Encendido» manda (apagado no hay modo ni horario), el modo Automático o Personalizado, «Hora»
 * de solo lectura, «Veces al día» con − / +, la fila de los siete días con solo las veces (hoy y lo pasado con candado), «Sin
 * Radar estos días», «Guardar · sáb, dom» con SOLO lo tocado, y «Programar mi Despertar» si falta. Venir de un aviso abre el
 * formulario cuando toca. El hook (red, historial) se reemplaza.
 *
 * El «hoy» de las pruebas es el jueves 29/10/2026 a las 15:30: lunes a jueves llevan candado y viernes a domingo se editan.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));

type PropsDelModal = { visible: boolean; textoDelPie?: string; obligatorio: boolean; slot: { etiqueta: string } | null };
const mockModal: PropsDelModal[] = [];
jest.mock('../../components/CodigoRenaserModal', () => ({
  CodigoRenaserModal: (props: PropsDelModal) => {
    mockModal.push(props);
    return null;
  },
}));

const mockMi = { actual: undefined as unknown as ReturnType<typeof crearMi> };
jest.mock('../../hooks/useMiRadar', () => ({ useMiRadar: () => mockMi.actual }));

import * as tokens from '../../../../theme/tokens';
import { diaDePrueba, miRadarDePrueba } from '../../__tests__/fixturasDeMiRadar';
import type { MiRadarApi, RegistroRadarApi } from '../../types/radar.types';
import { FUERA_DE_HORARIO, HOY_SIN_RADAR, MiRadarScreen } from '../MiRadarScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registro = (id: string, dia: number, hora: number, extra: Partial<RegistroRadarApi> = {}): RegistroRadarApi => ({
  id,
  whatAmIDoing: `haciendo ${id}`,
  whatAmIThinking: `pensando ${id}`,
  whatAmIFeeling: `sintiendo ${id}`,
  energyLevel: 7,
  whatAmIAvoiding: `evitando ${id}`,
  createdAt: new Date(2026, 9, dia, hora, 6).toISOString(),
  ...extra,
});

/** El jueves 29: lunes a jueves con candado (`editable: false`); viernes, sábado y domingo se editan. */
const semana = (encendido = true, porDia: Parameters<typeof miRadarDePrueba>[1] = {}): MiRadarApi =>
  miRadarDePrueba(encendido, { 1: { editable: false }, 2: { editable: false }, 3: { editable: false }, 4: { editable: false }, ...porDia });

function crearMi(config: MiRadarApi | null, extra: Record<string, unknown> = {}) {
  return {
    usuarioId: 'u1',
    ahora: new Date(2026, 9, 29, 15, 30),
    config,
    guardando: false,
    guardarConfig: jest.fn(async (encendido: boolean, _dias: readonly unknown[] = []) => ({ ok: true as const, config: semana(encendido) })),
    historial: {
      registros: [] as RegistroRadarApi[],
      dias: [] as Array<{ fecha: string | null; registros: Array<{ registro: RegistroRadarApi; hora: string | null }> }>,
      miRadar: null,
      hayMas: false,
      cargando: false,
      cargandoMas: false,
      fallo: null as string | null,
      cargarMas: jest.fn(async () => undefined),
      recargar: jest.fn(async () => undefined),
    },
    hoyTieneRadar: true,
    yaRegistroEstaHora: false,
    dentroDelHorario: true,
    horaEnCursoPendiente: false,
    registrar: jest.fn(async () => true),
    enviando: false,
    errorAlRegistrar: null,
    limpiarErrorAlRegistrar: jest.fn(),
    ...extra,
  };
}

const montadas: ReactTestRenderer[] = [];
function montar(props: { abrirDesdeAviso?: boolean; onProgramarHorario?: () => void; } = {}): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(MiRadarScreen, { onVolver: () => undefined, ...props }));
  });
  montadas.push(r);
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

const textosDe = (n: ReactTestInstance): string =>
  n
    .findAll(h => (h.type as unknown) === 'Text')
    .map(h => React.Children.toArray(h.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''))
    .join(' ');
const tocable = (r: ReactTestRenderer, etiqueta: string): ReactTestInstance =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];
const hay = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function').length > 0;
/** El chip de un día de la fila de los siete días, por su nombre (la fecha del mes depende del día en que corra la prueba). */
const chipDelDia = (r: ReactTestRenderer, nombre: string): ReactTestInstance =>
  r.root.findAll(
    n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(`${nombre} `) && typeof n.props.onPress === 'function',
  )[0];
const etiquetaDelChip = (r: ReactTestRenderer, nombre: string): string => chipDelDia(r, nombre).props.accessibilityLabel;
const chipEnEdicion = (r: ReactTestRenderer, nombre: string) => chipDelDia(r, nombre).props.accessibilityState.selected === true;
const chipConCandado = (r: ReactTestRenderer, nombre: string) => chipDelDia(r, nombre).props.accessibilityState.disabled === true;
const pulsar = (r: ReactTestRenderer, etiqueta: string) => act(() => tocable(r, etiqueta).props.onPress());
const marcar = (r: ReactTestRenderer, ...dias: string[]) => dias.forEach(d => act(() => chipDelDia(r, d).props.onPress()));
const modoElegido = (r: ReactTestRenderer) => (tocable(r, 'Personalizado').props.accessibilityState.selected ? 'PERSONALIZADO' : 'AUTOMATICO');
/** La cifra grande de «Veces al día». */
const cifraDeLasVeces = (r: ReactTestRenderer): string =>
  String(r.root.findAll(n => n.props.accessibilityLiveRegion === 'polite')[0].props.children);
const visibleElFormulario = () => mockModal[mockModal.length - 1]?.visible === true;

beforeEach(() => {
  // La confirmación en línea se va sola a los 4 s: con el reloj de mentira no queda un temporizador vivo al terminar.
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
  mockModal.length = 0;
});
afterEach(() => {
  act(() => montadas.splice(0).forEach(r => r.unmount()));
  jest.useRealTimers();
});

describe('Mi Radar apagado', () => {
  it('lo primero es «Encendido» apagado y no hay modo, hora, fila de días ni registrar', () => {
    mockMi.actual = crearMi(semana(false));
    const r = montar();
    const interruptor = tocable(r, 'Encendido');
    expect(interruptor.props.accessibilityRole).toBe('switch');
    expect(interruptor.props.accessibilityState.checked).toBe(false);
    const t = textos(r);
    expect(t).not.toContain('Registrar ahora');
    expect(t).not.toContain('Hora');
    expect(t).not.toContain('Todos los días');
    expect(hay(r, 'Automático')).toBe(false);
    expect(t).not.toContain('Hoy: ');
  });

  it('no queda ningún texto de explicación de la versión anterior', () => {
    mockMi.actual = crearMi(semana(true));
    const t = textos(montar());
    for (const quitado of ['Lo ves tú, tu mentor', 'Aquí verás tus registros de hoy', 'De 03:00 a 23:00', 'Toca un día para', 'Cómo suena', 'horas por día', 'Tus horas', 'Historial', 'Patrones', 'Sin registro', 'Ver más', 'Todavía no tienes registros']) {
      expect(t).not.toContain(quitado);
    }
  });

  it('no muestra las respuestas de la persona (ni hoy ni el historial), aunque las haya: eso lo ven su mentor y su líder en la ficha', () => {
    const mi = crearMi(semana(true));
    const a = registro('a', 29, 11, { horaPrevista: 11 });
    mi.historial.registros = [a];
    mi.historial.dias = [{ fecha: '2026-10-29', registros: [{ registro: a, hora: '11:06' }] }];
    mockMi.actual = mi;
    const t = textos(montar());
    expect(t).not.toContain('haciendo a');
    expect(t).not.toContain('Prevista 11:00');
    expect(t).not.toContain('Sentí');
    expect(t).not.toContain('Energía');
  });

  it('encender rige en el acto: manda solo «encendido» y confirma en línea', async () => {
    mockMi.actual = crearMi(semana(false));
    const r = montar();
    await act(async () => {
      tocable(r, 'Encendido').props.onPress();
    });
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true);
    expect(textos(r)).toContain('Mi Radar encendido');
  });
});

describe('Mi Radar encendido, Automático', () => {
  it('la cabecera dice «Ahora: 05:30 a 22:30»; el modo es Automático; «Hora» muestra Despertar y Dormir; no hay «Veces al día»', () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    const t = textos(r);
    expect(tocable(r, 'Encendido').props.accessibilityState.checked).toBe(true);
    expect(t).toContain('Ahora: 05:30 a 22:30');
    expect(modoElegido(r)).toBe('AUTOMATICO');
    expect(t).toContain('Hora');
    expect(t).toContain('05:30');
    expect(t).toContain('22:30');
    expect(t).toContain('Despertar');
    expect(t).toContain('Dormir');
    expect(t).not.toContain('Veces al día');
    expect(t).toContain('Todos los días');
  });

  it('la fila de los siete días lleva solo las veces: hoy y lo pasado con candado, y el lector de pantalla dice «Sábado 31, 17 veces»', () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    for (const dia of ['Lunes', 'Martes', 'Miércoles', 'Jueves']) {
      expect(chipConCandado(r, dia)).toBe(true);
      expect(etiquetaDelChip(r, dia)).toMatch(/ya no se puede cambiar$/);
    }
    for (const dia of ['Viernes', 'Sábado', 'Domingo']) {
      expect(chipConCandado(r, dia)).toBe(false);
      expect(etiquetaDelChip(r, dia)).toMatch(/^[^,]+ \d+, 17 veces$/);
    }
  });

  it('un día sin Radar (sin Despertar o «Sin Radar») dice «—» y «sin Radar»', () => {
    mockMi.actual = crearMi(semana(true, { 6: { despertar: null }, 7: { sinRadar: true } }));
    const r = montar();
    expect(etiquetaDelChip(r, 'Sábado')).toMatch(/, sin Radar$/);
    expect(etiquetaDelChip(r, 'Domingo')).toMatch(/, sin Radar$/);
    expect(textos(r)).toContain('—');
  });

  it('hoy y lo pasado no se pueden marcar: tocar un día con candado no hace nada', () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    marcar(r, 'Jueves', 'Lunes');
    expect(chipEnEdicion(r, 'Jueves')).toBe(false);
    expect(textos(r)).toContain('Todos los días');
    marcar(r, 'Sábado');
    expect(chipEnEdicion(r, 'Sábado')).toBe(true);
    expect(textos(r)).toContain('Solo sáb');
  });

  it('sin tocar nada no hay botón de guardar', () => {
    mockMi.actual = crearMi(semana());
    expect(textos(montar())).not.toContain('Guardar');
  });

  it('apagar rige en el acto', async () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    await act(async () => {
      tocable(r, 'Encendido').props.onPress();
    });
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(false);
    expect(textos(r)).toContain('Mi Radar apagado');
  });
});

describe('Personalizado: «Veces al día»', () => {
  it('al pasar a Personalizado, sin días marcados, cambian los días que vienen y se propone 6; hoy y lo pasado no', () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    pulsar(r, 'Personalizado');
    expect(modoElegido(r)).toBe('PERSONALIZADO');
    expect(textos(r)).toContain('Veces al día');
    expect(cifraDeLasVeces(r)).toBe('6');
    expect(etiquetaDelChip(r, 'Viernes')).toMatch(/, 6 veces$/);
    expect(etiquetaDelChip(r, 'Domingo')).toMatch(/, 6 veces$/);
    expect(etiquetaDelChip(r, 'Jueves')).toMatch(/ya no se puede cambiar$/);
    expect(textos(r)).toContain('Guardar · todos los días');
  });

  it('+ y − suben y bajan de a una, y las horas no se muestran: solo la cifra', () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    pulsar(r, 'Personalizado');
    pulsar(r, 'Una vez más');
    expect(cifraDeLasVeces(r)).toBe('7');
    pulsar(r, 'Una vez menos');
    pulsar(r, 'Una vez menos');
    expect(cifraDeLasVeces(r)).toBe('5');
    expect(textos(r)).not.toMatch(/\d\d:00/);
  });

  it('− se apaga en 1 y + se apaga en lo que cabe (17)', () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    pulsar(r, 'Personalizado');
    for (let i = 0; i < 8; i++) pulsar(r, 'Una vez menos');
    expect(cifraDeLasVeces(r)).toBe('1');
    expect(tocable(r, 'Una vez menos').props.accessibilityState.disabled).toBe(true);
    for (let i = 0; i < 20; i++) if (!tocable(r, 'Una vez más').props.accessibilityState.disabled) pulsar(r, 'Una vez más');
    expect(cifraDeLasVeces(r)).toBe('17');
    expect(tocable(r, 'Una vez más').props.accessibilityState.disabled).toBe(true);
  });

  it('con días marcados − / + cambian solo esos días, y el botón dice «Guardar · sáb, dom»', () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    marcar(r, 'Sábado', 'Domingo');
    pulsar(r, 'Personalizado');
    pulsar(r, 'Una vez menos');
    expect(cifraDeLasVeces(r)).toBe('5');
    expect(etiquetaDelChip(r, 'Sábado')).toMatch(/, 5 veces$/);
    expect(etiquetaDelChip(r, 'Viernes')).toMatch(/, 17 veces$/);
    expect(textos(r)).toContain('Solo sáb, dom');
    expect(textos(r)).toContain('Guardar · sáb, dom');
  });

  it('con veces distintas entre los marcados la cifra dice «—»', () => {
    mockMi.actual = crearMi(semana(true, { 6: { modo: 'PERSONALIZADO', veces: 4, horas: [6, 12, 17, 22] }, 7: { modo: 'PERSONALIZADO', veces: 9, horas: [6, 7, 8, 9, 10, 11, 12, 13, 14] } }));
    const r = montar();
    marcar(r, 'Sábado', 'Domingo');
    expect(cifraDeLasVeces(r)).toBe('—');
  });

  it('«Guardar · todos los días» manda SOLO los días que vienen con su modo y sus veces, y confirma', async () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    pulsar(r, 'Personalizado');
    await act(async () => {
      tocable(r, 'Guardar · todos los días').props.onPress();
    });
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true, [
      { dia: 5, modo: 'PERSONALIZADO', veces: 6, sinRadar: false },
      { dia: 6, modo: 'PERSONALIZADO', veces: 6, sinRadar: false },
      { dia: 7, modo: 'PERSONALIZADO', veces: 6, sinRadar: false },
    ]);
    expect(textos(r)).toContain('Guardado · todos los días');
    expect(textos(r)).not.toContain('Guardar ·');
  });

  it('con días marcados se manda solo lo de esos días', async () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    marcar(r, 'Sábado', 'Domingo');
    pulsar(r, 'Personalizado');
    pulsar(r, 'Una vez más');
    await act(async () => {
      tocable(r, 'Guardar · sáb, dom').props.onPress();
    });
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true, [
      { dia: 6, modo: 'PERSONALIZADO', veces: 7, sinRadar: false },
      { dia: 7, modo: 'PERSONALIZADO', veces: 7, sinRadar: false },
    ]);
  });

  it('volver a Automático sin guardar deja todo como estaba y quita el botón', () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    pulsar(r, 'Personalizado');
    pulsar(r, 'Automático');
    expect(textos(r)).not.toContain('Guardar ·');
    expect(etiquetaDelChip(r, 'Sábado')).toMatch(/, 17 veces$/);
  });

  it('si el servidor lo rechaza, dice el motivo y no pierde lo tocado', async () => {
    const mi = crearMi(semana());
    mi.guardarConfig.mockResolvedValueOnce({ ok: false, error: 'Hoy y los días que pasaron no se pueden cambiar' } as never);
    mockMi.actual = mi;
    const r = montar();
    pulsar(r, 'Personalizado');
    await act(async () => {
      tocable(r, 'Guardar · todos los días').props.onPress();
    });
    expect(textos(r)).toContain('Hoy y los días que pasaron no se pueden cambiar');
    expect(textos(r)).toContain('Guardar · todos los días');
    expect(modoElegido(r)).toBe('PERSONALIZADO');
  });
});

describe('«Sin Radar estos días»', () => {
  it('aparece al marcar días; se guarda solo para esos días', async () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    expect(hay(r, 'Sin Radar estos días')).toBe(false);
    marcar(r, 'Domingo');
    expect(tocable(r, 'Sin Radar estos días').props.accessibilityState.checked).toBe(false);
    pulsar(r, 'Sin Radar estos días');
    expect(tocable(r, 'Sin Radar estos días').props.accessibilityState.checked).toBe(true);
    expect(etiquetaDelChip(r, 'Domingo')).toMatch(/, sin Radar$/);
    await act(async () => {
      tocable(r, 'Guardar · dom').props.onPress();
    });
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true, [{ dia: 7, modo: 'AUTOMATICO', sinRadar: true }]);
  });

  it('«Varía» cuando solo algunos de los marcados van sin Radar', () => {
    mockMi.actual = crearMi(semana(true, { 7: { sinRadar: true } }));
    const r = montar();
    marcar(r, 'Sábado', 'Domingo');
    expect(tocable(r, 'Sin Radar estos días').props.accessibilityState.checked).toBe('mixed');
  });
});

describe('«Hora»: sin Despertar o con horarios distintos', () => {
  it('un día sin Despertar: en lugar de «Hora», «Falta tu hora de Despertar» y fijo abajo «Programar mi Despertar», que lleva a Training', () => {
    const irAPlanificar = jest.fn();
    mockMi.actual = crearMi(semana(true, { 4: { despertar: null } }), { hoyTieneRadar: false });
    const r = montar({ onProgramarHorario: irAPlanificar });
    const t = textos(r);
    expect(t).toContain('Falta tu hora de Despertar');
    expect(t).not.toContain('Ahora:');
    expect(t).toContain(HOY_SIN_RADAR);
    pulsar(r, 'Programar mi Despertar');
    expect(irAPlanificar).toHaveBeenCalledTimes(1);
  });

  it('sin Dormir el botón dice «Programar mi Dormir»', () => {
    mockMi.actual = crearMi(semana(true, { 4: { dormir: null } }), { hoyTieneRadar: false });
    const r = montar();
    expect(textos(r)).toContain('Falta tu hora de Dormir');
    expect(hay(r, 'Programar mi Dormir')).toBe(true);
  });

  it('si hay algo que guardar, el botón fijo es «Guardar» y no «Programar»', () => {
    mockMi.actual = crearMi(semana(true, { 4: { despertar: null } }));
    const r = montar();
    pulsar(r, 'Personalizado');
    expect(hay(r, 'Programar mi Despertar')).toBe(false);
    expect(textos(r)).toContain('Guardar · todos los días');
  });

  it('días marcados con horarios distintos: «Estos días tienen horas distintas»', () => {
    mockMi.actual = crearMi(semana(true, { 7: { despertar: '08:00', dormir: '23:00' } }));
    const r = montar();
    marcar(r, 'Sábado', 'Domingo');
    expect(textos(r)).toContain('Estos días tienen horas distintas');
    expect(textos(r)).toContain('Ahora: 05:30 a 22:30');
  });
});

describe('registrar y lo de hoy', () => {
  it('«Registrar ahora» abre el formulario de siempre, que se puede cerrar', () => {
    mockMi.actual = crearMi(semana());
    const r = montar();
    expect(visibleElFormulario()).toBe(false);
    pulsar(r, 'Registrar ahora');
    expect(visibleElFormulario()).toBe(true);
    expect(mockModal[mockModal.length - 1].obligatorio).toBe(false);
    expect(mockModal[mockModal.length - 1].textoDelPie).toBe('Puedes cerrarlo; tu borrador queda guardado en este teléfono.');
  });

  it('si ya registró esta hora lo dice y no ofrece registrar; de madrugada dice que funciona de 03:00 a 23:59', () => {
    mockMi.actual = crearMi(semana(), { yaRegistroEstaHora: true });
    let r = montar();
    expect(textos(r)).toContain('Ya registraste esta hora');
    expect(hay(r, 'Registrar ahora')).toBe(false);

    mockMi.actual = crearMi(semana(), { dentroDelHorario: false });
    r = montar();
    expect(textos(r)).toContain(FUERA_DE_HORARIO);
    expect(FUERA_DE_HORARIO).toBe('Mi Radar funciona de 03:00 a 23:59.');
    expect(hay(r, 'Registrar ahora')).toBe(false);
  });

  it('un día sin Radar no ofrece «Registrar ahora»: dice «Hoy no tienes Mi Radar»', () => {
    mockMi.actual = crearMi(semana(), { hoyTieneRadar: false });
    const r = montar();
    expect(textos(r)).toContain(HOY_SIN_RADAR);
    expect(hay(r, 'Registrar ahora')).toBe(false);
    expect(textos(r)).not.toContain('Ya registraste esta hora');
  });

});

describe('«Hoy: 4 de 6»: una sola línea con las veces que respondió hoy de las que le tocaban', () => {
  /* Jueves 29, 15:30. Seis horas hoy: 06, 09, 12, 15, 18 y 21; respondidas las cuatro primeras. */
  const delJueves = () =>
    semana(true, { 4: { horas: [6, 9, 12, 15, 18, 21] } });
  const respondidas = (...horas: number[]) => horas.map(h => registro(`r${h}`, 29, h, { horaPrevista: h }));
  const lineaDeHoy = (r: ReactTestRenderer) =>
    r.root.findAll(n => (n.type as unknown) === 'Text' && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Hoy respondiste'))[0];

  it('con datos: «Hoy: 4 de 6» en tabular-nums, 16 px, sin color de estado, y el lector de pantalla dice «Hoy respondiste 4 de 6 veces»', () => {
    const mi = crearMi(delJueves());
    mi.historial.registros = respondidas(6, 9, 12, 15);
    mockMi.actual = mi;
    const r = montar();
    const linea = lineaDeHoy(r);
    expect(textos(r)).toContain('Hoy: 4 de 6');
    expect(linea.props.accessibilityLabel).toBe('Hoy respondiste 4 de 6 veces');
    const estilo = StyleSheet.flatten(linea.props.style) as { fontSize: number; fontVariant: string[]; color: string };
    expect(estilo.fontSize).toBe(16);
    expect(estilo.fontVariant).toContain('tabular-nums');
    // Sin colores de estado: el del texto de siempre, ni el verde del éxito ni el rojo del error.
    expect(estilo.color).not.toBe(tokens.light.success);
    expect(estilo.color).not.toBe(tokens.light.danger);
  });

  it('«Hoy: 0 de 6» también se dice', () => {
    mockMi.actual = crearMi(delJueves());
    const r = montar();
    expect(textos(r)).toContain('Hoy: 0 de 6');
    expect(lineaDeHoy(r).props.accessibilityLabel).toBe('Hoy respondiste 0 de 6 veces');
  });

  it('sin Radar hoy (sin Despertar o «Sin Radar»), apagado o con 0 que tocan: no se muestra', () => {
    for (const config of [
      semana(true, { 4: { despertar: null } }),
      semana(true, { 4: { sinRadar: true } }),
      semana(false),
      semana(true, { 4: { horas: [] } }),
    ]) {
      mockMi.actual = crearMi(config);
      expect(textos(montar())).not.toContain('Hoy: ');
    }
  });

  it('no usa más estilo que el texto: sin animación y sin ícono', () => {
    const mi = crearMi(delJueves());
    mi.historial.registros = respondidas(6);
    mockMi.actual = mi;
    const r = montar();
    expect(lineaDeHoy(r).findAll(n => n.props.entering !== undefined || n.props.layout !== undefined)).toHaveLength(0);
  });
});

describe('venir de un aviso', () => {
  it('con la hora en curso de Mi Radar y sin registro, abre también el formulario', () => {
    mockMi.actual = crearMi(semana(), { horaEnCursoPendiente: true });
    montar({ abrirDesdeAviso: true });
    expect(visibleElFormulario()).toBe(true);
  });

  it('si esa hora ya tiene registro (o no es una de Mi Radar), abre solo Mi Radar', () => {
    mockMi.actual = crearMi(semana(), { horaEnCursoPendiente: false });
    montar({ abrirDesdeAviso: true });
    expect(visibleElFormulario()).toBe(false);
  });

  it('espera a saber si esa hora ya tiene registro (el historial carga)', () => {
    const mi = crearMi(semana(), { horaEnCursoPendiente: true });
    mi.historial.cargando = true;
    mockMi.actual = mi;
    montar({ abrirDesdeAviso: true });
    expect(visibleElFormulario()).toBe(false);
  });

  it('sin venir de un aviso, nunca se abre solo', () => {
    mockMi.actual = crearMi(semana(), { horaEnCursoPendiente: true });
    montar();
    expect(visibleElFormulario()).toBe(false);
  });
});
