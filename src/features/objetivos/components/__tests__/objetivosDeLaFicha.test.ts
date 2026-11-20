import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { ApiError } from '../../../../services/http/apiClient';
import type { ObjetivosDeLaPersona } from '../../../lider-mentores/types/objetivosDeLaPersona.types';
import { altoDelToque, estiloDe, hayTocable, montar, porTestID, tocable, tocar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});

import { leerObjetivosDeLaPersona } from '../../../lider-mentores/api/objetivosDeLaPersonaSchemas';
import { ObjetivosDeLaFicha } from '../ObjetivosDeLaFicha';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Los objetivos en la ficha (spec 056 FR-016, FR-027, T043): una sección que se abre y se cierra, del mismo estilo que los pilares.
 * Solo lectura. Si el servidor no los tiene (404, 403 o cualquier error), la sección no se dibuja: ni hueco ni mensaje.
 */
const objetivos: ObjetivosDeLaPersona = {
  noventaDias: [
    { id: 'o1', titulo: 'Bajar a 75 kg', avance: 40 },
    { id: 'o2', titulo: 'Recuperar la confianza con mi hijo', avance: null },
  ],
  mes: { titulo: 'Caminar 20 días', avance: 55 },
  semana: { titulo: 'Tres caminatas', planificadas: 5, cumplidas: 3 },
};

const cargar = jest.fn<() => Promise<ObjetivosDeLaPersona>>();
const ficha = (c: (() => Promise<ObjetivosDeLaPersona>) | null = cargar) => React.createElement(ObjetivosDeLaFicha, { cargar: c });

beforeEach(() => {
  cargar.mockReset().mockResolvedValue(objetivos);
});

