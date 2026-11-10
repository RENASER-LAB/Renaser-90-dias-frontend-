/** Spec 048 (FR-013): la hora real no se mueve si la persona cambia la hora del teléfono; tras un reinicio se dice que es corregida. */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { _reiniciarHoraReal, anclarHoraDelServidor, horaReal } from '../horaReal';

const reloj = { ms: 500_000 };
const modulo = { milisDesdeElEncendido: () => reloj.ms };

beforeEach(() => {
  reloj.ms = 500_000;
  _reiniciarHoraReal(modulo);
  jest.useRealTimers();
});

describe('hora real (spec 048)', () => {
  it('es la hora del servidor más lo que avanzó el reloj del sistema, aunque el teléfono tenga otra hora', () => { // spec 048 FR-013
    jest.useFakeTimers({ now: new Date('2026-11-09T12:00:00Z') });
    anclarHoraDelServidor(Date.parse('2026-11-09T12:00:00Z'));
    reloj.ms += 90 * 60_000; // pasó hora y media
    jest.setSystemTime(new Date('2026-11-12T08:00:00Z')); // la persona adelantó el reloj del teléfono tres días

    const h = horaReal();

    expect(h.origen).toBe('RELOJ_DEL_SISTEMA');
    expect(h.instante.toISOString()).toBe('2026-11-09T13:30:00.000Z');
  });

  it('si el teléfono se reinició desde el ancla, usa su reloj corregido y lo dice', () => { // spec 048 FR-013
    jest.useFakeTimers({ now: new Date('2026-11-09T12:00:00Z') });
    anclarHoraDelServidor(Date.parse('2026-11-09T12:05:00Z')); // el teléfono atrasa 5 min
    reloj.ms = 10_000; // reinicio
    jest.setSystemTime(new Date('2026-11-09T13:00:00Z'));

    const h = horaReal();

    expect(h.origen).toBe('TELEFONO_CORREGIDO');
    expect(h.instante.toISOString()).toBe('2026-11-09T13:05:00.000Z');
  });

  it('sin el módulo nativo (iPhone o app sin el APK nuevo) también corrige con el último desfase', () => {
    _reiniciarHoraReal(null);
    jest.useFakeTimers({ now: new Date('2026-11-09T12:00:00Z') });
    anclarHoraDelServidor(Date.parse('2026-11-09T11:58:00Z'));

    expect(horaReal()).toEqual({ instante: new Date('2026-11-09T11:58:00Z'), origen: 'TELEFONO_CORREGIDO' });
  });
});
