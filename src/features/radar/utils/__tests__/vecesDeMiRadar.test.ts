import { describe, expect, it } from '@jest/globals';

import { diaDePrueba, miRadarConHorario, miRadarDePrueba } from '../../__tests__/fixturasDeMiRadar';
import {
  botonDeLaFalta,
  cambiosParaGuardar,
  conElModo,
  conSinRadar,
  conVecesAjustadas,
  diasQueSeEditan,
  hayCambios,
  horaDeLosDias,
  horasQueCaben,
  modoQueSeMuestra,
  repartirHoras,
  textoDeLaFalta,
  textoDelDiaEnLaFila,
  todosSinRadar,
  vecesDelObjetivo,
  vistaDelDia,
} from '../vecesDeMiRadar';

/**
 * Mi Radar automático y personalizado (spec 019): las cuentas del cliente, espejo de las del servidor. Los casos de la regla
 * son los mismos que fija `HorarioDelRadarTest` del backend.
 *
 * El viernes 30 de octubre: de lunes a viernes tienen candado (`editable: false`); sábado y domingo se editan.
 */

const de = (desde: number, hasta: number) => Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
/** Una semana de viernes: lunes a viernes con candado. */
const viernes = (porDia: Parameters<typeof miRadarDePrueba>[1] = {}) =>
  miRadarDePrueba(true, {
    1: { editable: false }, 2: { editable: false }, 3: { editable: false }, 4: { editable: false }, 5: { editable: false },
    ...porDia,
  });

describe('las horas que caben entre el Despertar y el Dormir', () => {
  it('05:30 y 22:30: de 06 a 22 (17 veces), sin el tope de 12', () => {
    expect(horasQueCaben('05:30', '22:30')).toEqual(de(6, 22));
  });
  it('08:00 y 23:00: de 08 a 22 (15 veces)', () => {
    expect(horasQueCaben('08:00', '23:00')).toEqual(de(8, 22));
  });
  it('06:00 y 22:00: de 06 a 21 (la hora del Despertar cuenta y la del Dormir no)', () => {
    expect(horasQueCaben('06:00', '22:00')).toEqual(de(6, 21));
  });
  it('02:00 y 23:30: de 03 a 23, recortado (21 veces)', () => {
    expect(horasQueCaben('02:00', '23:30')).toEqual(de(3, 23));
  });
  it('sin Despertar, sin Dormir, o con el Dormir igual o antes del Despertar: ninguna, no se inventa un horario', () => {
    expect(horasQueCaben(null, '22:00')).toEqual([]);
    expect(horasQueCaben('06:00', null)).toEqual([]);
    expect(horasQueCaben(undefined, undefined)).toEqual([]);
    expect(horasQueCaben('22:00', '06:00')).toEqual([]);
    expect(horasQueCaben('06:00', '06:00')).toEqual([]);
    expect(horasQueCaben('05:10', '05:50')).toEqual([]);
  });
});

describe('el reparto parejo: round(i·(total−1)/(n−1))', () => {
  it('6 de 17 (06 a 22) dan 06, 09, 12, 16, 19 y 22', () => {
    expect(repartirHoras(de(6, 22), 6)).toEqual([6, 9, 12, 16, 19, 22]);
  });
  it('los extremos: 1 deja la primera, 2 la primera y la última, y n igual o mayor que las que hay las deja todas', () => {
    expect(repartirHoras(de(6, 22), 1)).toEqual([6]);
    expect(repartirHoras(de(6, 22), 0)).toEqual([6]);
    expect(repartirHoras(de(6, 22), 2)).toEqual([6, 22]);
    expect(repartirHoras(de(6, 22), 17)).toEqual(de(6, 22));
    expect(repartirHoras(de(6, 22), 40)).toEqual(de(6, 22));
    expect(repartirHoras([], 3)).toEqual([]);
  });
  it('para cualquier cantidad que cabe salen exactamente n horas distintas, en orden, con la primera y la última', () => {
    for (let total = 2; total <= 21; total++) {
      const horas = de(3, 2 + total);
      for (let n = 2; n <= total; n++) {
        const elegidas = repartirHoras(horas, n);
        expect(elegidas).toHaveLength(n);
        expect(new Set(elegidas).size).toBe(n);
        expect(elegidas).toEqual([...elegidas].sort((a, b) => a - b));
        expect(elegidas[0]).toBe(horas[0]);
        expect(elegidas[n - 1]).toBe(horas[total - 1]);
      }
    }
  });
});

describe('qué días se editan: hoy y lo pasado NO', () => {
  it('sin días marcados son todos los que vienen; hoy (viernes) y lo pasado no entran', () => {
    expect(diasQueSeEditan(viernes(), [])).toEqual([6, 7]);
  });
  it('con días marcados, esos; un día con candado marcado igual no se edita', () => {
    expect(diasQueSeEditan(viernes(), [6])).toEqual([6]);
    expect(diasQueSeEditan(viernes(), [5, 6])).toEqual([6]);
    expect(diasQueSeEditan(viernes(), [1, 2])).toEqual([]);
  });
});

