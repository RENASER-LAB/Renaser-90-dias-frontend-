import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Agendar mis acciones» y lo que el día YA tiene en el servidor (spec 048 fase 3, #185). Agendar un día que todavía no llegó reemplaza el
 * plan entero de ese día en el servidor (E-208): la hoja arrancaba en «Cuerpo · 0/3» aunque el día tuviera acciones y, al agendar otra, las
 * borraba sin avisar. Ahora las del día se ven, cuentan para el tope de tres por eje, se pueden quitar (y deshacer) y al guardar viaja el
 * plan entero: lo que ya tenía y siguió, lo que espera señal y lo nuevo.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
type PropsDeHoja = { visible?: boolean; children?: React.ReactNode; pie?: React.ReactNode };
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return { HojaDesdeAbajo: (p: PropsDeHoja) => (p.visible ? R.createElement(View, null, p.children, p.pie) : null) };
});
jest.mock('../../../habits/components/RuedaHoraPicker', () => ({ RuedaHoraPicker: () => null }));
// La fila de días se reemplaza por una que deja tocar un día desde la prueba.
let mockAlternarDia: ((dia: string) => void) | null = null;
jest.mock('../../../habits/components/FilaDeDiasDelPlan', () => ({
  FilaDeDiasDelPlan: (p: { onAlternarDia: (dia: string) => void }) => {
    mockAlternarDia = p.onAlternarDia;
    return null;
  },
}));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));
// La semana que se dibuja es la del 9 al 15 de noviembre de 2026, sin depender del reloj.
jest.mock('../../../habits/utils/semanaDelPlan', () => ({
  ...jest.requireActual<typeof import('../../../habits/utils/semanaDelPlan')>('../../../habits/utils/semanaDelPlan'),
  fechasIsoDeLaSemana: () => ({ LUN: '2026-11-09', MAR: '2026-11-10', 'MIÉ': '2026-11-11', JUE: '2026-11-12', VIE: '2026-11-13', 'SÁB': '2026-11-14', DOM: '2026-11-15' }),
}));

import { AgendarAccionesModal } from '../AgendarAccionesModal';
import type { EjeObjetivo, RocaDiariaApi } from '../../types/objetivos.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const semanalCon = (...ejes: EjeObjetivo[]) => ({ deEje: (eje: EjeObjetivo) => (ejes.includes(eje) ? { id: `s-${eje}`, titulo: `Objetivo de ${eje}` } : null) });
let n = 0;
/** Una acción que el servidor ya tiene (con su `id` real, sin `pendienteDeEnvio`). */
const delServidor = (extra: Partial<RocaDiariaApi> = {}): RocaDiariaApi => {
  n += 1;
  return {
    id: `0b1c2d3e-0000-4000-8000-00000000000${n}`, fecha: '2026-11-11', posicion: 1, titulo: `Acción del servidor ${n}`, descripcion: null, color: 'VERDE',
    puntajeImpacto: 5, esDelegable: false, eje: 'CUERPO', rocaSemanalId: 's-CUERPO', horaInicio: null, horaFin: null, completada: false, completadaEn: null,
    puntosOtorgados: 0, bloqueada: false, acciones: [], ...extra,
  };
};

const onGuardar = jest.fn();
const onVolverALeer = jest.fn();
let raiz: ReactTestRenderer | null = null;
function montar(
  props: {
    fecha?: string;
    delServidor?: RocaDiariaApi[];
    enEspera?: RocaDiariaApi[];
    sugerida?: { eje: EjeObjetivo; texto: string } | null;
    sinLeerLaSemana?: boolean;
  } = {},
) {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(AgendarAccionesModal, {
        visible: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        semanal: semanalCon('CUERPO', 'TRABAJO') as any,
        fecha: props.fecha ?? '2026-11-11',
        sugerida: props.sugerida ?? null,
        guardando: false,
        onGuardar,
        onCerrar: jest.fn(),
        enEspera: props.enEspera,
        delServidor: props.delServidor,
        sinLeerLaSemana: props.sinLeerLaSemana,
        onVolverALeer,
      }),
    );
  });
}
const textos = (): string[] =>
  raiz!.root
    .findAll(x => (x.type as unknown) === 'Text')
    .map(x => React.Children.toArray(x.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''));
