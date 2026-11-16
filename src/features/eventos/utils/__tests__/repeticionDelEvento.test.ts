import { describe, expect, it } from '@jest/globals';

import { SIN_OPCIONES, leerOpciones } from '../../api/audienciaSchemas';
import { notaDelSemaforo } from '../textosDeFecha';
import { tituloDeLaSesionPersonalizada } from '../tituloDeLaSesion';
import { armarCuerpo, formularioVacio, rotuloDelTipo, tipoQueSeGuarda, tiposQueSeOfrecen } from '../formularioDeEvento';
import {
  alCambiarLaFecha,
  alternarDia,
  camposDeRepeticion,
  diaIsoDe,
  primeraFechaDeLaSerie,
  repeticionInicial,
  resumenDeLaRepeticion,
  type RepeticionDelFormulario,
} from '../repeticionDelEvento';

const AHORA = Date.parse('2026-11-14T15:00:00Z'); // sábado 14 de noviembre, 10:00 en Lima
const ZONA = 'America/Lima';

describe('«Repetir por días»: valores de partida (spec 053, FR-007)', () => {
  // spec 053 FR-007
  it('viene apagado, con el día de la fecha marcado y 4 semanas sugeridas', () => {
    // 16 de noviembre de 2026 es lunes.
    expect(diaIsoDe('2026-11-16')).toBe(1);
    expect(repeticionInicial('2026-11-16')).toEqual({ activa: false, dias: [1], diasTocados: false, fin: { tipo: 'semanas', semanas: 4 } });
    expect(formularioVacio(AHORA, ZONA).repeticion).toEqual({ activa: false, dias: [7], diasTocados: false, fin: { tipo: 'semanas', semanas: 4 } });
  });

  // spec 053 FR-007
  it('al mover la fecha, los días que nadie tocó la siguen; los que se tocaron, no', () => {
    const sinTocar = alCambiarLaFecha(repeticionInicial('2026-11-16'), '2026-11-18');
    expect(sinTocar.dias).toEqual([3]);
    const tocada = alCambiarLaFecha(alternarDia(repeticionInicial('2026-11-16'), 4), '2026-11-18');
    expect(tocada.dias).toEqual([1, 4]);
  });

  // spec 053 FR-007
  it('marcar y desmarcar días los deja en orden, y el último marcado no se quita', () => {
    let rep = repeticionInicial('2026-11-16');
    rep = alternarDia(rep, 4);
    rep = alternarDia(rep, 2);
    expect(rep.dias).toEqual([1, 2, 4]);
    rep = alternarDia(alternarDia(alternarDia(rep, 1), 2), 4);
    expect(rep.dias).toEqual([4]);
  });
});

describe('«Repetir por días»: el resumen en palabras (FR-008)', () => {
  const base = (dias: number[], fin: RepeticionDelFormulario['fin']): RepeticionDelFormulario => ({ activa: true, dias, diasTocados: true, fin });

  // spec 053 FR-008
  it('por semanas y hasta una fecha, en palabras', () => {
    expect(resumenDeLaRepeticion(base([1, 4], { tipo: 'semanas', semanas: 4 }), '2026-11-16')).toBe(
      'Se repite lunes y jueves, 4 semanas, hasta el 13 de diciembre.',
    );
    expect(resumenDeLaRepeticion(base([1, 4], { tipo: 'hasta', fecha: '2026-12-12' }), '2026-11-16')).toBe('Se repite lunes y jueves, hasta el 12 de diciembre.');
    expect(resumenDeLaRepeticion(base([1, 3, 5], { tipo: 'semanas', semanas: 2 }), '2026-11-16')).toBe('Se repite lunes, miércoles y viernes, 2 semanas, hasta el 29 de noviembre.');
    expect(resumenDeLaRepeticion(base([2], { tipo: 'semanas', semanas: 1 }), '2026-11-17')).toBe('Se repite martes, 1 semana, hasta el 23 de noviembre.');
  });

  // spec 053 FR-008, FR-009
  it('si la fecha no cae en un día marcado, dice cuándo empieza de verdad', () => {
    // sábado 14: el primer lunes es el 16.
    expect(resumenDeLaRepeticion(base([1, 4], { tipo: 'hasta', fecha: '2026-12-12' }), '2026-11-14')).toBe(
      'Se repite lunes y jueves, hasta el 12 de diciembre. Empieza el lunes 16 de noviembre.',
    );
  });
});