describe('la vista de un día con lo tocado encima', () => {
  it('Automático pregunta todas las que caben; Personalizado sin veces propone 6 (o menos si no caben)', () => {
    const config = viernes();
    expect(vistaDelDia(config, 6)).toMatchObject({ modo: 'AUTOMATICO', veces: 17, maximo: 17 });
    expect(vistaDelDia(config, 6, { 6: { modo: 'PERSONALIZADO' } })).toMatchObject({ modo: 'PERSONALIZADO', veces: 6 });
    const corto = miRadarDePrueba(true, { 6: { despertar: '08:00', dormir: '10:30' } });
    expect(vistaDelDia(corto, 6, { 6: { modo: 'PERSONALIZADO' } })?.veces).toBe(3);
  });
  it('las veces de Personalizado nunca bajan de 1 ni pasan de las que caben', () => {
    const config = viernes();
    expect(vistaDelDia(config, 6, { 6: { modo: 'PERSONALIZADO', veces: 99 } })?.veces).toBe(17);
    expect(vistaDelDia(config, 6, { 6: { modo: 'PERSONALIZADO', veces: 0 } })?.veces).toBe(1);
  });
  it('un día sin Despertar o «Sin Radar» tiene 0 veces y en la fila dice «—»', () => {
    const config = viernes({ 6: { despertar: null }, 7: { sinRadar: true } });
    expect(vistaDelDia(config, 6)).toMatchObject({ veces: 0, sinHorario: true });
    expect(textoDelDiaEnLaFila(vistaDelDia(config, 6)!)).toBe('—');
    expect(vistaDelDia(config, 7)).toMatchObject({ veces: 0, sinRadar: true, cuantas: 17 });
    expect(textoDelDiaEnLaFila(vistaDelDia(config, 7)!)).toBe('—');
    expect(textoDelDiaEnLaFila(vistaDelDia(config, 1)!)).toBe('17');
  });
});

describe('«Veces al día» con − / +', () => {
  it('+ y − cambian solo los días marcados y respetan 1 y el máximo', () => {
    const config = viernes();
    let borrador = conElModo([6], {}, 'PERSONALIZADO');
    expect(vecesDelObjetivo(config, [6], borrador)).toEqual({ veces: 6, noBaja: false, noSube: false });
    borrador = conVecesAjustadas(config, [6], borrador, 1);
    expect(vistaDelDia(config, 6, borrador)?.veces).toBe(7);
    expect(vistaDelDia(config, 7, borrador)?.veces).toBe(17);
    for (let i = 0; i < 20; i++) borrador = conVecesAjustadas(config, [6], borrador, -1);
    expect(vistaDelDia(config, 6, borrador)?.veces).toBe(1);
    expect(vecesDelObjetivo(config, [6], borrador)).toMatchObject({ veces: 1, noBaja: true, noSube: false });
    for (let i = 0; i < 30; i++) borrador = conVecesAjustadas(config, [6], borrador, 1);
    expect(vecesDelObjetivo(config, [6], borrador)).toMatchObject({ veces: 17, noBaja: false, noSube: true });
  });

  it('cada día parte de las suyas: con veces distintas entre los marcados la cifra es «—» y + sube cada uno en uno', () => {
    const config = viernes({ 6: { modo: 'PERSONALIZADO', veces: 4 }, 7: { modo: 'PERSONALIZADO', veces: 9 } });
    expect(vecesDelObjetivo(config, [6, 7], {})?.veces).toBeNull();
    const borrador = conVecesAjustadas(config, [6, 7], {}, 1);
    expect(vistaDelDia(config, 6, borrador)?.veces).toBe(5);
    expect(vistaDelDia(config, 7, borrador)?.veces).toBe(10);
  });

  it('el máximo de cada día es el suyo: un día de 08:00 a 10:30 solo llega a 3', () => {
    const config = viernes({ 6: { despertar: '08:00', dormir: '10:30', modo: 'PERSONALIZADO', veces: 2 } });
    let borrador = {};
    for (let i = 0; i < 5; i++) borrador = conVecesAjustadas(config, [6], borrador, 1);
    expect(vistaDelDia(config, 6, borrador)?.veces).toBe(3);
  });

  it('un día sin horario no cuenta: si ninguno de los que se editan tiene, no hay «Veces al día»', () => {
    const config = viernes({ 6: { despertar: null }, 7: { despertar: null } });
    expect(vecesDelObjetivo(config, [6, 7], {})).toBeNull();
  });
});

