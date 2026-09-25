import { describe, expect, it } from '@jest/globals';

import {
  aDetalleDelSemaforo,
  aSemaforoDeHoy,
  semaforoSchemas,
  validarRespuesta,
} from '../semaforoSchemas';

/**
 * El semáforo contra su contrato (`docs/arquitectura/SEMAFORO_DEL_APRENDIZ.md` del backend, §4.1 y
 * §4.2). Los dos primeros ejemplos están copiados TAL CUAL del documento: si el contrato cambia y
 * la app no, esto es lo primero que tiene que romperse.
 *
 * Lo que se fija, además de "se puede leer":
 * - nunca verde por falta de datos, y nunca un 0 % inventado;
 * - un campo nuevo, un color nuevo o un estado nuevo no tumban nada;
 * - lo imprescindible que falta sí se dice, con un error claro.
 */

const ORIGEN = 'GET /api/v1/me/semaforo';

function leer(crudo: unknown) {
  return aDetalleDelSemaforo(validarRespuesta(semaforoSchemas.detalle, crudo, ORIGEN));
}

/** §4.1, copiado del contrato. */
const EJEMPLO_DEL_CONTRATO = {
  aplica: true,
  obligatorio: true,
  zona: 'America/Lima',
  pausa: null,
  vigente: {
    desde: '2026-09-18', hasta: '2026-09-24',
    porcentaje: 78.3, color: 'AMARILLO', etiqueta: 'Requiere atención',
    diasConDatos: 6, cerrada: false,
    dias: [
      { fecha: '2026-09-18', estado: 'MEDIDO', porcentaje: 75, color: 'AMARILLO',
        habitos: { programados: 9, cumplidos: 7 },
        objetivos: { programados: 3, cumplidos: 2 } },
    ],
  },
  semanas: [
    { desde: '2026-09-12', hasta: '2026-09-18', porcentaje: 82.0, color: 'VERDE',
      etiqueta: 'Al día', diasConDatos: 7, cerradaEn: '2026-09-19T05:25:03Z' },
  ],
  calculadoEn: '2026-09-25T05:25:03Z',
};

/**
 * Los cinco estados de un día en una misma ventana, coherente consigo misma: tres días medidos
 * (75, 100 y 50 → promedio 75.0, amarillo) y los otros cuatro sin porcentaje. Es de alguien del
 * staff (`obligatorio: false`) porque solo el staff puede tener días en pausa.
 */
const VENTANA_CON_TODOS_LOS_ESTADOS = {
  aplica: true,
  obligatorio: false,
  zona: 'America/Lima',
  pausa: null,
  vigente: {
    desde: '2026-09-18', hasta: '2026-09-24',
    porcentaje: 75.0, color: 'AMARILLO', etiqueta: 'Requiere atención',
    diasConDatos: 3, cerrada: false,
    dias: [
      { fecha: '2026-09-18', estado: 'FUERA_DEL_PROGRAMA', porcentaje: null, color: 'SIN_DATOS',
        habitos: { programados: 0, cumplidos: 0 }, objetivos: { programados: 0, cumplidos: 0 } },
      { fecha: '2026-09-19', estado: 'MEDIDO', porcentaje: 75, color: 'AMARILLO',
        habitos: { programados: 9, cumplidos: 7 }, objetivos: { programados: 3, cumplidos: 2 } },
      { fecha: '2026-09-20', estado: 'SIN_DATOS', porcentaje: null, color: 'SIN_DATOS',
        habitos: { programados: 0, cumplidos: 0 }, objetivos: { programados: 0, cumplidos: 0 } },
      { fecha: '2026-09-21', estado: 'MEDIDO', porcentaje: 100, color: 'VERDE',
        habitos: { programados: 8, cumplidos: 8 }, objetivos: { programados: 2, cumplidos: 2 } },
      { fecha: '2026-09-22', estado: 'PAUSADO', porcentaje: null, color: 'SIN_DATOS',
        habitos: { programados: 0, cumplidos: 0 }, objetivos: { programados: 0, cumplidos: 0 } },
      { fecha: '2026-09-23', estado: 'MEDIDO', porcentaje: 50, color: 'ROJO',
        habitos: { programados: 6, cumplidos: 3 }, objetivos: { programados: 2, cumplidos: 1 } },
      { fecha: '2026-09-24', estado: 'PENDIENTE', porcentaje: null, color: 'SIN_DATOS',
        habitos: { programados: 0, cumplidos: 0 }, objetivos: { programados: 0, cumplidos: 0 } },
    ],
  },
  semanas: [],
  calculadoEn: '2026-09-25T05:25:03Z',
};

