import { describe, expect, it } from '@jest/globals';

import type { Evento, ResumenDeMeet } from '../../types/eventos.types';
import {
  ETIQUETA_OTRO_ENLACE,
  LINEA_CADA_FECHA,
  OPCION_LUGAR,
  OPCION_MEET,
  ROTULO_DONDE,
  avisoDelPlanDeGoogle,
  lineaDeLaSala,
  lineaDeLaSerie,
  motivoSinMeet,
  sePuedeReintentar,
} from '../enlaceDeMeet';
import { armarCuerpo, dondeQueSeGuarda, formularioDesdeEvento, formularioVacio, type FormularioDeEvento } from '../formularioDeEvento';

/**
 * El enlace de Meet automático en el formulario de eventos (spec 040, D-321): qué se pide al servidor, qué se conserva al editar y qué
 * dicen los textos. Lógica pura, sin pantalla.
 */

const AHORA = Date.parse('2026-11-05T15:00:00Z');

function resumen(parcial: Partial<ResumenDeMeet> = {}): ResumenDeMeet {
  return { estado: 'CREADO', accesoAplicado: true, mensaje: null, fechasConSala: 1, fechasConProblema: 0, avisoDelPlan: null, ...parcial };
}

function evento(parcial: Partial<Evento> = {}): Evento {
  return {
    id: 'e1',
    titulo: 'Clase en vivo',
    descripcion: null,
    portadaUrl: null,
    iniciaEn: '2026-11-10T01:00:00Z',
    duracionMinutos: 90,
    zona: 'America/Lima',
    tipoUbicacion: 'MEET',
    valorUbicacion: 'https://meet.google.com/abc-defg-hij',
    tipoEvento: 'SESION_ESPECIAL',
    reglasDeAviso: null,
    notificarAlCrear: true,
    recurrente: false,
    creadoPor: 'u1',
    audiencia: 'ALL_MEMBERS',
    rolesDestino: [],
    ...parcial,
  };
}

const base: FormularioDeEvento = { ...formularioVacio(AHORA, 'America/Lima'), titulo: 'Clase en vivo' };

describe('pedir el enlace automático (FR-001, FR-004, FR-023; decisión del dueño del 2026-11-05)', () => {
  // spec 040 FR-001, FR-023
  it('un evento nuevo, sin elegir nada, pide el Meet automático y NO manda ningún acceso: la sala queda abierta (OPEN) en el servidor', () => {
    expect(base.donde).toBe('meet');
    const r = armarCuerpo(base, AHORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cuerpo.crearEnlaceMeet).toBe(true);
    expect('accesoSalaMeet' in r.cuerpo).toBe(false);
    expect(r.cuerpo.locationType).toBe('MEET');
    expect(r.cuerpo.locationValue).toBeNull();
  });

  // spec 040 FR-004
  it('con Meet no manda el link ni el lugar que hubiera escritos: no se pide el automático y uno pegado a la vez', () => {
    const r = armarCuerpo({ ...base, link: 'https://meet.google.com/zzz-zzzz-zzz', lugar: 'Av. Lima 123' }, AHORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cuerpo.locationValue).toBeNull();
    expect(JSON.stringify(r.cuerpo)).not.toContain('zzz-zzzz-zzz');
    expect(JSON.stringify(r.cuerpo)).not.toContain('Av. Lima');
  });

  // spec 040 FR-019
  it('«En un lugar» manda la dirección y pide escribirla si falta', () => {
    const r = armarCuerpo({ ...base, donde: 'lugar', lugar: 'Av. Lima 123' }, AHORA);
    expect(r.ok && r.cuerpo.locationType).toBe('ADDRESS');
    expect(r.ok && r.cuerpo.locationValue).toBe('Av. Lima 123');
    expect(r.ok && 'crearEnlaceMeet' in r.cuerpo).toBe(false);
    expect(armarCuerpo({ ...base, donde: 'lugar' }, AHORA)).toEqual({ ok: false, error: 'Escribe la dirección del lugar.' });
  });

  // spec 040 FR-020
  it('«Pegar otro enlace» (lo de siempre): sin crearEnlaceMeet, y el link pegado viaja igual', () => {
    const r = armarCuerpo({ ...base, donde: 'enlace', link: 'https://meet.google.com/abc-defg-hij' }, AHORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect('crearEnlaceMeet' in r.cuerpo).toBe(false);
    expect('accesoSalaMeet' in r.cuerpo).toBe(false);
    expect(r.cuerpo.locationValue).toBe('https://meet.google.com/abc-defg-hij');
  });

  // spec 040 FR-014, FR-020
  it('si el servidor no puede crear la sala, se guarda como el formulario de siempre (un link o un lugar), nunca pidiendo la sala', () => {
    expect(dondeQueSeGuarda('meet', false)).toBe('enlace');
    expect(dondeQueSeGuarda('lugar', false)).toBe('enlace');
    expect(dondeQueSeGuarda('meet', true)).toBe('meet');
    expect(armarCuerpo({ ...base, donde: dondeQueSeGuarda(base.donde, false) }, AHORA).ok).toBe(false);
  });
});

describe('editar un evento que ya usa el enlace automático (FR-005)', () => {
  // spec 040 FR-005
  it('el formulario arranca en «Por Meet» y con el link vacío (lo puso Google)', () => {
    const form = formularioDesdeEvento(evento({ meet: resumen() }));

    expect(form.donde).toBe('meet');
    expect(form.link).toBe('');
  });

  // spec 040 FR-005
  it('guardar sin tocar nada VUELVE a pedir el enlace automático, para que el servidor no lo tome por un link pegado y borre las salas', () => {
    const original = evento({ meet: resumen() });

    const r = armarCuerpo(formularioDesdeEvento(original), AHORA - 10 * 24 * 3600 * 1000, original);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cuerpo.crearEnlaceMeet).toBe(true);
    expect('accesoSalaMeet' in r.cuerpo).toBe(false);
    expect(r.cuerpo.locationValue).toBeNull();
  });

  // spec 040 FR-020
  it('un evento con el link pegado a mano se edita como siempre: conserva su link y no pide el automático', () => {
    const original = evento();

    const form = formularioDesdeEvento(original);
    const r = armarCuerpo(form, AHORA - 10 * 24 * 3600 * 1000, original);

    expect(form.donde).toBe('enlace');
    expect(form.link).toBe('https://meet.google.com/abc-defg-hij');
    expect(r.ok && 'crearEnlaceMeet' in r.cuerpo).toBe(false);
  });

  // spec 040 FR-020
  it('un evento en una dirección se abre en «En un lugar»', () => {
    expect(formularioDesdeEvento(evento({ tipoUbicacion: 'ADDRESS', valorUbicacion: 'Av. Lima 123' })).donde).toBe('lugar');
  });

  // spec 040 FR-005
  it('pasar a «Pegar otro enlace» al editar exige pegar un link', () => {
    const original = evento({ meet: resumen() });

    const r = armarCuerpo({ ...formularioDesdeEvento(original), donde: 'enlace' }, AHORA - 10 * 24 * 3600 * 1000, original);

    expect(r.ok).toBe(false);
  });
});