describe('«Repetir por días»: lo que viaja al servidor (FR-009, FR-010, FR-012)', () => {
  const lunesYJueves = (fin: RepeticionDelFormulario['fin']): RepeticionDelFormulario => ({ activa: true, dias: [1, 4], diasTocados: true, fin });

  // spec 053 FR-009
  it('por semanas: WEEKLY, cada 1, días ISO y «hasta» al final del último día en la zona del evento', () => {
    const r = camposDeRepeticion(lunesYJueves({ tipo: 'semanas', semanas: 3 }), '2026-11-16', ZONA);

    expect(r).toEqual({
      ok: true,
      fecha: '2026-11-16',
      campos: {
        recurrenceFrequency: 'WEEKLY',
        recurrenceInterval: 1,
        recurrenceByWeekday: [1, 4],
        // 3 semanas desde el lunes 16: hasta el domingo 6 de diciembre, 23:59:59.999 en Lima (UTC-5).
        recurrenceUntil: '2026-12-07T04:59:59.999Z',
      },
    });
  });

  // spec 053 FR-009
  it('la fecha elegida fuera de los días marcados empieza en el primer día marcado', () => {
    expect(primeraFechaDeLaSerie('2026-11-14', [1, 4])).toBe('2026-11-16');
    expect(primeraFechaDeLaSerie('2026-11-16', [1, 4])).toBe('2026-11-16');
    const r = camposDeRepeticion(lunesYJueves({ tipo: 'semanas', semanas: 6 }), '2026-11-14', ZONA);
    expect(r.ok && r.fecha).toBe('2026-11-16');
  });

  // spec 053 FR-010
  it('rechaza sin días, un «hasta» anterior al inicio y topes pasados', () => {
    expect(camposDeRepeticion({ ...lunesYJueves({ tipo: 'semanas', semanas: 3 }), dias: [] }, '2026-11-16', ZONA)).toEqual({
      ok: false,
      error: 'Elige al menos un día para repetir.',
    });
    expect(camposDeRepeticion(lunesYJueves({ tipo: 'hasta', fecha: '2026-11-10' }), '2026-11-16', ZONA).ok).toBe(false);
    expect(camposDeRepeticion(lunesYJueves({ tipo: 'semanas', semanas: 13 }), '2026-11-16', ZONA).ok).toBe(false);
    expect(camposDeRepeticion(lunesYJueves({ tipo: 'semanas', semanas: 12 }), '2026-11-16', ZONA).ok).toBe(true);
  });

  // spec 053 FR-009, FR-012
  it('el cuerpo del evento lleva la repetición y arranca en la primera ocurrencia; apagado, no lleva nada', () => {
    const form = { ...formularioVacio(AHORA, ZONA), titulo: 'Sesión', fecha: '2026-11-14', hora: '19:00' };
    const apagado = armarCuerpo(form, AHORA);
    expect(apagado.ok && 'recurrenceFrequency' in apagado.cuerpo).toBe(false);

    const rep: RepeticionDelFormulario = { activa: true, dias: [1, 4], diasTocados: true, fin: { tipo: 'semanas', semanas: 3 } };
    const r = armarCuerpo({ ...form, repeticion: rep }, AHORA);

    expect(r.ok && r.cuerpo).toMatchObject({
      startsAt: '2026-11-17T00:00:00.000Z', // lunes 16, 19:00 en Lima
      recurrenceFrequency: 'WEEKLY',
      recurrenceByWeekday: [1, 4],
      recurrenceUntil: '2026-12-07T04:59:59.999Z',
    });
  });

  // spec 053 FR-011
  it('al editar no se manda repetición aunque el formulario la traiga', () => {
    const form = { ...formularioVacio(AHORA, ZONA), titulo: 'Sesión', repeticion: { activa: true, dias: [1], diasTocados: true, fin: { tipo: 'semanas', semanas: 2 } } as RepeticionDelFormulario };
    const original = { tipoEvento: 'SESION_ESPECIAL', audiencia: null, rolesDestino: [], reglasDeAviso: null, tipoUbicacion: 'MEET' } as never;
    const r = armarCuerpo(form, AHORA, original);
    expect(r.ok && 'recurrenceFrequency' in r.cuerpo).toBe(false);
  });
});

