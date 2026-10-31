import { describe, expect, it } from '@jest/globals';
import {
  DURACION_SUPUESTA_DEL_EVENTO_MIN,
  armarListaDelDia,
  contarElDia,
  etiquetaDeLosHechos,
  minutosDeLaHora,
  textoDelResumenDeHoy,
  type ItemBase,
} from '../listaDelDia';

/** Un ítem mínimo: lo único que la lista necesita saber. */
const habito = (clave: string, hora: string | null, extra: Partial<ItemBase> = {}): ItemBase => ({
  clave,
  tipo: 'habito',
  hora,
  hecho: false,
  ...extra,
});
const m = (hora: string) => minutosDeLaHora(hora) as number;
const claves = (items: ItemBase[]) => items.map(x => x.clave);

describe('La lista de hoy, por hora (spec 014)', () => {
  it('Independent Test: Despertar 05:30 hecho, Agua 06:00 pendiente, son las 06:10 → empieza con Agua «Te toca ahora»; Despertar solo en los hechos', () => {
    const lista = armarListaDelDia([habito('despertar', '05:30', { hecho: true }), habito('agua', '06:00')], m('06:10'));
    expect(claves(lista.enCurso)).toEqual(['agua']);
    expect(lista.marcaDelPrimero).toBe('ahora');
    expect(claves(lista.hechos)).toEqual(['despertar']);
    expect(lista.atrasados).toEqual([]);
  });

  it('ordena lo que sigue por hora, sin importar cómo llegó', () => {
    const lista = armarListaDelDia([habito('c', '09:00'), habito('a', '06:00'), habito('b', '07:30')], m('05:00'));
    expect(claves(lista.enCurso)).toEqual(['a', 'b', 'c']);
  });

  it('el primero dice «Lo que sigue» si su hora todavía no llegó', () => {
    const lista = armarListaDelDia([habito('a', '06:00'), habito('b', '07:00')], m('05:00'));
    expect(lista.marcaDelPrimero).toBe('sigue');
  });

  it('el primero dice «Te toca ahora» si su hora ya llegó', () => {
    const lista = armarListaDelDia([habito('a', '06:00'), habito('b', '08:00')], m('06:00'));
    expect(lista.marcaDelPrimero).toBe('ahora');
  });

  it('sin nada en curso no hay marca', () => {
    expect(armarListaDelDia([habito('a', '06:00', { hecho: true })], m('07:00')).marcaDelPrimero).toBeNull();
  });

  describe('lo atrasado: un pendiente queda atrasado cuando llega la hora del siguiente', () => {
    it('pendiente de las 05:30 y otro de las 06:00: a las 06:00 el de las 06:00 sube y el de las 05:30 baja', () => {
      const lista = armarListaDelDia([habito('cinco-y-media', '05:30'), habito('seis', '06:00')], m('06:00'));
      expect(claves(lista.enCurso)).toEqual(['seis']);
      expect(claves(lista.atrasados)).toEqual(['cinco-y-media']);
    });

    it('a las 05:59 todavía no está atrasado: el siguiente aún no llegó', () => {
      const lista = armarListaDelDia([habito('cinco-y-media', '05:30'), habito('seis', '06:00')], m('05:59'));
      expect(claves(lista.enCurso)).toEqual(['cinco-y-media', 'seis']);
      expect(lista.atrasados).toEqual([]);
    });

    it('el último de la agenda nunca se atrasa: no hay siguiente', () => {
      const lista = armarListaDelDia([habito('a', '06:00'), habito('ultimo', '07:00')], m('23:00'));
      expect(claves(lista.atrasados)).toEqual(['a']);
      expect(claves(lista.enCurso)).toEqual(['ultimo']);
    });

    it('el «siguiente» también puede ser algo ya hecho: lo que viene en la agenda, no solo lo pendiente', () => {
      const lista = armarListaDelDia([habito('a', '05:30'), habito('b', '06:00', { hecho: true })], m('06:05'));
      expect(claves(lista.atrasados)).toEqual(['a']);
    });

    it('el «siguiente» también puede ser un evento', () => {
      const evento: ItemBase = { clave: 'clase', tipo: 'evento', hora: '06:00', hecho: false, duracionMin: 90 };
      const lista = armarListaDelDia([habito('a', '05:30'), evento], m('06:10'));
      expect(claves(lista.atrasados)).toEqual(['a']);
      expect(claves(lista.enCurso)).toEqual(['clase']);
    });

    it('lo atrasado queda por hora, y las acciones también se atrasan', () => {
      const accion: ItemBase = { clave: 'accion', tipo: 'accion', hora: '05:45', hecho: false };
      const lista = armarListaDelDia([habito('b', '05:50'), accion, habito('c', '08:00')], m('09:00'));
      expect(claves(lista.atrasados)).toEqual(['accion', 'b']);
      expect(claves(lista.enCurso)).toEqual(['c']);
    });

    it('un evento nunca queda atrasado (no se registra): si no terminó, sigue en curso', () => {
      const evento: ItemBase = { clave: 'e', tipo: 'evento', hora: '06:00', hecho: false, duracionMin: 300 };
      const lista = armarListaDelDia([evento, habito('a', '06:30'), habito('b', '07:00')], m('08:00'));
      expect(claves(lista.enCurso)).toEqual(['e', 'b']);
      expect(claves(lista.atrasados)).toEqual(['a']);
    });
  });

  describe('«Sin hora»', () => {
    it('va aparte y antes de lo atrasado: en su propia sección, sin ordenarse con las horas', () => {
      const lista = armarListaDelDia(
        [habito('libre', null), habito('a', '05:30'), habito('b', '06:00')],
        m('06:30'),
      );
      expect(claves(lista.sinHora)).toEqual(['libre']);
      expect(claves(lista.atrasados)).toEqual(['a']);
      expect(claves(lista.enCurso)).toEqual(['b']);
    });

    it('lo sin hora nunca se atrasa', () => {
      const lista = armarListaDelDia([habito('libre', null), habito('b', '06:00')], m('23:59'));
      expect(claves(lista.sinHora)).toEqual(['libre']);
    });

    it('una hora que no se entiende cuenta como sin hora', () => {
      const lista = armarListaDelDia([habito('raro', 'a las seis')], m('10:00'));
      expect(claves(lista.sinHora)).toEqual(['raro']);
    });
  });

  describe('lo hecho', () => {
    it('sale de la lista y queda en «hechos», por hora', () => {
      const lista = armarListaDelDia(
        [habito('b', '07:00', { hecho: true }), habito('a', '06:00', { hecho: true }), habito('c', '08:00')],
        m('06:30'),
      );
      expect(claves(lista.hechos)).toEqual(['a', 'b']);
      expect(claves(lista.enCurso)).toEqual(['c']);
    });

    it('al registrar un hábito, el siguiente queda primero', () => {
      const antes = armarListaDelDia([habito('a', '06:00'), habito('b', '07:00')], m('06:00'));
      expect(claves(antes.enCurso)[0]).toBe('a');
      const despues = armarListaDelDia([habito('a', '06:00', { hecho: true }), habito('b', '07:00')], m('06:00'));
      expect(claves(despues.enCurso)[0]).toBe('b');
    });

    it('lo que se acaba de cumplir (retenido) se queda en su lugar y no salta de sección mientras se despide', () => {
      const items = [habito('a', '05:30', { hecho: true }), habito('b', '06:00')];
      const sinRetener = armarListaDelDia(items, m('06:10'));
      expect(claves(sinRetener.hechos)).toEqual(['a']);
      const retenido = armarListaDelDia(items, m('06:10'), new Set(['a']));
      // Pendiente a las 05:30 con otro a las 06:00: seguía en «Se te pasó la hora» y sigue ahí hasta irse.
      expect(claves(retenido.atrasados)).toEqual(['a']);
      expect(retenido.hechos).toEqual([]);
    });
  });

  describe('eventos', () => {
    const evento = (hora: string, duracionMin: number | null): ItemBase => ({ clave: `e-${hora}`, tipo: 'evento', hora, hecho: false, duracionMin });

    it('los que ya terminaron salen de la lista', () => {
      const lista = armarListaDelDia([evento('09:00', 60), habito('a', '12:00')], m('10:00'));
      expect(claves(lista.enCurso)).toEqual(['a']);
      expect([...lista.sinHora, ...lista.atrasados, ...lista.hechos, ...lista.cerrados]).toEqual([]);
    });

    it('uno en curso se queda, y uno que empieza más tarde también', () => {
      const lista = armarListaDelDia([evento('09:00', 60), evento('15:00', 60)], m('09:30'));
      expect(claves(lista.enCurso)).toEqual(['e-09:00', 'e-15:00']);
    });

    it('termina justo cuando acaba su duración', () => {
      expect(armarListaDelDia([evento('09:00', 60)], m('09:59')).enCurso.length).toBe(1);
      expect(armarListaDelDia([evento('09:00', 60)], m('10:00')).enCurso.length).toBe(0);
    });

    it('sin duración se supone una hora', () => {
      expect(DURACION_SUPUESTA_DEL_EVENTO_MIN).toBe(60);
      expect(armarListaDelDia([evento('09:00', null)], m('09:59')).enCurso.length).toBe(1);
      expect(armarListaDelDia([evento('09:00', null)], m('10:01')).enCurso.length).toBe(0);
    });
  });

  describe('pausados y cerrados', () => {
    it('un hábito pausado no aparece hoy en ninguna sección', () => {
      const lista = armarListaDelDia([habito('p', '06:00', { pausado: true }), habito('a', '07:00')], m('05:00'));
      expect(claves(lista.enCurso)).toEqual(['a']);
      expect(claves([...lista.sinHora, ...lista.atrasados, ...lista.hechos, ...lista.cerrados])).toEqual([]);
    });

    it('un pausado tampoco cuenta para decidir si otro se atrasó', () => {
      const lista = armarListaDelDia([habito('a', '05:30'), habito('p', '06:00', { pausado: true })], m('07:00'));
      expect(claves(lista.enCurso)).toEqual(['a']);
      expect(lista.atrasados).toEqual([]);
    });

    it('un registro cuyo día ya cerró no es atrasado: queda aparte, sin ocultarse', () => {
      const lista = armarListaDelDia([habito('v', '05:00', { cerrado: true }), habito('a', '08:00')], m('07:00'));
      expect(claves(lista.cerrados)).toEqual(['v']);
      expect(claves(lista.enCurso)).toEqual(['a']);
    });
  });

  it('un día sin nada devuelve todo vacío', () => {
    const lista = armarListaDelDia([], m('10:00'));
    expect(lista).toEqual({ enCurso: [], primero: null, marcaDelPrimero: null, sinHora: [], atrasados: [], cerrados: [], hechos: [], cierre: null });
  });
});

