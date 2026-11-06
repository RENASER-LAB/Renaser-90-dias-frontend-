/** Spec 044: lo que se elige en «¿Para quién es?» y cómo viaja al servidor. Puro. */
import { describe, expect, it } from '@jest/globals';

import { SIN_OPCIONES } from '../../api/audienciaSchemas';
import type { OpcionesDeAudiencia } from '../../types/audiencia.types';
import {
  NADIE,
  alternar,
  alternarColor,
  audienciaDesdeElResumen,
  audienciaInicial,
  camposDeAudiencia,
  eligioAlgo,
  lineaDeMisAlumnos,
  lineaDelOrganizador,
  partesDelCable,
  partesEnOrden,
  textoLlegaA,
} from '../audienciaDelFormulario';
import { armarCuerpo, formularioVacio } from '../formularioDeEvento';

const AHORA = Date.parse('2026-11-06T15:00:00Z');
const delMentor: OpcionesDeAudiencia = { ...SIN_OPCIONES, puedeCrear: true, partes: ['PERSON', 'MY_LEARNERS', 'TRAFFIC_LIGHT'], porDefecto: 'MY_LEARNERS' };
const delLider: OpcionesDeAudiencia = { ...SIN_OPCIONES, puedeCrear: true, partes: ['PERSON', 'GROUP', 'MENTORS', 'TRAFFIC_LIGHT', 'STAFF'] };
const deAdmin: OpcionesDeAudiencia = { ...delLider, todos: true };

describe('cómo abre el paso (FR-034)', () => {
  // spec 044 FR-034
  it('Administración en «Todos», el mentor en «Mis alumnos», el líder sin elección', () => {
    expect(audienciaInicial(deAdmin).todos).toBe(true);
    expect(audienciaInicial(delMentor).misAlumnos).toBe(true);
    expect(eligioAlgo(audienciaInicial(delLider))).toBe(false);
  });

  // spec 044 FR-034
  it('los chips son los que el servidor ofrece, «Todos» solo para quien puede', () => {
    expect(partesEnOrden(delMentor)).toEqual(['MY_LEARNERS', 'PERSON', 'TRAFFIC_LIGHT']);
    expect(partesEnOrden(deAdmin)[0]).toBe('ALL');
    expect(partesEnOrden(delLider)).not.toContain('ALL');
  });
});

describe('lo que viaja (contrato §1)', () => {
  // spec 044 FR-003
  it('las partes se suman: rojo y amarillo, una persona y el Alquimista', () => {
    const a = {
      ...NADIE,
      colores: ['RED', 'YELLOW'] as const,
      personas: [{ id: 'p1', nombre: 'Rosa', fotoUrl: null, rol: 'Aprendiz', grupo: null }],
      personal: [{ id: 'alq', nombre: 'Carmen', fotoUrl: null, rol: 'Alquimista', grupo: null }],
    };
    expect(partesDelCable({ ...a, colores: [...a.colores] })).toEqual([
      { kind: 'TRAFFIC_LIGHT', color: 'RED' },
      { kind: 'TRAFFIC_LIGHT', color: 'YELLOW' },
      { kind: 'PERSON', id: 'p1' },
      { kind: 'STAFF', id: 'alq' },
    ]);
  });

  // spec 044 FR-003
  it('«Todos» es exclusivo: elegir otra cosa lo apaga, y elegirlo limpia lo demás', () => {
    const conTodos = audienciaInicial(deAdmin);
    expect(alternarColor(conTodos, 'RED').todos).toBe(false);
    expect(alternar(alternarColor(NADIE, 'RED'), 'ALL')).toEqual({ ...NADIE, todos: true });
  });

  // spec 044 FR-030
  it('FR-030: al editar se manda la audiencia completa; un evento que la tenía y no la muestra la reenvía como SELECTION sin partes', () => {
    expect(camposDeAudiencia({ ...NADIE, misAlumnos: true })).toEqual({
      audienceType: 'SELECTION',
      targetRoles: [],
      audience: { parts: [{ kind: 'MY_LEARNERS' }], recalculate: false },
    });
    const sinPaso = armarCuerpo({ ...formularioVacio(AHORA, 'America/Lima'), titulo: 'Repaso', donde: 'meet' }, AHORA, {
      id: 'e1', titulo: 'Repaso', descripcion: null, portadaUrl: null, iniciaEn: '2026-11-10T01:00:00Z', duracionMinutos: 60, zona: 'America/Lima',
      tipoUbicacion: 'MEET', valorUbicacion: null, tipoEvento: 'SESION_ESPECIAL', reglasDeAviso: null, notificarAlCrear: false, recurrente: false,
      creadoPor: 'u1', audiencia: 'SELECTION', rolesDestino: [],
    });
    expect(sinPaso.ok && sinPaso.cuerpo.audienceType).toBe('SELECTION');
    expect(sinPaso.ok && sinPaso.cuerpo.audience).toBeUndefined();
  });

  // spec 044 FR-005
  it('FR-005: con el paso a la vista hay que elegir algo', () => {
    const r = armarCuerpo({ ...formularioVacio(AHORA, 'America/Lima'), titulo: 'Repaso' }, AHORA, null, NADIE);
    expect(r).toEqual({ ok: false, error: 'Elige para quién es el evento.' });
  });

  // spec 044 FR-011
  it('FR-011: al editar, lo guardado vuelve a la pantalla; «Volver a calcular» viaja como recalculate', () => {
    const a = audienciaDesdeElResumen({
      total: 3,
      partes: [
        { tipo: 'TRAFFIC_LIGHT', id: null, nombre: null, color: 'RED', cuantos: 3, resueltoEn: '2026-11-06T15:00:00Z', personas: [] },
        { tipo: 'STAFF', id: null, nombre: null, color: null, cuantos: 2, resueltoEn: null, personas: [] },
      ],
    });
    expect(a.colores).toEqual(['RED']);
    expect(a.todoElPersonal).toBe(true);
    expect((camposDeAudiencia({ ...a, recalcular: true }).audience as { recalculate: boolean }).recalculate).toBe(true);
  });
});

describe('textos', () => {
  // spec 044 FR-033
  it('«Llega a N personas», y al mentor «alumnos»', () => {
    expect(textoLlegaA(23, false)).toBe('Llega a 23 personas');
    expect(textoLlegaA(1, false)).toBe('Llega a 1 persona');
    expect(textoLlegaA(6, true)).toBe('Llega a 6 alumnos');
  });

  // spec 044 FR-019
  it('FR-019 (S7): «Te invitó Rocío, líder de mentores»: primer nombre y el rol en minúscula; nunca el motivo', () => {
    expect(lineaDelOrganizador('Rocío Díaz', 'Líder de mentores')).toBe('Te invitó Rocío, líder de mentores');
    expect(lineaDelOrganizador('Luis', null)).toBe('Te invitó Luis');
    expect(lineaDelOrganizador(null, 'Mentor')).toBeNull();
  });

  // spec 044 FR-034
  it('bajo «Mis alumnos» dice cuántos tiene hoy, en singular o plural', () => {
    expect(lineaDeMisAlumnos(1)).toBe('Tienes 1 alumno hoy.');
    expect(lineaDeMisAlumnos(3)).toBe('Tienes 3 alumnos hoy.');
    expect(lineaDeMisAlumnos(0)).toBe('Todavía no tienes alumnos en esta formación.');
  });
});
