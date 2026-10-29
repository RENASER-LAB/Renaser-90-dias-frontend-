import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Yo → Mi Radar (spec 012), lo básico de la pantalla: el interruptor manda (apagado no hay registrar ni horarios),
 * encender muestra las horas sugeridas y se guarda con «Guardar y encender», las reglas de las horas se dicen en línea,
 * apagar rige en el acto, y venir de un aviso abre el formulario cuando toca. El hook (red, historial) se reemplaza.
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

import type { DiaDeMiRadarApi, MiRadarApi, RegistroRadarApi } from '../../types/radar.types';
import { validarHoras } from '../../utils/miRadar';
import { FUERA_DE_HORARIO, HOY_SIN_RADAR, MiRadarScreen, QUIEN_LO_VE } from '../MiRadarScreen';

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

function crearMi(config: MiRadarApi | null, extra: Record<string, unknown> = {}) {
  return {
    usuarioId: 'u1',
    ahora: new Date(2026, 9, 29, 15, 30),
    config,
    guardando: false,
    guardarConfig: jest.fn(async (encendido: boolean, horas: readonly number[], dias: readonly DiaDeMiRadarApi[] = []) => {
      if (!encendido) return { ok: true as const, config: { encendido: false, horas: [], dias: [] } };
      const v = validarHoras(horas);
      return v.ok ? { ok: true as const, config: { encendido: true, horas: v.horas, dias: [...dias] } } : { ok: false as const, error: v.error };
    }),
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
    hoy: [] as unknown[],
    patrones: { registros: 0, hayPatrones: false, masEnergia: null, menosEnergia: null, evitando: null },
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
function montar(props: { abrirDesdeAviso?: boolean } = {}): ReactTestRenderer {
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
const elegida = (r: ReactTestRenderer, hora: string) => tocable(r, hora).props.accessibilityState.selected === true;
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
  it('lo primero es el interruptor apagado, y no hay registrar ni horarios; sí quién lo ve, historial y patrones', () => {
    mockMi.actual = crearMi({ encendido: false, horas: [] });
    const r = montar();
    const interruptor = tocable(r, 'Mi Radar');
    expect(interruptor.props.accessibilityRole).toBe('switch');
    expect(interruptor.props.accessibilityState.checked).toBe(false);
    const t = textos(r);
    expect(t).toContain(QUIEN_LO_VE);
    expect(QUIEN_LO_VE).toBe('Lo ves tú, tu mentor y el equipo que coordina tu grupo.');
    expect(t).not.toContain('Registrar ahora');
    expect(t).not.toContain('Tus horas');
    expect(hay(r, '09:00')).toBe(false);
    expect(t).toContain('Historial');
    expect(t).toContain('Patrones');
    expect(t).toContain('Todavía no tienes registros.');
    expect(t).toContain('Con 0 registros todavía no hay patrones. Aparecen desde 3.');
  });

  it('el historial se ve aunque esté apagado, con todo lo que hubo (también lo de hoy)', () => {
    const mi = crearMi({ encendido: false, horas: [] });
    const a = registro('a', 29, 11, { horaPrevista: 11 });
    mi.historial.registros = [a];
    mi.historial.dias = [{ fecha: '2026-10-29', registros: [{ registro: a, hora: '11:06' }] }];
    mockMi.actual = mi;
    const r = montar();
    expect(textos(r)).toContain('Prevista 11:00 · respondida 11:06');
  });

  it('encender muestra las horas con 09:00, 14:00 y 20:00 marcadas, sin guardar todavía', () => {
    mockMi.actual = crearMi({ encendido: false, horas: [] });
    const r = montar();
    act(() => tocable(r, 'Mi Radar').props.onPress());
    const t = textos(r);
    expect(t).toContain('Tus horas');
    expect(t).toContain('3 de 12 horas elegidas');
    expect(['09:00', '14:00', '20:00'].every(h => elegida(r, h))).toBe(true);
    expect(elegida(r, '10:00')).toBe(false);
    // Solo 03:00 a 23:00: 21 horas, ninguna de madrugada ni pasada la medianoche.
    expect(hay(r, '03:00')).toBe(true);
    expect(hay(r, '23:00')).toBe(true);
    expect(hay(r, '00:00')).toBe(false);
    expect(hay(r, '02:00')).toBe(false);
    expect(mockMi.actual.guardarConfig).not.toHaveBeenCalled();
    // Todavía no está guardado: no hay registrar.
    expect(t).not.toContain('Registrar ahora');
  });

  it('«Guardar y encender» guarda las horas y confirma en línea', async () => {
    mockMi.actual = crearMi({ encendido: false, horas: [] });
    const r = montar();
    act(() => tocable(r, 'Mi Radar').props.onPress());
    act(() => tocable(r, '10:00').props.onPress());
    await act(async () => {
      tocable(r, 'Guardar y encender').props.onPress();
    });
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true, [9, 10, 14, 20], []);
    expect(textos(r)).toContain('Mi Radar encendido · 09:00, 10:00, 14:00 y 20:00');
  });

  it('con ninguna hora marcada, guardar dice «Elige al menos una hora» y no guarda', async () => {
    mockMi.actual = crearMi({ encendido: false, horas: [] });
    const r = montar();
    act(() => tocable(r, 'Mi Radar').props.onPress());
    for (const h of ['09:00', '14:00', '20:00']) act(() => tocable(r, h).props.onPress());
    await act(async () => {
      tocable(r, 'Guardar y encender').props.onPress();
    });
    expect(textos(r)).toContain('Elige al menos una hora');
    expect(textos(r)).not.toContain('Mi Radar encendido');
  });

  it('con 12 marcadas, una más no se marca y se lee «Puedes elegir hasta 12»', () => {
    mockMi.actual = crearMi({ encendido: false, horas: [] });
    const r = montar();
    act(() => tocable(r, 'Mi Radar').props.onPress());
    for (const h of ['03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '10:00', '11:00', '12:00']) {
      act(() => tocable(r, h).props.onPress());
    }
    expect(textos(r)).toContain('12 de 12 horas elegidas');
    act(() => tocable(r, '13:00').props.onPress());
    expect(textos(r)).toContain('Puedes elegir hasta 12');
    expect(elegida(r, '13:00')).toBe(false);
    expect(textos(r)).toContain('12 de 12 horas elegidas');
  });
});

describe('Mi Radar encendido', () => {
  const encendido = { encendido: true, horas: [9, 14, 20] };

  it('muestra registrar, hoy y las horas guardadas; no pide guardar mientras nada cambió', () => {
    mockMi.actual = crearMi(encendido, { hoy: [{ tipo: 'sin-registro', hora: 14 }, { tipo: 'sin-registro', hora: 9 }] });
    const r = montar();
    const t = textos(r);
    expect(tocable(r, 'Mi Radar').props.accessibilityState.checked).toBe(true);
    expect(hay(r, 'Registrar ahora') || t.includes('Registrar ahora')).toBe(true);
    expect(t).toContain('14:00 · Sin registro');
    expect(t).toContain('09:00 · Sin registro');
    expect(['09:00', '14:00', '20:00'].every(h => elegida(r, h))).toBe(true);
    expect(t).not.toContain('Guardar horarios');
  });

  it('cambiar una hora ofrece «Guardar horarios» y guarda solo las elegidas', async () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    act(() => tocable(r, '20:00').props.onPress());
    await act(async () => {
      tocable(r, 'Guardar horarios').props.onPress();
    });
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true, [9, 14], []);
    expect(textos(r)).toContain('Horarios guardados · 09:00 y 14:00');
  });

  it('«Registrar ahora» abre el formulario de siempre, que se puede cerrar', () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    expect(visibleElFormulario()).toBe(false);
    act(() => tocable(r, 'Registrar ahora').props.onPress());
    expect(visibleElFormulario()).toBe(true);
    const modal = mockModal[mockModal.length - 1];
    expect(modal.obligatorio).toBe(false);
    expect(modal.slot?.etiqueta).toBe('15:00');
    expect(modal.textoDelPie).toBeTruthy();
  });

  it('apagar rige en el acto', async () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    await act(async () => {
      tocable(r, 'Mi Radar').props.onPress();
    });
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(false, []);
    expect(textos(r)).toContain('Mi Radar apagado');
  });

  it('si ya registró esta hora lo dice y no ofrece registrar; de madrugada dice que funciona de 03:00 a 23:59', () => {
    mockMi.actual = crearMi(encendido, { yaRegistroEstaHora: true });
    let r = montar();
    expect(textos(r)).toContain('Ya registraste esta hora');
    expect(hay(r, 'Registrar ahora')).toBe(false);

    mockMi.actual = crearMi(encendido, { dentroDelHorario: false });
    r = montar();
    expect(textos(r)).toContain(FUERA_DE_HORARIO);
    expect(FUERA_DE_HORARIO).toBe('Mi Radar funciona de 03:00 a 23:59.');
    expect(hay(r, 'Registrar ahora')).toBe(false);
  });
});

