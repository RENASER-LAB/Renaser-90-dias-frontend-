import { describe, expect, it } from '@jest/globals';
import type { CuerpoDeLaCarrera, RespuestaDeLaCarrera } from '../../types/carrera.types';
import { PREFERENCIAS_POR_DEFECTO } from '../../types/carrera.types';
import { agregarALaCola, aplicarDesenlace, desenlaceDelError, esperaTrasIntentos, tocaIntentar } from '../colaDeEnvio';
import { alDarPasos, alPuntoGps, AVATAR_INICIAL, avatarCamina, figuraDelAvatar, RECONCILIAR_MS } from '../fusionDelAvatar';
import { distanciaM, puntoDestino } from '../geo';
import { seOfreceLaCarrera } from '../entradaDeLaCarrera';
import { esUuid, nuevaCarreraId } from '../idDeLaCarrera';
import { fraseDelAviso, lineaDeLaNotificacion, lineaDelEnvio, tocaAviso } from '../textosDeLaCarrera';
import { detalleDeLosKm } from '../../../pasos/utils/textosDePasos';
import { textosDeLaMedicion } from '../../../pasos/utils/medicionDeLaFicha';

const CUERPO: CuerpoDeLaCarrera = {
  carreraId: '6f1c2c1e-3b1a-4c0a-9a55-2f0f8d1d7a10',
  iniciadaEn: '2026-11-05T11:02:10Z',
  terminadaEn: '2026-11-05T11:41:55Z',
  duracionActivaSeg: 2215,
  distanciaMetros: 6210.4,
  tramos: [{ km: 1, segundos: 352 }],
};

function respuesta(resultado: string, repetida = false): RespuestaDeLaCarrera {
  return {
    carreraId: CUERPO.carreraId,
    repetida,
    fecha: '2026-11-05',
    kilometros: 6.21,
    cuentaParaElHabito: true,
    porRevisar: false,
    habito: { resultado, registroId: 'r', kilometrosDelDia: 6.21, puntosOtorgados: 8 },
  };
}

describe('la cola de envío', () => {
  // spec 042 FR-019
  it('una carreraId entra una sola vez aunque se agregue dos veces', () => {
    const una = agregarALaCola([], CUERPO, 'cuenta', 0);
    expect(agregarALaCola(una, CUERPO, 'cuenta', 10)).toHaveLength(1);
  });

  // spec 042 FR-017
  it('sin red se reintenta con espera creciente: 5 s, 15 s, 1 min, 5 min, 15 min y luego cada 30 min', () => {
    expect([1, 2, 3, 4, 5, 6, 9].map(esperaTrasIntentos)).toEqual([5_000, 15_000, 60_000, 300_000, 900_000, 1_800_000, 1_800_000]);
    let cola = agregarALaCola([], CUERPO, 'cuenta', 0);
    cola = aplicarDesenlace(cola, CUERPO.carreraId, desenlaceDelError(0, null, ''), 0);
    expect(cola[0]).toMatchObject({ intentos: 1, proximoIntentoMs: 5_000 });
    expect(tocaIntentar(cola[0], 4_000, false)).toBe(false);
    expect(tocaIntentar(cola[0], 5_000, false)).toBe(true);
  });

  // spec 042 FR-017, SC-004
  it('con la app al frente la espera nunca pasa de 1 minuto', () => {
    let cola = agregarALaCola([], CUERPO, 'cuenta', 0);
    for (let i = 0; i < 5; i++) cola = aplicarDesenlace(cola, CUERPO.carreraId, { tipo: 'reintentar' }, 0);
    expect(tocaIntentar(cola[0], 59_000, true)).toBe(false);
    expect(tocaIntentar(cola[0], 60_000, true)).toBe(true);
    expect(tocaIntentar(cola[0], 60_000, false)).toBe(false);
  });

  // spec 042 FR-017, FR-019
  it('un 2xx (también repetida) o un 409 sacan la carrera de la cola; un 5xx o 503 la dejan', () => {
    const cola = agregarALaCola([], CUERPO, 'cuenta', 0);
    expect(aplicarDesenlace(cola, CUERPO.carreraId, { tipo: 'exito', respuesta: respuesta('SIN_CAMBIO', true) }, 0)).toEqual([]);
    expect(aplicarDesenlace(cola, CUERPO.carreraId, desenlaceDelError(409, 'CARRERA_YA_REGISTRADA', ''), 0)).toEqual([]);
    expect(aplicarDesenlace(cola, CUERPO.carreraId, desenlaceDelError(503, 'FUNCIONALIDAD_APAGADA', ''), 0)).toHaveLength(1);
    expect(desenlaceDelError(502, null, '').tipo).toBe('reintentar');
  });

  // spec 042 FR-017
  it('otro 4xx no se reintenta solo: queda marcado con el motivo', () => {
    const cola = aplicarDesenlace(agregarALaCola([], CUERPO, 'cuenta', 0), CUERPO.carreraId, desenlaceDelError(400, null, 'Más de 60 km no se registra solo'), 0);
    expect(cola[0].bloqueada).toBe('Más de 60 km no se registra solo');
    expect(tocaIntentar(cola[0], 10_000_000, true)).toBe(false);
  });
});