describe('los textos (FR-019, FR-021)', () => {
  // spec 040 FR-019
  it('«Dónde es» con dos opciones y la salida discreta; nada sobre quién puede entrar', () => {
    expect(ROTULO_DONDE).toBe('Dónde es');
    expect(OPCION_MEET).toBe('Por Meet (se crea solo)');
    expect(OPCION_LUGAR).toBe('En un lugar');
    expect(ETIQUETA_OTRO_ENLACE).toBe('Pegar otro enlace');
  });

  // spec 040 FR-019
  it('«Cada fecha tendrá su propio enlace.» solo en una serie con el enlace automático', () => {
    expect(LINEA_CADA_FECHA).toBe('Cada fecha tendrá su propio enlace.');
    expect(lineaDeLaSerie(evento({ recurrente: true, meet: resumen() }))).toBe(LINEA_CADA_FECHA);
    expect(lineaDeLaSerie(evento({ recurrente: false, meet: resumen() }))).toBeNull();
    expect(lineaDeLaSerie(evento({ recurrente: true }))).toBeNull();
  });

  // spec 040 FR-019, FR-008
  it('«Reintentar» solo cuando el servidor dice que algo quedó sin terminar, y la frase es la suya', () => {
    const fallida = resumen({ estado: 'FALLIDO', accesoAplicado: false, mensaje: 'No pudimos crear el enlace de Meet.', fechasConProblema: 1 });

    expect(lineaDeLaSala(fallida)).toBe('No pudimos crear el enlace de Meet.');
    expect(sePuedeReintentar(fallida)).toBe(true);
    expect(sePuedeReintentar(resumen())).toBe(false);
    expect(sePuedeReintentar(null)).toBe(false);
    expect(sePuedeReintentar(undefined)).toBe(false);
  });

  // spec 040 FR-021
  it('ningún texto habla de un límite de 60 minutos ni de que la reunión se corte: si no cortó en la prueba, no hay aviso de ningún tipo', () => {
    const todos = [
      ROTULO_DONDE,
      OPCION_MEET,
      OPCION_LUGAR,
      ETIQUETA_OTRO_ENLACE,
      LINEA_CADA_FECHA,
      motivoSinMeet('SIN_CUENTA'),
      motivoSinMeet('CUENTA_REVOCADA'),
    ].join(' ');

    expect(todos).not.toMatch(/60|sesenta|una hora|1 hora|se corta|cortar|límite de tiempo|duración máxima/i);
  });

  // spec 040 FR-014
  it('si la cuenta de Google ya no sirve, un evento que usaba el enlace lo dice con palabras; los demás motivos no dicen nada', () => {
    expect(motivoSinMeet('SIN_CUENTA')).toContain('Conecta la cuenta de Google');
    expect(motivoSinMeet('CUENTA_REVOCADA')).toContain('volver a conectar');
    expect(motivoSinMeet('APAGADA')).toBe('');
    expect(motivoSinMeet(null)).toBe('');
  });
});

describe('el aviso del plan de Google (FR-037)', () => {
  // spec 040 FR-037
  it('dice lo que manda el servidor y no habilita «Reintentar»', () => {
    const aviso = 'Para transcribir hace falta Google Workspace.';
    expect(avisoDelPlanDeGoogle(resumen({ avisoDelPlan: aviso }))).toBe(aviso);
    expect(sePuedeReintentar(resumen({ avisoDelPlan: aviso }))).toBe(false);
    expect(avisoDelPlanDeGoogle(resumen())).toBeNull();
    expect(avisoDelPlanDeGoogle(null)).toBeNull();
  });
});
