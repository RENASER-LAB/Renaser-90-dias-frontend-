import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { ApiError } from '../../../../services/http/apiClient';
import { hayTocable, montar, porTestID, tocar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';
import type { ReporteApi } from '../../api/liderMentoresSchemas';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));

const mockObtener = jest.fn<(mes?: string | null) => Promise<ReporteApi>>();
jest.mock('../../api/liderMentoresApi', () => ({ obtenerReporte: (m?: string | null) => mockObtener(m) }));
const mockExportar = jest.fn<() => Promise<void>>();
let mockExportando = false;
const mockUsarExportar = jest.fn<(mes: string) => void>();
jest.mock('../../hooks/useDescargarSemana', () => ({
  useExportarReporte: (mes: string) => {
    mockUsarExportar(mes);
    return { exportando: mockExportando, exportar: mockExportar };
  },
}));

import { ReporteScreen } from '../ReporteScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const entrada = (id: string, nombre: string, pct: number | null, extra: { answered?: number; open?: number; color?: string } = {}) => ({
  mentor: {
    userId: id,
    fullName: nombre,
    avatarUrl: null,
    groups: { source: 'OK', items: [] },
    traineeCount: 5,
    semaforo: { source: 'OK', summary: { verde: 0, amarillo: 0, rojo: 1, sinDatos: 0, total: 1, promedio: 0, color: extra.color ?? 'ROJO' } },
    attention: { source: 'OK', open: extra.open ?? 0, oldestOpenDays: null, answered: extra.answered ?? 0, medianResponseHours: null },
    evaluation: { source: 'OK', month: '2026-11', percentage: pct, delivered: 1, expected: 2, traineesEvaluated: 1, state: pct === null ? 'SIN_MUESTRA' : 'CALCULADA' },
  },
  observations: { source: 'OK', recognitions: 0, suggestions: 0, alerts: 0, total: 0 },
});
const reporte = (extra: Record<string, unknown> = {}): ReporteApi =>
  ({
    month: '2026-11',
    timezone: 'America/Lima',
    cutoffAt: '2026-11-18T14:42:00Z',
    closed: false,
    answeredWithoutAttribution: null,
    ranked: [entrada('m-1', 'Ricardo Palomino', 62, { answered: 1, color: 'VERDE' }), entrada('m-2', 'E2E Mentor', 0, { open: 1, color: 'ROJO' }), entrada('m-4', 'Cuarto', 10)],
    withoutSample: [entrada('m-3', 'Mentor Dos E2E', null)],
    ...extra,
  }) as unknown as ReporteApi;

const alVolver = jest.fn();
const pantalla = () => React.createElement(ReporteScreen, { onVolver: alVolver } as never);

beforeEach(() => {
  mockObtener.mockReset().mockResolvedValue(reporte());
  mockExportar.mockReset().mockResolvedValue();
  mockUsarExportar.mockReset();
  mockExportando = false;
});

describe('el reporte del mes del líder', () => {
  it('abre con el promedio de los mentores en un anillo con su número y cuántos quedan debajo del 60 %', async () => { // spec 056 FR-031
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('Promedio de tus mentores');
    expect(texto).toContain('24 %');
    expect(texto).toContain('2 de 3 debajo de 60 %');
    const anillo = porTestID(r, 'anillo-del-promedio')[0];
    expect(anillo.props.accessibilityRole).toBe('progressbar');
    expect(anillo.props.accessibilityValue).toMatchObject({ min: 0, max: 100 });
  });

  it('el ranking va en el orden del servidor, con su puesto, el nombre y una línea corta con sus consultas', async () => { // spec 056 FR-031
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    const nombres = texto.match(/Ricardo Palomino|E2E Mentor|Cuarto/g);
    expect(nombres).toEqual(['Ricardo Palomino', 'E2E Mentor', 'Cuarto']);
    expect(texto).toContain('1°');
    expect(texto).toContain('2°');
    expect(texto).toContain('62 % · 1 consulta respondida');
    expect(texto).toContain('0 % · ninguna consulta respondida · 1 sin responder');
  });

  it('cada mentor lleva la foto con el borde de su color', async () => { // spec 056 FR-031
    const r = await montar(pantalla());
    const anillos = porTestID(r, 'anillo-del-avatar');
    expect(anillos.length).toBe(4);
    const bordes = anillos.map(a => (a.props.style as { borderColor: string }).borderColor);
    expect(new Set(bordes).size).toBeGreaterThanOrEqual(2);
  });

  it('quien no tiene evaluación este mes va aparte, nombrado, y no entra en el orden ni en el promedio', async () => { // spec 056 FR-031
    const r = await montar(pantalla());
    const texto = todoElTexto(r);
    expect(texto).toContain('Sin evaluación este mes');
    expect(texto).toContain('Mentor Dos E2E');
    /* El ranking tiene tres puestos; quien no tiene evaluación no recibe el cuarto. */
    expect(texto).not.toContain('4°');
  });

  it('sin ninguna evaluación no dibuja un anillo en cero', async () => { // spec 056 FR-031
    mockObtener.mockResolvedValue(reporte({ ranked: [], withoutSample: [entrada('m-3', 'Mentor Dos E2E', null)] }));
    const r = await montar(pantalla());
    expect(porTestID(r, 'anillo-del-promedio')).toHaveLength(0);
    expect(todoElTexto(r)).toContain('Mentor Dos E2E');
  });

  it('sin mentores lo dice en una línea', async () => { // spec 056 FR-031
    mockObtener.mockResolvedValue(reporte({ ranked: [], withoutSample: [] }));
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Todavía no hay mentores activos.');
    expect(hayTocable(r, 'Exportar el reporte')).toBe(false);
  });

  it('se puede ir al mes anterior', async () => { // spec 056 FR-031
    const r = await montar(pantalla());
    await tocar(r, 'Mes anterior');
    expect(mockObtener).toHaveBeenLastCalledWith('2026-10');
  });
});

describe('«Exportar el reporte»', () => {
  it('es un botón al pie que exporta el documento del mes que se está viendo', async () => { // spec 056 FR-032
    const r = await montar(pantalla());
    expect(mockUsarExportar).toHaveBeenCalledWith('2026-11');
    await tocar(r, 'Exportar el reporte');
    expect(mockExportar).toHaveBeenCalledTimes(1);
  });

  it('mientras el documento se genera queda apagado: un toque, un pedido', async () => { // spec 056 FR-032
    mockExportando = true;
    const r = await montar(pantalla());
    const boton = r.root.findAll(n => n.props.accessibilityLabel === 'Exportar el reporte' && typeof n.props.onPress === 'function')[0];
    expect(boton.props.disabled).toBe(true);
  });
});

describe('el reporte cuando no carga', () => {
  it('dice por qué, con el motivo del servidor si lo dio', async () => { // spec 056 FR-042
    mockObtener.mockRejectedValue(new ApiError(403, 'Tu cuenta no ve el reporte.', { codigo: 'FUERA_DE_SU_ALCANCE' }));
    const r = await montar(pantalla());
    expect(todoElTexto(r)).toContain('Tu cuenta no ve el reporte.');
  });
});
