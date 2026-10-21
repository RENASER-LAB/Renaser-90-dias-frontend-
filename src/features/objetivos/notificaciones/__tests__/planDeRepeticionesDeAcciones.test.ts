/**
 * Los identificadores y el plan de «Repetir si no la atiendo» para las acciones de los objetivos (spec 010), y lo propio de
 * «Cómo suena» en ellas. Puro: no toca la librería de avisos.
 */
import { describe, expect, it } from '@jest/globals';

import type { CombinacionDeAlarma } from '../../../habits/notificaciones/utils/combinacionDeAlarma';
import { repeticionDe as repeticionDeUnHabito } from '../../../habits/notificaciones/utils/repeticionesDeAlarma';
import type { RocaDiariaApi } from '../../types/objetivos.types';
import {
  DESCRIPCION_VOZ_DE_LAS_ACCIONES,
  FILAS_DE_COMO_SUENA_DE_LAS_ACCIONES,
  motivoDeAtenuacionDeLasAcciones,
} from '../comoSuenaDeLasAcciones';
import {
  claveDeLaAccionAtendida,
  claveDelDiarioAtendido,
  fechaIsoDeLaCompacta,
  identificadorDeRepeticionDeAccion,
  identificadorDeRepeticionDelDiario,
  planDeRepeticionesDeLasAcciones,
  planDeRepeticionesDelDiario,
  repeticionDeObjetivos,
} from '../planDeRepeticionesDeAcciones';
import type { PreferenciasDeAcciones } from '../preferenciasPorDia';

const c = (sonido: boolean, vibracion: boolean, voz = false, repetir = false): CombinacionDeAlarma => ({ sonido, vibracion, voz, repetir });
const REPITE: PreferenciasDeAcciones = { diarioActivo: true, horaDiaria: '07:00', antelaciones: [0], alarma: c(true, true, false, true) };
const MADRUGADA_UTC = Date.UTC(2026, 8, 26, 3, 0); // viernes 25 a las 22:00 en Lima

const roca = (parcial: Partial<RocaDiariaApi> & { id: string }): RocaDiariaApi => ({
  fecha: '2026-09-26', posicion: 1, titulo: 'Llamar', descripcion: null, color: 'VERDE', puntajeImpacto: 5, esDelegable: false,
  eje: 'TRABAJO', rocaSemanalId: null, horaInicio: '07:00:00', horaFin: null, completada: false, completadaEn: null,
  puntosOtorgados: 0, bloqueada: false, acciones: [], ...parcial,
});

describe('los identificadores', () => {
  it('se arman y se leen de vuelta', () => {
    expect(identificadorDeRepeticionDeAccion('r-1', '20260926', 5)).toBe('accion-r-1-rep-20260926-5');
    expect(repeticionDeObjetivos('accion-r-1-rep-20260926-5')).toEqual({ tipo: 'accion', rocaId: 'r-1', fecha: '20260926', minutos: 5 });
    expect(identificadorDeRepeticionDelDiario('20260926', 10)).toBe('acciones-diario-rep-20260926-10');
    expect(repeticionDeObjetivos('acciones-diario-rep-20260926-10')).toEqual({ tipo: 'diario', fecha: '20260926', minutos: 10 });
  });

  it('el id de una acción puede traer guiones (un uuid) y se lee entero', () => {
    const id = '8c1f1a3e-7b0d-4c1e-9a55-0d2b1e6f7a10';
    expect(repeticionDeObjetivos(identificadorDeRepeticionDeAccion(id, '20260926', 10))).toMatchObject({ rocaId: id });
  });

  it('lo que no es una repetición de estas no se reconoce, y las de los hábitos tampoco se confunden con ellas', () => {
    for (const id of ['acciones-diario-d6', 'habito-h-1-rep-20260926-5', 'accion-r-1', 'accion-r-1-rep-2026-5', undefined, 7, null]) {
      expect(repeticionDeObjetivos(id)).toBeNull();
    }
    // Y al revés: la parte de hábitos no se queda con las de acciones (cambiar el tono las mezclaría).
    expect(repeticionDeUnHabito('accion-r-1-rep-20260926-5')).toBeNull();
    expect(repeticionDeUnHabito('acciones-diario-rep-20260926-5')).toBeNull();
  });

  it('`AAAAMMDD` ↔ `AAAA-MM-DD` y las claves de «atendida»', () => {
    expect(fechaIsoDeLaCompacta('20260926')).toBe('2026-09-26');
    expect(claveDeLaAccionAtendida('r-1')).toBe('accion:r-1');
    expect(claveDelDiarioAtendido('20260926')).toBe('diario:20260926');
  });
});