describe('GET /api/v1/me/semaforo — el ejemplo del contrato (§4.1)', () => {
  it('se lee entero, sin perder nada', () => {
    const detalle = leer(EJEMPLO_DEL_CONTRATO);

    expect(detalle.aplica).toBe(true);
    expect(detalle.obligatorio).toBe(true);
    expect(detalle.zona).toBe('America/Lima');
    expect(detalle.pausa).toBeNull();
    expect(detalle.calculadoEn).toBe('2026-09-25T05:25:03Z');
    expect(detalle.vigente).toEqual({
      desde: '2026-09-18',
      hasta: '2026-09-24',
      porcentaje: 78.3,
      color: 'AMARILLO',
      etiqueta: 'Requiere atención',
      diasConDatos: 6,
      cerrada: false,
      dias: [
        {
          fecha: '2026-09-18',
          estado: 'MEDIDO',
          porcentaje: 75,
          color: 'AMARILLO',
          habitos: { programados: 9, cumplidos: 7 },
          objetivos: { programados: 3, cumplidos: 2 },
        },
      ],
    });
    expect(detalle.semanas).toEqual([
      {
        desde: '2026-09-12',
        hasta: '2026-09-18',
        porcentaje: 82,
        color: 'VERDE',
        etiqueta: 'Al día',
        diasConDatos: 7,
        cerradaEn: '2026-09-19T05:25:03Z',
      },
    ]);
  });

  /* El promedio llega con un decimal y el color se decidió con ese decimal. */
  it('no redondea el promedio: 79.9 sigue siendo 79.9', () => {
    const detalle = leer({
      ...EJEMPLO_DEL_CONTRATO,
      vigente: { ...EJEMPLO_DEL_CONTRATO.vigente, porcentaje: 79.9 },
    });
    expect(detalle.vigente?.porcentaje).toBe(79.9);
    expect(detalle.vigente?.color).toBe('AMARILLO');
  });
});

describe('los cinco estados de un día', () => {
  const detalle = leer(VENTANA_CON_TODOS_LOS_ESTADOS);
  const dias = detalle.vigente!.dias;

  it('trae los 7 días, del más viejo al más nuevo', () => {
    expect(dias.map(d => d.fecha)).toEqual([
      '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24',
    ]);
  });

  it('solo los días MEDIDO tienen porcentaje y color', () => {
    expect(dias.map(d => [d.estado, d.porcentaje, d.color])).toEqual([
      ['FUERA_DEL_PROGRAMA', null, 'SIN_DATOS'],
      ['MEDIDO', 75, 'AMARILLO'],
      ['SIN_DATOS', null, 'SIN_DATOS'],
      ['MEDIDO', 100, 'VERDE'],
      ['PAUSADO', null, 'SIN_DATOS'],
      ['MEDIDO', 50, 'ROJO'],
      ['PENDIENTE', null, 'SIN_DATOS'],
    ]);
  });

  it('es del staff: se puede pausar', () => {
    expect(detalle.obligatorio).toBe(false);
  });

  it('ordena los días aunque lleguen desordenados', () => {
    const desordenado = {
      ...VENTANA_CON_TODOS_LOS_ESTADOS,
      vigente: {
        ...VENTANA_CON_TODOS_LOS_ESTADOS.vigente,
        dias: [...VENTANA_CON_TODOS_LOS_ESTADOS.vigente.dias].reverse(),
      },
    };
    expect(leer(desordenado).vigente!.dias.map(d => d.fecha)).toEqual(dias.map(d => d.fecha));
  });
});

