import { describe, expect, it } from '@jest/globals';

import { rutaDeLasPersonasDeUnHabito, rutaDeLosHabitosDeTodos } from '../habitosDeTodosApi';
import { estadoDe, horaCorta, leerHabitosDeTodos, leerPersonasDeUnHabito } from '../habitosDeTodosSchemas';

/**
 * «Hábitos de todos» (spec 029): rutas, esquemas tolerantes y los estados. Una fila rota se pierde sola; un estado que no se conoce
 * NUNCA se lee como una falta; las horas se dicen en HH:mm.
 */

const FILTROS = { fecha: null, grupo: null, formacion: null, categoria: null };

describe('rutas', () => {
  it('sin filtros pide hoy sin parámetros', () => {
    expect(rutaDeLosHabitosDeTodos(FILTROS)).toBe('/api/v1/leadership/habits');
  });

  it('manda solo los filtros que hay, codificados', () => {
    expect(rutaDeLosHabitosDeTodos({ fecha: '2026-10-30', grupo: 'none', formacion: 'DIPLOMADO', categoria: 'DIPLOMADO_ESTUDIO' })).toBe(
      '/api/v1/leadership/habits?date=2026-10-30&group=none&formation=DIPLOMADO&category=DIPLOMADO_ESTUDIO',
    );
    expect(rutaDeLosHabitosDeTodos({ ...FILTROS, grupo: 'a b' })).toBe('/api/v1/leadership/habits?group=a%20b');
  });

  it('las personas de un hábito llevan la búsqueda y la página, y no la dimensión', () => {
    const ruta = rutaDeLasPersonasDeUnHabito('h-1', { fecha: '2026-10-29', grupo: 'g-1', formacion: null, categoria: 'CUERPO' }, { q: ' Ana ', pagina: 2, tamano: 30 });
    expect(ruta).toBe('/api/v1/leadership/habits/h-1/people?date=2026-10-29&group=g-1&q=Ana&page=2&size=30');
  });

  it('una búsqueda vacía no se manda', () => {
    expect(rutaDeLasPersonasDeUnHabito('h-1', FILTROS, { q: '  ', pagina: 0, tamano: 30 })).toBe('/api/v1/leadership/habits/h-1/people?page=0&size=30');
  });
});

describe('leerHabitosDeTodos', () => {
  const HABITO = { habitId: 'h-1', title: 'DESPERTAR', category: 'BODY', categoryKey: 'CUERPO', formation: 'ESCUELA', expected: 100, done: 41, pending: 50, missed: 9 };

  it('lee el día, los totales y los hábitos tal como llegan (sin reordenar)', () => {
    const dia = leerHabitosDeTodos(
      {
        date: '2026-10-30',
        isToday: true,
        earliest: '2026-10-23',
        latest: '2026-10-30',
        totals: { students: 120, withHabits: 118, expected: 1500, done: 940, pending: 400, missed: 160 },
        habits: [HABITO, { ...HABITO, habitId: 'h-0', title: 'AGUA' }],
        campoNuevo: 'ignorado',
      },
      'GET',
    );
    expect(dia.fecha).toBe('2026-10-30');
    expect(dia.esHoy).toBe(true);
    expect(dia.masAntigua).toBe('2026-10-23');
    expect(dia.masReciente).toBe('2026-10-30');
    expect(dia.totales).toEqual({ alumnos: 120, conHabitos: 118, esperados: 1500, cumplieron: 940, pendientes: 400, sinCumplir: 160 });
    expect(dia.habitos.map(h => h.habitoId)).toEqual(['h-1', 'h-0']);
    expect(dia.habitos[0]).toMatchObject({ titulo: 'DESPERTAR', categoria: 'BODY', categoriaClave: 'CUERPO', formacion: 'ESCUELA', esperados: 100, cumplieron: 41, pendientes: 50, sinCumplir: 9 });
  });

  it('una fila rota se pierde sola, no la lista', () => {
    const dia = leerHabitosDeTodos({ date: '2026-10-30', habits: [HABITO, { title: 'sin id' }, null, 'x', { ...HABITO, habitId: 'h-2' }] }, 'GET');
    expect(dia.habitos.map(h => h.habitoId)).toEqual(['h-1', 'h-2']);
  });

  it('sin totales, se suman de la lista; sin límites y siendo hoy, el límite de adelante es el propio día', () => {
    const dia = leerHabitosDeTodos({ date: '2026-10-30', isToday: true, habits: [HABITO, { ...HABITO, habitId: 'h-2', done: 1, pending: 0, missed: 0 }] }, 'GET');
    expect(dia.totales.cumplieron).toBe(42);
    expect(dia.totales.esperados).toBe(100 + 1);
    expect(dia.masAntigua).toBeNull();
    expect(dia.masReciente).toBe('2026-10-30');
  });

  it('un día cerrado sin límites no inventa ninguno', () => {
    const dia = leerHabitosDeTodos({ date: '2026-10-29', isToday: false, habits: [] }, 'GET');
    expect(dia.masAntigua).toBeNull();
    expect(dia.masReciente).toBeNull();
  });

  it('lo esperado es la suma de los tres; el título vacío dice «Hábito sin nombre»; los conteos raros son 0', () => {
    const dia = leerHabitosDeTodos({ date: '2026-10-30', habits: [{ habitId: 'h', title: '  ', expected: 99, done: 2, pending: -3, missed: 1.5 }] }, 'GET');
    expect(dia.habitos[0]).toMatchObject({ titulo: 'Hábito sin nombre', esperados: 2, cumplieron: 2, pendientes: 0, sinCumplir: 0 });
  });

  it('el nombre de la categoría es opcional', () => {
    const dia = leerHabitosDeTodos({ date: '2026-10-30', habits: [{ ...HABITO, categoryName: 'Estudio' }, HABITO] }, 'GET');
    expect(dia.habitos[0].nombreDeLaCategoria).toBe('Estudio');
    expect(dia.habitos[1].nombreDeLaCategoria).toBeNull();
  });

  it('una respuesta que no es un día se rechaza con un motivo', () => {
    expect(() => leerHabitosDeTodos({ habits: [] }, 'GET /leadership/habits')).toThrow(/Respuesta inesperada de GET \/leadership\/habits/);
    expect(() => leerHabitosDeTodos({ date: 'ayer', habits: [] }, 'GET')).toThrow();
    expect(() => leerHabitosDeTodos({ date: '2026-10-30' }, 'GET')).toThrow();
    expect(() => leerHabitosDeTodos(null, 'GET')).toThrow();
  });
});

