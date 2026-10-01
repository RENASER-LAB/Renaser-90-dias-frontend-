/**
 * «Guías del grupo inicial» (pedido del dueño del 2026-10-01, backend D-242). Fallan contra el
 * código anterior: no existía ni la utilidad ni forma de leer o elegir guías desde la app.
 */
import { describe, expect, it } from '@jest/globals';

import type { GrupoResumenApi, UsuarioStaffApi } from '../../api/adminSchemas';
import {
  candidatosAGuia,
  filasDeGuias,
  grupoInicialAMostrar,
  gruposDeBienvenida,
  guiasConUnoMas,
  guiasSinUno,
} from '../guiasRecepcion';

const persona = (id: string, fullName: string, role: string, status = 'ACTIVE', email?: string): UsuarioStaffApi => ({
  id,
  fullName,
  role,
  status,
  email: email ?? `${id}@renaser.test`,
});

const grupo = (id: string, type: string, status: string): GrupoResumenApi => ({
  id,
  name: id,
  cohortId: 'c-1',
  videoCallUrl: null,
  nextSessionAt: null,
  memberCount: 0,
  mentor: null,
  type,
  status: status as GrupoResumenApi['status'],
});

describe('candidatosAGuia', () => {
  const staff = [
    persona('m-1', 'Mario Mentor', 'MENTOR'),
    persona('a-1', 'Ada Admin', 'ADMIN'),
    persona('l-1', 'José Líder', 'MENTOR_LEAD'),
    persona('s-1', 'Sara Suspendida', 'MENTOR', 'SUSPENDED'),
  ];

  it('ofrece solo cuentas activas, con el Líder de Mentores primero y el rol con su nombre', () => {
    const filas = candidatosAGuia(staff, [], '');
    expect(filas.map(f => f.id)).toEqual(['l-1', 'm-1', 'a-1']);
    expect(filas[0].detalle).toBe('Líder de mentores');
  });

  it('no ofrece a quien ya es guía', () => {
    expect(candidatosAGuia(staff, ['l-1'], '').map(f => f.id)).toEqual(['m-1', 'a-1']);
  });

  it('busca por nombre sin tildes y por correo', () => {
    expect(candidatosAGuia(staff, [], 'jose').map(f => f.id)).toEqual(['l-1']);
    expect(candidatosAGuia(staff, [], 'a-1@renaser').map(f => f.id)).toEqual(['a-1']);
  });

  it('no repite a quien llega dos veces', () => {
    expect(candidatosAGuia([...staff, staff[0]], [], 'mario')).toHaveLength(1);
  });
});

describe('filasDeGuias', () => {
  it('muestra nombre y rol, y avisa si la cuenta ya no está activa', () => {
    const filas = filasDeGuias({
      cohortId: 'c-1',
      receptionCellId: 'r-1',
      guides: [
        { userId: 'l-1', fullName: 'Lia Líder', role: 'MENTOR_LEAD', status: 'ACTIVE' },
        { userId: 'x-1', fullName: null, role: 'MENTOR', status: 'SUSPENDED' },
      ],
    });
    expect(filas).toEqual([
      { id: 'l-1', nombre: 'Lia Líder', detalle: 'Líder de mentores' },
      { id: 'x-1', nombre: 'Sin nombre', detalle: 'Mentor · Cuenta suspendida' },
    ]);
  });
});

describe('grupo de bienvenida a mostrar', () => {
  const grupos = [grupo('reg', 'REGULAR', 'VIGENTE'), grupo('vieja', 'RECEPCION', 'CERRADO'), grupo('bien', 'RECEPCION', 'SIN_PERIODO')];

  it('solo los de recepción que no están cerrados', () => {
    expect(gruposDeBienvenida(grupos).map(g => g.id)).toEqual(['bien']);
  });

  it('manda el designado; sin designado, el primero abierto; sin ninguno, null', () => {
    const abiertos = gruposDeBienvenida(grupos);
    expect(grupoInicialAMostrar('otro', abiertos)).toBe('otro');
    expect(grupoInicialAMostrar(null, abiertos)).toBe('bien');
    expect(grupoInicialAMostrar(null, [])).toBeNull();
  });
});

describe('la lista que va al PUT (es un reemplazo)', () => {
  it('agregar suma sin repetir y quitar saca solo a esa persona', () => {
    expect(guiasConUnoMas(['a'], 'b')).toEqual(['a', 'b']);
    expect(guiasConUnoMas(['a'], 'a')).toEqual(['a']);
    expect(guiasSinUno(['a', 'b'], 'a')).toEqual(['b']);
  });
});
