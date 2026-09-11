/**
 * Las reglas del Código Renaser, sin montar pantalla.
 *
 * Lo que se prueba acá es una decisión pura —qué slot está abierto y si ya se respondió—, así que
 * se puede recorrer la matriz completa (24 horas × 9 días) en milisegundos. A mano eso es
 * inviable, y era justamente donde se escondían los dos peores fallos de esta función.
 */
import { describe, expect, it } from '@jest/globals';
import {
  envioEnElMismoSlot,
  estadoDelRadar,
  horaEnPunto,
  horasConSlot,
  proximaHoraConSlot,
} from '../slotsDelRadar';

/** Un instante del 11/09/2026 a la hora local indicada. La zona es la del dispositivo, a propósito. */
const enHora = (hora: number, minuto = 0) => {
  const d = new Date(2026, 8, 11);
  d.setHours(hora, minuto, 0, 0);
  return d;
};
const ayerAlas = (hora: number, minuto = 0) => {
  const d = new Date(2026, 8, 10);
  d.setHours(hora, minuto, 0, 0);
  return d;
};

describe('la ventana del día', () => {
  it('son exactamente 12 slots, uno por hora en punto', () => {
    expect(horasConSlot()).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  });

  it('abre en esas 12 horas los días 1 a 7, y en ninguna otra hora ni ningún otro día', () => {
    for (let dia = 0; dia <= 8; dia++) {
      const abiertas: number[] = [];
      for (let hora = 0; hora < 24; hora++) {
        if (estadoDelRadar({ diaPrograma: dia, ultimoEnvioIso: null, ahora: enHora(hora) }).tipo === 'abierto') {
          abiertas.push(hora);
        }
      }
      expect({ dia, abiertas }).toEqual({
        dia,
        abiertas: dia >= 1 && dia <= 7 ? [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] : [],
      });
    }
  });

  it('el día 0 no cuenta: hay cuenta, pero el reloj del programa no arrancó', () => {
    const estado = estadoDelRadar({ diaPrograma: 0, ultimoEnvioIso: null, ahora: enHora(10) });
    expect(estado).toEqual({ tipo: 'apagado', motivo: 'programa-sin-arrancar' });
  });

  it('desde el día 8 se apaga y no vuelve, igual que el traslado fuera de la bienvenida', () => {
    for (const dia of [8, 9, 30, 90]) {
      expect(estadoDelRadar({ diaPrograma: dia, ultimoEnvioIso: null, ahora: enHora(10) }).tipo).toBe('apagado');
    }
  });
});

describe('entrar tarde no acumula los slots perdidos', () => {
  it('quien entra a las 10:00 ve UNO, el de las 10, no los tres del día', () => {
    const estado = estadoDelRadar({ diaPrograma: 3, ultimoEnvioIso: null, ahora: enHora(10) });
    expect(estado.tipo).toBe('abierto');
    expect(estado.tipo === 'abierto' && estado.slot.hora).toBe(10);
  });

  it('a las 19:30 del día 7, con once perdidos, sigue habiendo uno solo', () => {
    const estado = estadoDelRadar({ diaPrograma: 7, ultimoEnvioIso: null, ahora: enHora(19, 30) });
    expect(estado.tipo === 'abierto' && estado.slot.hora).toBe(19);
    expect(estado.tipo === 'abierto' && estado.minutosParaCerrar).toBe(30);
  });
});

describe('un registro vale para SU hora y sólo para esa', () => {
  it('respondido a las 10:05, a las 10:30 está hecho', () => {
    expect(estadoDelRadar({ diaPrograma: 3, ultimoEnvioIso: enHora(10, 5).toISOString(), ahora: enHora(10, 30) }).tipo)
      .toBe('respondido');
  });

  it('a las 11:00 vuelve a pedirse', () => {
    expect(estadoDelRadar({ diaPrograma: 3, ultimoEnvioIso: enHora(10, 5).toISOString(), ahora: enHora(11) }).tipo)
      .toBe('abierto');
  });

  it('lo de las 09:59 no cubre el slot de las 10:00 (un minuto antes es otra hora)', () => {
    expect(estadoDelRadar({ diaPrograma: 3, ultimoEnvioIso: enHora(9, 59).toISOString(), ahora: enHora(10) }).tipo)
      .toBe('abierto');
  });

  it('la misma hora de AYER no cuenta como respondida hoy', () => {
    expect(estadoDelRadar({ diaPrograma: 3, ultimoEnvioIso: ayerAlas(10, 30).toISOString(), ahora: enHora(10, 30) }).tipo)
      .toBe('abierto');
  });
});

