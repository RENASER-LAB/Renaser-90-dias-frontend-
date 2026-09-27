import { describe, expect, it } from '@jest/globals';

import type { Evento } from '../../types/eventos.types';
import { armarCuerpo, formularioDesdeEvento, formularioVacio, sePuedeEditarEnLaApp } from '../formularioDeEvento';
import { esLinkSeguro, linkParaUnirme, nombreDelLink, tipoDeUbicacionDelLink } from '../linkDelEvento';
import { puedeGestionarEventos } from '../permisosDeEventos';

describe('quién ve el formulario de eventos (E-6, decisión del dueño)', () => {
  it('ADMIN y ALCHEMIST sí', () => {
    expect(puedeGestionarEventos('ADMIN')).toBe(true);
    expect(puedeGestionarEventos('ALCHEMIST')).toBe(true);
    expect(puedeGestionarEventos('alchemist')).toBe(true);
  });

  it('el MENTOR ya no (D-186), ni el líder, ni el aprendiz, ni sin sesión', () => {
    for (const rol of ['MENTOR', 'MENTOR_LEAD', 'TRAINEE', '', null, undefined]) {
      expect(puedeGestionarEventos(rol)).toBe(false);
    }
  });
});

describe('«Unirme» solo con un link seguro', () => {
  it('acepta https de Meet, Zoom y Drive', () => {
    expect(esLinkSeguro('https://meet.google.com/abc-defg-hij')).toBe(true);
    expect(esLinkSeguro('https://us02web.zoom.us/j/123?pwd=x')).toBe(true);
    expect(esLinkSeguro('https://drive.google.com/file/d/1/view')).toBe(true);
  });

  it('rechaza http, javascript:, intent: y texto suelto', () => {
    for (const malo of ['http://meet.google.com/x', 'javascript:alert(1)', 'intent://x', 'meet.google.com/x', 'https://', 'https://a b.com', '']) {
      expect(esLinkSeguro(malo)).toBe(false);
    }
  });

  it('una dirección física no se «une»', () => {
    expect(linkParaUnirme({ tipoUbicacion: 'ADDRESS', valorUbicacion: 'https://maps.app/x.y' })).toBeNull();
    expect(linkParaUnirme({ tipoUbicacion: 'LINK', valorUbicacion: 'https://drive.google.com/x' })).toBe('https://drive.google.com/x');
    expect(linkParaUnirme({ tipoUbicacion: 'MEET', valorUbicacion: 'reunión del jueves' })).toBeNull();
  });

  it('el tipo sale del link: Meet → MEET, Zoom → ZOOM, Drive → LINK', () => {
    expect(tipoDeUbicacionDelLink('https://meet.google.com/x')).toBe('MEET');
    expect(tipoDeUbicacionDelLink('https://us02web.zoom.us/j/1')).toBe('ZOOM');
    expect(tipoDeUbicacionDelLink('https://drive.google.com/x')).toBe('LINK');
    expect(nombreDelLink('https://drive.google.com/x')).toBe('Google Drive');
  });
});

const AHORA = Date.parse('2026-09-26T15:00:00Z');

function evento(parcial: Partial<Evento> = {}): Evento {
  return {
    id: 'e1',
    titulo: 'Clase',
    descripcion: null,
    iniciaEn: '2026-10-01T00:30:00Z',
    duracionMinutos: 60,
    zona: 'America/Lima',
    tipoUbicacion: 'MEET',
    valorUbicacion: 'https://meet.google.com/x',
    tipoEvento: 'SESION_ESPECIAL',
    reglasDeAviso: null,
    notificarAlCrear: false,
    recurrente: false,
    creadoPor: null,
    audiencia: 'ALL_MEMBERS',
    rolesDestino: [],
    ...parcial,
  };
}

describe('formulario del evento', () => {
  const base = { ...formularioVacio(AHORA, 'America/Lima'), titulo: 'Clase en vivo', link: 'https://meet.google.com/abc' };

  it('arma el cuerpo con la hora de Lima convertida a UTC', () => {
    const r = armarCuerpo({ ...base, fecha: '2026-09-30', hora: '19:30' }, AHORA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cuerpo).toMatchObject({
      title: 'Clase en vivo',
      eventType: 'SESION_ESPECIAL',
      startsAt: '2026-10-01T00:30:00.000Z',
      timezone: 'America/Lima',
      locationType: 'MEET',
      locationValue: 'https://meet.google.com/abc',
      audienceType: 'ALL_MEMBERS',
      notifyOnCreate: true,
    });
    expect(r.cuerpo).not.toHaveProperty('reminderRules');
  });

  it('sin link usa el lugar; sin ninguno de los dos, lo pide', () => {
    const conLugar = armarCuerpo({ ...base, link: '', lugar: 'Av. Larco 123' }, AHORA);
    expect(conLugar.ok && conLugar.cuerpo.locationType).toBe('ADDRESS');
    const sinNada = armarCuerpo({ ...base, link: '', lugar: '' }, AHORA);
    expect(sinNada.ok).toBe(false);
  });

  it('rechaza un link que no es https y un nombre de más de 30 letras (tope del backend)', () => {
    expect(armarCuerpo({ ...base, link: 'meet.google.com/abc' }, AHORA)).toEqual({
      ok: false,
      error: 'El link tiene que empezar con https://',
    });
    expect(armarCuerpo({ ...base, titulo: 'x'.repeat(31) }, AHORA).ok).toBe(false);
  });

  it('no deja crear un evento en el pasado', () => {
    expect(armarCuerpo({ ...base, fecha: '2026-09-26', hora: '09:00' }, AHORA).ok).toBe(false);
  });

  it('al editar reenvía lo que el formulario no muestra: tipo, audiencia, roles y avisos propios', () => {
    const original = evento({
      tipoEvento: 'MENTORIA_ALQUIMISTA',
      audiencia: 'ROLES',
      rolesDestino: ['TRAINEE'],
      reglasDeAviso: [{ tipo: 'minutosAntes', minutos: 30 }, { tipo: 'horaDelDia', hora: '06:00' }],
    });
    const form = { ...formularioDesdeEvento(original), tipoEvento: 'ESPONTANEO' };
    const r = armarCuerpo(form, AHORA, original);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cuerpo.eventType).toBe('MENTORIA_ALQUIMISTA');
    expect(r.cuerpo.audienceType).toBe('ROLES');
    expect(r.cuerpo.targetRoles).toEqual(['TRAINEE']);
    expect(r.cuerpo.reminderRules).toEqual([
      { kind: 'minutesBefore', value: 30 },
      { kind: 'timeOfDay', value: '06:00' },
    ]);
  });

  it('el formulario de edición arranca con la fecha y la hora en la zona del evento', () => {
    const form = formularioDesdeEvento(evento());
    expect(form.fecha).toBe('2026-09-30');
    expect(form.hora).toBe('19:30');
    expect(form.link).toBe('https://meet.google.com/x');
  });

  it('un evento que se repite o es para un grupo no se edita desde la app (se perdería la repetición)', () => {
    expect(sePuedeEditarEnLaApp(evento())).toBe(true);
    expect(sePuedeEditarEnLaApp(evento({ recurrente: true }))).toBe(false);
    expect(sePuedeEditarEnLaApp(evento({ audiencia: 'CELL' }))).toBe(false);
  });
});
