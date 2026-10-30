import { describe, expect, it } from '@jest/globals';

/**
 * La mitad del Radar de «Hábitos de hoy» (spec 016): qué dice y qué hace en cada caso de la tabla de la spec. Es la regla
 * pura; la tarjeta solo la dibuja. Hoy en la prueba es el jueves 29 de octubre de 2026 (día ISO 4), en la zona del teléfono.
 */

import type { LecturaDeMiRadar } from '../../hooks/useConfigDeMiRadar';
import type { MiRadarApi, RegistroRadarApi } from '../../types/radar.types';
import {
  etiquetaDeLaMitad,
  filasDeLasHorasDeHoy,
  mitadDelRadar,
  registroDeEstaHora,
  textoDeLaFilaDeHoy,
  type EntradaDeLaMitad,
} from '../mitadDelRadar';
import type { EstadoRadar } from '../slotsDelRadar';

const A_LAS = (h: number, min = 0) => new Date(2026, 9, 29, h, min);
const slot = (h: number) => ({ hora: h, etiqueta: `${String(h).padStart(2, '0')}:00`, cierraA: `${String(h + 1).padStart(2, '0')}:00` });

const registro = (id: string, hora: number, extra: Partial<RegistroRadarApi> = {}, dia = 29): RegistroRadarApi => ({
  id,
  whatAmIDoing: 'a',
  whatAmIThinking: 'b',
  whatAmIFeeling: 'c',
  energyLevel: 7,
  whatAmIAvoiding: 'd',
  createdAt: new Date(2026, 9, dia, hora, 6).toISOString(),
  ...extra,
});

const lista = (config: MiRadarApi): LecturaDeMiRadar => ({ estado: 'lista', config });
const ENCENDIDO: MiRadarApi = { encendido: true, horas: [9, 14, 20], dias: [] };

function entrada(extra: Partial<EntradaDeLaMitad> = {}): EntradaDeLaMitad {
  return {
    diaPrograma: 3,
    inscrito: true,
    estadoDelDia: { tipo: 'abierto', slot: slot(13), minutosParaCerrar: 12 },
    obligatorio: true,
    minutosParaAbrir: 0,
    miRadar: { estado: 'pendiente' },
    registros: null,
    ahora: A_LAS(13, 48),
    ...extra,
  };
}

/** Desde el día 8, con Mi Radar encendido (o lo que se pase) y los registros ya leídos. */
const desdeElOcho = (extra: Partial<EntradaDeLaMitad> = {}) =>
  entrada({ diaPrograma: 10, estadoDelDia: { tipo: 'apagado', motivo: 'etapa-terminada' }, miRadar: lista(ENCENDIDO), registros: [], ...extra });

describe('sin Día 1', () => {
  it.each([
    ['sin inscripción', { inscrito: false }],
    ['programa sin arrancar (día 0)', { diaPrograma: 0 }],
    ['sin saber el día', { diaPrograma: null }],
    ['sin /home todavía', { diaPrograma: undefined, inscrito: undefined }],
  ])('%s: no hay mitad', (_caso, extra) => {
    expect(mitadDelRadar(entrada(extra as Partial<EntradaDeLaMitad>))).toBeNull();
    expect(mitadDelRadar(desdeElOcho(extra as Partial<EntradaDeLaMitad>))).toBeNull();
  });
});