describe('la sección de objetivos', () => {
  it('llega plegada, con su título y cuántos objetivos tiene', async () => { // spec 056 FR-016
    const r = await montar(ficha());
    expect(hayTocable(r, 'Objetivos')).toBe(true);
    expect(tocable(r, 'Objetivos').props.accessibilityState).toMatchObject({ expanded: false });
    expect(todoElTexto(r)).toContain('3 objetivos');
    expect(todoElTexto(r)).not.toContain('Bajar a 75 kg');
  });

  it('al abrirla muestra los del programa, el del mes y el de la semana, cada uno con su avance', async () => { // spec 056 FR-016
    const r = await montar(ficha());
    await tocar(r, 'Objetivos');
    expect(tocable(r, 'Objetivos').props.accessibilityState).toMatchObject({ expanded: true });
    const texto = todoElTexto(r);
    expect(texto).toContain('Bajar a 75 kg');
    expect(texto).toContain('40 %');
    expect(texto).toContain('Caminar 20 días');
    expect(texto).toContain('55 %');
    expect(texto).toContain('Tres caminatas');
    expect(texto).toContain('3 de 5');
  });

  it('el avance se dice con su cifra además de la barra, y un objetivo sin cifra no lleva barra ni porcentaje', async () => { // spec 056 FR-016
    const r = await montar(ficha());
    await tocar(r, 'Objetivos');
    const barras = porTestID(r, /^avance-del-objetivo-/);
    expect(barras.map(b => b.props.testID)).toEqual(['avance-del-objetivo-o1', 'avance-del-objetivo-mes']);
    expect(estiloDe(porTestID(r, 'relleno-del-avance-o1')[0]).width).toBe('40%');
    expect(todoElTexto(r)).toContain('Recuperar la confianza con mi hijo');
    expect(barras.some(b => String(b.props.testID).includes('o2'))).toBe(false);
  });

  it('es solo lectura: nada que editar, y el toque del encabezado mide al menos 48', async () => { // spec 056 FR-027
    const r = await montar(ficha());
    await tocar(r, 'Objetivos');
    const etiquetas = r.root.findAll(n => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string').map(n => n.props.accessibilityLabel);
    expect(Array.from(new Set(etiquetas))).toEqual(['Objetivos']);
    expect(altoDelToque(tocable(r, 'Objetivos'))).toBeGreaterThanOrEqual(48);
  });

  it('con un solo objetivo dice «1 objetivo»', async () => { // spec 056 FR-016
    cargar.mockResolvedValue({ noventaDias: [{ id: 'o1', titulo: 'Bajar a 75 kg', avance: 10 }], mes: null, semana: null });
    expect(todoElTexto(await montar(ficha()))).toContain('1 objetivo');
  });

  it('solo la semana: el resumen es «N de M» y abre sin los otros grupos', async () => { // spec 056 FR-016
    cargar.mockResolvedValue({ noventaDias: [], mes: null, semana: { titulo: 'Tres caminatas', planificadas: 5, cumplidas: 3 } });
    const r = await montar(ficha());
    expect(todoElTexto(r)).toContain('3 de 5');
    await tocar(r, 'Objetivos');
    expect(todoElTexto(r)).not.toContain('Del programa');
    expect(todoElTexto(r)).not.toContain('Del mes');
  });
});

/** La respuesta real de `GET /mentor/groups/{g}/learners/{u}/objetivos` (spec 057): mes y semana traen un objetivo por eje en `objetivos`. */
const RESPUESTA_REAL = {
  duracionDias: 90,
  fase: { numero: 4, primerDia: 65, ultimoDia: 90 },
  noventaDias: [
    { id: 'CUERPO', eje: 'CUERPO', titulo: 'Bajar a 75 kg', avance: 40 },
    { id: 'TRABAJO', eje: 'TRABAJO', titulo: 'Facturar 5000', avance: 20 },
    { id: 'RELACIONES', eje: 'RELACIONES', titulo: 'Cenar en familia', avance: null },
  ],
  mes: {
    titulo: 'Mes 3',
    numeroMes: 3,
    diaDeCierre: 90,
    objetivos: [
      { eje: 'CUERPO', titulo: null, cifra: 78, unidad: 'kg', unidadAdelante: false, metaAlcanzada: false, motivoSinCifra: null },
      { eje: 'TRABAJO', titulo: 'Cerrar tres ventas', cifra: null, unidad: null, unidadAdelante: false, metaAlcanzada: false, motivoSinCifra: null },
      { eje: 'RELACIONES', titulo: null, cifra: null, unidad: null, unidadAdelante: false, metaAlcanzada: false, motivoSinCifra: 'SIN_TIPO' },
    ],
  },
  semana: {
    titulo: 'Semana 12',
    numeroSemana: 12,
    planificadas: 5,
    cumplidas: 2,
    objetivos: [
      { eje: 'CUERPO', titulo: 'Caminar 4 días' },
      { eje: 'TRABAJO', titulo: 'Llamar a diez clientes' },
    ],
  },
};

describe('la sección entera con la respuesta real del mentor (spec 057)', () => {
  it('muestra la fase, los 3 ejes del programa, el objetivo de cada eje del mes y de la semana, sin cortarse en «Mes 3»', async () => { // spec 057 FR-004
    cargar.mockResolvedValue(leerObjetivosDeLaPersona(RESPUESTA_REAL, 'prueba'));
    const r = await montar(ficha());
    await tocar(r, 'Objetivos');
    const texto = todoElTexto(r);
    expect(texto).toContain('Fase 4 · días 65 a 90');
    expect(texto).toContain('Objetivo de 90 días');
    for (const t of ['Bajar a 75 kg', 'Facturar 5000', 'Cenar en familia']) expect(texto).toContain(t);
    expect(texto).toContain('Del mes · Mes 3');
    for (const t of ['Llegar a 78 kg', 'Cerrar tres ventas', 'Este mes no lleva cifra.']) expect(texto).toContain(t);
    // El motivo llega como código del servidor: nunca se muestra crudo (visto en el E2E del 20/11).
    for (const codigo of ['SIN_TIPO', 'SIN_DATOS']) expect(texto).not.toContain(codigo);
    expect(texto).toContain('De la semana · Semana 12');
    for (const t of ['Caminar 4 días', 'Llamar a diez clientes', 'Acciones cumplidas', '2 de 5']) expect(texto).toContain(t);
    for (const eje of ['Cuerpo', 'Negocio y dinero', 'Relaciones']) expect(texto).toContain(eje);
  });

  it('una respuesta sin los ejes del mes y la semana (la del líder) se dibuja como siempre', async () => { // spec 057 FR-004
    cargar.mockResolvedValue(leerObjetivosDeLaPersona({ noventaDias: [], mes: { titulo: 'Caminar 20 días', avance: 55 }, semana: { titulo: 'Tres caminatas', planificadas: 5, cumplidas: 3 } }, 'prueba'));
    const r = await montar(ficha());
    await tocar(r, 'Objetivos');
    const texto = todoElTexto(r);
    expect(texto).toContain('Caminar 20 días');
    expect(texto).toContain('Tres caminatas');
    expect(texto).toContain('3 de 5');
  });

  it('el mes y la semana con ejes se dibujan aunque no traigan título', async () => { // spec 057 FR-004
    const o = leerObjetivosDeLaPersona({ mes: { objetivos: [{ eje: 'CUERPO', titulo: 'Caminar' }] }, semana: { planificadas: 2, cumplidas: 1, objetivos: [{ eje: 'TRABAJO', titulo: 'Llamar' }] } }, 'prueba');
    expect(o.mes?.objetivos).toHaveLength(1);
    expect(o.semana?.objetivos).toHaveLength(1);
  });
});

describe('la ficha del mentor (spec 057)', () => {
  it('el rótulo dice el plazo de la formación y arriba va la fase', async () => { // spec 057 FR-004
    cargar.mockResolvedValue({ ...objetivos, duracionDias: 60, fase: { numero: 2, primerDia: 8, ultimoDia: 34 } });
    const r = await montar(ficha());
    await tocar(r, 'Objetivos');
    const texto = todoElTexto(r);
    expect(texto).toContain('Objetivo de 60 días');
    expect(texto).toContain('Fase 2 · días 8 a 34');
    expect(texto).not.toContain('Del programa');
  });

  it('sin plazo ni fase (el líder o un servidor viejo) conserva «Del programa» y no inventa la fase', async () => { // spec 057 FR-004
    const r = await montar(ficha());
    await tocar(r, 'Objetivos');
    expect(todoElTexto(r)).toContain('Del programa');
    expect(porTestID(r, 'fase-del-programa')).toHaveLength(0);
  });

  it('un 404 con SIN_PROGRAMA_ACTIVO dice «Todavía no tiene objetivos» en una línea, sin hueco', async () => { // spec 057 FR-004
    cargar.mockRejectedValue(new ApiError(404, 'sin programa', { codigo: 'SIN_PROGRAMA_ACTIVO' }));
    const r = await montar(ficha());
    expect(todoElTexto(r)).toContain('Todavía no tiene objetivos');
    expect(hayTocable(r, 'Objetivos')).toBe(false);
  });

  it('Día 0: un 200 vacío de la ruta del mentor (con plazo y fase) también dice «Todavía no tiene objetivos»; el del líder, sin esos campos, no dibuja nada', async () => { // spec 057 FR-004
    cargar.mockResolvedValue({ duracionDias: 60, fase: null, noventaDias: [], mes: null, semana: null });
    expect(todoElTexto(await montar(ficha()))).toContain('Todavía no tiene objetivos');
    cargar.mockResolvedValue({ noventaDias: [], mes: null, semana: null });
    expect((await montar(ficha())).toJSON()).toBeNull();
  });

  it('un 403 (ya no lo acompaña) o un 404 sin código no dibujan nada', async () => { // spec 057 FR-004
    cargar.mockRejectedValue(new ApiError(403, 'no'));
    expect((await montar(ficha())).toJSON()).toBeNull();
    cargar.mockRejectedValue(new ApiError(404, 'no', { codigo: 'OTRO' }));
    expect((await montar(ficha())).toJSON()).toBeNull();
  });
});

describe('cuando no hay nada que mostrar, no se dibuja nada', () => {
  it('sin función de carga no hay sección ni pedido', async () => { // spec 056 FR-027
    const r = await montar(ficha(null));
    expect(r.toJSON()).toBeNull();
    expect(cargar).not.toHaveBeenCalled();
  });

  it.each([404, 403, 500, 0])('un error %s del servidor deja la ficha como estaba', async estado => { // spec 056 FR-016
    cargar.mockRejectedValue(new ApiError(estado, 'no'));
    expect((await montar(ficha())).toJSON()).toBeNull();
  });

  it('mientras llega la primera lectura tampoco dibuja nada (un marco que se retira después sería un parpadeo)', async () => { // spec 056 FR-016
    cargar.mockImplementation(() => new Promise(() => undefined));
    expect((await montar(ficha())).toJSON()).toBeNull();
  });

  it('una persona sin objetivos no deja un encabezado vacío', async () => { // spec 056 FR-016
    cargar.mockResolvedValue({ noventaDias: [], mes: null, semana: null });
    expect((await montar(ficha())).toJSON()).toBeNull();
  });

  it('pide los objetivos una sola vez por persona', async () => { // spec 056 FR-016
    await montar(ficha());
    expect(cargar).toHaveBeenCalledTimes(1);
  });
});
