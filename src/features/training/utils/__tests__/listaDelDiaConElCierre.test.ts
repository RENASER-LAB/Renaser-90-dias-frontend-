import { describe, expect, it } from '@jest/globals';

import { armarListaDelDia, contarElDia, minutosDeLaHora, type ItemBase } from '../listaDelDia';
import { puntosDeHoy, type ItemDelDia } from '../itemsDelDia';
import { destinoDelToque } from '../filaDelDia';

/**
 * «Cierra tu día» (spec 017, corregida el 2026-10-30) dentro de la lista de hoy: un ítem de otra naturaleza. Está SIEMPRE,
 * a cualquier hora y sin importar Despertar ni Dormir; no lleva hora; la lista lo entrega aparte (`cierre`) para que se
 * dibuje de última. Cerrado o no, no se atrasa ni atrasa a nadie, no cuenta como hecho ni da puntos y no es el «primero».
 */

const m = (hora: string) => minutosDeLaHora(hora) as number;
const habito = (clave: string, hora: string | null, extra: Partial<ItemBase> = {}): ItemBase => ({ clave, tipo: 'habito', hora, hecho: false, ...extra });
const cierre = (extra: Partial<ItemBase> = {}): ItemBase => ({ clave: 'cierre', tipo: 'cierre', hora: null, hecho: false, ...extra });
const claves = (items: ItemBase[]) => items.map(x => x.clave);

describe('«Cierra tu día» en la lista de hoy: siempre, y de última', () => {
  const DIA_NORMAL = [habito('despertar', '06:00'), habito('almuerzo', '13:00'), habito('dormir', '22:30'), cierre()];

  it.each(['00:00', '06:00', '14:00', '21:00', '23:30'])('a las %s está, aparte de lo que sigue', hora => {
    const lista = armarListaDelDia(DIA_NORMAL, m(hora));
    expect(lista.cierre?.clave).toBe('cierre');
    expect(claves(lista.enCurso)).not.toContain('cierre');
    expect(claves(lista.atrasados)).not.toContain('cierre');
    expect(claves(lista.hechos)).not.toContain('cierre');
  });

  it('con Dormir, sin Dormir y con Dormir a las 08:00 (quien trabaja de noche) es lo mismo', () => {
    for (const dormir of [habito('dormir', '22:30'), habito('dormir', '08:00'), habito('dormir', '00:10'), habito('dormir', null), null]) {
      const items = [habito('despertar', '16:00'), ...(dormir ? [dormir] : []), cierre()];
      for (const hora of ['06:00', '14:00', '23:30']) {
        expect(armarListaDelDia(items, m(hora)).cierre?.clave).toBe('cierre');
      }
    }
  });

  it('no depende de ninguna hora: sin hora, con una hora vieja o sin hábitos, está igual', () => {
    expect(armarListaDelDia([cierre()], m('03:00')).cierre?.clave).toBe('cierre');
    expect(armarListaDelDia([cierre({ hora: '' })], m('23:00')).cierre?.clave).toBe('cierre');
    expect(armarListaDelDia([cierre({ hora: '22:00' })], m('06:00')).cierre?.clave).toBe('cierre');
  });

  it('sin el ítem (backend anterior, plan apagado, todavía no se sabe) no hay cierre', () => {
    expect(armarListaDelDia([habito('a', '06:00')], m('23:00')).cierre).toBeNull();
  });

  it('NO se atrasa: pasada la hora de Dormir sigue aparte, no entre lo atrasado', () => {
    const lista = armarListaDelDia([cierre(), habito('dormir', '22:30')], m('23:10'));
    expect(lista.cierre?.clave).toBe('cierre');
    expect(claves(lista.atrasados)).toEqual([]);
    expect(claves(lista.enCurso)).toEqual(['dormir']);
  });

  it('NO atrasa a nadie: aunque trajera una hora, no es «la hora del siguiente» de un hábito anterior', () => {
    const lista = armarListaDelDia([habito('escritura', '21:30'), cierre({ hora: '22:00' })], m('22:10'));
    expect(claves(lista.enCurso)).toEqual(['escritura']);
    expect(lista.atrasados).toEqual([]);
  });

  it('cerrado se queda donde está: no pasa a «N hechos hoy» ni se despide', () => {
    const lista = armarListaDelDia([cierre({ hecho: true }), habito('dormir', '22:30')], m('22:05'));
    expect(lista.cierre?.hecho).toBe(true);
    expect(claves(lista.enCurso)).toEqual(['dormir']);
    expect(lista.hechos).toEqual([]);
    // Tampoco con la fila marcada como «se despide».
    const conRetenidos = armarListaDelDia([cierre({ hecho: true })], m('22:05'), new Set(['cierre']));
    expect(conRetenidos.cierre?.clave).toBe('cierre');
    expect(conRetenidos.hechos).toEqual([]);
  });

  it('con Dormir ya hecho (plegado en «hechos») el cierre sigue aparte: la pantalla lo dibuja después de los hechos', () => {
    const lista = armarListaDelDia([habito('dormir', '22:30', { hecho: true }), cierre()], m('23:00'));
    expect(claves(lista.hechos)).toEqual(['dormir']);
    expect(lista.cierre?.clave).toBe('cierre');
  });

  it('no es el «primero»: la marca de «Te toca ahora» es de un hábito o una acción', () => {
    const lista = armarListaDelDia([cierre(), habito('dormir', '22:30')], m('22:05'));
    expect(lista.primero?.clave).toBe('dormir');
    expect(lista.marcaDelPrimero).toBe('sigue');
  });

  it('sola, sin nada más en curso, no hay primero ni marca', () => {
    const lista = armarListaDelDia([habito('a', '06:00', { hecho: true }), cierre()], m('21:40'));
    expect(lista.primero).toBeNull();
    expect(lista.marcaDelPrimero).toBeNull();
    expect(claves(lista.hechos)).toEqual(['a']);
    expect(lista.cierre?.clave).toBe('cierre');
  });

  it('un cierre de un hábito pausado no se confunde: el cierre no se pausa', () => {
    expect(armarListaDelDia([cierre(), habito('p', '07:00', { pausado: true })], m('08:00')).cierre?.clave).toBe('cierre');
  });

  it('no cuenta en «N de M hechos»', () => {
    const items = [habito('a', '06:00', { hecho: true }), habito('b', '07:00'), cierre({ hecho: true })];
    expect(contarElDia(items)).toEqual({ hechos: 1, total: 2 });
  });

  it('no da puntos aunque un servidor ponga alguno', () => {
    const item = { clave: 'cierre', tipo: 'cierre', hora: null, hecho: true, puntos: 50 } as ItemDelDia;
    const hecho = { clave: 'h', tipo: 'habito', hora: '06:00', hecho: true, puntos: 8 } as ItemDelDia;
    expect(puntosDeHoy([item, hecho])).toBe(8);
  });
});

describe('a dónde lleva el toque en «Cierra tu día»', () => {
  const item = { clave: 'cierre', tipo: 'cierre', hora: null, hecho: false } as ItemDelDia;
  it('hoy abre su hoja, cerrada o no (para cambiarla)', () => {
    expect(destinoDelToque(item, 'hoy', true)).toBe('cierre');
    expect(destinoDelToque({ ...item, hecho: true }, 'hecho', true)).toBe('cierre');
  });
  it('en un día anterior no abre nada', () => {
    expect(destinoDelToque(item, 'cerrado', false)).toBe('nada');
    expect(destinoDelToque({ ...item, hecho: true }, 'hecho', false)).toBe('nada');
  });
});
