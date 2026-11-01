import { describe, expect, it } from '@jest/globals';

import type { FormacionDeLaSesion } from '../../../formaciones/types/formaciones.types';
import type { HabitoDeTodos, PersonaEnUnHabito, TotalesDelDia } from '../../types/habitosDeTodos.types';
import {
  diaCompletoEnPalabras,
  dichoDelHabito,
  dimensionDelHabito,
  estadoEnPalabras,
  fichaParaElDia,
  fraccionCumplida,
  hayFiltros,
  lineaDeLaPersona,
  lineaDelHabito,
  navegacionDelDia,
  nombreDelHabito,
  resumenDelDiaEnPalabras,
  rotuloDelDia,
  seOfreceElFiltroDeFormacion,
  seccionesDeLasPersonas,
  sumarDias,
  sumarDimensiones,
  sumarPersonas,
  textoSinHabitos,
  tituloDelDia,
} from '../habitosDeTodos';

/**
 * Los textos y las reglas de «Hábitos de todos» (spec 029): el rótulo del día, los límites de ‹ y ›, los estados en palabras, las
 * secciones, el resumen, el filtro de formación y cómo se abre la ficha en el mismo día.
 */

function habito(parcial: Partial<HabitoDeTodos> = {}): HabitoDeTodos {
  return { habitoId: 'h-1', titulo: 'DESPERTAR', categoria: 'BODY', categoriaClave: 'CUERPO', nombreDeLaCategoria: null, formacion: 'ESCUELA', esperados: 100, cumplieron: 41, pendientes: 50, sinCumplir: 9, ...parcial };
}

function persona(parcial: Partial<PersonaEnUnHabito> = {}): PersonaEnUnHabito {
  return { personaId: 'p-1', nombre: 'Ana', fotoPath: null, grupoId: 'g', grupoNombre: 'Fénix', estado: 'CUMPLIDO', motivo: null, horaPlanificada: '06:00', cumplioA: '06:42', evidenciaId: null, ...parcial };
}