describe('qué se guarda: SOLO lo tocado, y solo días que se pueden editar', () => {
  it('sin tocar nada no hay nada que guardar', () => {
    expect(cambiosParaGuardar(viernes(), [6, 7], {})).toEqual([]);
    expect(hayCambios(viernes(), [6, 7], {})).toBe(false);
  });

  it('pasar a Personalizado con 3 veces manda modo, veces y sinRadar solo de los días que se editan', () => {
    const config = viernes();
    let borrador = conElModo([6, 7], {}, 'PERSONALIZADO');
    borrador = conVecesAjustadas(config, [6, 7], borrador, -1);
    borrador = conVecesAjustadas(config, [6, 7], borrador, -1);
    borrador = conVecesAjustadas(config, [6, 7], borrador, -1);
    expect(cambiosParaGuardar(config, [6, 7], borrador)).toEqual([
      { dia: 6, modo: 'PERSONALIZADO', veces: 3, sinRadar: false },
      { dia: 7, modo: 'PERSONALIZADO', veces: 3, sinRadar: false },
    ]);
  });

  it('volver a Automático manda el modo y no las veces', () => {
    const config = viernes({ 6: { modo: 'PERSONALIZADO', veces: 4, horas: [6, 12, 17, 22] } });
    expect(cambiosParaGuardar(config, [6], conElModo([6], {}, 'AUTOMATICO'))).toEqual([{ dia: 6, modo: 'AUTOMATICO', sinRadar: false }]);
  });

  it('«Sin Radar» manda solo ese día; un día que ya estaba así no se vuelve a mandar', () => {
    const config = viernes({ 7: { sinRadar: true } });
    expect(cambiosParaGuardar(config, [6, 7], conSinRadar([6, 7], {}, true))).toEqual([{ dia: 6, modo: 'AUTOMATICO', sinRadar: true }]);
  });

  it('hoy y lo pasado nunca se mandan, aunque estén en el borrador', () => {
    const config = viernes();
    const borrador = conElModo([5, 6], {}, 'PERSONALIZADO');
    expect(cambiosParaGuardar(config, [5, 6], borrador).map(c => c.dia)).toEqual([6]);
  });

  it('el modo que se muestra es el del primer día que se edita, y «Sin Radar» de todos los marcados se lee verdadero', () => {
    const config = viernes({ 6: { modo: 'PERSONALIZADO', veces: 5 } });
    expect(modoQueSeMuestra(config, [6, 7], {})).toBe('PERSONALIZADO');
    expect(modoQueSeMuestra(config, [7, 6], {})).toBe('AUTOMATICO');
    expect(todosSinRadar(config, [6, 7], conSinRadar([6, 7], {}, true))).toBe(true);
    expect(todosSinRadar(config, [6, 7], conSinRadar([6], {}, true))).toBe(false);
  });
});

describe('«Hora»: el horario que se lee', () => {
  it('un horario igual en los días que se miran: «05:30 a 22:30»', () => {
    expect(horaDeLosDias(miRadarConHorario('05:30', '22:30'), [1, 2])).toEqual({ tipo: 'horario', despertar: '05:30', dormir: '22:30' });
  });
  it('horarios distintos: «Estos días tienen horas distintas»', () => {
    const config = miRadarDePrueba(true, { 7: { despertar: '08:00', dormir: '23:00' } });
    expect(horaDeLosDias(config, [6, 7])).toEqual({ tipo: 'distintas' });
    expect(horaDeLosDias(config, [6])).toEqual({ tipo: 'horario', despertar: '05:30', dormir: '22:30' });
  });
  it('si falta el Despertar o el Dormir manda la falta, con su botón', () => {
    const sinDespertar = miRadarDePrueba(true, { 4: { despertar: null } });
    expect(horaDeLosDias(sinDespertar, [4])).toEqual({ tipo: 'falta', motivo: 'SIN_DESPERTAR' });
    expect(textoDeLaFalta('SIN_DESPERTAR')).toBe('Falta tu hora de Despertar');
    expect(botonDeLaFalta('SIN_DESPERTAR')).toBe('Programar mi Despertar');
    const sinDormir = miRadarDePrueba(true, { 4: { dormir: null } });
    expect(horaDeLosDias(sinDormir, [4])).toEqual({ tipo: 'falta', motivo: 'SIN_DORMIR' });
    expect(textoDeLaFalta('SIN_DORMIR')).toBe('Falta tu hora de Dormir');
    expect(botonDeLaFalta('SIN_DORMIR')).toBe('Programar mi Dormir');
    expect(textoDeLaFalta('HORARIO_INVALIDO')).toBe('Tu Dormir es antes que tu Despertar');
    // Una falta entre varios días manda sobre los horarios de los demás.
    expect(horaDeLosDias(sinDespertar, [3, 4])).toEqual({ tipo: 'falta', motivo: 'SIN_DESPERTAR' });
    expect(horaDeLosDias(miRadarDePrueba(), [])).toBeNull();
    expect(diaDePrueba(1).maximo).toBe(17);
  });
});
