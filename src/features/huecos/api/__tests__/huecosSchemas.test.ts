import { describe, expect, it } from '@jest/globals';

import { esFechaIso, leerHuecosDeLaSemana } from '../huecosSchemas';

/**
 * El esquema de los huecos de horario (spec 015): tolerante por partes. Un día, un hueco o un campo del resumen que no se
 * entienden se pierden ELLOS; lo único indispensable es la `semana`.
 */

const COMPLETA = {
  semana: '2026-10-26',
  primeraSemana: '2026-10-12',
  cerrada: false,
  dias: [
    {
      fecha: '2026-10-26',
      ventana: { desde: '05:30', hasta: '22:30' },
      minutosOcupados: 410,
      minutosLibres: 390,
      huecos: [{ desde: '15:00', hasta: '17:00', minutos: 120 }],
    },
  ],
  resumen: {
    minutosOcupados: 2870,
    minutosLibres: 2730,
    huecosQueSeRepiten: [{ desde: '15:00', hasta: '17:00', dias: [1, 3, 4] }],
    cumplidosATiempo: 32,
    cumplidosTarde: 6,
    noCumplidos: 4,
  },
};

describe('leerHuecosDeLaSemana', () => {
  it('lee la respuesta del contrato tal cual', () => {
    const r = leerHuecosDeLaSemana(COMPLETA, 'prueba');
    expect(r.semana).toBe('2026-10-26');
    expect(r.primeraSemana).toBe('2026-10-12');
    expect(r.cerrada).toBe(false);
    expect(r.dias).toEqual([
      {
        fecha: '2026-10-26',
        ventana: { desde: '05:30', hasta: '22:30' },
        minutosOcupados: 410,
        minutosLibres: 390,
        huecos: [{ desde: '15:00', hasta: '17:00', minutos: 120 }],
        /* El servidor de antes no manda la agenda del día: «no lo dice» (null), no «nada planificado» ni ceros. */
        sinVentanaPor: null,
        ocupados: null,
        cumplidosATiempo: null,
        cumplidosTarde: null,
        noCumplidos: null,
      },
    ]);
    expect(r.hoy).toBeNull();
    expect(r.resumen).toEqual({
      minutosOcupados: 2870,
      minutosLibres: 2730,
      huecosQueSeRepiten: [{ desde: '15:00', hasta: '17:00', dias: [1, 3, 4] }],
      cumplidosATiempo: 32,
      cumplidosTarde: 6,
      noCumplidos: 4,
    });
  });

  it('con solo la semana, el resto se lee como «no hay» y no revienta', () => {
    const r = leerHuecosDeLaSemana({ semana: '2026-10-26' }, 'prueba');
    expect(r).toEqual({ semana: '2026-10-26', primeraSemana: null, hoy: null, cerrada: false, dias: [], resumen: null });
  });

  it('un campo nuevo que el servidor agregue no rompe nada', () => {
    const r = leerHuecosDeLaSemana({ ...COMPLETA, algoNuevo: { x: 1 } }, 'prueba');
    expect(r.dias).toHaveLength(1);
  });

  it.each([
    ['sin semana', { dias: [] }],
    ['con una semana que no es fecha', { semana: 'esta' }],
    ['con una fecha que no existe', { semana: '2026-02-31' }],
    ['con otra cosa que un objeto', 'hola'],
    ['nula', null],
  ])('una respuesta %s es un fallo (no hay a dónde ir con ‹ ›)', (_nombre, datos) => {
    expect(() => leerHuecosDeLaSemana(datos, 'GET /huecos')).toThrow(/Respuesta inesperada de GET \/huecos/);
  });

  it('una ventana nula, ausente o rota cuenta el día entero', () => {
    const dia = (extra: object) => ({ fecha: '2026-10-27', huecos: [], ...extra });
    const r = leerHuecosDeLaSemana(
      {
        semana: '2026-10-26',
        dias: [dia({ ventana: null }), { ...dia({}), fecha: '2026-10-28' }, { ...dia({ ventana: { desde: 'x' } }), fecha: '2026-10-29' }],
      },
      'prueba',
    );
    expect(r.dias.map(d => d.ventana)).toEqual([null, null, null]);
  });

  it('un día roto se pierde solo él, y los días quedan en orden y sin repetir', () => {
    const r = leerHuecosDeLaSemana(
      {
        semana: '2026-10-26',
        dias: [
          { fecha: '2026-10-28', huecos: [] },
          { fecha: 'mañana', huecos: [] },
          'basura',
          { fecha: '2026-10-26', huecos: [] },
          { fecha: '2026-10-28', huecos: [{ desde: '10:00', hasta: '11:00' }] },
        ],
      },
      'prueba',
    );
    expect(r.dias.map(d => d.fecha)).toEqual(['2026-10-26', '2026-10-28']);
    /* Gana el primero de un día repetido. */
    expect(r.dias[1].huecos).toEqual([]);
  });

  it('un hueco roto o al revés se pierde solo él; los demás quedan en orden', () => {
    const r = leerHuecosDeLaSemana(
      {
        semana: '2026-10-26',
        dias: [
          {
            fecha: '2026-10-26',
            huecos: [
              { desde: '18:00', hasta: '19:00', minutos: 60 },
              { desde: '25:00', hasta: '26:00' },
              { desde: '17:00', hasta: '16:00' },
              { desde: '09:00', hasta: '09:30', minutos: 30 },
              null,
            ],
          },
        ],
      },
      'prueba',
    );
    expect(r.dias[0].huecos.map(h => h.desde)).toEqual(['09:00', '18:00']);
  });

  it('si no llegan los minutos de un hueco, salen de sus dos horas', () => {
    const r = leerHuecosDeLaSemana(
      { semana: '2026-10-26', dias: [{ fecha: '2026-10-26', huecos: [{ desde: '15:00', hasta: '16:30' }] }] },
      'prueba',
    );
    expect(r.dias[0].huecos[0].minutos).toBe(90);
  });

  it('acepta HH:mm:ss y el 24:00 de un día sin ventana', () => {
    const r = leerHuecosDeLaSemana(
      {
        semana: '2026-10-26',
        dias: [{ fecha: '2026-10-26', ventana: null, huecos: [{ desde: '20:00:00', hasta: '24:00', minutos: 240 }] }],
      },
      'prueba',
    );
    expect(r.dias[0].huecos[0]).toEqual({ desde: '20:00', hasta: '24:00', minutos: 240 });
  });

  it('un cero en los minutos del día es un cero; un campo que falta o es basura es «no sé» (null)', () => {
    const r = leerHuecosDeLaSemana(
      {
        semana: '2026-10-26',
        dias: [
          { fecha: '2026-10-26', minutosOcupados: 0, minutosLibres: 'mucho', huecos: [] },
          { fecha: '2026-10-27', minutosOcupados: -5, huecos: [] },
        ],
      },
      'prueba',
    );
    expect(r.dias[0].minutosOcupados).toBe(0);
    expect(r.dias[0].minutosLibres).toBeNull();
    expect(r.dias[1].minutosOcupados).toBeNull();
    expect(r.dias[1].minutosLibres).toBeNull();
  });

  it('un resumen roto se pierde solo él: los días siguen', () => {
    const r = leerHuecosDeLaSemana({ ...COMPLETA, resumen: 'roto' }, 'prueba');
    expect(r.resumen).toBeNull();
    expect(r.dias).toHaveLength(1);
  });

  it('en el resumen, un campo roto se pierde solo él y los huecos que se repiten se limpian', () => {
    const r = leerHuecosDeLaSemana(
      {
        ...COMPLETA,
        resumen: {
          minutosOcupados: 'mucho',
          minutosLibres: 600,
          huecosQueSeRepiten: [
            { desde: '15:00', hasta: '17:00', dias: [4, 1, 1, 9, 0, 3] },
            { desde: '12:00', hasta: '13:00', dias: [] },
            { desde: '??', hasta: '13:00', dias: [1, 2, 3] },
            7,
          ],
          cumplidosATiempo: 3.4,
          cumplidosTarde: 'x',
        },
      },
      'prueba',
    );
    expect(r.resumen).toEqual({
      minutosOcupados: null,
      minutosLibres: 600,
      huecosQueSeRepiten: [{ desde: '15:00', hasta: '17:00', dias: [1, 3, 4] }],
      cumplidosATiempo: 3,
      cumplidosTarde: null,
      noCumplidos: null,
    });
  });

  it('`cerrada` que no es booleano se lee como la semana en curso (false)', () => {
    expect(leerHuecosDeLaSemana({ semana: '2026-10-26', cerrada: 'sí' }, 'prueba').cerrada).toBe(false);
    expect(leerHuecosDeLaSemana({ semana: '2026-10-19', cerrada: true }, 'prueba').cerrada).toBe(true);
  });

  it('una primeraSemana que no es fecha se lee como «no se sabe»', () => {
    expect(leerHuecosDeLaSemana({ semana: '2026-10-26', primeraSemana: 'ayer' }, 'prueba').primeraSemana).toBeNull();
  });
});