describe('fechas', () => {
  it('suma días sin pasar por la zona, cruzando mes y año', () => {
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('rotula «Hoy», «Ayer» y luego día, número y mes', () => {
    expect(rotuloDelDia('2026-10-30', '2026-10-30', true)).toBe('Hoy');
    expect(rotuloDelDia('2026-10-29', '2026-10-30', false)).toBe('Ayer');
    expect(rotuloDelDia('2026-10-27', '2026-10-30', false)).toBe('Mar 27 oct');
    expect(rotuloDelDia('2026-10-24', '2026-10-30', false)).toBe('Sáb 24 oct');
  });

  it('sin saber cuál es hoy, solo el que el servidor marca como hoy se llama «Hoy»', () => {
    expect(rotuloDelDia('2026-10-29', null, false)).toBe('Jue 29 oct');
    expect(rotuloDelDia('2026-10-30', null, true)).toBe('Hoy');
  });

  it('para el lector de pantalla, el día completo', () => {
    expect(diaCompletoEnPalabras('2026-10-27')).toBe('martes 27 de octubre');
  });
});

describe('la cabecera del día', () => {
  it('hoy y ayer se dicen, los demás llevan solo el día completo', () => {
    expect(tituloDelDia('2026-10-30', '2026-10-30', true)).toBe('Hoy, viernes 30 de octubre');
    expect(tituloDelDia('2026-10-29', '2026-10-30', false)).toBe('Ayer, jueves 29 de octubre');
    expect(tituloDelDia('2026-10-27', '2026-10-30', false)).toBe('Martes 27 de octubre');
  });
});

describe('‹ y ›', () => {
  it('se mueven solo dentro de los límites que dijo el servidor', () => {
    expect(navegacionDelDia('2026-10-28', '2026-10-23', '2026-10-30')).toEqual({ anterior: '2026-10-27', siguiente: '2026-10-29' });
  });

  it('‹ se apaga en el límite de 7 días y › se apaga hoy', () => {
    expect(navegacionDelDia('2026-10-23', '2026-10-23', '2026-10-30').anterior).toBeNull();
    expect(navegacionDelDia('2026-10-30', '2026-10-23', '2026-10-30').siguiente).toBeNull();
    expect(navegacionDelDia('2026-10-30', '2026-10-23', '2026-10-30').anterior).toBe('2026-10-29');
  });

  it('sin los límites no se adivina nada: los dos apagados', () => {
    expect(navegacionDelDia('2026-10-30', null, null)).toEqual({ anterior: null, siguiente: null });
    expect(navegacionDelDia(null, '2026-10-23', '2026-10-30')).toEqual({ anterior: null, siguiente: null });
  });
});

describe('estados en palabras', () => {
  it('cada estado se dice con su palabra, y «sin datos» nunca como falta', () => {
    expect(estadoEnPalabras(persona({ estado: 'CUMPLIDO' }))).toBe('Cumplió');
    expect(estadoEnPalabras(persona({ estado: 'PENDIENTE' }))).toBe('Pendiente');
    expect(estadoEnPalabras(persona({ estado: 'SIN_CUMPLIR' }))).toBe('Sin cumplir');
    expect(estadoEnPalabras(persona({ estado: 'SIN_DATOS', motivo: 'NO_LE_TOCABA' }))).toBe('No le tocaba o en pausa');
    expect(estadoEnPalabras(persona({ estado: 'SIN_DATOS', motivo: 'NO_EXIGIBLE' }))).toBe('No le tocaba o en pausa');
    expect(estadoEnPalabras(persona({ estado: 'SIN_DATOS', motivo: 'ANTES_DEL_DIA_1' }))).toBe('Todavía no empezaba');
    expect(estadoEnPalabras(persona({ estado: 'SIN_DATOS', motivo: null }))).toBe('No le tocaba o en pausa');
  });
});

describe('secciones de las personas', () => {
  it('van en el orden de la lista, sin las vacías, y las sin datos plegadas', () => {
    const personas = [
      persona({ personaId: '1', estado: 'SIN_CUMPLIR' }),
      persona({ personaId: '2', estado: 'PENDIENTE' }),
      persona({ personaId: '3', estado: 'CUMPLIDO' }),
      persona({ personaId: '4', estado: 'SIN_DATOS', motivo: 'NO_LE_TOCABA' }),
      persona({ personaId: '5', estado: 'CUMPLIDO' }),
    ];
    const secciones = seccionesDeLasPersonas(personas);
    expect(secciones.map(s => s.titulo)).toEqual(['Sin cumplir', 'Pendientes', 'Cumplieron', 'No les tocaba o en pausa']);
    expect(secciones.map(s => s.plegadaAlAbrir)).toEqual([false, false, false, true]);
    expect(secciones[2].personas.map(p => p.personaId)).toEqual(['3', '5']);
  });

  it('una sección vacía no se dibuja', () => {
    expect(seccionesDeLasPersonas([persona({ estado: 'CUMPLIDO' })]).map(s => s.estado)).toEqual(['CUMPLIDO']);
    expect(seccionesDeLasPersonas([])).toEqual([]);
  });

  it('suma una página sin repetir a nadie', () => {
    const previas = [persona({ personaId: '1' }), persona({ personaId: '2' })];
    const suma = sumarPersonas(previas, [persona({ personaId: '2' }), persona({ personaId: '3' })]);
    expect(suma.map(p => p.personaId)).toEqual(['1', '2', '3']);
  });
});

describe('textos', () => {
  const totales: TotalesDelDia = { alumnos: 120, conHabitos: 118, esperados: 1500, cumplieron: 940, pendientes: 400, sinCumplir: 160 };

  it('el resumen del día con las cifras del servidor', () => {
    expect(resumenDelDiaEnPalabras(totales)).toBe('118 de 120 alumnos con hábitos · 940 de 1 500 cumplidos'.replace(' ', formatoMiles()));
  });

  it('sin alumnos en el dato no se inventa la primera mitad; sin hábitos por cumplir lo dice', () => {
    expect(resumenDelDiaEnPalabras({ ...totales, alumnos: 0, conHabitos: 0 })).toBe(`940 de 1${formatoMiles()}500 cumplidos`);
    expect(resumenDelDiaEnPalabras({ ...totales, esperados: 0, cumplieron: 0 })).toBe('Nadie tenía hábitos por cumplir');
  });

  it('un solo alumno va en singular', () => {
    expect(resumenDelDiaEnPalabras({ alumnos: 1, conHabitos: 1, esperados: 2, cumplieron: 1, pendientes: 1, sinCumplir: 0 })).toBe('1 de 1 alumno con hábitos · 1 de 2 cumplidos');
  });

  it('la línea de un hábito: hoy dice los pendientes, un día cerrado los sin cumplir', () => {
    expect(lineaDelHabito(habito({ pendientes: 50, sinCumplir: 0 }), true)).toBe('Cumplieron 41 de 100 · 50 pendientes');
    expect(lineaDelHabito(habito({ pendientes: 0, sinCumplir: 9 }), false)).toBe('Cumplieron 41 de 100 · 9 sin cumplir');
    expect(lineaDelHabito(habito({ pendientes: 1, sinCumplir: 0 }), true)).toBe('Cumplieron 41 de 100 · 1 pendiente');
    expect(lineaDelHabito(habito({ pendientes: 0, sinCumplir: 0, cumplieron: 100 }), true)).toBe('Cumplieron 100 de 100');
  });

  it('en hoy, lo que ya se pasó se dice detrás; en un día cerrado, primero lo sin cumplir', () => {
    expect(lineaDelHabito(habito({ pendientes: 4, sinCumplir: 2 }), true)).toBe('Cumplieron 41 de 100 · 4 pendientes · 2 sin cumplir');
    expect(lineaDelHabito(habito({ pendientes: 4, sinCumplir: 2 }), false)).toBe('Cumplieron 41 de 100 · 2 sin cumplir · 4 pendientes');
  });

  it('la barra: la fracción cumplida, sin pasarse de 1 ni dividir por cero', () => {
    expect(fraccionCumplida(habito({ cumplieron: 25, esperados: 100 }))).toBe(0.25);
    expect(fraccionCumplida(habito({ cumplieron: 5, esperados: 0 }))).toBe(0);
    expect(fraccionCumplida(habito({ cumplieron: 9, esperados: 4 }))).toBe(1);
  });

  it('el nombre en tipo oración y la dimensión: la del servidor o una de las cuatro conocidas; si no, nada', () => {
    expect(nombreDelHabito(habito({ titulo: 'AGUA TIBIA CON LIMÓN' }))).toBe('Agua tibia con limón');
    expect(dimensionDelHabito(habito({ categoria: 'BODY' }))).toBe('Cuerpo');
    expect(dimensionDelHabito(habito({ categoria: 'CONSCIENCE' }))).toBe('Emociones');
    expect(dimensionDelHabito(habito({ categoria: 'DIPLOMADO_ESTUDIO' }))).toBeNull();
    expect(dimensionDelHabito(habito({ categoria: 'DIPLOMADO_ESTUDIO', nombreDeLaCategoria: 'Estudio' }))).toBe('Estudio');
  });

  it('lo que oye quien no ve en la fila de un hábito', () => {
    expect(dichoDelHabito(habito({ titulo: 'DESPERTAR' }), true)).toBe('Despertar. Cuerpo. Cumplieron 41 de 100 · 50 pendientes · 9 sin cumplir. Ver los alumnos.');
  });

  it('la línea de una persona: grupo, hora planificada y hora de cumplimiento', () => {
    expect(lineaDeLaPersona(persona())).toBe('Fénix · Planificado 06:00 · Cumplió 06:42');
    expect(lineaDeLaPersona(persona({ grupoId: null, grupoNombre: null, horaPlanificada: null, cumplioA: null, estado: 'PENDIENTE' }))).toBe('Sin grupo');
    expect(lineaDeLaPersona(persona({ grupoNombre: null }))).toBe('Grupo sin nombre · Planificado 06:00 · Cumplió 06:42');
  });

  it('los textos de la lista vacía', () => {
    expect(textoSinHabitos(false)).toBe('Ese día nadie tenía hábitos por cumplir.');
    expect(textoSinHabitos(true)).toBe('Ningún alumno coincide con estos filtros.');
  });
});

/** El separador de miles que usa la app (un espacio duro), leído de la misma función. */
function formatoMiles(): string {
  return resumenDelDiaEnPalabras({ alumnos: 0, conHabitos: 0, esperados: 1500, cumplieron: 1, pendientes: 0, sinCumplir: 0 }).match(/1(\D)500/)?.[1] ?? ' ';
}

describe('filtros', () => {
  it('las dimensiones se suman a lo ya visto, para que al filtrar por una no desaparezcan las otras', () => {
    const primera = sumarDimensiones([], [habito({ categoriaClave: 'CUERPO', categoria: 'BODY' }), habito({ habitoId: 'h-2', categoriaClave: 'MENTE', categoria: 'MIND' })]);
    expect(primera).toEqual([{ clave: 'CUERPO', etiqueta: 'Cuerpo' }, { clave: 'MENTE', etiqueta: 'Mente' }]);
    const filtrada = sumarDimensiones(primera, [habito({ categoriaClave: 'CUERPO', categoria: 'BODY' })]);
    expect(filtrada).toEqual(primera);
  });

  it('una dimensión sin nombre conocido no se ofrece: no se inventan etiquetas', () => {
    expect(sumarDimensiones([], [habito({ categoria: 'DIPLOMADO_ESTUDIO', categoriaClave: 'DIPLOMADO_ESTUDIO' })])).toEqual([]);
    expect(sumarDimensiones([], [habito({ categoria: 'DIPLOMADO_ESTUDIO', categoriaClave: 'DIPLOMADO_ESTUDIO', nombreDeLaCategoria: 'Estudio' })])).toEqual([
      { clave: 'DIPLOMADO_ESTUDIO', etiqueta: 'Estudio' },
    ]);
  });

  it('hay filtros si alguno está puesto (el día no es un filtro)', () => {
    expect(hayFiltros({ grupo: null, formacion: null, categoria: null })).toBe(false);
    expect(hayFiltros({ grupo: 'none', formacion: null, categoria: null })).toBe(true);
    expect(hayFiltros({ grupo: null, formacion: null, categoria: 'CUERPO' })).toBe(true);
  });

  const BASE: FormacionDeLaSesion = { activa: { codigo: 'ESCUELA', nombre: 'Escuela Renaser' }, disponibles: [{ codigo: 'ESCUELA', nombre: 'Escuela Renaser' }], puedeElegir: false, veTodas: false, sinFormacion: false, duracionDias: 90, fases: [] };

  it('el filtro de formación existe solo para quien ve más de una a la vez; una persona con una sola ni la palabra', () => {
    expect(seOfreceElFiltroDeFormacion(BASE)).toBe(false);
    expect(seOfreceElFiltroDeFormacion(null)).toBe(false);
    expect(seOfreceElFiltroDeFormacion(undefined)).toBe(false);
    expect(seOfreceElFiltroDeFormacion({ ...BASE, veTodas: true, activa: null })).toBe(true);
  });

  it('el personal con dos formaciones ve solo la activa: no se le ofrece un filtro que daría siempre una lista vacía', () => {
    expect(
      seOfreceElFiltroDeFormacion({
        ...BASE,
        puedeElegir: true,
        disponibles: [{ codigo: 'ESCUELA', nombre: 'Escuela Renaser' }, { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser' }],
      }),
    ).toBe(false);
  });
});

describe('la ficha, en el mismo día', () => {
  it('un día anterior cae en la ventana vigente: no hace falta pedir otra', () => {
    expect(fichaParaElDia({ fecha: '2026-10-28', esHoy: false })).toEqual({ inicio: undefined, diaInicial: '2026-10-28' });
  });

  it('hoy solo cabe en la ficha si hoy es viernes: se pide la semana que termina hoy', () => {
    expect(fichaParaElDia({ fecha: '2026-10-30', esHoy: true })).toEqual({
      inicio: { posicion: { modo: 'semana', semanaHasta: '2026-10-30' }, hastaVigente: null },
      diaInicial: '2026-10-30',
    });
  });

  it('hoy cualquier otro día: la ventana vigente, y el día pedido (que no está) deja el más reciente', () => {
    expect(fichaParaElDia({ fecha: '2026-10-29', esHoy: true })).toEqual({ inicio: undefined, diaInicial: '2026-10-29' });
  });
});
