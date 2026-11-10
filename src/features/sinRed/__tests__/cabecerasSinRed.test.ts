/** Spec 048, fase 3 (FR-007, FR-014, FR-019): las tres cabeceras del contrato con el servidor. No se cambian sus nombres. */
import { describe, expect, it } from '@jest/globals';

import { cabecerasDe } from '../cabecerasSinRed';

describe('cabeceras de lo hecho sin señal (fase 3)', () => {
  it('lleva el id del envío, la hora real en UTC con Z y el origen de la hora', () => { // spec 048 FR-019
    const c = cabecerasDe({ idCliente: '5f0c1f4e-2d0a-4b7e-9d77-0c9f3f6b1a10', hechoEn: '2026-11-10T02:40:13.250Z', origenDeLaHora: 'RELOJ_DEL_SISTEMA' });
    expect(c).toEqual({
      'X-Id-Cliente': '5f0c1f4e-2d0a-4b7e-9d77-0c9f3f6b1a10',
      'X-Hecho-En': '2026-11-10T02:40:13.250Z',
      'X-Origen-De-La-Hora': 'RELOJ_DEL_SISTEMA',
    });
  });

  it('una hora guardada con otro formato sale en UTC con Z', () => { // spec 048 FR-019
    const c = cabecerasDe({ idCliente: 'x', hechoEn: '2026-11-09T21:40:00-05:00', origenDeLaHora: 'TELEFONO_CORREGIDO' });
    expect(c['X-Hecho-En']).toBe('2026-11-10T02:40:00.000Z');
    expect(c['X-Origen-De-La-Hora']).toBe('TELEFONO_CORREGIDO');
  });
});