/** El chip de un día de la fila de los siete días, por su nombre (la fecha del mes depende del día en que corra la prueba). */
const chipDelDia = (r: ReactTestRenderer, nombre: string): ReactTestInstance => {
  const encontrados = r.root.findAll(
    n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(`${nombre} `) && typeof n.props.onPress === 'function',
  );
  return encontrados[0];
};
const chipEnEdicion = (r: ReactTestRenderer, nombre: string) => chipDelDia(r, nombre).props.accessibilityState.selected === true;
const etiquetaDelChip = (r: ReactTestRenderer, nombre: string): string => chipDelDia(r, nombre).props.accessibilityLabel;

describe('los horarios por día de la semana', () => {
  const encendido: MiRadarApi = { encendido: true, horas: [9, 14, 20], dias: [] };
  const conPropios: MiRadarApi = { encendido: true, horas: [9, 14, 20], dias: [{ dia: 6, horas: [11] }, { dia: 7, horas: [] }] };

  it('sin días marcados: «Todos los días», la fila de los siete días y las horas de siempre', () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    const t = textos(r);
    expect(t).toContain('Todos los días');
    expect(t).toContain('Toca un día para darle sus propias horas o dejarlo sin Radar.');
    for (const dia of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']) {
      expect(chipDelDia(r, dia)).toBeDefined();
      expect(chipEnEdicion(r, dia)).toBe(false);
    }
    expect(['09:00', '14:00', '20:00'].every(h => elegida(r, h))).toBe(true);
    expect(t).toContain('3 de 12 horas elegidas');
    expect(t).not.toContain('Sin Radar ese día');
    expect(t).not.toContain('Guardar horas');
  });

  it('ningún día lleva candado: se puede tocar cualquiera, también hoy', () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    for (const dia of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']) {
      expect(chipDelDia(r, dia).props.accessibilityState.disabled).toBe(false);
    }
  });

  it('cada día dice su estado: los que siguen a todos, nada; con horas propias o sin Radar, también al lector de pantalla', () => {
    mockMi.actual = crearMi(conPropios);
    const r = montar();
    expect(etiquetaDelChip(r, 'Lunes')).not.toMatch(/horas propias|sin Radar/i);
    expect(etiquetaDelChip(r, 'Sábado')).toMatch(/, horas propias: 11:00$/);
    expect(etiquetaDelChip(r, 'Domingo')).toMatch(/, sin Radar$/);
  });

  it('marcar un día: «Solo sáb», «Sin Radar ese día» y las horas que tiene (las de todos, si las sigue); sin botón hasta tocar algo', () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    act(() => chipDelDia(r, 'Sábado').props.onPress());
    const t = textos(r);
    expect(chipEnEdicion(r, 'Sábado')).toBe(true);
    expect(t).toContain('Solo sáb');
    expect(t).toContain('Solo sáb, todas las semanas.');
    expect(tocable(r, 'Sin Radar ese día').props.accessibilityState.checked).toBe(false);
    expect(['09:00', '14:00', '20:00'].every(h => elegida(r, h))).toBe(true);
    expect(t).not.toContain('Guardar horas');
    expect(hay(r, 'Volver a todos los días')).toBe(true);
  });

  it('varios días: «Solo sáb, dom» y el interruptor dice «estos días»', () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    act(() => chipDelDia(r, 'Sábado').props.onPress());
    act(() => chipDelDia(r, 'Domingo').props.onPress());
    expect(textos(r)).toContain('Solo sáb, dom, todas las semanas.');
    expect(hay(r, 'Sin Radar estos días')).toBe(true);
    expect(hay(r, 'Sin Radar ese día')).toBe(false);
  });

  it('«Sin Radar ese día» se guarda con «Guardar horas · sáb», solo lo tocado, y confirma', async () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    act(() => chipDelDia(r, 'Sábado').props.onPress());
    act(() => tocable(r, 'Sin Radar ese día').props.onPress());
    // Sin Radar esconde las horas.
    expect(hay(r, '09:00')).toBe(false);
    expect(tocable(r, 'Sin Radar ese día').props.accessibilityState.checked).toBe(true);
    await act(async () => {
      tocable(r, 'Guardar horas · sáb').props.onPress();
    });
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true, [9, 14, 20], [{ dia: 6, horas: [] }]);
    expect(textos(r)).toContain('Guardado para sáb.');
    // Después de guardar vuelve a «Todos los días».
    expect(textos(r)).toContain('Todos los días');
    expect(chipEnEdicion(r, 'Sábado')).toBe(false);
  });

  it('horas propias de un día: se eligen con los mismos chips y se guardan solo para ese día', async () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    act(() => chipDelDia(r, 'Sábado').props.onPress());
    act(() => tocable(r, '14:00').props.onPress());
    act(() => tocable(r, '20:00').props.onPress());
    act(() => tocable(r, '11:00').props.onPress());
    expect(elegida(r, '11:00')).toBe(true);
    expect(elegida(r, '14:00')).toBe(false);
    expect(textos(r)).toContain('2 de 12 horas elegidas');
    await act(async () => {
      tocable(r, 'Guardar horas · sáb').props.onPress();
    });
    // Las horas de todos los días son las guardadas (9, 14, 20), no lo que se tocó para el sábado.
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true, [9, 14, 20], [{ dia: 6, horas: [9, 11] }]);
  });

  it('lo que queda igual que todos los días no se guarda como propio, y no hay botón si nada cambió', () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    act(() => chipDelDia(r, 'Sábado').props.onPress());
    act(() => tocable(r, '14:00').props.onPress());
    expect(textos(r)).toContain('Guardar horas · sáb');
    act(() => tocable(r, '14:00').props.onPress());
    expect(textos(r)).not.toContain('Guardar horas');
    expect(mockMi.actual.guardarConfig).not.toHaveBeenCalled();
  });

  it('marcar y desmarcar días no pierde las horas de todos los días que se estaban eligiendo', () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    act(() => tocable(r, '10:00').props.onPress());
    expect(textos(r)).toContain('4 de 12 horas elegidas');
    act(() => chipDelDia(r, 'Sábado').props.onPress());
    expect(elegida(r, '10:00')).toBe(false);
    act(() => tocable(r, 'Volver a todos los días').props.onPress());
    expect(textos(r)).toContain('Todos los días');
    expect(elegida(r, '10:00')).toBe(true);
    expect(textos(r)).toContain('Guardar horarios');
  });

  it('con 12 horas en un día, una más no se marca y se lee «Puedes elegir hasta 12»', () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    act(() => chipDelDia(r, 'Sábado').props.onPress());
    for (const h of ['03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '10:00', '11:00', '12:00']) {
      act(() => tocable(r, h).props.onPress());
    }
    expect(textos(r)).toContain('12 de 12 horas elegidas');
    act(() => tocable(r, '13:00').props.onPress());
    expect(textos(r)).toContain('Puedes elegir hasta 12');
    expect(elegida(r, '13:00')).toBe(false);
  });

  it('sin ninguna hora y sin «Sin Radar», guardar dice qué hacer y no guarda', async () => {
    mockMi.actual = crearMi({ encendido: true, horas: [9, 14, 20], dias: [] });
    const r = montar();
    act(() => chipDelDia(r, 'Sábado').props.onPress());
    for (const h of ['09:00', '14:00', '20:00']) act(() => tocable(r, h).props.onPress());
    await act(async () => {
      tocable(r, 'Guardar horas · sáb').props.onPress();
    });
    expect(textos(r)).toContain('Elige al menos una hora o marca «Sin Radar» para esos días');
    expect(mockMi.actual.guardarConfig).not.toHaveBeenCalled();
  });

  it('días con horas distintas: «Estos días tienen horas distintas», sin horas marcadas, «Varía» y lo que se elija va a todos', async () => {
    mockMi.actual = crearMi(conPropios);
    const r = montar();
    // Sábado (11:00) y lunes (las de todos) no coinciden.
    act(() => chipDelDia(r, 'Sábado').props.onPress());
    act(() => chipDelDia(r, 'Lunes').props.onPress());
    expect(textos(r)).toContain('Estos días tienen horas distintas');
    expect(['09:00', '11:00', '14:00', '20:00'].some(h => elegida(r, h))).toBe(false);
    act(() => tocable(r, '16:00').props.onPress());
    expect(textos(r)).not.toContain('Estos días tienen horas distintas');
    await act(async () => {
      tocable(r, 'Guardar horas · lun, sáb').props.onPress();
    });
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true, [9, 14, 20], [
      { dia: 1, horas: [16] },
      { dia: 6, horas: [16] },
      { dia: 7, horas: [] },
    ]);
  });

  it('«Varía» en «Sin Radar» cuando solo algunos de los marcados van sin Radar; tocarlo los pone a todos sin Radar', () => {
    mockMi.actual = crearMi(conPropios);
    const r = montar();
    act(() => chipDelDia(r, 'Domingo').props.onPress());
    expect(tocable(r, 'Sin Radar ese día').props.accessibilityState.checked).toBe(true);
    act(() => chipDelDia(r, 'Lunes').props.onPress());
    expect(tocable(r, 'Sin Radar estos días').props.accessibilityState.checked).toBe('mixed');
    act(() => tocable(r, 'Sin Radar estos días').props.onPress());
    expect(tocable(r, 'Sin Radar estos días').props.accessibilityState.checked).toBe(true);
    expect(textos(r)).toContain('Guardar horas · lun, dom');
  });

  it('apagar «Sin Radar» de un día que iba sin Radar le devuelve las horas de todos', async () => {
    mockMi.actual = crearMi(conPropios);
    const r = montar();
    act(() => chipDelDia(r, 'Domingo').props.onPress());
    act(() => tocable(r, 'Sin Radar ese día').props.onPress());
    expect(['09:00', '14:00', '20:00'].every(h => elegida(r, h))).toBe(true);
    await act(async () => {
      tocable(r, 'Guardar horas · dom').props.onPress();
    });
    // El domingo vuelve a seguir a todos; el sábado conserva sus 11:00.
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true, [9, 14, 20], [{ dia: 6, horas: [11] }]);
  });

  it('«Dejar sáb como los demás días» solo aparece si ese día tiene lo suyo, y se guarda en el acto', async () => {
    mockMi.actual = crearMi(conPropios);
    const r = montar();
    act(() => chipDelDia(r, 'Lunes').props.onPress());
    expect(textos(r)).not.toContain('Dejar lun como los demás días');
    act(() => chipDelDia(r, 'Lunes').props.onPress());
    act(() => chipDelDia(r, 'Sábado').props.onPress());
    expect(textos(r)).toContain('Dejar sáb como los demás días');
    await act(async () => {
      r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityRole === 'button' && textosDe(n).includes('Dejar sáb como los demás días'))[0].props.onPress();
    });
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true, [9, 14, 20], [{ dia: 7, horas: [] }]);
    expect(textos(r)).toContain('Quedó igual que los demás días: sáb.');
  });

  it('«Guardar horarios» de todos los días conserva los días propios que ya había', async () => {
    mockMi.actual = crearMi(conPropios);
    const r = montar();
    act(() => tocable(r, '20:00').props.onPress());
    await act(async () => {
      tocable(r, 'Guardar horarios').props.onPress();
    });
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true, [9, 14], conPropios.dias);
  });

  it('aún apagado: encender y darle horas propias a un día se guarda junto, con «Guardar y encender · sáb»', async () => {
    mockMi.actual = crearMi({ encendido: false, horas: [], dias: [] });
    const r = montar();
    act(() => tocable(r, 'Mi Radar').props.onPress());
    act(() => chipDelDia(r, 'Sábado').props.onPress());
    act(() => tocable(r, 'Sin Radar ese día').props.onPress());
    await act(async () => {
      tocable(r, 'Guardar y encender · sáb').props.onPress();
    });
    // Las horas de todos los días son las sugeridas que se estaban viendo.
    expect(mockMi.actual.guardarConfig).toHaveBeenCalledWith(true, [9, 14, 20], [{ dia: 6, horas: [] }]);
    expect(textos(r)).toContain('Mi Radar encendido · guardado para sáb.');
  });

  it('si el servidor lo rechaza, dice el motivo y no pierde lo tocado', async () => {
    const mi = crearMi(encendido);
    mi.guardarConfig.mockResolvedValueOnce({ ok: false as const, error: 'Las horas van de 3 a 23' } as never);
    mockMi.actual = mi;
    const r = montar();
    act(() => chipDelDia(r, 'Sábado').props.onPress());
    act(() => tocable(r, 'Sin Radar ese día').props.onPress());
    await act(async () => {
      tocable(r, 'Guardar horas · sáb').props.onPress();
    });
    expect(textos(r)).toContain('Las horas van de 3 a 23');
    expect(chipEnEdicion(r, 'Sábado')).toBe(true);
    expect(tocable(r, 'Sin Radar ese día').props.accessibilityState.checked).toBe(true);
  });
});