describe('«Sesión personalizada» del líder (spec 053, FR-001 a FR-003)', () => {
  // spec 053 FR-003
  it('con un solo tipo ofrecido, ese es el que se guarda aunque el formulario traiga otro', () => {
    const ofrecidos = tiposQueSeOfrecen(['SESION_PERSONALIZADA']);
    expect(ofrecidos).toEqual([{ clave: 'SESION_PERSONALIZADA', nombre: 'Sesión personalizada' }]);
    expect(tipoQueSeGuarda(formularioVacio(AHORA, ZONA).tipoEvento, ofrecidos)).toBe('SESION_PERSONALIZADA');
  });

  // spec 053 FR-003
  it('el mentor y la guía conservan sus dos; sin lista del servidor, los cuatro de siempre y sin la del líder', () => {
    expect(tiposQueSeOfrecen(['SESION_ESPECIAL', 'ESPONTANEO']).map(t => t.clave)).toEqual(['SESION_ESPECIAL', 'ESPONTANEO']);
    expect(tiposQueSeOfrecen([]).map(t => t.clave)).toEqual(['SESION_ESPECIAL', 'MENTORIA_ALQUIMISTA', 'ESPONTANEO', 'SEMANA_MANIFESTACION']);
    expect(tipoQueSeGuarda('ESPONTANEO', tiposQueSeOfrecen(['SESION_ESPECIAL', 'ESPONTANEO']))).toBe('ESPONTANEO');
  });

  // spec 053 FR-002, FR-003
  it('la tarjeta rotula «SESIÓN PERSONALIZADA»; un tipo viejo o desconocido sigue viéndose', () => {
    expect(rotuloDelTipo('SESION_PERSONALIZADA')).toBe('SESIÓN PERSONALIZADA');
    expect(rotuloDelTipo('SESION_ESPECIAL')).toBe('SESIÓN ESPECIAL');
    expect(rotuloDelTipo('ALGO_NUEVO')).toBe('EVENTO');
  });
});

describe('Título automático de «Sesión personalizada» (spec 053, FR-013)', () => {
  const ninguna = { todos: false, personas: [], misAlumnos: false, mentores: false, grupos: [], colores: [], personal: [], todoElPersonal: false, recalcular: false };
  const ana = { id: 'a', nombre: 'Ana Pérez', fotoUrl: null, rol: 'Aprendiz', grupo: null };
  const opciones = { ...SIN_OPCIONES, grupos: [{ id: 'g1', nombre: 'Grupo Alfa', integrantes: 5 }] };

  // spec 053 FR-013
  it('una persona, un grupo, un color y varias personas', () => {
    expect(tituloDeLaSesionPersonalizada({ ...ninguna, personas: [ana] }, opciones, 1)).toBe('Sesión personalizada · Ana Pérez');
    expect(tituloDeLaSesionPersonalizada({ ...ninguna, grupos: ['g1'] }, opciones, 5)).toBe('Sesión personalizada · Grupo Alfa');
    expect(tituloDeLaSesionPersonalizada({ ...ninguna, colores: ['GREEN'] }, opciones, 9)).toBe('Sesión personalizada · Semáforo verde');
    expect(tituloDeLaSesionPersonalizada({ ...ninguna, personas: [ana, { ...ana, id: 'b' }] }, opciones, 2)).toBe('Sesión personalizada · 2 personas');
    expect(tituloDeLaSesionPersonalizada({ ...ninguna, colores: ['RED', 'YELLOW'] }, opciones, 12)).toBe('Sesión personalizada · 12 personas');
    expect(tituloDeLaSesionPersonalizada(ninguna, opciones, null)).toBe('Sesión personalizada');
  });

  // spec 053 FR-013
  it('nunca pasa de 60 letras y el cuerpo acepta ese largo solo para este tipo', () => {
    const largo = { ...ana, nombre: 'María de los Ángeles Fernández de la Vega y Altamirano Quispe' };
    const titulo = tituloDeLaSesionPersonalizada({ ...ninguna, personas: [largo] }, opciones, 1);
    expect(titulo.length).toBeLessThanOrEqual(60);
    expect(titulo.endsWith('…')).toBe(true);

    const form = { ...formularioVacio(AHORA, ZONA), titulo, tipoEvento: 'SESION_PERSONALIZADA' };
    expect(armarCuerpo(form, AHORA).ok).toBe(true);
    expect(armarCuerpo({ ...form, tipoEvento: 'SESION_ESPECIAL' }, AHORA)).toEqual({ ok: false, error: 'El nombre puede tener hasta 30 letras.' });
  });
});

describe('«Según el semáforo de…» (spec 053, FR-006)', () => {
  // spec 053 FR-006
  it('ayer si el día es ayer o no se sabe; si no, el día de la semana y el número', () => {
    expect(notaDelSemaforo('2026-11-13', '2026-11-14')).toBe('Según el semáforo de ayer.');
    expect(notaDelSemaforo(null, '2026-11-14')).toBe('Según el semáforo de ayer.');
    expect(notaDelSemaforo('2026-11-13', '2026-11-16')).toBe('Según el semáforo del viernes 13.');
  });

  // spec 053 FR-006
  it('lee trafficLightDate de las opciones y descarta una fecha rara', () => {
    expect(leerOpciones({ canCreate: true, trafficLightDate: '2026-11-13' }).fechaDelSemaforo).toBe('2026-11-13');
    expect(leerOpciones({ canCreate: true, trafficLightDate: 'ayer' }).fechaDelSemaforo).toBeNull();
    expect(leerOpciones({ canCreate: true }).fechaDelSemaforo).toBeNull();
  });
});