describe('sin programa, sin ventana, sin campos opcionales', () => {
  /* El contrato: `aplica=false` → `vigente: null`, `semanas: []`, `pausa: null`. */
  it('aplica=false tal como lo describe el contrato', () => {
    const detalle = leer({ aplica: false, obligatorio: true, zona: 'America/Lima', pausa: null, vigente: null, semanas: [], calculadoEn: null });
    expect(detalle).toEqual({
      aplica: false,
      obligatorio: true,
      zona: 'America/Lima',
      pausa: null,
      vigente: null,
      semanas: [],
      calculadoEn: null,
    });
  });

  /* Si el cable se contradijera, gana `aplica`: la pantalla no tiene que elegir a quién creerle. */
  it('aplica=false vacía lo demás aunque venga algo', () => {
    const detalle = leer({ ...EJEMPLO_DEL_CONTRATO, aplica: false, pausa: { desde: '2026-09-25', hasta: '2026-10-01' } });
    expect(detalle.vigente).toBeNull();
    expect(detalle.semanas).toEqual([]);
    expect(detalle.pausa).toBeNull();
  });

  it('con solo `aplica`, lo demás toma valores seguros', () => {
    const detalle = leer({ aplica: true });
    expect(detalle).toEqual({
      aplica: true,
      /* Sin permiso declarado no aparece el control de pausa: el lado seguro del error. */
      obligatorio: true,
      zona: null,
      pausa: null,
      vigente: null,
      semanas: [],
      calculadoEn: null,
    });
  });

  it('una ventana sin sus campos opcionales se lee como "sin datos", no como cero', () => {
    const detalle = leer({ aplica: true, vigente: { desde: '2026-09-18', hasta: '2026-09-24' } });
    expect(detalle.vigente).toEqual({
      desde: '2026-09-18',
      hasta: '2026-09-24',
      porcentaje: null,
      color: 'SIN_DATOS',
      etiqueta: null,
      diasConDatos: null,
      cerrada: false,
      dias: [],
    });
  });

  it('un día sin conteos no inventa ceros', () => {
    const detalle = leer({
      aplica: true,
      vigente: {
        desde: '2026-09-18', hasta: '2026-09-24',
        dias: [{ fecha: '2026-09-18', estado: 'MEDIDO', porcentaje: 75, color: 'AMARILLO' }],
      },
    });
    expect(detalle.vigente!.dias[0]).toMatchObject({ habitos: null, objetivos: null, porcentaje: 75 });
  });

  it('lee la pausa del staff', () => {
    const detalle = leer({ ...VENTANA_CON_TODOS_LOS_ESTADOS, pausa: { desde: '2026-09-25', hasta: '2026-10-01' } });
    expect(detalle.pausa).toEqual({ desde: '2026-09-25', hasta: '2026-10-01' });
  });
});

describe('nunca verde por falta de datos, nunca un 0 % inventado', () => {
  it('sin porcentaje es "Sin datos" aunque el color diga VERDE', () => {
    const detalle = leer({
      ...EJEMPLO_DEL_CONTRATO,
      vigente: { ...EJEMPLO_DEL_CONTRATO.vigente, porcentaje: null, color: 'VERDE', etiqueta: 'Al día' },
    });
    expect(detalle.vigente).toMatchObject({ porcentaje: null, color: 'SIN_DATOS', etiqueta: null });
  });

  it('una semana sin datos conserva la palabra del servidor, que dice lo mismo', () => {
    const detalle = leer({
      ...EJEMPLO_DEL_CONTRATO,
      semanas: [{ desde: '2026-09-12', hasta: '2026-09-18', porcentaje: null, color: 'SIN_DATOS', etiqueta: 'Sin datos', diasConDatos: 0, cerradaEn: null }],
    });
    expect(detalle.semanas[0]).toMatchObject({ porcentaje: null, color: 'SIN_DATOS', etiqueta: 'Sin datos', diasConDatos: 0 });
  });

  it('un día que no es MEDIDO no muestra porcentaje aunque venga uno', () => {
    const detalle = leer({
      aplica: true,
      vigente: {
        desde: '2026-09-18', hasta: '2026-09-24',
        dias: [{ fecha: '2026-09-18', estado: 'PAUSADO', porcentaje: 0, color: 'ROJO' }],
      },
    });
    expect(detalle.vigente!.dias[0]).toMatchObject({ estado: 'PAUSADO', porcentaje: null, color: 'SIN_DATOS' });
  });

  it('un día MEDIDO sin porcentaje no se afirma: queda como desconocido', () => {
    const detalle = leer({
      aplica: true,
      vigente: {
        desde: '2026-09-18', hasta: '2026-09-24',
        dias: [{ fecha: '2026-09-18', estado: 'MEDIDO', porcentaje: null, color: 'VERDE' }],
      },
    });
    expect(detalle.vigente!.dias[0]).toMatchObject({ estado: 'DESCONOCIDO', porcentaje: null, color: 'SIN_DATOS' });
  });

  it('un 0 % medido es real y se conserva', () => {
    const detalle = leer({
      aplica: true,
      vigente: {
        desde: '2026-09-18', hasta: '2026-09-24',
        dias: [{ fecha: '2026-09-18', estado: 'MEDIDO', porcentaje: 0, color: 'ROJO', habitos: { programados: 9, cumplidos: 0 } }],
      },
    });
    expect(detalle.vigente!.dias[0]).toMatchObject({ estado: 'MEDIDO', porcentaje: 0, color: 'ROJO' });
  });
});