describe('el plan de las acciones', () => {
  const plan = (rocas: RocaDiariaApi[], prefs = REPITE, atendidas = new Set<string>()) =>
    planDeRepeticionesDeLasAcciones(rocas, prefs, MADRUGADA_UTC, 'America/Lima', atendidas);

  it('dos por acción, con su ruta y su acción en los datos', () => {
    const [cinco, diez] = plan([roca({ id: 'r1' })]);
    expect([cinco.minutosDespues, diez.minutosDespues]).toEqual([5, 10]);
    expect([cinco.instanteMs, diez.instanteMs]).toEqual([Date.UTC(2026, 8, 26, 12, 5), Date.UTC(2026, 8, 26, 12, 10)]);
    expect(cinco).toMatchObject({ titulo: 'Llamar', cuerpo: 'Te tocaba a las 07:00.', fecha: '20260926', origen: { tipo: 'accion', rocaId: 'r1' } });
    expect(cinco.data).toEqual({ route: '/objetivos/2026-09-26?eje=TRABAJO', rocaId: 'r1', alarma: c(true, true, false, true) });
  });

  it('una atendida, cumplida, sin hora o de un día sin aviso o sin «Repetir» no repite', () => {
    expect(plan([roca({ id: 'r1' })], REPITE, new Set(['accion:r1']))).toEqual([]);
    expect(plan([roca({ id: 'r1', completada: true })])).toEqual([]);
    expect(plan([roca({ id: 'r1', horaInicio: null })])).toEqual([]);
    expect(plan([roca({ id: 'r1' })], { ...REPITE, dias: { 6: { antelaciones: [] } } })).toEqual([]);
    expect(plan([roca({ id: 'r1' })], { ...REPITE, alarma: undefined })).toEqual([]);
  });

  it('una fecha que no es fecha no tira', () => {
    expect(plan([roca({ id: 'r1', fecha: 'mañana' })])).toEqual([]);
  });
});

describe('el plan del recordatorio diario', () => {
  it('una ventana de 7 días desde hoy, sin lo que ya pasó', () => {
    const pedidos = planDeRepeticionesDelDiario(REPITE, new Date(MADRUGADA_UTC));
    expect(pedidos).toHaveLength(12);
    expect(pedidos[0]).toMatchObject({ identificador: 'acciones-diario-rep-20260926-5', origen: { tipo: 'diario' } });
    expect(pedidos.at(-1)?.identificador).toBe('acciones-diario-rep-20261001-10');
  });

  it('un día atendido, apagado o que no repite no tiene', () => {
    expect(planDeRepeticionesDelDiario(REPITE, new Date(MADRUGADA_UTC), new Set(['diario:20260926'])).map(p => p.fecha)).not.toContain('20260926');
    expect(planDeRepeticionesDelDiario({ ...REPITE, diarioActivo: false }, new Date(MADRUGADA_UTC))).toEqual([]);
    expect(planDeRepeticionesDelDiario({ ...REPITE, alarma: undefined }, new Date(MADRUGADA_UTC))).toEqual([]);
  });
});

describe('«Cómo suena» de las acciones', () => {
  it('son las mismas cuatro filas, en el mismo orden, con «Voz» que dice la frase de objetivos', () => {
    expect(FILAS_DE_COMO_SUENA_DE_LAS_ACCIONES.map(f => f.clave)).toEqual(['sonido', 'vibracion', 'voz', 'repetir']);
    expect(FILAS_DE_COMO_SUENA_DE_LAS_ACCIONES.map(f => f.etiqueta)).toEqual(['Sonido', 'Vibración', 'Voz', 'Repetir si no la atiendo']);
    expect(DESCRIPCION_VOZ_DE_LAS_ACCIONES).toBe('Una voz dice: «Tienes acciones de tus objetivos por hacer»');
    expect(FILAS_DE_COMO_SUENA_DE_LAS_ACCIONES[2].descripcion).toBe(DESCRIPCION_VOZ_DE_LAS_ACCIONES);
  });

  it('solo se atenúa si no hay ni recordatorio ni aviso, y el texto sigue a los días marcados', () => {
    expect(motivoDeAtenuacionDeLasAcciones({ sinAlarmas: false, conDias: true, cuantosDias: 2 })).toBeNull();
    expect(motivoDeAtenuacionDeLasAcciones({ sinAlarmas: true, conDias: false, cuantosDias: 0 })?.titulo).toBe('Todavía no tienes recordatorio ni aviso');
    expect(motivoDeAtenuacionDeLasAcciones({ sinAlarmas: true, conDias: true, cuantosDias: 1 })?.titulo).toBe('Este día no tiene recordatorio ni aviso');
    expect(motivoDeAtenuacionDeLasAcciones({ sinAlarmas: true, conDias: true, cuantosDias: 3 })?.titulo).toBe('Estos días no tienen recordatorio ni aviso');
  });
});