describe('el resumen de hoy', () => {
  it('cuenta hábitos y acciones; los eventos no se «hacen»', () => {
    const items: ItemBase[] = [
      habito('a', '06:00', { hecho: true }),
      habito('b', '07:00'),
      { clave: 'acc', tipo: 'accion', hora: '08:00', hecho: true },
      { clave: 'ev', tipo: 'evento', hora: '09:00', hecho: false },
      habito('pausa', '10:00', { pausado: true }),
    ];
    expect(contarElDia(items)).toEqual({ hechos: 2, total: 3 });
  });

  it('«4 de 12 hechos · 46 pts»', () => {
    expect(textoDelResumenDeHoy(4, 12, 46)).toBe('4 de 12 hechos · 46 pts');
  });
  it('con un solo ítem, en singular', () => {
    expect(textoDelResumenDeHoy(1, 1, 8)).toBe('1 de 1 hecho · 8 pts');
  });
  it('sin nada planificado no dice «0 de 0»', () => {
    expect(textoDelResumenDeHoy(0, 0, 0)).toBe('Hoy no tienes nada planificado.');
  });
  it('el plegado dice «1 hecho hoy» / «4 hechos hoy»', () => {
    expect(etiquetaDeLosHechos(1)).toBe('1 hecho hoy');
    expect(etiquetaDeLosHechos(4)).toBe('4 hechos hoy');
  });
});

describe('minutosDeLaHora', () => {
  it('lee HH:mm y HH:mm:ss', () => {
    expect(minutosDeLaHora('06:30')).toBe(390);
    expect(minutosDeLaHora('06:30:00')).toBe(390);
    expect(minutosDeLaHora('00:00')).toBe(0);
  });
  it('lo que no es hora, null', () => {
    expect(minutosDeLaHora(null)).toBeNull();
    expect(minutosDeLaHora('')).toBeNull();
    expect(minutosDeLaHora('25:00')).toBeNull();
    expect(minutosDeLaHora('07:75')).toBeNull();
  });
});