describe('el avatar refleja el movimiento real al instante', () => {
  const ORIGEN = { lat: -12.0464, lng: -77.0428 };

  // spec 042 FR-031, SC-005
  it('4 pasos lo mueven en el mismo instante en que llegan, aunque el GPS no haya cambiado', () => {
    const conGps = alPuntoGps(AVATAR_INICIAL, ORIGEN, 90).estado;
    const llegada = 1_000;
    const mov = alDarPasos(conGps, 4, 0.75, llegada);
    expect(distanciaM(ORIGEN, mov.estado.posicion!)).toBeCloseTo(3, 1);
    expect(mov.duracionMs).toBeLessThan(500);
    expect(avatarCamina(mov.estado, llegada + 100, false, null)).toBe(true);
  });

  // spec 042 FR-032
  it('el siguiente punto GPS lo lleva suave (≤ 600 ms); si está a más de 30 m, sin animar', () => {
    const base = alPuntoGps(AVATAR_INICIAL, ORIGEN).estado;
    expect(alPuntoGps(base, puntoDestino(ORIGEN, 90, 5)).duracionMs).toBe(RECONCILIAR_MS);
    expect(alPuntoGps(base, puntoDestino(ORIGEN, 90, 45)).duracionMs).toBe(0);
  });

  // spec 042 FR-033, FR-038
  it('sin pasos ni velocidad, o en pausa, queda quieto', () => {
    const e = alDarPasos(alPuntoGps(AVATAR_INICIAL, ORIGEN).estado, 2, 0.75, 0).estado;
    expect(avatarCamina(e, 5_000, false, 0.3)).toBe(false);
    expect(avatarCamina(e, 500, true, null)).toBe(false);
  });

  // spec 042 FR-038
  it('la figura sale del sexo de la ficha; sin dato u «Otro», neutral', () => {
    expect(figuraDelAvatar('Masculino')).toBe('hombre');
    expect(figuraDelAvatar('Femenino')).toBe('mujer');
    expect(figuraDelAvatar('Otro')).toBe('neutral');
    expect(figuraDelAvatar(null)).toBe('neutral');
  });
});

