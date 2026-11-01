import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La sección «Pagos» de la ficha de una persona (spec 032): solo Administración y Alquimista (el servidor responde 403 a los demás y no se dibuja), marcar cada
 * cuota «Pagado» o «Pendiente», ajustar las pendientes y asignar un cronograma a quien ya estaba dentro. Una pagada no se edita ni se quita; con pagadas no se
 * reemplaza el cronograma entero. Nada se recalcula solo.
 */

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
const mockTacto = { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() };
// Perezoso: la fábrica corre al primer require (antes de que exista `mockTacto`), así que cada método lee el doble recién al llamarse.
jest.mock('../../../utils/tacto', () => ({
  tacto: { seleccion: () => mockTacto.seleccion(), error: () => mockTacto.error(), logro: () => mockTacto.logro() },
}));
const mockFuncion = { prendida: true, aviso: null as string | null, disponible: true };
jest.mock('../../plataforma/estado/useFuncionalidad', () => ({ useFuncionalidad: () => mockFuncion }));
const mockConfirmar = jest.fn<(titulo: string, mensaje?: string, opciones?: unknown) => Promise<boolean>>();
const mockAvisar = jest.fn<(titulo: string, mensaje?: string) => void>();
jest.mock('../../admin/utils/dialogo', () => ({
  confirmar: (t: string, m?: string, o?: unknown) => mockConfirmar(t, m, o),
  avisar: (t: string, m?: string) => mockAvisar(t, m),
}));
const mockApi = {
  leer: jest.fn<(id: string) => Promise<unknown>>(),
  asignar: jest.fn<(id: string, pago: unknown) => Promise<unknown>>(),
  marcar: jest.fn<(id: string, cuota: string, pagada: boolean) => Promise<unknown>>(),
  quitar: jest.fn<(id: string, cuota: string) => Promise<unknown>>(),
  agregar: jest.fn<(id: string, cuota: unknown) => Promise<unknown>>(),
  editar: jest.fn<(id: string, cuota: string, datos: unknown) => Promise<unknown>>(),
};
// El servidor responde en crudo y `pagosApi` lo lee con el esquema: el doble hace lo mismo para que la sección reciba lo que recibe en la app.
jest.mock('../api/pagosApi', () => {
  const { leerPagosEnLaFicha } = jest.requireActual<typeof import('../api/pagosSchemas')>('../api/pagosSchemas');
  const leida = async (cruda: Promise<unknown>) => leerPagosEnLaFicha(await cruda);
  return {
    leerPagosDeLaPersona: (id: string) => leida(mockApi.leer(id)),
    asignarPagos: (id: string, pago: unknown) => leida(mockApi.asignar(id, pago)),
    marcarCuota: (id: string, cuota: string, pagada: boolean) => leida(mockApi.marcar(id, cuota, pagada)),
    quitarCuota: (id: string, cuota: string) => leida(mockApi.quitar(id, cuota)),
    agregarCuota: (id: string, cuota: unknown) => leida(mockApi.agregar(id, cuota)),
    editarCuota: (id: string, cuota: string, datos: unknown) => leida(mockApi.editar(id, cuota, datos)),
  };
});
type PropsDeHoja = { visible: boolean; alCerrar: () => void; alGuardar: (x: never) => Promise<void>; [clave: string]: unknown };
const mockHojas: { cronograma: PropsDeHoja | null; cuota: PropsDeHoja | null } = { cronograma: null, cuota: null };
jest.mock('../components/HojaDelCronograma', () => ({ HojaDelCronograma: (p: PropsDeHoja) => { mockHojas.cronograma = p; return null; } }));
jest.mock('../components/HojaDeUnaCuota', () => ({ HojaDeUnaCuota: (p: PropsDeHoja) => { mockHojas.cuota = p; return null; } }));

import { ApiError } from '../../../services/http/apiClient';
import { PagosDeLaPersona } from '../components/PagosDeLaPersona';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cuota = (id: string, venceEl: string, pagada: boolean, extra: Record<string, unknown> = {}) => ({
  id, dueDate: venceEl, amount: 1000, status: pagada ? 'PAID' : 'PENDING', statusChangedAt: null, statusChangedByName: null, ...extra,
});
const ficha = (payments: unknown) => ({ personName: 'Ana Quispe', payments });
const conCronograma = (cuotas: unknown[], estado = 'NOT_YET') => ({ mode: 'SCHEDULE', currency: 'USD', installments: cuotas, confirmation: { state: estado, confirmedAt: null, name: null } });

