import { describe, expect, it } from '@jest/globals';

import type { ColorSemaforo, DetalleDelSemaforo, DiaDelSemaforo } from '../../../semaforo/types/semaforo.types';
import { semaforoParaLaAgenda } from '../semaforoEnAgenda';

function dia(fecha: string, color: ColorSemaforo): DiaDelSemaforo {
  return { fecha, estado: 'MEDIDO', porcentaje: 80, color, habitos: null, objetivos: null };
}

/**
 * Ventana vigente del jueves 17 al miércoles 23 de septiembre de 2026: "hoy" para la persona es el
 * jueves 24. La semana en curso empezó el sábado 19, así que los días vividos de esta semana son
 * sáb 19, dom 20, lun 21, mar 22 y mié 23.
 */
function detalle(cambios: Partial<DetalleDelSemaforo> = {}, color: ColorSemaforo = 'AMARILLO'): DetalleDelSemaforo {
  return {
    aplica: true,
    obligatorio: true,
    zona: 'America/Lima',
    pausa: null,
    vigente: {
      desde: '2026-09-17',
      hasta: '2026-09-23',
      porcentaje: 72.5,
      color,
      etiqueta: null,
      diasConDatos: 7,
      cerrada: false,
      dias: [
        dia('2026-09-17', 'VERDE'),
        dia('2026-09-18', 'VERDE'),
        dia('2026-09-19', 'ROJO'),
        dia('2026-09-20', 'AMARILLO'),
        dia('2026-09-21', 'VERDE'),
        dia('2026-09-22', 'SIN_DATOS'),
        dia('2026-09-23', 'VERDE'),
      ],
    },
    semanas: [],
    calculadoEn: null,
    ...cambios,
  };
}

/* El reloj del teléfono no manda: el "hoy" sale de la ventana del servidor. Se fija un instante que
   en UTC ya es el día siguiente (01:00 UTC del viernes 25 = jueves 24 a las 20:00 en Lima), el caso
   que escondía el bug del reloj (E-91 del backend). */
const AHORA = new Date('2026-09-25T01:00:00Z');

describe('el semáforo arriba de «Mi agenda»', () => {
  it('con 404 (backend viejo), 403 o sin red no muestra nada, ni un error', () => {
    for (const fallo of ['no_disponible', 'sin_permiso', 'sin_red', 'error'] as const) {
      expect(semaforoParaLaAgenda(null, fallo, AHORA)).toBeNull();
      expect(semaforoParaLaAgenda(detalle(), fallo, AHORA)).toBeNull();
    }
  });

  it('mientras no llegó la lectura no muestra nada', () => {
    expect(semaforoParaLaAgenda(null, null, AHORA)).toBeNull();
  });

  it('quien no se mide (mentor sin programa, administración) no ve nada', () => {
    expect(semaforoParaLaAgenda(detalle({ aplica: false, vigente: null }), null, AHORA)).toBeNull();
  });

  it('sin ventana o sin datos en la ventana no muestra nada', () => {
    expect(semaforoParaLaAgenda(detalle({ vigente: null }), null, AHORA)).toBeNull();
    expect(semaforoParaLaAgenda(detalle({}, 'SIN_DATOS'), null, AHORA)).toBeNull();
  });

  it('con color muestra el del servidor y su palabra de siempre', () => {
    const lectura = semaforoParaLaAgenda(detalle(), null, AHORA);
    expect(lectura?.color).toBe('AMARILLO');
    expect(lectura?.palabra).toBe('Requiere atención');
  });

  it('gana la palabra que manda el servidor', () => {
    const d = detalle();
    d.vigente!.etiqueta = 'Vas bien';
    expect(semaforoParaLaAgenda(d, null, AHORA)?.palabra).toBe('Vas bien');
  });

  it('los puntitos son solo los días ya vividos de esta semana (sábado → ayer), con su color', () => {
    const lectura = semaforoParaLaAgenda(detalle(), null, AHORA);
    expect(lectura?.diasVividos).toEqual([
      { fecha: '2026-09-19', rotulo: 'Sáb', color: 'ROJO' },
      { fecha: '2026-09-20', rotulo: 'Dom', color: 'AMARILLO' },
      { fecha: '2026-09-21', rotulo: 'Lun', color: 'VERDE' },
      { fecha: '2026-09-22', rotulo: 'Mar', color: 'SIN_DATOS' },
      { fecha: '2026-09-23', rotulo: 'Mié', color: 'VERDE' },
    ]);
  });

  it('un sábado la semana recién empieza: la línea sí, puntitos ninguno (no se predice)', () => {
    const d = detalle();
    d.vigente!.desde = '2026-09-19';
    d.vigente!.hasta = '2026-09-25'; // hoy = sábado 26
    d.vigente!.dias = d.vigente!.dias.map((x, i) => ({ ...x, fecha: `2026-09-${19 + i}` }));
    const lectura = semaforoParaLaAgenda(d, null, AHORA);
    expect(lectura?.color).toBe('AMARILLO');
    expect(lectura?.diasVividos).toEqual([]);
  });

  it('un viernes entran de sábado a jueves; hoy nunca lleva color', () => {
    const d = detalle();
    d.vigente!.desde = '2026-09-18';
    d.vigente!.hasta = '2026-09-24'; // hoy = viernes 25
    d.vigente!.dias = d.vigente!.dias.map((x, i) => ({ ...x, fecha: `2026-09-${18 + i}` }));
    const fechas = semaforoParaLaAgenda(d, null, AHORA)?.diasVividos.map(x => x.fecha);
    expect(fechas).toEqual(['2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24']);
  });
});
