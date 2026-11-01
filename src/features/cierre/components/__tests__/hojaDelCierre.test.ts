/**
 * La hoja «Cierra tu día» (spec 017) MONTADA, con la red reemplazada por un doble que anota cada pedido y la hoja de abajo
 * por un doble que solo dibuja su título, su cuerpo y su pie (lo que hace la hoja de verdad lo prueban las de
 * `components/hojaDesdeAbajo`).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
const mockLogro = jest.fn();
jest.mock('../../../../utils/tacto', () => ({
  tacto: { seleccion: () => undefined, error: () => undefined, logro: () => mockLogro() },
}));
const mockAlert = jest.fn();
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (...args: unknown[]) => mockAlert(...args) } }));

const mockPedidos: { ruta: string; metodo: string; cuerpo?: unknown }[] = [];
let mockRespuesta: (ruta: string, metodo: string) => unknown;
jest.mock('../../../../services/http/apiClient', () => ({
  ...(jest.requireActual('../../../../services/http/apiClient') as object),
  apiFetch: async (ruta: string, opciones?: { method?: string; body?: unknown }) => {
    const metodo = opciones?.method ?? 'GET';
    mockPedidos.push({ ruta, metodo, cuerpo: opciones?.body });
    return mockRespuesta(ruta, metodo);
  },
}));

jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => ({
  HojaDesdeAbajo: (props: { visible: boolean; titulo: string; subtitulo?: string; children: unknown; pie?: unknown }) => {
    const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    const R = jest.requireActual<typeof import('react')>('react');
    return props.visible
      ? R.createElement(
          View,
          null,
          R.createElement(Text, null, props.titulo),
          R.createElement(Text, null, props.subtitulo ?? ''),
          props.children as never,
          props.pie as never,
        )
      : null;
  },
}));

import { ApiError } from '../../../../services/http/apiClient';
import { HojaDelCierre, TEXTO_DE_DIA_CERRADO_TARDE } from '../HojaDelCierre';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HOY = '2026-10-29';
const CUMPLIDA = { id: 'a-1', titulo: 'Enviar la propuesta al cliente', horaInicio: '10:00:00', cumplida: true, cumplidaEn: '2026-10-29T15:20:00Z', cierre: null };
const PENDIENTE = { id: 'a-2', titulo: 'Revisar las facturas', horaInicio: '20:30:00', cumplida: false, cumplidaEn: null, cierre: null };
const dia = (extra: object = {}) => ({
  fecha: HOY,
  estado: 'ABIERTO',
  puedeCerrar: true,
  cerradoEn: null,
  nota: null,
  semana: { cumplidas: 7, planificadas: 12 },
  acciones: [CUMPLIDA, PENDIENTE],
  ...extra,
});

const alLeer = jest.fn();
const alGuardar = jest.fn();
const alSalirPorDiaCerrado = jest.fn();
const onCerrar = jest.fn();
const onVerManana = jest.fn();
let raiz: ReactTestRenderer | null = null;

type Props = Partial<React.ComponentProps<typeof HojaDelCierre>>;
const elemento = (props: Props = {}) =>
  React.createElement(HojaDelCierre, {
    visible: true,
    fecha: HOY,
    hoyIso: HOY,
    diaPrograma: 20,
    habitosHechos: 14,
    habitosTotal: 18,
    puedeVerManana: true,
    onCerrar,
    alLeer,
    alGuardar,
    alSalirPorDiaCerrado,
    onVerManana,
    ...props,
  });
const montar = async (props: Props = {}) => {
  await act(async () => { raiz = TestRenderer.create(elemento(props)); });
};
const actualizar = (props: Props) => act(async () => { raiz!.update(elemento(props)); });

const textosDe = (nodos: ReactTestInstance[]) =>
  nodos
    .filter(n => n.type === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''))
    .filter(Boolean);
const textos = () => textosDe(raiz!.root.findAll(() => true));
const hay = (texto: string) => textos().some(t => t.includes(texto));

/** El tocable más interno que contiene ese texto (el último de la búsqueda en profundidad). */
function tocableCon(texto: string): ReactTestInstance {
  const t = raiz!.root.findAll(n => n.type === 'Text' && textosDe([n]).some(x => x === texto))[0];
  if (!t) throw new Error(`No hay «${texto}»: ${textos().join(' | ')}`);
  const n = raiz!.root.findAll(x => typeof x.props.onPress === 'function' && x.findAll(y => y === t).length > 0).at(-1);
  if (!n) throw new Error(`«${texto}» no está dentro de nada tocable`);
  return n;
}
const apagado = (n: ReactTestInstance) => n.props.disabled === true || n.props.accessibilityState?.disabled === true;
const elegir = (texto: string) => act(async () => { tocableCon(texto).props.onPress(); });
const guardar = () => act(async () => { await tocableCon('Guardar mi cierre').props.onPress(); });
const chipsElegidos = () =>
  raiz!.root
    .findAll(n => n.props.accessibilityRole === 'radio' && n.props.accessibilityState?.selected === true && typeof n.props.onPress === 'function')
    .map(n => String(n.props.accessibilityLabel))
    .filter((v, i, todos) => todos.indexOf(v) === i);