describe('días 1 a 7', () => {
  it('hora pendiente: Código Renaser, la hora, «Innegociable» y cuándo cierra; abre el formulario de siempre', () => {
    const m = mitadDelRadar(entrada())!;
    expect(m).toMatchObject({
      nombre: 'Código Renaser',
      hora: '13:00',
      estado: 'Innegociable',
      tono: 'dorado',
      icono: 'compass',
      titulo: '¿Dónde estás ahora mismo?',
      accion: 'formulario',
      destacada: true,
    });
    expect(m.detalle).toBe('Cinco preguntas, un minuto. Cierra a las 14:00 · quedan 12 min.');
  });

  it('quien puede cerrarlo ve «Abierto»; con más de 15 minutos no se dicen los que quedan', () => {
    const m = mitadDelRadar(entrada({ obligatorio: false, estadoDelDia: { tipo: 'abierto', slot: slot(13), minutosParaCerrar: 40 } }))!;
    expect(m.estado).toBe('Abierto');
    expect(m.detalle).toBe('Cinco preguntas, un minuto. Cierra a las 14:00.');
  });

  it('en los minutos de cortesía dice cuándo se abre solo y que se puede empezar ya', () => {
    const m = mitadDelRadar(entrada({ minutosParaAbrir: 2 }))!;
    expect(m.detalle).toBe('Cinco preguntas, un minuto. Se abre en 2 min, o toca para empezar ya.');
    expect(m.accion).toBe('formulario');
  });

  it('hora registrada: «Registrado», lo siguiente, y abre la hoja con lo respondido', () => {
    const m = mitadDelRadar(entrada({ estadoDelDia: { tipo: 'respondido', slot: slot(13), proximaHora: 14 } }))!;
    expect(m).toMatchObject({ nombre: 'Código Renaser', hora: '13:00', estado: 'Registrado', tono: 'ok', icono: 'checkCircle', titulo: null, accion: 'resumen', destacada: false });
    expect(m.detalle).toBe('Listo por esta hora. El siguiente a las 14:00.');
    expect(m.siguiente).toBe('El siguiente a las 14:00.');
  });

  it('el último registro del día lo dice', () => {
    const m = mitadDelRadar(entrada({ estadoDelDia: { tipo: 'respondido', slot: slot(19), proximaHora: null } }))!;
    expect(m.detalle).toBe('Listo. Era el último registro del día.');
  });

  it('antes del primer registro del día, «En espera» y no es un botón', () => {
    const m = mitadDelRadar(entrada({ estadoDelDia: { tipo: 'fuera-de-ventana', proximaHora: 8 } }))!;
    expect(m).toMatchObject({ estado: 'En espera', hora: null, accion: 'ninguna', icono: 'clock' });
    expect(m.detalle).toBe('El primer registro del día es a las 08:00.');
  });

  it.each<[string, EstadoRadar]>([
    ['cargando (aún no se sabe si esta hora ya se respondió)', { tipo: 'cargando', slot: slot(13) }],
    ['apagado', { tipo: 'apagado', motivo: 'desactivado' }],
    ['pasado el último registro del día', { tipo: 'fuera-de-ventana', proximaHora: null }],
  ])('%s: no hay mitad', (_caso, estadoDelDia) => {
    expect(mitadDelRadar(entrada({ estadoDelDia }))).toBeNull();
  });

  it('lo de Mi Radar no cambia nada en estos días, aunque esté encendido', () => {
    const solo = mitadDelRadar(entrada());
    expect(mitadDelRadar(entrada({ miRadar: lista(ENCENDIDO), registros: [registro('r', 13)] }))).toEqual(solo);
  });

  it('el día 7 todavía es el Código Renaser y el 8 ya es Mi Radar', () => {
    expect(mitadDelRadar(entrada({ diaPrograma: 7 }))!.nombre).toBe('Código Renaser');
    expect(mitadDelRadar(desdeElOcho({ diaPrograma: 8 }))!.nombre).toBe('Mi Radar');
  });
});