describe('relojes que no coinciden', () => {
  // El caso que dejaba encerrado al aprendiz: el formulario no se cierra nunca porque la hora del
  // servidor y la del teléfono no caen en el mismo slot. Envía, sigue ahí, vuelve a enviar.
  const servidorAdelantado = enHora(14).toISOString();

  it('con la marca del servidor desfasada, sola, el registro no se daba por hecho', () => {
    expect(estadoDelRadar({ diaPrograma: 3, ultimoEnvioIso: servidorAdelantado, ahora: enHora(10, 30) }).tipo)
      .toBe('abierto');
  });

  it('la marca local del propio dispositivo lo cierra igual', () => {
    expect(estadoDelRadar({
      diaPrograma: 3,
      ultimoEnvioIso: servidorAdelantado,
      envioLocalIso: enHora(10, 29).toISOString(),
      ahora: enHora(10, 30),
    }).tipo).toBe('respondido');
  });

  it('y no lo cierra de más: a la hora siguiente vuelve a pedirse', () => {
    expect(estadoDelRadar({
      diaPrograma: 3,
      ultimoEnvioIso: servidorAdelantado,
      envioLocalIso: enHora(10, 29).toISOString(),
      ahora: enHora(11),
    }).tipo).toBe('abierto');
  });

  it('una marca local de ayer no vale para hoy', () => {
    expect(estadoDelRadar({
      diaPrograma: 3,
      ultimoEnvioIso: null,
      envioLocalIso: ayerAlas(10, 29).toISOString(),
      ahora: enHora(10, 30),
    }).tipo).toBe('abierto');
  });
});

describe('bordes y datos rotos', () => {
  it('a las 07:59 todavía no empezó, y dice a qué hora empieza', () => {
    const estado = estadoDelRadar({ diaPrograma: 3, ultimoEnvioIso: null, ahora: enHora(7, 59) });
    expect(estado).toEqual({ tipo: 'fuera-de-ventana', proximaHora: 8 });
  });

  it('a las 20:00 ya terminó el día y no hay próxima', () => {
    const estado = estadoDelRadar({ diaPrograma: 3, ultimoEnvioIso: null, ahora: enHora(20) });
    expect(estado).toEqual({ tipo: 'fuera-de-ventana', proximaHora: null });
  });

  it('el de las 19:00 es el último: respondido, sin siguiente', () => {
    const estado = estadoDelRadar({ diaPrograma: 3, ultimoEnvioIso: enHora(19, 1).toISOString(), ahora: enHora(19, 30) });
    expect(estado.tipo === 'respondido' && estado.proximaHora).toBeNull();
  });

  it('una fecha ilegible del backend no rompe ni da por hecho nada', () => {
    expect(envioEnElMismoSlot('no-es-una-fecha', enHora(10, 30))).toBe(false);
    expect(envioEnElMismoSlot(null, enHora(10, 30))).toBe(false);
    expect(envioEnElMismoSlot(undefined, enHora(10, 30))).toBe(false);
  });

  it('un día negativo no abre nada', () => {
    expect(estadoDelRadar({ diaPrograma: -1, ultimoEnvioIso: null, ahora: enHora(10) }).tipo).toBe('apagado');
  });

  it('la hora se pinta siempre con dos dígitos y da la vuelta a medianoche', () => {
    expect(horaEnPunto(8)).toBe('08:00');
    expect(horaEnPunto(19)).toBe('19:00');
    expect(horaEnPunto(24)).toBe('00:00');
  });

  it('la próxima hora con slot se calcula desde la actual', () => {
    expect(proximaHoraConSlot(enHora(3))).toBe(8);
    expect(proximaHoraConSlot(enHora(12, 59))).toBe(13);
    expect(proximaHoraConSlot(enHora(19))).toBeNull();
  });
});