const filaCon = (texto: string): ReactTestInstance | undefined =>
  raiz!.root
    .findAll(x => typeof x.props.onPress === 'function' && x.findAll(h => (h.type as unknown) === 'Text' && h.props.children === texto).length > 0)
    .sort((a, b) => a.findAll(() => true).length - b.findAll(() => true).length)[0];
const porEtiqueta = (etiqueta: string): ReactTestInstance | undefined =>
  raiz!.root.findAll(x => x.props.accessibilityLabel === etiqueta && typeof x.props.onPress === 'function')[0];
const botonAgendar = () =>
  raiz!.root.findAll(x => typeof x.props.label === 'string' && /^(Agendar|Guardar cambios)/.test(x.props.label) && typeof x.props.onPress === 'function')[0];
type Item = { eje: string; posicion: number; titulo: string; horaInicio?: string; acciones?: string[] };
const loQueSeGuardo = () => onGuardar.mock.calls[0] as [Item[], string];

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockAlternarDia = null;
  onGuardar.mockReset();
  onVolverALeer.mockReset();
});

describe('«Agendar mis acciones» con lo que el día ya tiene en el servidor (#185)', () => {
  it('las acciones del día cuentan para el tope («Cuerpo · 2/3») y se ven con su hora y «Ya agendada»', () => {
    montar({ delServidor: [delServidor({ titulo: 'Caminar 30 minutos', horaInicio: '07:00:00' }), delServidor({ titulo: 'Estirar', posicion: 2 })] });
    expect(textos()).toContain('Cuerpo  ·  2/3');
    expect(textos()).toContain('Caminar 30 minutos');
    expect(textos()).toContain('A las 07:00 · Ya agendada');
    expect(textos()).toContain('Estirar');
    expect(textos()).toContain('Ya agendada');
    expect(textos()).toContain('Negocio y dinero  ·  0/3');
  });

  it('lo que otro día tiene no cuenta en este', () => {
    montar({ fecha: '2026-11-12', delServidor: [delServidor({ titulo: 'Caminar 30 minutos' })] });
    expect(textos()).toContain('Cuerpo  ·  0/3');
    expect(textos()).not.toContain('Caminar 30 minutos');
  });

  it('con tres en un eje está lleno: no se puede elegir otra ni escribir otra, y la sugerida repetida no se ofrece de nuevo', () => {
    montar({
      delServidor: [delServidor({ posicion: 1 }), delServidor({ posicion: 2 }), delServidor({ posicion: 3, titulo: 'Una ya agendada' })],
      sugerida: { eje: 'CUERPO', texto: 'Una ya agendada' },
    });
    expect(textos()).toContain('Cuerpo  ·  3/3');
    expect(textos().filter(t => t === 'Una ya agendada')).toHaveLength(1);
    expect(textos()).not.toContain('Sugerida por tu diagnóstico');
    expect(raiz!.root.findAll(x => (x.type as unknown) === 'TextInput' && x.props.placeholder === 'Escribe otra acción tuya')).toHaveLength(1); // solo el de Negocio y dinero
  });

  it('agendar otra acción manda el día ENTERO: lo que ya tenía (con su hora y sus pasos) y lo nuevo, con las posiciones seguidas', () => {
    montar({
      delServidor: [delServidor({ titulo: 'Caminar 30 minutos', horaInicio: '07:00:00', acciones: ['Zapatillas', 'Ruta del parque'] })],
      sugerida: { eje: 'CUERPO', texto: 'Estirar' },
    });
    act(() => filaCon('Estirar')!.props.onPress());
    expect(textos()).toContain('Cuerpo  ·  2/3');
    act(() => botonAgendar().props.onPress());
    expect(onGuardar).toHaveBeenCalledTimes(1);
    const [items, fecha] = loQueSeGuardo();
    expect(fecha).toBe('2026-11-11');
    expect(items.map(i => [i.eje, i.posicion, i.titulo])).toEqual([['CUERPO', 1, 'Caminar 30 minutos'], ['CUERPO', 2, 'Estirar']]);
    expect(items[0].horaInicio).toBe('07:00');
    expect(items[0].acciones).toEqual(['Zapatillas', 'Ruta del parque']);
  });

  it('sin quitar ni agregar nada no hay qué guardar: el botón queda apagado', () => {
    montar({ delServidor: [delServidor()] });
    expect(botonAgendar().props.disabled).toBe(true);
  });

  it('con las del servidor y las que esperan señal juntas, viajan todas', () => { // spec 048 FR-019
    const enEspera: RocaDiariaApi = { ...delServidor({ titulo: 'Esperando', eje: 'TRABAJO' }), id: 'pendiente:c1:TRABAJO:1', pendienteDeEnvio: true };
    montar({ delServidor: [delServidor({ titulo: 'Ya estaba' })], enEspera: [enEspera], sugerida: { eje: 'CUERPO', texto: 'Nueva' } });
    act(() => filaCon('Nueva')!.props.onPress());
    act(() => botonAgendar().props.onPress());
    expect(loQueSeGuardo()[0].map(i => i.titulo).sort()).toEqual(['Esperando', 'Nueva', 'Ya estaba']);
  });

  it('sin nada en el servidor todo sigue como siempre (0/3, sin «Ya agendada»)', () => {
    montar({ delServidor: [] });
    expect(textos()).toContain('Cuerpo  ·  0/3');
    expect(textos().some(t => t.includes('Ya agendada'))).toBe(false);
  });
});