describe('lo que el backend agregue mañana no rompe nada', () => {
  it('campos desconocidos en todos los niveles', () => {
    const conExtras = {
      ...EJEMPLO_DEL_CONTRATO,
      versionFormula: 2,
      vigente: {
        ...EJEMPLO_DEL_CONTRATO.vigente,
        tendencia: 'SUBE',
        dias: [{ ...EJEMPLO_DEL_CONTRATO.vigente.dias[0], nota: 'x', habitos: { programados: 9, cumplidos: 7, opcionales: 2 } }],
      },
      semanas: [{ ...EJEMPLO_DEL_CONTRATO.semanas[0], versionFormula: 1 }],
    };
    expect(leer(conExtras).vigente?.porcentaje).toBe(78.3);
  });

  it('un color nuevo se lee como "sin datos", sin número', () => {
    const detalle = leer({
      ...EJEMPLO_DEL_CONTRATO,
      vigente: { ...EJEMPLO_DEL_CONTRATO.vigente, color: 'NARANJA', etiqueta: 'Casi al día' },
    });
    expect(detalle.vigente).toMatchObject({ color: 'SIN_DATOS', porcentaje: null, etiqueta: null });
  });

  it('un estado de día nuevo se lee como desconocido, sin número', () => {
    const detalle = leer({
      aplica: true,
      vigente: {
        desde: '2026-09-18', hasta: '2026-09-24',
        dias: [{ fecha: '2026-09-18', estado: 'FERIADO', porcentaje: 80, color: 'VERDE' }],
      },
    });
    expect(detalle.vigente!.dias[0]).toMatchObject({ estado: 'DESCONOCIDO', porcentaje: null, color: 'SIN_DATOS' });
  });
});

describe('lo imprescindible que falta se dice con un error claro', () => {
  it('sin `aplica`', () => {
    expect(() => leer({ vigente: null })).toThrow(/GET \/api\/v1\/me\/semaforo — aplica/);
  });

  it('un día sin fecha', () => {
    expect(() =>
      leer({ aplica: true, vigente: { desde: '2026-09-18', hasta: '2026-09-24', dias: [{ estado: 'MEDIDO' }] } }),
    ).toThrow(/vigente\.dias\.0\.fecha/);
  });

  it('una respuesta que no es un objeto', () => {
    expect(() => leer('<html>502</html>')).toThrow(/Respuesta inesperada/);
  });
});

describe('el campo `semaforo` de GET /api/v1/home (§4.2)', () => {
  /* Copiado del contrato. */
  const EJEMPLO_DE_HOY = { color: 'AMARILLO', etiqueta: 'Requiere atención', porcentaje: 78.3, diasConDatos: 6, pausado: false };

  it('el ejemplo del contrato', () => {
    const crudo = validarRespuesta(semaforoSchemas.deHoy, EJEMPLO_DE_HOY, 'GET /api/v1/home');
    expect(aSemaforoDeHoy(crudo)).toEqual({
      color: 'AMARILLO',
      etiqueta: 'Requiere atención',
      porcentaje: 78.3,
      diasConDatos: 6,
      pausado: false,
      /* El ejemplo del contrato no trae `dias` (aditivo): sin ellos, `null`, y Hoy los pide a `/me/semaforo`. */
      dias: null,
    });
  });

  it('en pausa y sin datos: "Sin datos", nunca verde', () => {
    const crudo = validarRespuesta(
      semaforoSchemas.deHoy,
      { color: 'SIN_DATOS', etiqueta: 'Sin datos', porcentaje: null, diasConDatos: 0, pausado: true },
      'GET /api/v1/home',
    );
    expect(aSemaforoDeHoy(crudo)).toEqual({
      color: 'SIN_DATOS',
      etiqueta: 'Sin datos',
      porcentaje: null,
      diasConDatos: 0,
      pausado: true,
      dias: null,
    });
  });

  it('solo el color es imprescindible', () => {
    const crudo = validarRespuesta(semaforoSchemas.deHoy, { color: 'VERDE', porcentaje: 91.4 }, 'GET /api/v1/home');
    expect(aSemaforoDeHoy(crudo)).toEqual({
      color: 'VERDE',
      etiqueta: null,
      porcentaje: 91.4,
      diasConDatos: null,
      pausado: false,
      dias: null,
    });
  });
});