const alCambiar = jest.fn();
let raiz: ReactTestRenderer | null = null;
async function montar(): Promise<ReactTestRenderer> {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(PagosDeLaPersona, { personaId: 'p1', nombre: 'Ana', alCambiar }));
  });
  return raiz!;
}
const textos = (r: ReactTestRenderer): string =>
  r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
    .join(' | ');
const botones = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function');

beforeEach(() => {
  Object.values(mockApi).forEach(f => f.mockReset());
  Object.values(mockTacto).forEach(f => f.mockClear());
  mockConfirmar.mockReset().mockResolvedValue(true);
  mockAvisar.mockReset();
  alCambiar.mockReset();
  mockFuncion.disponible = true;
  mockHojas.cronograma = null;
  mockHojas.cuota = null;
});

describe('quién la ve', () => {
  it('con un 403 (otro rol), un 404 (backend anterior) o un 503 (función apagada) no se dibuja nada', async () => {
    for (const status of [403, 404, 503]) {
      mockApi.leer.mockRejectedValue(Object.assign(new Error('x'), { status }));
      const r = await montar();
      expect(textos(r)).toBe('');
      act(() => r.unmount());
    }
  });

  it('mientras llega la primera lectura no se dibuja (sin parpadeo); un fallo de red dice «Reintentar»', async () => {
    mockApi.leer.mockReturnValue(new Promise(() => undefined));
    let r = await montar();
    expect(textos(r)).toBe('');
    act(() => r.unmount());

    mockApi.leer.mockRejectedValue(new Error('sin red'));
    r = await montar();
    expect(textos(r)).toContain('No se pudieron cargar los pagos. Revisa tu conexión.');
    mockApi.leer.mockResolvedValue(ficha(null));
    await act(async () => botones(r, 'Reintentar')[0].props.onPress());
    expect(textos(r)).toContain('Todavía no tiene su pago anotado.');
  });

  it('si la función no le corresponde a esta sesión, no se dibuja', async () => {
    mockFuncion.disponible = false;
    mockApi.leer.mockResolvedValue(ficha(null));
    expect(textos(await montar())).toBe('');
  });
});

describe('sin nada anotado (quien ya estaba dentro)', () => {
  it('ofrece asignar un cronograma o marcarlo «sin cronograma (pagó completo)», que pregunta antes', async () => {
    mockApi.leer.mockResolvedValue(ficha(null));
    mockApi.asignar.mockResolvedValue(ficha({ mode: 'NONE', currency: null, installments: [], confirmation: null }));
    const r = await montar();
    expect(textos(r)).toContain('Todavía no tiene su pago anotado.');
    expect(botones(r, 'Asignar un cronograma')).toHaveLength(1);

    await act(async () => botones(r, 'Marcar sin cronograma (pagó completo)')[0].props.onPress());

    expect(mockConfirmar).toHaveBeenCalledTimes(1);
    expect(mockApi.asignar).toHaveBeenCalledWith('p1', { mode: 'NONE' });
    expect(textos(r)).toContain('Sin cronograma: pagó completo.');
    expect(alCambiar).toHaveBeenCalledWith('Listo: Ana quedó sin cronograma.');
  });

  it('si no confirma el diálogo, no se manda nada', async () => {
    mockApi.leer.mockResolvedValue(ficha(null));
    mockConfirmar.mockResolvedValue(false);
    const r = await montar();
    await act(async () => botones(r, 'Marcar sin cronograma (pagó completo)')[0].props.onPress());
    expect(mockApi.asignar).not.toHaveBeenCalled();
  });

  it('«Asignar un cronograma» abre la hoja del editor, que guarda con PUT y cierra', async () => {
    mockApi.leer.mockResolvedValue(ficha(null));
    mockApi.asignar.mockResolvedValue(ficha(conCronograma([cuota('a', '2026-11-15', false)])));
    const r = await montar();
    act(() => botones(r, 'Asignar un cronograma')[0].props.onPress());
    expect(mockHojas.cronograma?.visible).toBe(true);

    const pedido = { mode: 'SCHEDULE', currency: 'USD', installments: [{ dueDate: '2026-11-15', amount: 1000 }] };
    await act(async () => mockHojas.cronograma?.alGuardar(pedido as never));

    expect(mockApi.asignar).toHaveBeenCalledWith('p1', pedido);
    expect(mockHojas.cronograma?.visible).toBe(false);
    expect(textos(r)).toContain('Con cronograma en dólares (US$).');
  });
});

