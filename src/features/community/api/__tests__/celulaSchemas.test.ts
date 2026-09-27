/**
 * Los campos que D-206 suma a `/me/cells` y `/me/cells/{id}/members` (2026-09-27): el id y la ruta de la
 * tarjeta del mentor, y la ruta de la tarjeta de cada aprendiz. Son aditivos y opcionales: esta versión
 * de la app tiene que seguir leyendo lo que manda un backend anterior, sin ellos.
 */
import { describe, expect, it } from '@jest/globals';

import type { CellMember, CelulaDelAprendiz } from '../../types/community.types';
import { cellMembersResponseSchema, misCelulasResponseSchema, validarRespuesta } from '../celulaSchemas';

const GRUPO_ANTERIOR = {
  cellId: 'g-1',
  cellName: 'Fénix',
  cohortName: 'Cohorte 1',
  cohortStatus: 'ACTIVE',
  mentorName: 'Ricardo Palomino',
  mentorAvatarUrl: null,
  memberCount: 2,
  totalCellsInCohort: 1,
  videoCallUrl: null,
  nextSessionAt: null,
};
const RUTA_DE_RICARDO = '/api/v1/chat/conversations/c-1/miembros/u-ricardo/foto';

describe('/me/cells', () => {
  it('trae el id del mentor y la ruta de su tarjeta', () => {
    const { cells } = validarRespuesta<{ cells: CelulaDelAprendiz[] }>(
      misCelulasResponseSchema,
      { cells: [{ ...GRUPO_ANTERIOR, mentorId: 'u-ricardo', mentorPhotoPath: RUTA_DE_RICARDO }] },
      'GET /api/v1/me/cells'
    );

    expect(cells[0].mentorId).toBe('u-ricardo');
    expect(cells[0].mentorPhotoPath).toBe(RUTA_DE_RICARDO);
  });

  it('un backend anterior, sin esos campos, se sigue leyendo; y un null también vale', () => {
    const { cells } = validarRespuesta<{ cells: CelulaDelAprendiz[] }>(
      misCelulasResponseSchema,
      { cells: [GRUPO_ANTERIOR, { ...GRUPO_ANTERIOR, cellId: 'g-2', mentorId: null, mentorPhotoPath: null }] },
      'GET /api/v1/me/cells'
    );

    expect(cells.map(c => c.mentorId ?? null)).toEqual([null, null]);
  });
});

describe('/me/cells/{id}/members', () => {
  it('cada aprendiz trae la ruta de su tarjeta; sin ella (backend anterior o modo FOTO_SUBIDA) también vale', () => {
    const { members } = validarRespuesta<{ members: CellMember[] }>(
      cellMembersResponseSchema,
      {
        members: [
          { traineeId: 'u-1', fullName: 'E2E Libre 01', avatarUrl: null, isSelf: true, photoPath: '/api/v1/chat/conversations/c-1/miembros/u-1/foto' },
          { traineeId: 'u-2', fullName: 'E2E Libre 02', avatarUrl: 'https://s3/avatares/u-2.jpg', isSelf: false, photoPath: null },
          { traineeId: 'u-3', fullName: 'Tercera', avatarUrl: null, isSelf: false },
        ],
      },
      'GET /api/v1/me/cells/{cellId}/members'
    );

    expect(members.map(m => m.photoPath ?? null)).toEqual([
      '/api/v1/chat/conversations/c-1/miembros/u-1/foto',
      null,
      null,
    ]);
  });
});