beforeEach(() => {
  mockPedidos.length = 0;
  [alLeer, alGuardar, alSalirPorDiaCerrado, onCerrar, onVerManana, mockAlert, mockLogro].forEach(m => m.mockClear());
  mockRespuesta = (_r, metodo) => (metodo === 'PUT' ? dia({ estado: 'CERRADO', cerradoEn: '2026-10-29T03:02:00Z', acciones: [CUMPLIDA, { ...PENDIENTE, cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: null } }] }) : dia());
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('el formulario', () => {
  it('título «Cierra tu día», «Jueves 29 · Día 20», lo cumplido marcado y la pendiente con sus dos preguntas', async () => {
    await montar();
    expect(textos()).toEqual(expect.arrayContaining(['Cierra tu día', 'Jueves 29 · Día 20']));
    expect(hay('Enviar la propuesta al cliente')).toBe(true);
    expect(hay('Revisar las facturas')).toBe(true);
    expect(hay('Era a las 20:30 · quedó pendiente')).toBe(true);
    expect(hay('¿Qué pasó?')).toBe(true);
    expect(hay('¿Qué harás mañana?')).toBe(true);
    for (const chip of ['No me alcanzó el tiempo', 'Surgió otra cosa', 'Me faltó energía', 'Lo dejé para después', 'Hacerla a otra hora', 'Hacerla más corta', 'Pedir ayuda', 'Dejarla']) {
      expect(hay(chip)).toBe(true);
    }
    // Lo cumplido llega marcado, sin preguntas: solo UNA tarjeta de preguntas.
    expect(textos().filter(t => t === '¿Qué pasó?')).toHaveLength(1);
  });

  it('sin la hora de la acción dice solo «Quedó pendiente»', async () => {
    mockRespuesta = () => dia({ acciones: [{ ...PENDIENTE, horaInicio: null }] });
    await montar();
    expect(textos()).toContain('Quedó pendiente');
  });

  it('«Tus hábitos: 14 de 18 hechos hoy» y «Tu semana: 7 de 12 acciones cumplidas hasta hoy», solo lectura', async () => {
    await montar();
    expect(hay('14 de 18 hechos hoy. No hace falta responder nada.')).toBe(true);
    expect(hay('7 de 12 acciones cumplidas hasta hoy.')).toBe(true);
  });

  it('sin `semana` del servidor no se dibuja la línea; sin hábitos tampoco la de hábitos', async () => {
    mockRespuesta = () => dia({ semana: null });
    await montar({ habitosTotal: 0, habitosHechos: 0 });
    expect(hay('Tu semana')).toBe(false);
    expect(hay('Tus hábitos')).toBe(false);
  });

  it('«Guardar mi cierre» está apagado y dice qué falta; con los dos chips se enciende', async () => {
    await montar();
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(true);
    expect(textos()).toContain('Elige qué pasó y qué harás mañana con «Revisar las facturas».');
    await elegir('No me alcanzó el tiempo');
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(true);
    await elegir('Hacerla a otra hora');
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(false);
    expect(hay('Elige qué pasó')).toBe(false);
    expect(chipsElegidos()).toEqual(['No me alcanzó el tiempo', 'Hacerla a otra hora']);
  });

  it('elegir otro chip cambia el elegido (uno por pregunta)', async () => {
    await montar();
    await elegir('No me alcanzó el tiempo');
    await elegir('Me faltó energía');
    expect(chipsElegidos()).toEqual(['Me faltó energía']);
  });

  it('con una pendiente, la nota va dentro de su tarjeta y NO hay nota del día', async () => {
    await montar();
    const campos = raiz!.root.findAll(n => n.props.multiline === true && typeof n.props.onChangeText === 'function');
    const etiquetas = campos.map(n => n.props.accessibilityLabel).filter((v, i, t) => t.indexOf(v) === i);
    expect(etiquetas).toEqual(['Nota sobre Revisar las facturas']);
  });
});

describe('al guardar', () => {
  const responder = async () => {
    await elegir('No me alcanzó el tiempo');
    await elegir('Hacerla a otra hora');
  };

  it('envía UN PUT, queda «Día cerrado» con lo de mañana, y vibra una vez', async () => {
    await montar();
    await responder();
    await guardar();
    const puts = mockPedidos.filter(p => p.metodo === 'PUT');
    expect(puts).toHaveLength(1);
    expect(puts[0].cuerpo).toEqual({ fecha: HOY, acciones: [{ id: 'a-2', motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA' }] });
    expect(textos()).toEqual(expect.arrayContaining(['Día cerrado', 'Mañana: «Revisar las facturas», a otra hora.']));
    expect(hay('Ver mañana en Plan')).toBe(true);
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(alGuardar).toHaveBeenCalledTimes(1);
    expect(hay('Guardar mi cierre')).toBe(false);
  });

  it('«Ver mañana en Plan» lleva a lo que Plan muestra de mañana; solo se ofrece si Plan muestra acciones (spec 033)', async () => {
    await montar();
    await responder();
    await guardar();
    await act(async () => { tocableCon('Ver mañana en Plan').props.onPress(); });
    expect(onVerManana).toHaveBeenCalledTimes(1);
    act(() => raiz!.unmount());

    await montar({ puedeVerManana: false });
    await responder();
    await guardar();
    expect(hay('Día cerrado')).toBe(true);
    expect(hay('Ver mañana en Plan')).toBe(false);
  });

  it('guardar no completa nada: ningún pedido toca la evidencia, el registro del hábito ni los puntos', async () => {
    await montar();
    await responder();
    await guardar();
    expect(mockPedidos.every(p => p.ruta.startsWith('/api/v1/rocks/day-closure'))).toBe(true);
    expect(mockPedidos.filter(p => /\/evidence|\/complete|\/points/.test(p.ruta))).toEqual([]);
    expect(hay('pts')).toBe(false);
    expect(hay('puntos')).toBe(false);
  });

  it('el día cambió con la hoja abierta: no envía, y Training cierra, relee y avisa', async () => {
    await montar();
    await responder();
    await actualizar({ hoyIso: '2026-10-30' });
    await guardar();
    expect(mockPedidos.filter(p => p.metodo === 'PUT')).toEqual([]);
    expect(alSalirPorDiaCerrado).toHaveBeenCalledTimes(1);
    expect(mockLogro).not.toHaveBeenCalled();
  });

  it('un 409 del servidor: avisa a Training (que relee y dice «ese día ya cerró»), sin puntos ni «Día cerrado»', async () => {
    await montar();
    await responder();
    mockRespuesta = (_r, metodo) => {
      if (metodo === 'PUT') throw new ApiError(409, TEXTO_DE_DIA_CERRADO_TARDE);
      return dia();
    };
    await guardar();
    expect(alSalirPorDiaCerrado).toHaveBeenCalledTimes(1);
    expect(hay('Día cerrado')).toBe(false);
    expect(mockLogro).not.toHaveBeenCalled();
  });

  it('un fallo de red sale en un diálogo con «Reintentar», que vuelve a enviar lo mismo', async () => {
    await montar();
    await responder();
    let fallar = true;
    mockRespuesta = (_r, metodo) => {
      if (metodo === 'PUT' && fallar) throw new ApiError(0, 'Sin conexión');
      return metodo === 'PUT' ? dia({ estado: 'CERRADO', acciones: [CUMPLIDA, { ...PENDIENTE, cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: null } }] }) : dia();
    };
    await guardar();
    expect(mockAlert).toHaveBeenCalledTimes(1);
    const [titulo, mensaje, botones] = mockAlert.mock.calls[0] as [string, string, Array<{ text: string; onPress?: () => void }>];
    expect(titulo).toBe('No se guardó tu cierre');
    expect(mensaje).toBe('Sin conexión');
    expect(botones.map(b => b.text)).toEqual(['Ahora no', 'Reintentar']);
    expect(hay('Día cerrado')).toBe(false);
    fallar = false;
    await act(async () => { botones[1].onPress!(); });
    expect(mockPedidos.filter(p => p.metodo === 'PUT')).toHaveLength(2);
    expect(hay('Día cerrado')).toBe(true);
  });
});

describe('un día sin acciones, con todo cumplido, o ya cerrado', () => {
  it('sin acciones dice «Hoy no tenías acciones.», los hábitos y una nota del día opcional; se puede guardar de una vez', async () => {
    mockRespuesta = () => dia({ acciones: [], semana: null });
    await montar();
    expect(hay('Hoy no tenías acciones.')).toBe(true);
    expect(hay('14 de 18 hechos hoy')).toBe(true);
    const campos = raiz!.root.findAll(n => n.props.multiline === true && typeof n.props.onChangeText === 'function');
    expect(campos.map(n => n.props.accessibilityLabel)).toContain('Nota del día');
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(false);
    await guardar();
    expect(mockPedidos.find(p => p.metodo === 'PUT')?.cuerpo).toEqual({ fecha: HOY, acciones: [] });
  });

  it('con todo cumplido no pregunta nada: lo dice, y hay nota del día', async () => {
    mockRespuesta = () => dia({ acciones: [CUMPLIDA] });
    await montar();
    expect(hay('¿Qué pasó?')).toBe(false);
    expect(hay('No te quedó nada pendiente. No hace falta responder nada.')).toBe(true);
    expect(hay('Tu nota del día')).toBe(true);
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(false);
  });

  it('ya cerrado, abre con lo guardado precargado y se puede cambiar y guardar de nuevo', async () => {
    mockRespuesta = (_r, metodo) =>
      metodo === 'PUT'
        ? dia({ estado: 'CERRADO', acciones: [CUMPLIDA, { ...PENDIENTE, cierre: { motivo: 'PARA_DESPUES', manana: 'DEJARLA', nota: null } }] })
        : dia({ estado: 'CERRADO', cerradoEn: '2026-10-29T03:02:00Z', acciones: [CUMPLIDA, { ...PENDIENTE, cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: 'Se alargó' } }] });
    await montar();
    expect(chipsElegidos()).toEqual(['No me alcanzó el tiempo', 'Hacerla a otra hora']);
    const nota = raiz!.root.findAll(n => n.props.multiline === true && typeof n.props.onChangeText === 'function')[0];
    expect(nota.props.value).toBe('Se alargó');
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(false);
    await elegir('Lo dejé para después');
    await elegir('Dejarla');
    await guardar();
    expect(mockPedidos.find(p => p.metodo === 'PUT')?.cuerpo).toEqual({
      fecha: HOY,
      acciones: [{ id: 'a-2', motivo: 'PARA_DESPUES', manana: 'DEJARLA', nota: 'Se alargó' }],
    });
    expect(hay('Mañana: «Revisar las facturas», la dejas.')).toBe(true);
  });

  it('si entre tanto se cumplió la pendiente, llega marcada y ya no se pregunta por ella', async () => {
    mockRespuesta = () => dia({ acciones: [CUMPLIDA, { ...PENDIENTE, cumplida: true, cumplidaEn: '2026-10-29T23:10:00Z' }] });
    await montar();
    expect(hay('¿Qué pasó?')).toBe(false);
    expect(hay('Revisar las facturas')).toBe(true);
  });
});

describe('los estados de la lectura', () => {
  it('mientras lee dice «Cargando tu día…» y no ofrece guardar', async () => {
    let soltar!: (v: unknown) => void;
    mockRespuesta = () => new Promise(res => { soltar = res; }) as unknown;
    await act(async () => { raiz = TestRenderer.create(elemento()); });
    expect(hay('Cargando tu día…')).toBe(true);
    expect(hay('Guardar mi cierre')).toBe(false);
    await act(async () => soltar(dia()));
    expect(hay('Guardar mi cierre')).toBe(true);
  });

  it('un fallo de lectura dice por qué y ofrece «Reintentar»', async () => {
    mockRespuesta = () => {
      throw new ApiError(0, 'Sin conexión');
    };
    await montar();
    expect(hay('Sin conexión')).toBe(true);
    mockRespuesta = () => dia();
    await act(async () => { tocableCon('Reintentar').props.onPress(); });
    expect(hay('Guardar mi cierre')).toBe(true);
  });

  it('cerrada no lee ni dibuja nada', async () => {
    await montar({ visible: false });
    expect(mockPedidos).toEqual([]);
    expect(textos()).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------------------
 * Solo se pregunta por lo que ya llegó a su hora (decisión del dueño, 2026-10-30). La hora la decide el servidor, con su reloj
 * y la zona de la persona, y lo dice en `exigeRespuesta`: a las 06:00 la de las 20:30 viene con `false`; a las 21:00, con `true`.
 * Las acciones sin hora se preguntan como siempre. Sin el dato (un servidor anterior) se pregunta por todas.
 * ---------------------------------------------------------------------------------------------- */
describe('solo se pregunta por lo que ya llegó a su hora', () => {
  const A_LAS_SEIS = { ...PENDIENTE, exigeRespuesta: false };
  const A_LAS_NUEVE_DE_LA_NOCHE = { ...PENDIENTE, exigeRespuesta: true };
  const SIN_HORA = { id: 'a-3', titulo: 'Ordenar el escritorio', horaInicio: null, cumplida: false, cumplidaEn: null, cierre: null, exigeRespuesta: true };

  it('a las 06:00 NO pregunta por la de las 20:30: se ve como «todavía no llega», sin preguntas ni chips', async () => {
    mockRespuesta = () => dia({ acciones: [CUMPLIDA, A_LAS_SEIS] });
    await montar();
    expect(hay('Revisar las facturas')).toBe(true);
    expect(hay('Es a las 20:30 · todavía no llega')).toBe(true);
    expect(hay('¿Qué pasó?')).toBe(false);
    expect(hay('¿Qué harás mañana?')).toBe(false);
    expect(hay('Era a las 20:30 · quedó pendiente')).toBe(false);
    expect(hay('Lo que falta por hacer todavía no llega a su hora. No hace falta responder nada.')).toBe(true);
    expect(hay('No te quedó nada pendiente')).toBe(false); // sí le queda algo: solo que todavía no es su hora
  });

  it('a las 06:00 «Guardar mi cierre» está encendido sin responder nada, y el PUT no lleva la de las 20:30', async () => {
    mockRespuesta = (_r, metodo) => (metodo === 'PUT' ? dia({ estado: 'CERRADO', cerradoEn: '2026-10-29T11:02:00Z', acciones: [CUMPLIDA, A_LAS_SEIS] }) : dia({ acciones: [CUMPLIDA, A_LAS_SEIS] }));
    await montar();
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(false);
    await guardar();
    const put = mockPedidos.filter(p => p.metodo === 'PUT');
    expect(put).toHaveLength(1);
    expect(put[0].cuerpo).toEqual({ fecha: HOY, acciones: [] });
    expect(hay('Día cerrado')).toBe(true);
    expect(mockLogro).toHaveBeenCalledTimes(1);
  });

  it('a las 06:00, sin nada por preguntar, ofrece la nota del día (no hay tarjetas con nota propia)', async () => {
    mockRespuesta = () => dia({ acciones: [CUMPLIDA, A_LAS_SEIS] });
    await montar();
    expect(hay('Tu nota del día')).toBe(true);
  });

  it('a las 21:00 SÍ pregunta por la de las 20:30: «Guardar mi cierre» se apaga hasta responder las dos preguntas', async () => {
    mockRespuesta = () => dia({ acciones: [CUMPLIDA, A_LAS_NUEVE_DE_LA_NOCHE] });
    await montar();
    expect(hay('Era a las 20:30 · quedó pendiente')).toBe(true);
    expect(hay('¿Qué pasó?')).toBe(true);
    expect(hay('¿Qué harás mañana?')).toBe(true);
    expect(hay('todavía no llega')).toBe(false);
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(true);
    expect(hay('Elige qué pasó y qué harás mañana con «Revisar las facturas».')).toBe(true);
    await elegir('No me alcanzó el tiempo');
    await elegir('Hacerla a otra hora');
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(false);
    await guardar();
    const cuerpo = mockPedidos.find(p => p.metodo === 'PUT')?.cuerpo as { acciones: Array<{ id: string; motivo: string; manana: string }> };
    expect(cuerpo.acciones).toEqual([{ id: 'a-2', motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA' }]);
  });

  it('mezcla: la ya pasada y la sin hora se preguntan; la de hora futura queda como línea y no viaja en el PUT', async () => {
    const pasada = { id: 'a-4', titulo: 'Llamar a mi mentor', horaInicio: '17:30:00', cumplida: false, cumplidaEn: null, cierre: null, exigeRespuesta: true };
    mockRespuesta = () => dia({ acciones: [CUMPLIDA, pasada, SIN_HORA, A_LAS_SEIS] });
    await montar();
    expect(hay('Era a las 17:30 · quedó pendiente')).toBe(true);
    expect(hay('Quedó pendiente')).toBe(true); // la sin hora, como hoy
    expect(hay('Es a las 20:30 · todavía no llega')).toBe(true);
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(true);
    // Responde las dos preguntadas (cada tarjeta tiene sus chips con el mismo texto: se eligen por tarjeta).
    const chips = (texto: string) => raiz!.root.findAll(n => n.props.accessibilityRole === 'radio' && n.props.accessibilityLabel === texto && typeof n.props.onPress === 'function');
    for (const n of [...chips('No me alcanzó el tiempo'), ...chips('Hacerla a otra hora')]) await act(async () => { n.props.onPress(); });
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(false);
    await guardar();
    const cuerpo = mockPedidos.find(p => p.metodo === 'PUT')?.cuerpo as { acciones: Array<{ id: string }> };
    expect(cuerpo.acciones.map(a => a.id).sort()).toEqual(['a-3', 'a-4']);
  });

  it('con un servidor anterior (sin el dato) se pregunta por todas las pendientes, como siempre', async () => {
    mockRespuesta = () => dia({ acciones: [CUMPLIDA, PENDIENTE] }); // sin `exigeRespuesta`
    await montar();
    expect(hay('¿Qué pasó?')).toBe(true);
    expect(hay('todavía no llega')).toBe(false);
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(true);
  });

  it('un valor raro en `exigeRespuesta` se lee como «no lo dijo»: se pregunta', async () => {
    mockRespuesta = () => dia({ acciones: [CUMPLIDA, { ...PENDIENTE, exigeRespuesta: 'si' }] });
    await montar();
    expect(hay('¿Qué pasó?')).toBe(true);
  });

  it('si llega la hora de la acción con la hoja abierta: el servidor responde 400, se relee SIN perder lo elegido y se avisa; no hay «Reintentar»', async () => {
    const pasada = { id: 'a-4', titulo: 'Llamar a mi mentor', horaInicio: '17:30:00', cumplida: false, cumplidaEn: null, cierre: null, exigeRespuesta: true };
    let yaLlegoLaHora = false;
    mockRespuesta = (_r, metodo) => {
      if (metodo === 'PUT') throw new ApiError(400, 'Cuenta qué pasó con «Revisar las facturas» y qué harás mañana');
      return dia({ acciones: [CUMPLIDA, pasada, yaLlegoLaHora ? A_LAS_NUEVE_DE_LA_NOCHE : A_LAS_SEIS] });
    };
    await montar();
    await elegir('No me alcanzó el tiempo');
    await elegir('Hacerla a otra hora');
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(false);

    yaLlegoLaHora = true; // pasan las 20:30 con la hoja abierta
    await guardar();

    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockAlert.mock.calls[0][0]).toBe('Falta una respuesta');
    expect(String(mockAlert.mock.calls[0][1])).toContain('Revisar las facturas');
    expect((mockAlert.mock.calls[0][2] as Array<{ text: string }>).map(b => b.text)).toEqual(['Entendido']);
    // La acción que ya llegó a su hora aparece con sus preguntas, y lo que ya se había elegido sigue elegido.
    expect(hay('Era a las 20:30 · quedó pendiente')).toBe(true);
    expect(chipsElegidos()).toEqual(expect.arrayContaining(['No me alcanzó el tiempo', 'Hacerla a otra hora']));
    expect(apagado(tocableCon('Guardar mi cierre'))).toBe(true);
    expect(mockLogro).not.toHaveBeenCalled();
  });
});
