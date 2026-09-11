/**
 * Cuál de los hábitos de hoy le toca a la persona en este momento.
 *
 * Es la primera tarjeta de Hoy, y antes decía siempre lo mismo. Las reglas que importan: gana el
 * más RECIENTE que ya arrancó (no el más viejo que quedó sin hacer), un hábito vencido sigue
 * siendo accionable, y ante empate siempre sale el mismo.
 */
import { describe, expect, it } from '@jest/globals';
import type { TrackDelDiaApi } from '../../types/habits.types';
import { habitoDelMomento } from '../habitoDelMomento';

const enHora = (hora: number, minuto = 0) => {
  const d = new Date(2026, 8, 11);
  d.setHours(hora, minuto, 0, 0);
  return d;
};

const track = (
  id: string,
  tituloHabito: string,
  horaDisparo: string | null,
  estado = 'PENDIENTE',
): TrackDelDiaApi => ({
  id,
  habitoId: `h-${id}`,
  fechaEjecucion: '2026-09-11',
  diaPrograma: 3,
  tipoDia: 'DIARIO',
  esOpcional: false,
  estado,
  puntosOtorgados: 0,
  respuestaTexto: null,
  calificacionProductividad: null,
  completadoEn: null,
  tituloHabito,
  tipoHabito: 'CHECKBOX',
  guia: null,
  horaDisparo,
  horaLimite: null,
});

const jornada = () => [
  track('a', 'DESPERTAR', '06:00:00'),
  track('b', 'AGUA', '09:00:00'),
  track('c', 'ENTRENAR', '13:00:00'),
  track('d', 'ÚLTIMA COMIDA DEL DÍA', '20:00:00'),
];

describe('a quién le toca según el reloj', () => {
  it('antes del primero muestra el que viene, no el último de ayer', () => {
    const r = habitoDelMomento(jornada(), enHora(5));
    expect([r.estado, r.titulo, r.hora]).toEqual(['proximo', 'DESPERTAR', '06:00']);
  });

  it('en la hora en punto ya te toca', () => {
    expect(habitoDelMomento(jornada(), enHora(6)).estado).toBe('ahora');
  });

  it('gana el MÁS RECIENTE que ya arrancó, no el más viejo sin hacer', () => {
    expect(habitoDelMomento(jornada(), enHora(13, 30)).titulo).toBe('ENTRENAR');
  });

  it('de noche muestra el de la noche', () => {
    expect(habitoDelMomento(jornada(), enHora(23, 59)).titulo).toBe('ÚLTIMA COMIDA DEL DÍA');
  });

  it('cuenta cuántos quedan por hacer', () => {
    expect(habitoDelMomento(jornada(), enHora(13, 30)).pendientes).toBe(4);
  });
});

describe('qué cuenta como pendiente', () => {
  it('los completados salen de la cuenta y de la elección', () => {
    const tracks = [
      track('a', 'DESPERTAR', '06:00:00', 'COMPLETADO'),
      track('b', 'AGUA', '09:00:00', 'COMPLETADO'),
      track('c', 'ENTRENAR', '13:00:00'),
    ];
    const r = habitoDelMomento(tracks, enHora(13, 30));
    expect([r.titulo, r.pendientes]).toEqual(['ENTRENAR', 1]);
  });

  it('con todo cerrado lo dice, sin señalar ningún hábito', () => {
    const r = habitoDelMomento(jornada().map(t => ({ ...t, estado: 'COMPLETADO' })), enHora(13));
    expect([r.estado, r.titulo]).toEqual(['todo-hecho', null]);
  });

  it('un hábito EXPIRADO sigue siendo accionable: el backend deja registrarlo tarde', () => {
    expect(habitoDelMomento([track('a', 'AGUA', '09:00:00', 'EXPIRADO')], enHora(13)).titulo).toBe('AGUA');
  });

  it('un FALLIDO no: lo cierra el barrido nocturno y ya no se puede hacer nada', () => {
    expect(habitoDelMomento([track('a', 'AGUA', '09:00:00', 'FALLIDO')], enHora(13)).estado).toBe('todo-hecho');
  });

  it('EN_CURSO cuenta como pendiente', () => {
    expect(habitoDelMomento([track('a', 'AGUA', '09:00:00', 'EN_CURSO')], enHora(13)).titulo).toBe('AGUA');
  });
});

describe('sin datos y datos raros', () => {
  it('sin tracks vuelve al texto genérico en vez de inventar un hábito', () => {
    expect(habitoDelMomento([], enHora(13)).estado).toBe('sin-datos');
  });

  it('un hábito sin hora igual se muestra: es lo único que hay que hacer', () => {
    const r = habitoDelMomento([track('a', 'HÁBITO PROPIO', null)], enHora(13));
    expect([r.estado, r.hora]).toEqual(['ahora', null]);
  });

  it('si alguno tiene hora, ese manda sobre los que no la tienen', () => {
    const tracks = [track('a', 'SIN HORA', null), track('b', 'AGUA', '09:00:00')];
    expect(habitoDelMomento(tracks, enHora(13)).titulo).toBe('AGUA');
  });

  it('una hora ilegible no rompe la tarjeta', () => {
    expect(habitoDelMomento([track('a', 'ROTO', 'xx:yy')], enHora(13)).estado).toBe('ahora');
  });

  it('acepta triggerTime cuando el backend no manda horaDisparo', () => {
    const t = { ...track('a', 'ALIAS', null), triggerTime: '09:00:00' };
    expect(habitoDelMomento([t], enHora(13)).hora).toBe('09:00');
  });
});

describe('empates', () => {
  // Sin desempate fijo la tarjeta cambiaba de hábito entre recargas, según cómo viniera la lista.
  const par = () => [track('a', 'PRIMERO DEL CATÁLOGO', '09:00:00'), track('b', 'SEGUNDO', '09:00:00')];

  it('ante la misma hora gana el primero del orden curado del catálogo', () => {
    expect(habitoDelMomento(par(), enHora(13)).titulo).toBe('PRIMERO DEL CATÁLOGO');
  });

  it('con tres empatados, también', () => {
    expect(habitoDelMomento([...par(), track('c', 'TERCERO', '09:00:00')], enHora(13)).titulo)
      .toBe('PRIMERO DEL CATÁLOGO');
  });
});
