import { describe, expect, it } from '@jest/globals';

import type { Evento, ResumenDeMeet } from '../../types/eventos.types';
import {
  ACCESO_POR_DEFECTO,
  ACCESOS_DE_LA_SALA,
  AYUDA_CREAR_ENLACE,
  ETIQUETA_CREAR_ENLACE,
  LINEA_CADA_FECHA,
  lineaDeLaSala,
  lineaDeLaSerie,
  motivoSinMeet,
  sePuedeReintentar,
} from '../enlaceDeMeet';
import { armarCuerpo, formularioDesdeEvento, formularioVacio, type FormularioDeEvento } from '../formularioDeEvento';

/**
 * El enlace de Meet automático en el formulario de eventos (spec 040, D-321): qué se pide al servidor, qué se conserva al editar y qué
 * dicen los textos. Lógica pura, sin pantalla.
 */

const AHORA = Date.parse('2026-11-05T15:00:00Z');

function resumen(parcial: Partial<ResumenDeMeet> = {}): ResumenDeMeet {
  return { estado: 'CREADO', acceso: 'ABIERTA', accesoAplicado: true, mensaje: null, fechasConSala: 1, fechasConProblema: 0, ...parcial };
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

describe('pedir el enlace automático (FR-001, FR-004, FR-023)', () => {
  // spec 040 FR-001, FR-023
  it('encendido: el cuerpo pide el enlace, lleva el acceso y NO lleva ubicación pegada', () => {
    const r = armarCuerpo({ ...base, crearEnlaceMeet: true, accesoSalaMeet: 'CON_PERMISO' }, AHORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cuerpo.crearEnlaceMeet).toBe(true);
    expect(r.cuerpo.accesoSalaMeet).toBe('CON_PERMISO');
    expect(r.cuerpo.locationType).toBe('MEET');
    expect(r.cuerpo.locationValue).toBeNull();
  });

  // spec 040 FR-023
  it('el acceso que viene marcado es «Abierta»', () => {
    expect(ACCESO_POR_DEFECTO).toBe('ABIERTA');
    expect(base.accesoSalaMeet).toBe('ABIERTA');
    expect(ACCESOS_DE_LA_SALA.map(a => a.clave)).toEqual(['ABIERTA', 'CON_PERMISO']);
    const r = armarCuerpo({ ...base, crearEnlaceMeet: true }, AHORA);
    expect(r.ok && r.cuerpo.accesoSalaMeet).toBe('ABIERTA');
  });

  // spec 040 FR-004
  it('encendido no manda el link ni el lugar que hubiera escritos: no se pide el automático y uno pegado a la vez', () => {
    const r = armarCuerpo(
      { ...base, crearEnlaceMeet: true, link: 'https://meet.google.com/zzz-zzzz-zzz', lugar: 'Av. Lima 123' },
      AHORA,
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cuerpo.locationValue).toBeNull();
    expect(JSON.stringify(r.cuerpo)).not.toContain('zzz-zzzz-zzz');
    expect(JSON.stringify(r.cuerpo)).not.toContain('Av. Lima');
  });

  // spec 040 FR-020
  it('apagado (lo de siempre): sin crearEnlaceMeet ni accesoSalaMeet, y el link pegado viaja igual', () => {
    const r = armarCuerpo({ ...base, link: 'https://meet.google.com/abc-defg-hij' }, AHORA);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect('crearEnlaceMeet' in r.cuerpo).toBe(false);
    expect('accesoSalaMeet' in r.cuerpo).toBe(false);
    expect(r.cuerpo.locationValue).toBe('https://meet.google.com/abc-defg-hij');
  });

  // spec 040 FR-020
  it('un formulario nuevo nace con el enlace automático apagado', () => {
    expect(base.crearEnlaceMeet).toBe(false);
  });

  // spec 040 FR-004
  it('apagado y sin link ni lugar sigue pidiendo uno (no hay un enlace «solo»)', () => {
    const r = armarCuerpo(base, AHORA);
    expect(r.ok).toBe(false);
  });
});

describe('editar un evento que ya usa el enlace automático (FR-005)', () => {
  // spec 040 FR-005
  it('el formulario arranca con el enlace encendido, su acceso y el link vacío (lo puso Google)', () => {
    const form = formularioDesdeEvento(evento({ meet: resumen({ acceso: 'CON_PERMISO' }) }));

    expect(form.crearEnlaceMeet).toBe(true);
    expect(form.accesoSalaMeet).toBe('CON_PERMISO');
    expect(form.link).toBe('');
  });

  // spec 040 FR-005
  it('guardar sin tocar nada VUELVE a pedir el enlace automático, para que el servidor no lo tome por un link pegado y borre las salas', () => {
    const original = evento({ meet: resumen() });

    const r = armarCuerpo(formularioDesdeEvento(original), AHORA - 10 * 24 * 3600 * 1000, original);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cuerpo.crearEnlaceMeet).toBe(true);
    expect(r.cuerpo.accesoSalaMeet).toBe('ABIERTA');
    expect(r.cuerpo.locationValue).toBeNull();
  });

  // spec 040 FR-020
  it('un evento con el link pegado a mano se edita como siempre: conserva su link y no pide el automático', () => {
    const original = evento();

    const form = formularioDesdeEvento(original);
    const r = armarCuerpo(form, AHORA - 10 * 24 * 3600 * 1000, original);

    expect(form.crearEnlaceMeet).toBe(false);
    expect(form.link).toBe('https://meet.google.com/abc-defg-hij');
    expect(r.ok && 'crearEnlaceMeet' in r.cuerpo).toBe(false);
  });

  // spec 040 FR-005
  it('apagar el enlace automático al editar exige pegar un link o escribir un lugar', () => {
    const original = evento({ meet: resumen() });

    const r = armarCuerpo({ ...formularioDesdeEvento(original), crearEnlaceMeet: false }, AHORA - 10 * 24 * 3600 * 1000, original);

    expect(r.ok).toBe(false);
  });
});

describe('los textos (FR-019, FR-021)', () => {
  // spec 040 FR-019
  it('el interruptor, su ayuda y las dos opciones con UNA frase cada una', () => {
    expect(ETIQUETA_CREAR_ENLACE).toBe('Crear enlace de Meet');
    expect(AYUDA_CREAR_ENLACE.split('.').filter(Boolean)).toHaveLength(1);
    expect(ACCESOS_DE_LA_SALA).toEqual([
      { clave: 'ABIERTA', nombre: 'Abierta', ayuda: 'Se entra directo, sin esperar.' },
      { clave: 'CON_PERMISO', nombre: 'Con permiso', ayuda: 'Tú admites a cada persona.' },
    ]);
    for (const a of ACCESOS_DE_LA_SALA) expect(a.ayuda.split('.').filter(Boolean)).toHaveLength(1);
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
      ETIQUETA_CREAR_ENLACE,
      AYUDA_CREAR_ENLACE,
      LINEA_CADA_FECHA,
      ...ACCESOS_DE_LA_SALA.flatMap(a => [a.nombre, a.ayuda]),
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