describe('textos y voz', () => {
  // spec 042 FR-018
  it('la línea del hábito dice el estado del envío', () => {
    expect(lineaDelEnvio({ tipo: 'enviando', km: '3,20' }, true)).toBe('Registrando 3,20 km en tu hábito…');
    expect(lineaDelEnvio({ tipo: 'en-cola', km: '3,20' }, true)).toBe('Guardada en tu teléfono, se enviará al tener señal');
    expect(lineaDelEnvio({ tipo: 'respondida', respuesta: { ...respuesta('CERRADO'), kilometros: 3.2 } }, true)).toBe('Registramos 3,2 km en tu hábito');
    expect(lineaDelEnvio({ tipo: 'respondida', respuesta: respuesta('YA_CON_CAPTURA') }, true)).toBe(
      'Tu carrera quedó guardada. Hoy ya registraste este hábito con tu captura.',
    );
    expect(lineaDelEnvio({ tipo: 'respondida', respuesta: respuesta('DIA_CERRADO') }, true)).toContain('Su día ya cerró');
  });

  // spec 042 FR-010
  it('avisa cada km o cada 5 min según lo elegido, y nunca con «Nunca»', () => {
    const km = PREFERENCIAS_POR_DEFECTO;
    expect(tocaAviso(km, { metros: 990, activoMs: 0 }, { metros: 1003, activoMs: 0 })).toBe(true);
    expect(tocaAviso(km, { metros: 1003, activoMs: 0 }, { metros: 1500, activoMs: 0 })).toBe(false);
    expect(tocaAviso({ ...km, avisos: '5min' }, { metros: 0, activoMs: 299_000 }, { metros: 0, activoMs: 301_000 })).toBe(true);
    expect(tocaAviso({ ...km, avisos: 'nunca' }, { metros: 990, activoMs: 0 }, { metros: 1003, activoMs: 0 })).toBe(false);
    const frase = fraseDelAviso({ ...km, dice: { distancia: true, tiempo: true, ritmo: false, ritmoUltimoKm: false } }, {
      metros: 2000,
      activoMs: 12 * 60_000,
      ritmoSeg: 360,
      ritmoUltimoKmSeg: 350,
    });
    expect(frase).toBe('2 kilómetros. 12 minutos');
  });
});

describe('lo que dicen Training y las fichas de un día con carreras', () => {
  // spec 042 FR-044
  it('el origen GPS se nombra «Carrera con GPS»', () => {
    expect(detalleDeLosKm(6.2, 'GPS', null)).toMatch(/^6,2\skm · Carrera con GPS$/);
    expect(
      textosDeLaMedicion({ valor: 6.2, origen: 'GPS', pasos: null, fuente: null, dispositivo: null, leidaEn: null, porRevisar: false }).principal,
    ).toMatch(/^6,2\skm · Carrera con GPS$/);
  });
});

describe('la notificación fija', () => {
  // spec 042 FR-011
  it('dice km, tiempo y ritmo', () => {
    expect(lineaDeLaNotificacion(3250, '00:21:04', 389)).toBe('3,25 km · 00:21:04 · 6:29 min/km');
  });
});

describe('dónde y cuándo se ofrece', () => {
  // spec 042 FR-001, FR-045
  it('solo en Android, en hoy, con un servidor que sabe de carreras y el interruptor disponible y prendido', () => {
    const base = { plataforma: 'android', esHoy: true, carrerasDelDia: null, disponible: true, prendida: true };
    expect(seOfreceLaCarrera(base)).toBe(true);
    expect(seOfreceLaCarrera({ ...base, plataforma: 'web' })).toBe(false);
    expect(seOfreceLaCarrera({ ...base, esHoy: false })).toBe(false);
    expect(seOfreceLaCarrera({ ...base, carrerasDelDia: undefined })).toBe(false);
    expect(seOfreceLaCarrera({ ...base, prendida: false })).toBe(false);
    expect(seOfreceLaCarrera({ ...base, disponible: false })).toBe(false);
  });

  // spec 042 FR-029
  it('la agenda distingue «servidor sin carreras» (sin el campo) de «sin carreras hoy» (null)', () => {
    const { medicionPedidaDe } = require('../../../habits/utils/registroConFoto');
    const base = { unidad: 'KILOMETROS', valorDelDia: null, total: 10, meta: 5 };
    expect(medicionPedidaDe({ medicion: base }).carrerasDelDia).toBeUndefined();
    expect(medicionPedidaDe({ medicion: { ...base, carrerasDelDia: null } }).carrerasDelDia).toBeNull();
    expect(medicionPedidaDe({ medicion: { ...base, carrerasDelDia: { cantidad: 1, kilometros: 6.21 } } }).carrerasDelDia).toEqual({
      cantidad: 1,
      kilometros: 6.21,
    });
  });

  // spec 042 FR-002
  it('la carreraId es un UUID', () => {
    expect(esUuid(nuevaCarreraId())).toBe(true);
  });
});