describe('desde el día 8', () => {
  it.each<[string, LecturaDeMiRadar]>([
    ['leyendo', { estado: 'pendiente' }],
    ['backend sin Mi Radar (404 o 403)', { estado: 'no-disponible' }],
    ['no se pudo leer', { estado: 'fallo' }],
  ])('%s: no hay mitad', (_caso, miRadar) => {
    expect(mitadDelRadar(desdeElOcho({ miRadar }))).toBeNull();
  });

  it('apagado: «Planifica tu Radar» y lleva a Yo → Mi Radar', () => {
    const m = mitadDelRadar(desdeElOcho({ miRadar: lista({ encendido: false, horas: [], dias: [] }), registros: null }))!;
    expect(m).toMatchObject({ nombre: 'Mi Radar', hora: null, estado: 'Apagado', tono: 'suave', titulo: 'Planifica tu Radar', accion: 'yo', destacada: false });
    expect(m.detalle).toBe('Elige tus horas, por día. Es opcional.');
  });

  it('encendido pero aún sin saber qué hora está respondida: no dice nada (sin parpadeo)', () => {
    expect(mitadDelRadar(desdeElOcho({ registros: null }))).toBeNull();
  });

  it('una hora elegida pendiente: «Tu hora», responde ahí mismo con el formulario', () => {
    const m = mitadDelRadar(desdeElOcho({ ahora: A_LAS(14, 10) }))!;
    expect(m).toMatchObject({ nombre: 'Mi Radar', hora: '14:00', estado: 'Tu hora', tono: 'dorado', titulo: '¿Dónde estás ahora mismo?', accion: 'formulario', destacada: true });
    expect(m.detalle).toBe('Cinco preguntas, un minuto. Responde hasta las 15:00.');
  });

  it('esa hora ya registrada: «Registrado», cuándo es la siguiente y abre lo respondido', () => {
    const m = mitadDelRadar(desdeElOcho({ ahora: A_LAS(14, 30), registros: [registro('a', 14, { horaPrevista: 14 })] }))!;
    expect(m).toMatchObject({ hora: '14:00', estado: 'Registrado', tono: 'ok', accion: 'resumen' });
    expect(m.detalle).toBe('Listo por esta hora. La siguiente a las 20:00.');
    expect(m.siguiente).toBe('La siguiente a las 20:00.');
  });

  it('la última hora de hoy registrada dice que no quedan más', () => {
    const m = mitadDelRadar(desdeElOcho({ ahora: A_LAS(20, 30), registros: [registro('a', 20, { horaPrevista: 20 })] }))!;
    expect(m.siguiente).toBe('No quedan más horas hoy.');
  });

  it('sin hora elegida ahora: «Tu Radar de hoy» con lo que va y lo que sigue', () => {
    const m = mitadDelRadar(
      desdeElOcho({ ahora: A_LAS(16, 30), registros: [registro('a', 9, { horaPrevista: 9 }), registro('b', 14, { horaPrevista: 14 })] }),
    )!;
    expect(m).toMatchObject({ nombre: 'Mi Radar', hora: null, estado: 'Encendido', tono: 'suave', titulo: 'Próxima a las 20:00', accion: 'horas', destacada: false });
    expect(m.detalle).toBe('Hoy respondiste 2 de 3.');
  });

  it('pasadas todas las horas de hoy, lo dice y sigue abriendo las horas', () => {
    const m = mitadDelRadar(desdeElOcho({ ahora: A_LAS(21, 15), registros: [registro('a', 9, { horaPrevista: 9 })] }))!;
    expect(m.titulo).toBe('No quedan más horas hoy');
    expect(m.detalle).toBe('Hoy respondiste 1 de 3.');
    expect(m.accion).toBe('horas');
  });

  it('un día sin Radar (la spec 012, por día): «Hoy no tienes Mi Radar» y lleva a Yo', () => {
    const config: MiRadarApi = { encendido: true, horas: [9, 14, 20], dias: [{ dia: 4, horas: [] }] };
    const m = mitadDelRadar(desdeElOcho({ miRadar: lista(config), ahora: A_LAS(14, 10) }))!;
    expect(m).toMatchObject({ nombre: 'Mi Radar', estado: 'Encendido', titulo: 'Hoy no tienes Mi Radar', accion: 'yo' });
  });

  it('un día con horas propias usa las suyas, no las de todos', () => {
    const config: MiRadarApi = { encendido: true, horas: [9, 14, 20], dias: [{ dia: 4, horas: [11] }] };
    expect(mitadDelRadar(desdeElOcho({ miRadar: lista(config), ahora: A_LAS(11, 5) }))!.estado).toBe('Tu hora');
    expect(mitadDelRadar(desdeElOcho({ miRadar: lista(config), ahora: A_LAS(14, 5) }))!.accion).toBe('horas');
  });

  it('un registro de otro día no cuenta para hoy', () => {
    const m = mitadDelRadar(desdeElOcho({ ahora: A_LAS(14, 10), registros: [registro('ayer', 14, { horaPrevista: 14 }, 28)] }))!;
    expect(m.estado).toBe('Tu hora');
  });
});