describe('quitar una acción que el día ya tiene (#185)', () => {
  it('«Quitar» libera su lugar, la deja a la vista con «Se quitará al guardar» y «Guardar cambios» manda el día sin ella', () => {
    montar({ delServidor: [delServidor({ titulo: 'Caminar 30 minutos', posicion: 1 }), delServidor({ titulo: 'Estirar', posicion: 2 })] });
    act(() => porEtiqueta('Quitar Caminar 30 minutos de ese día')!.props.onPress());
    expect(textos()).toContain('Cuerpo  ·  1/3');
    expect(textos()).toContain('Se quitará al guardar');
    expect(textos()).toContain('Deshacer');
    expect(botonAgendar().props.label).toBe('Guardar cambios');
    expect(botonAgendar().props.disabled).toBe(false);
    act(() => botonAgendar().props.onPress());
    const [items] = loQueSeGuardo();
    expect(items.map(i => [i.eje, i.posicion, i.titulo])).toEqual([['CUERPO', 1, 'Estirar']]);
  });

  it('quitar una y agregar otra manda la que sigue y la nueva, y no la quitada', () => {
    montar({ delServidor: [delServidor({ titulo: 'Caminar 30 minutos' })], sugerida: { eje: 'CUERPO', texto: 'Trotar' } });
    act(() => porEtiqueta('Quitar Caminar 30 minutos de ese día')!.props.onPress());
    act(() => filaCon('Trotar')!.props.onPress());
    act(() => botonAgendar().props.onPress());
    expect(loQueSeGuardo()[0].map(i => i.titulo)).toEqual(['Trotar']);
  });

  it('«Deshacer» la devuelve y vuelve a contar', () => {
    montar({ delServidor: [delServidor({ titulo: 'Caminar 30 minutos' })] });
    act(() => porEtiqueta('Quitar Caminar 30 minutos de ese día')!.props.onPress());
    expect(textos()).toContain('Cuerpo  ·  0/3');
    act(() => porEtiqueta('Deshacer: mantener Caminar 30 minutos')!.props.onPress());
    expect(textos()).toContain('Cuerpo  ·  1/3');
    expect(textos()).not.toContain('Se quitará al guardar');
    expect(botonAgendar().props.disabled).toBe(true);
  });

  it('quitar todas sin agregar otra no se puede guardar: el servidor no acepta un día sin acciones', () => {
    montar({ delServidor: [delServidor({ titulo: 'Caminar 30 minutos' })] });
    act(() => porEtiqueta('Quitar Caminar 30 minutos de ese día')!.props.onPress());
    expect(botonAgendar().props.disabled).toBe(true);
    expect(textos()).toContain('Un día tiene que quedar con al menos una acción: agrega otra o deshaz el cambio.');
  });

  it('con el lugar de la quitada ya ocupado por otra, no se puede deshacer (no pasar de tres)', () => {
    montar({
      delServidor: [delServidor({ titulo: 'Una', posicion: 1 }), delServidor({ titulo: 'Dos', posicion: 2 }), delServidor({ titulo: 'Tres', posicion: 3 })],
      sugerida: { eje: 'CUERPO', texto: 'Cuarta' },
    });
    act(() => porEtiqueta('Quitar Tres de ese día')!.props.onPress());
    act(() => filaCon('Cuarta')!.props.onPress());
    expect(textos()).toContain('Cuerpo  ·  3/3');
    expect(porEtiqueta('Deshacer: mantener Tres')!.props.disabled).toBe(true);
  });

  it('lo que se quitó de un día no se arrastra a otro: cada día vuelve a verse como lo tiene el servidor', () => {
    montar({ delServidor: [delServidor({ titulo: 'Caminar 30 minutos' })] });
    act(() => porEtiqueta('Quitar Caminar 30 minutos de ese día')!.props.onPress());
    act(() => mockAlternarDia!('JUE'));
    act(() => mockAlternarDia!('MIÉ'));
    expect(textos()).toContain('Cuerpo  ·  1/3');
    expect(textos()).not.toContain('Se quitará al guardar');
  });
});