describe('leerPersonasDeUnHabito', () => {
  const PERSONA = { personId: 'p-1', name: 'Ana Pérez', photoPath: null, groupId: 'g-1', groupName: 'Fénix', status: 'CUMPLIDO', reason: null, plannedTime: '06:00:00', doneAt: '06:42', evidenceId: 'e-1' };

  it('lee la persona con sus horas en HH:mm y su evidencia', () => {
    const lectura = leerPersonasDeUnHabito(
      { date: '2026-10-30', isToday: true, habit: { habitId: 'h-1', title: 'DESPERTAR', done: 1, pending: 0, missed: 0 }, page: 0, size: 30, total: 1, people: [PERSONA] },
      { pagina: 0, tamano: 30 },
      'GET',
    );
    expect(lectura.habito?.titulo).toBe('DESPERTAR');
    expect(lectura.personas[0]).toEqual({
      personaId: 'p-1', nombre: 'Ana Pérez', fotoPath: null, grupoId: 'g-1', grupoNombre: 'Fénix', estado: 'CUMPLIDO', motivo: null,
      horaPlanificada: '06:00', cumplioA: '06:42', evidenciaId: 'e-1',
    });
    expect(lectura.hayMas).toBe(false);
  });

  it('una persona rota se pierde sola; sin nombre dice «Persona sin nombre»', () => {
    const lectura = leerPersonasDeUnHabito({ date: '2026-10-30', people: [PERSONA, { name: 'sin id' }, { personId: 'p-2', name: ' ' }] }, { pagina: 0, tamano: 30 }, 'GET');
    expect(lectura.personas.map(p => p.nombre)).toEqual(['Ana Pérez', 'Persona sin nombre']);
  });

  it('hay más cuando el total lo dice, o cuando la página vino llena si no lo dice', () => {
    const con = leerPersonasDeUnHabito({ date: '2026-10-30', page: 0, size: 1, total: 3, people: [PERSONA] }, { pagina: 0, tamano: 1 }, 'GET');
    expect(con.hayMas).toBe(true);
    const sin = leerPersonasDeUnHabito({ date: '2026-10-30', people: [PERSONA] }, { pagina: 0, tamano: 1 }, 'GET');
    expect(sin.hayMas).toBe(true);
    const vacia = leerPersonasDeUnHabito({ date: '2026-10-30', people: [] }, { pagina: 0, tamano: 1 }, 'GET');
    expect(vacia.hayMas).toBe(false);
  });

  it('el motivo solo viaja con «sin datos»', () => {
    const lectura = leerPersonasDeUnHabito(
      { date: '2026-10-30', people: [{ ...PERSONA, status: 'SIN_DATOS', reason: 'ANTES_DEL_DIA_1' }, { ...PERSONA, personId: 'p-2', status: 'CUMPLIDO', reason: 'NO_LE_TOCABA' }] },
      { pagina: 0, tamano: 30 },
      'GET',
    );
    expect(lectura.personas.map(p => p.motivo)).toEqual(['ANTES_DEL_DIA_1', null]);
  });
});

describe('estados y horas', () => {
  it('un estado desconocido o ausente es «sin datos»: nunca una falta', () => {
    expect(estadoDe('CUMPLIDO')).toBe('CUMPLIDO');
    expect(estadoDe(' sin_cumplir ')).toBe('SIN_CUMPLIR');
    expect(estadoDe('FALLIDO')).toBe('SIN_DATOS');
    expect(estadoDe(null)).toBe('SIN_DATOS');
    expect(estadoDe('')).toBe('SIN_DATOS');
  });

  it('la hora se dice HH:mm; lo que no se entiende no se dibuja', () => {
    expect(horaCorta('06:00:00')).toBe('06:00');
    expect(horaCorta('06:42')).toBe('06:42');
    expect(horaCorta('6:42')).toBeNull();
    expect(horaCorta('mañana')).toBeNull();
    expect(horaCorta(null)).toBeNull();
  });
});
