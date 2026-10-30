import { describe, expect, it } from '@jest/globals';

import { armarListaDelDia, contarElDia, minutosDeLaHora, type ItemBase } from '../listaDelDia';
import { puntosDeHoy, type ItemDelDia } from '../itemsDelDia';
import { destinoDelToque } from '../filaDelDia';

/**
 * «Cierra tu día» (spec 017) dentro de la lista de hoy: un ítem de otra naturaleza. Aparece desde su hora, queda en su lugar
 * (cerrado o no), no se atrasa ni atrasa a nadie, no cuenta como hecho ni da puntos y no es el «primero».
 */

const m = (hora: string) => minutosDeLaHora(hora) as number;
const habito = (clave: string, hora: string | null, extra: Partial<ItemBase> = {}): ItemBase => ({ clave, tipo: 'habito', hora, hecho: false, ...extra });
const cierre = (hora = '22:00', extra: Partial<ItemBase> = {}): ItemBase => ({ clave: 'cierre', tipo: 'cierre', hora, hecho: false, ...extra });
const claves = (items: ItemBase[]) => items.map(x => x.clave);

describe('«Cierra tu día» en la lista de hoy', () => {
  it('antes de su hora no está', () => {
    const lista = armarListaDelDia([habito('noche', '21:00'), cierre('22:00')], m('21:59'));
    expect(claves(lista.enCurso)).toEqual(['noche']);
  });

  it('desde su hora está, entre lo que sigue, ordenada por hora', () => {
    const lista = armarListaDelDia([habito('dormir', '22:30'), cierre('22:00'), habito('escritura', '21:30', { hecho: true })], m('22:00'));
    expect(claves(lista.enCurso)).toEqual(['cierre', 'dormir']);
  });

  it('NO se atrasa: pasada la hora del siguiente sigue en su lugar', () => {
    const lista = armarListaDelDia([cierre('22:00'), habito('dormir', '22:30')], m('23:10'));
    expect(claves(lista.enCurso)).toContain('cierre');
    expect(claves(lista.atrasados)).not.toContain('cierre');
  });

  it('NO atrasa a nadie: su hora no es «la hora del siguiente» de un hábito anterior', () => {
    const lista = armarListaDelDia([habito('escritura', '21:30'), cierre('22:00')], m('22:10'));
    expect(claves(lista.enCurso)).toEqual(['escritura', 'cierre']);
    expect(lista.atrasados).toEqual([]);
  });

  it('cerrado se queda en su lugar: no pasa a «N hechos hoy» ni se despide', () => {
    const lista = armarListaDelDia([cierre('22:00', { hecho: true }), habito('dormir', '22:30')], m('22:05'));
    expect(claves(lista.enCurso)).toEqual(['cierre', 'dormir']);
    expect(lista.hechos).toEqual([]);
    // Tampoco con la fila marcada como «se despide».
    const conRetenidos = armarListaDelDia([cierre('22:00', { hecho: true })], m('22:05'), new Set(['cierre']));
    expect(claves(conRetenidos.enCurso)).toEqual(['cierre']);
    expect(conRetenidos.hechos).toEqual([]);
  });

  it('no es el «primero»: la marca de «Te toca ahora» es de un hábito o una acción', () => {
    const lista = armarListaDelDia([cierre('22:00'), habito('dormir', '22:30')], m('22:05'));
    expect(lista.primero?.clave).toBe('dormir');
    expect(lista.marcaDelPrimero).toBe('sigue');
  });

  it('sola, sin nada más en curso, no hay primero ni marca', () => {
    const lista = armarListaDelDia([habito('a', '06:00', { hecho: true }), cierre('21:30')], m('21:40'));
    expect(lista.primero).toBeNull();
    expect(lista.marcaDelPrimero).toBeNull();
    expect(claves(lista.hechos)).toEqual(['a']);
  });

  it('un cierre sin hora legible no se muestra (no hay a qué hora)', () => {
    expect(armarListaDelDia([cierre('')], m('23:00')).enCurso).toEqual([]);
  });

  it('no cuenta en «N de M hechos»', () => {
    const items = [habito('a', '06:00', { hecho: true }), habito('b', '07:00'), cierre('22:00', { hecho: true })];
    expect(contarElDia(items)).toEqual({ hechos: 1, total: 2 });
  });

  it('no da puntos aunque un servidor ponga alguno', () => {
    const item = { clave: 'cierre', tipo: 'cierre', hora: '22:00', hecho: true, puntos: 50 } as ItemDelDia;
    const hecho = { clave: 'h', tipo: 'habito', hora: '06:00', hecho: true, puntos: 8 } as ItemDelDia;
    expect(puntosDeHoy([item, hecho])).toBe(8);
  });
});

describe('a dónde lleva el toque en «Cierra tu día»', () => {
  const item = { clave: 'cierre', tipo: 'cierre', hora: '22:00', hecho: false } as ItemDelDia;
  it('hoy abre su hoja, cerrada o no (para cambiarla)', () => {
    expect(destinoDelToque(item, 'hoy', true)).toBe('cierre');
    expect(destinoDelToque({ ...item, hecho: true }, 'hecho', true)).toBe('cierre');
  });
  it('en un día anterior no abre nada', () => {
    expect(destinoDelToque(item, 'cerrado', false)).toBe('nada');
    expect(destinoDelToque({ ...item, hecho: true }, 'hecho', false)).toBe('nada');
  });
});