describe('con cronograma', () => {
  const cargada = (...cuotas: unknown[]) => mockApi.leer.mockResolvedValue(ficha(conCronograma(cuotas)));

  it('muestra cada cuota con su fecha, su monto y su estado, y quién la marcó y cuándo', async () => {
    cargada(cuota('a', '2026-10-15', true, { statusChangedAt: new Date(2026, 9, 16, 12, 0).toISOString(), statusChangedByName: 'Ana Admin' }), cuota('b', '2026-11-15', false));
    const r = await montar();
    const texto = textos(r);
    expect(texto).toContain('Todavía no lo confirmó.');
    expect(texto).toContain('15 oct');
    expect(texto).toContain('Pagado');
    expect(texto).toContain('Pendiente');
    expect(texto).toContain('Marcó pagada: Ana Admin el 16 de octubre.');
  });

  it('marcar «Pagado» es de un toque, sin confirmación, y la sección queda al día con lo que devuelve el servidor', async () => {
    cargada(cuota('a', '2026-11-15', false));
    mockApi.marcar.mockResolvedValue(ficha(conCronograma([cuota('a', '2026-11-15', true, { statusChangedByName: 'Ana Admin' })])));
    const r = await montar();

    await act(async () => botones(r, 'Marcar pagado')[0].props.onPress());

    expect(mockApi.marcar).toHaveBeenCalledWith('p1', 'a', true);
    expect(mockConfirmar).not.toHaveBeenCalled();
    expect(textos(r)).toContain('Volver a pendiente');
    expect(alCambiar).toHaveBeenCalledWith('Listo: cuota marcada como pagada.');
    expect(mockTacto.logro).toHaveBeenCalledTimes(1);
  });

  it('devolver a «Pendiente» marca de vuelta', async () => {
    cargada(cuota('a', '2026-11-15', true));
    mockApi.marcar.mockResolvedValue(ficha(conCronograma([cuota('a', '2026-11-15', false)])));
    const r = await montar();
    await act(async () => botones(r, 'Volver a pendiente')[0].props.onPress());
    expect(mockApi.marcar).toHaveBeenCalledWith('p1', 'a', false);
  });

  it('un doble toque manda un solo pedido', async () => {
    cargada(cuota('a', '2026-11-15', false));
    let terminar!: (v: unknown) => void;
    mockApi.marcar.mockReturnValue(new Promise(resolver => { terminar = resolver; }));
    const r = await montar();

    await act(async () => {
      botones(r, 'Marcar pagado')[0].props.onPress();
      botones(r, 'Marcar pagado')[0].props.onPress();
    });
    expect(mockApi.marcar).toHaveBeenCalledTimes(1);
    await act(async () => terminar(ficha(conCronograma([cuota('a', '2026-11-15', true)]))));
  });

  it('un rechazo del servidor se dice con sus palabras y no cambia lo que se ve', async () => {
    cargada(cuota('a', '2026-11-15', false));
    mockApi.marcar.mockRejectedValue(new ApiError(404, 'Esa cuota no es de este cronograma'));
    const r = await montar();
    await act(async () => botones(r, 'Marcar pagado')[0].props.onPress());
    expect(mockAvisar).toHaveBeenCalledWith('No se pudo', expect.stringContaining('no es de este cronograma'));
    expect(mockTacto.error).toHaveBeenCalledTimes(1);
    expect(textos(r)).toContain('Pendiente');
  });

  it('una pagada no se edita ni se quita; una pendiente sí', async () => {
    cargada(cuota('a', '2026-10-15', true), cuota('b', '2026-11-15', false));
    const r = await montar();
    expect(botones(r, 'Editar la cuota del 15 oct')).toHaveLength(0);
    expect(botones(r, 'Quitar la cuota del 15 oct')).toHaveLength(0);
    expect(botones(r, 'Editar la cuota del 15 nov').length).toBeGreaterThan(0);
    expect(botones(r, 'Quitar la cuota del 15 nov').length).toBeGreaterThan(0);
  });

  it('quitar una cuota pregunta antes y manda DELETE; si no confirma, no hace nada', async () => {
    cargada(cuota('a', '2026-11-15', false), cuota('b', '2026-12-15', false));
    mockApi.quitar.mockResolvedValue(ficha(conCronograma([cuota('b', '2026-12-15', false)])));
    const r = await montar();

    mockConfirmar.mockResolvedValueOnce(false);
    await act(async () => botones(r, 'Quitar la cuota del 15 nov')[0].props.onPress());
    expect(mockApi.quitar).not.toHaveBeenCalled();

    await act(async () => botones(r, 'Quitar la cuota del 15 nov')[0].props.onPress());
    expect(mockApi.quitar).toHaveBeenCalledWith('p1', 'a');
    expect(alCambiar).toHaveBeenCalledWith('Listo: quitaste la cuota.');
  });

  it('agregar y editar una cuota abren su hoja y guardan por su ruta', async () => {
    cargada(cuota('a', '2026-11-15', false));
    mockApi.agregar.mockResolvedValue(ficha(conCronograma([cuota('a', '2026-11-15', false), cuota('n', '2026-12-15', false)])));
    mockApi.editar.mockResolvedValue(ficha(conCronograma([cuota('a', '2026-11-20', false)])));
    const r = await montar();

    act(() => botones(r, 'Agregar una cuota')[0].props.onPress());
    expect(mockHojas.cuota?.visible).toBe(true);
    await act(async () => mockHojas.cuota?.alGuardar({ dueDate: '2026-12-15', amount: 1000 } as never));
    expect(mockApi.agregar).toHaveBeenCalledWith('p1', { dueDate: '2026-12-15', amount: 1000 });

    act(() => botones(r, 'Editar la cuota del 15 nov')[0].props.onPress());
    await act(async () => mockHojas.cuota?.alGuardar({ dueDate: '2026-11-20', amount: 1000 } as never));
    expect(mockApi.editar).toHaveBeenCalledWith('p1', 'a', { dueDate: '2026-11-20', amount: 1000 });
  });

  it('sin cuotas pagadas se ofrece reemplazar el cronograma o pasar a «sin cronograma»; con pagadas, no (lo dice)', async () => {
    cargada(cuota('a', '2026-11-15', false));
    let r = await montar();
    expect(botones(r, 'Reemplazar el cronograma')).toHaveLength(1);
    expect(botones(r, 'Marcar sin cronograma')).toHaveLength(1);
    act(() => r.unmount());

    cargada(cuota('a', '2026-11-15', true), cuota('b', '2026-12-15', false));
    r = await montar();
    expect(botones(r, 'Reemplazar el cronograma')).toHaveLength(0);
    expect(botones(r, 'Marcar sin cronograma')).toHaveLength(0);
    expect(textos(r)).toContain('Con cuotas pagadas no se reemplaza el cronograma entero');
  });

  it('dice si la persona confirmó, y si el cronograma cambió después', async () => {
    mockApi.leer.mockResolvedValue(ficha({ ...conCronograma([cuota('a', '2026-11-15', false)], 'CONFIRMED'), confirmation: { state: 'CONFIRMED', confirmedAt: new Date(2026, 10, 3, 12, 0).toISOString(), name: 'Ana' } }));
    let r = await montar();
    expect(textos(r)).toContain('Confirmó su cronograma el 3 de noviembre.');
    act(() => r.unmount());

    mockApi.leer.mockResolvedValue(ficha(conCronograma([cuota('a', '2026-11-15', false)], 'OUTDATED')));
    r = await montar();
    expect(textos(r)).toContain('Confirmó antes, pero el cronograma cambió');
  });
});