describe('hoy, según el día de la semana', () => {
  const encendido = { encendido: true, horas: [9, 14, 20] };

  it('un día «Sin Radar» no ofrece «Registrar ahora»: dice «Hoy no tienes Mi Radar»', () => {
    mockMi.actual = crearMi(encendido, { hoyTieneRadar: false });
    const r = montar();
    expect(textos(r)).toContain(HOY_SIN_RADAR);
    expect(HOY_SIN_RADAR).toBe('Hoy no tienes Mi Radar');
    expect(hay(r, 'Registrar ahora')).toBe(false);
    expect(textos(r)).not.toContain('Ya registraste esta hora');
  });

  it('un día con Radar sigue ofreciendo «Registrar ahora» y no dice que no hay Radar', () => {
    mockMi.actual = crearMi(encendido);
    const r = montar();
    expect(hay(r, 'Registrar ahora')).toBe(true);
    expect(textos(r)).not.toContain(HOY_SIN_RADAR);
  });

  it('«Hoy» muestra lo que trae el hook, en el orden que trae (de la mañana a la noche)', () => {
    mockMi.actual = crearMi(encendido, { hoy: [{ tipo: 'sin-registro', hora: 9 }, { tipo: 'sin-registro', hora: 14 }] });
    const r = montar();
    const t = textos(r);
    expect(t.indexOf('09:00 · Sin registro')).toBeGreaterThan(-1);
    expect(t.indexOf('09:00 · Sin registro')).toBeLessThan(t.indexOf('14:00 · Sin registro'));
  });
});

describe('venir de un aviso', () => {
  const encendido = { encendido: true, horas: [9, 14, 20] };

  it('con la hora en curso elegida y sin registro, abre también el formulario', () => {
    mockMi.actual = crearMi(encendido, { horaEnCursoPendiente: true });
    montar({ abrirDesdeAviso: true });
    expect(visibleElFormulario()).toBe(true);
  });

  it('si esa hora ya tiene registro (o no es una elegida), abre solo Mi Radar', () => {
    mockMi.actual = crearMi(encendido, { horaEnCursoPendiente: false });
    montar({ abrirDesdeAviso: true });
    expect(visibleElFormulario()).toBe(false);
  });

  it('espera a saber si esa hora ya tiene registro (el historial carga)', () => {
    const mi = crearMi(encendido, { horaEnCursoPendiente: true });
    mi.historial.cargando = true;
    mockMi.actual = mi;
    montar({ abrirDesdeAviso: true });
    expect(visibleElFormulario()).toBe(false);
  });

  it('sin venir de un aviso, nunca se abre solo', () => {
    mockMi.actual = crearMi(encendido, { horaEnCursoPendiente: true });
    montar();
    expect(visibleElFormulario()).toBe(false);
  });
});