/** Un día de la semana en curso como lo manda el servidor desde el 2026-10-29: con su agenda, lo cumplido y `hoy`. */
const DIA_CON_AGENDA = {
  fecha: '2026-10-29',
  ventana: { desde: '05:30', hasta: '22:30' },
  sinVentanaPor: null,
  minutosOcupados: 410,
  minutosLibres: 610,
  huecos: [{ desde: '15:00', hasta: '17:00', minutos: 120 }],
  ocupados: [
    { desde: '09:00', hasta: '10:30', tipo: 'EVENTO', titulo: 'Reunión de equipo' },
    { desde: '05:30', hasta: '06:00', tipo: 'HABITO', titulo: 'Despertar' },
    { desde: '14:00', hasta: '15:00', tipo: 'AGENDA', titulo: null },
  ],
  cumplidosATiempo: 5,
  cumplidosTarde: 1,
  noCumplidos: 0,
};

describe('la agenda del día (corregido 2026-10-29)', () => {
  const leer = (dia: unknown, extra: Record<string, unknown> = {}) =>
    leerHuecosDeLaSemana({ semana: '2026-10-26', hoy: '2026-10-29', dias: [dia], ...extra }, 'prueba');

  it('lee los bloques con su tipo y su nombre, en orden de hora, y lo cumplido del día', () => {
    const r = leer(DIA_CON_AGENDA);
    expect(r.hoy).toBe('2026-10-29');
    expect(r.dias[0].ocupados).toEqual([
      { desde: '05:30', hasta: '06:00', tipo: 'HABITO', titulo: 'Despertar' },
      { desde: '09:00', hasta: '10:30', tipo: 'EVENTO', titulo: 'Reunión de equipo' },
      { desde: '14:00', hasta: '15:00', tipo: 'AGENDA', titulo: null },
    ]);
    expect([r.dias[0].cumplidosATiempo, r.dias[0].cumplidosTarde, r.dias[0].noCumplidos]).toEqual([5, 1, 0]);
  });

  it('la agenda personal nunca lleva nombre, aunque el servidor lo mande', () => {
    const r = leer({ ...DIA_CON_AGENDA, ocupados: [{ desde: '14:00', hasta: '15:00', tipo: 'AGENDA', titulo: 'Dentista' }] });
    expect(r.dias[0].ocupados).toEqual([{ desde: '14:00', hasta: '15:00', tipo: 'AGENDA', titulo: null }]);
  });

  it('un tipo que la app no conoce se dibuja igual, como «OTRO»; un nombre vacío es «sin nombre»', () => {
    const r = leer({
      ...DIA_CON_AGENDA,
      ocupados: [
        { desde: '10:00', hasta: '11:00', tipo: 'RADAR', titulo: '  Algo  ' },
        { desde: '12:00', hasta: '13:00', tipo: 'HABITO', titulo: '   ' },
        { desde: '13:00', hasta: '14:00', tipo: 7, titulo: 3 },
      ],
    });
    expect(r.dias[0].ocupados).toEqual([
      { desde: '10:00', hasta: '11:00', tipo: 'OTRO', titulo: 'Algo' },
      { desde: '12:00', hasta: '13:00', tipo: 'HABITO', titulo: null },
      { desde: '13:00', hasta: '14:00', tipo: 'OTRO', titulo: null },
    ]);
  });

  it('un bloque roto (hora inválida, o que termina antes de empezar) se pierde SOLO él', () => {
    const r = leer({
      ...DIA_CON_AGENDA,
      ocupados: [
        { desde: '25:00', hasta: '26:00', tipo: 'HABITO', titulo: 'No' },
        { desde: '11:00', hasta: '10:00', tipo: 'HABITO', titulo: 'Al revés' },
        { desde: '11:00', hasta: '11:00', tipo: 'HABITO', titulo: 'Cero' },
        'hola',
        { desde: '08:00', hasta: '09:00', tipo: 'ACCION', titulo: 'Sí' },
      ],
    });
    expect(r.dias[0].ocupados).toEqual([{ desde: '08:00', hasta: '09:00', tipo: 'ACCION', titulo: 'Sí' }]);
  });

  it('una lista vacía es «nada planificado» (distinto de que el servidor no la diga)', () => {
    expect(leer({ ...DIA_CON_AGENDA, ocupados: [] }).dias[0].ocupados).toEqual([]);
    expect(leer({ ...DIA_CON_AGENDA, ocupados: null }).dias[0].ocupados).toBeNull();
    expect(leer({ ...DIA_CON_AGENDA, ocupados: 'x' }).dias[0].ocupados).toBeNull();
  });

  it('un día de una semana cerrada: todo en null, y los campos de antes siguen', () => {
    const { ocupados: _o, cumplidosATiempo: _a, cumplidosTarde: _t, noCumplidos: _n, ...cerrado } = DIA_CON_AGENDA;
    const dia = leer({ ...cerrado, ocupados: null, cumplidosATiempo: null }, { cerrada: true }).dias[0];
    expect(dia.ocupados).toBeNull();
    expect(dia.cumplidosATiempo).toBeNull();
    expect(dia.minutosLibres).toBe(610);
    expect(dia.huecos).toHaveLength(1);
  });

  it('un cero es un dato; lo que no es número no lo es', () => {
    const dia = leer({ ...DIA_CON_AGENDA, cumplidosATiempo: 0, cumplidosTarde: 'dos', noCumplidos: -1 }).dias[0];
    expect(dia.cumplidosATiempo).toBe(0);
    expect(dia.cumplidosTarde).toBeNull();
    expect(dia.noCumplidos).toBeNull();
  });

  it.each([
    ['SIN_DESPERTAR', 'SIN_DESPERTAR'],
    ['SIN_DORMIR', 'SIN_DORMIR'],
    ['SIN_DESPERTAR_NI_DORMIR', 'SIN_DESPERTAR_NI_DORMIR'],
    ['DORMIR_ANTES_DE_DESPERTAR', 'DORMIR_ANTES_DE_DESPERTAR'],
    ['ALGO_NUEVO', null],
    [7, null],
    [null, null],
  ])('sinVentanaPor %j se lee %j', (valor, esperado) => {
    expect(leer({ ...DIA_CON_AGENDA, ventana: null, sinVentanaPor: valor }).dias[0].sinVentanaPor).toBe(esperado);
  });

  it('un hoy que no es fecha se lee como «no se sabe»', () => {
    expect(leerHuecosDeLaSemana({ semana: '2026-10-26', hoy: 'hoy' }, 'prueba').hoy).toBeNull();
    expect(leerHuecosDeLaSemana({ semana: '2026-10-26', hoy: '2026-02-31' }, 'prueba').hoy).toBeNull();
  });
});

describe('esFechaIso', () => {
  it('solo acepta fechas que existen', () => {
    expect(esFechaIso('2026-10-26')).toBe(true);
    expect(esFechaIso('2028-02-29')).toBe(true);
    expect(esFechaIso('2026-02-29')).toBe(false);
    expect(esFechaIso('26/10/2026')).toBe(false);
    expect(esFechaIso(20261026)).toBe(false);
  });
});