describe('etiqueta para el lector de pantalla', () => {
  it('nombre, hora, estado y lo que se pide', () => {
    expect(etiquetaDeLaMitad(mitadDelRadar(entrada())!)).toBe('Código Renaser 13:00, Innegociable. ¿Dónde estás ahora mismo?');
    expect(etiquetaDeLaMitad(mitadDelRadar(desdeElOcho({ miRadar: lista({ encendido: false, horas: [], dias: [] }) }))!)).toBe(
      'Mi Radar, Apagado. Planifica tu Radar',
    );
    expect(etiquetaDeLaMitad(mitadDelRadar(entrada({ estadoDelDia: { tipo: 'respondido', slot: slot(13), proximaHora: 14 } }))!)).toBe(
      'Código Renaser 13:00, Registrado. Listo por esta hora. El siguiente a las 14:00.',
    );
  });
});

describe('«Tu Radar de hoy»: las horas de hoy', () => {
  it('respondida (con su hora), sin registro, es tu hora y prevista, en orden', () => {
    const filas = filasDeLasHorasDeHoy([20, 9, 14, 16], [registro('a', 9, { horaPrevista: 9 })], A_LAS(14, 30));
    expect(filas.map(f => [f.etiqueta, f.estado, f.respondidaA])).toEqual([
      ['09:00', 'respondida', '09:06'],
      ['14:00', 'ahora', null],
      ['16:00', 'prevista', null],
      ['20:00', 'prevista', null],
    ]);
    expect(filasDeLasHorasDeHoy([9, 14], [], A_LAS(16, 0)).map(f => f.estado)).toEqual(['sin-registro', 'sin-registro']);
  });

  it('un registro responde a la hora que dice su horaPrevista, no a la hora en que se hizo', () => {
    const filas = filasDeLasHorasDeHoy([9, 14], [registro('tarde', 15, { horaPrevista: 14 })], A_LAS(16, 0));
    expect(filas.map(f => f.estado)).toEqual(['sin-registro', 'respondida']);
    expect(filas[1].respondidaA).toBe('15:06');
  });

  it('en la hora en curso vale cualquier registro de esa hora', () => {
    const filas = filasDeLasHorasDeHoy([14], [registro('a', 14)], A_LAS(14, 30));
    expect(filas[0].estado).toBe('respondida');
  });

  it('lo que dice cada fila', () => {
    const base = { hora: 14, etiqueta: '14:00' };
    expect(textoDeLaFilaDeHoy({ ...base, estado: 'respondida', respondidaA: '14:06' })).toBe('Respondida 14:06');
    expect(textoDeLaFilaDeHoy({ ...base, estado: 'sin-registro', respondidaA: null })).toBe('Sin registro');
    expect(textoDeLaFilaDeHoy({ ...base, estado: 'ahora', respondidaA: null })).toBe('Es tu hora');
    expect(textoDeLaFilaDeHoy({ ...base, estado: 'prevista', respondidaA: null })).toBe('Prevista');
  });

  it('el registro de esta hora, para la hoja de lo respondido', () => {
    const esta = registro('esta', 14);
    expect(registroDeEstaHora([registro('otra', 9), esta], A_LAS(14, 40))).toBe(esta);
    expect(registroDeEstaHora([registro('otra', 9)], A_LAS(14, 40))).toBeNull();
  });
});