describe('cambiar de día con acciones ya elegidas (#185)', () => {
  it('lo elegido pasa al día nuevo sin pasarse de tres por eje con lo que ese día ya tiene', () => {
    montar({
      delServidor: [delServidor({ titulo: 'Del jueves 1', fecha: '2026-11-12', posicion: 1 }), delServidor({ titulo: 'Del jueves 2', fecha: '2026-11-12', posicion: 2 })],
      sugerida: { eje: 'CUERPO', texto: 'Sugerida' },
    });
    act(() => filaCon('Sugerida')!.props.onPress());
    act(() => {
      const campo = raiz!.root.findAll(x => (x.type as unknown) === 'TextInput' && x.props.placeholder === 'Escribe otra acción tuya')[0];
      campo.props.onChangeText('Propia');
    });
    act(() => filaCon('Agregar')!.props.onPress());
    expect(textos()).toContain('Cuerpo  ·  2/3');
    act(() => mockAlternarDia!('JUE'));
    expect(textos()).toContain('Cuerpo  ·  3/3');
    act(() => botonAgendar().props.onPress());
    const [items, fecha] = loQueSeGuardo();
    expect(fecha).toBe('2026-11-12');
    expect(items.map(i => i.titulo)).toEqual(['Del jueves 1', 'Del jueves 2', 'Sugerida']);
  });
});

describe('sin haber podido leer lo que ya hay agendado (#185)', () => {
  it('no deja agendar —borraría lo que no se vio— y ofrece volver a leer', () => {
    montar({ sinLeerLaSemana: true, sugerida: { eje: 'CUERPO', texto: 'Estirar' } });
    expect(textos()).toContain('No pudimos leer lo que ya tienes agendado esta semana. Si agendas ahora, podrías borrarlo.');
    act(() => filaCon('Estirar')!.props.onPress());
    expect(botonAgendar().props.disabled).toBe(true);
    act(() => filaCon('Volver a leer')!.props.onPress());
    expect(onVolverALeer).toHaveBeenCalledTimes(1);
  });

  it('leído, el aviso no aparece y se agenda como siempre', () => {
    montar({ sinLeerLaSemana: false, sugerida: { eje: 'CUERPO', texto: 'Estirar' } });
    expect(textos().some(t => t.includes('No pudimos leer lo que ya tienes agendado'))).toBe(false);
    act(() => filaCon('Estirar')!.props.onPress());
    expect(botonAgendar().props.disabled).toBe(false);
  });
});
