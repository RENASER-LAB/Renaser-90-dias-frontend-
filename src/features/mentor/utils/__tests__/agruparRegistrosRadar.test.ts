/**
 * El agrupado del Código Renaser de un aprendiz, sin montar pantalla.
 *
 * Lo que se prueba es una decisión pura —a qué día pertenece cada registro y en qué orden se
 * leen—, así que se puede recorrer la matriz completa en milisegundos.
 *
 * **Los instantes se construyen con `new Date(año, mes, día, hora)` y se serializan con
 * `toISOString()`.** Es a propósito: así el ISO que entra corresponde EXACTAMENTE a esa hora
 * local, corra el test en la zona que corra. Fijarlos como cadenas `…Z` a mano haría que el
 * resultado dependiera del huso de la máquina, que es la forma clásica de que una prueba de
 * fechas pase en una laptop y falle en CI.
 */
import { describe, expect, it } from '@jest/globals';

import { agruparPorDiaYHora } from '../agruparRegistrosRadar';
import type { RegistroRadarApi } from '../../../radar/types/radar.types';

/** Un registro real, con la hora local pedida. El texto no importa acá: importa el instante. */
const registro = (
  id: string,
  local: { anio?: number; mes?: number; dia: number; hora: number; minuto?: number },
): RegistroRadarApi => ({
  id,
  whatAmIDoing: `haciendo ${id}`,
  whatAmIThinking: `pensando ${id}`,
  whatAmIFeeling: `sintiendo ${id}`,
  energyLevel: 7,
  whatAmIAvoiding: `evitando ${id}`,
  createdAt: new Date(
    local.anio ?? 2026,
    local.mes ?? 8,
    local.dia,
    local.hora,
    local.minuto ?? 0,
    0,
    0,
  ).toISOString(),
});

describe('agrupar por día', () => {
  it('sin registros no hay días', () => {
    expect(agruparPorDiaYHora([])).toEqual([]);
  });

  it('junta en un solo día los registros del mismo día', () => {
    const dias = agruparPorDiaYHora([
      registro('a', { dia: 15, hora: 10 }),
      registro('b', { dia: 15, hora: 9 }),
      registro('c', { dia: 15, hora: 8 }),
    ]);

    expect(dias).toHaveLength(1);
    expect(dias[0].fecha).toBe('2026-09-15');
    expect(dias[0].registros.map(r => r.registro.id)).toEqual(['a', 'b', 'c']);
  });

  it('separa los días y los ordena del más nuevo al más viejo', () => {
    const dias = agruparPorDiaYHora([
      registro('viejo', { dia: 13, hora: 8 }),
      registro('nuevo', { dia: 15, hora: 8 }),
      registro('medio', { dia: 14, hora: 8 }),
    ]);

    expect(dias.map(d => d.fecha)).toEqual(['2026-09-15', '2026-09-14', '2026-09-13']);
  });

  it('un mismo día que vuelve a aparecer más abajo no abre un segundo grupo', () => {
    /* Es el caso de una segunda página que empieza en el mismo día en que terminó la primera.
       Sin el orden previo, el 15 quedaría partido en dos bloques con el 14 en el medio. */
    const dias = agruparPorDiaYHora([
      registro('a', { dia: 15, hora: 19 }),
      registro('b', { dia: 14, hora: 8 }),
      registro('c', { dia: 15, hora: 8 }),
    ]);

    expect(dias.map(d => d.fecha)).toEqual(['2026-09-15', '2026-09-14']);
    expect(dias[0].registros.map(r => r.registro.id)).toEqual(['a', 'c']);
  });

  it('cambia de día al cruzar la medianoche, no cada 24 horas', () => {
    /* 23:30 y 00:30 están a una hora de distancia y son días distintos. Una implementación que
       partiera por bloques de 24 h desde el primer registro los pondría juntos. */
    const dias = agruparPorDiaYHora([
      registro('despues', { dia: 16, hora: 0, minuto: 30 }),
      registro('antes', { dia: 15, hora: 23, minuto: 30 }),
    ]);

    expect(dias.map(d => d.fecha)).toEqual(['2026-09-16', '2026-09-15']);
  });

  it('el mes y el año se acolchan a dos y cuatro dígitos', () => {
    const [dia] = agruparPorDiaYHora([registro('a', { anio: 2026, mes: 0, dia: 5, hora: 9 })]);
    expect(dia.fecha).toBe('2026-01-05');
  });
});

describe('la hora de cada registro', () => {
  it('sale en HH:mm con ceros a la izquierda', () => {
    const [dia] = agruparPorDiaYHora([
      registro('a', { dia: 15, hora: 19, minuto: 5 }),
      registro('b', { dia: 15, hora: 8, minuto: 0 }),
    ]);
    expect(dia.registros.map(r => r.hora)).toEqual(['19:05', '08:00']);
  });

  it('dentro de un día se ordenan de la más reciente a la más antigua', () => {
    const [dia] = agruparPorDiaYHora([
      registro('b', { dia: 15, hora: 11 }),
      registro('d', { dia: 15, hora: 8 }),
      registro('a', { dia: 15, hora: 14 }),
      registro('c', { dia: 15, hora: 9 }),
    ]);
    expect(dia.registros.map(r => r.registro.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('una fecha ilegible no borra lo que la persona escribió', () => {
  const roto: RegistroRadarApi = {
    id: 'roto',
    whatAmIDoing: 'algo',
    whatAmIThinking: 'algo',
    whatAmIFeeling: 'algo',
    energyLevel: 3,
    whatAmIAvoiding: 'algo',
    createdAt: 'no es una fecha',
  };

  it('el registro se conserva, en un grupo sin fecha y al final', () => {
    const dias = agruparPorDiaYHora([roto, registro('a', { dia: 15, hora: 10 })]);

    expect(dias.map(d => d.fecha)).toEqual(['2026-09-15', null]);
    expect(dias[1].registros).toEqual([{ registro: roto, hora: null }]);
  });

  it('si TODOS son ilegibles, sigue habiendo un grupo con todos adentro', () => {
    const dias = agruparPorDiaYHora([roto, { ...roto, id: 'roto2' }]);

    expect(dias).toHaveLength(1);
    expect(dias[0].fecha).toBeNull();
    expect(dias[0].registros.map(r => r.registro.id)).toEqual(['roto', 'roto2']);
  });
});
