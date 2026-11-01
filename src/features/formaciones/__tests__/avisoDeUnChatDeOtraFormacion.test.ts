import { describe, expect, it, jest } from '@jest/globals';

import { destinoDeRuta, type DestinoDeAviso, type DestinoDelChat } from '../../mentor/api/avisosApi';
import { conversacionDelAviso, decidirAvisoDeChat } from '../../chat/avisos/avisoDeChat';
import {
  intentarAbrirAvisoPendiente,
  pestanaDelDestino,
  type DecisionDeApertura,
  type DependenciasDeApertura,
} from '../../../navigation/abrirAviso';
import type { FormacionDeLaSesion } from '../types/formaciones.types';
import { avisoDeCambioDeFormacion, decidirFormacionDelAviso } from '../utils/avisoDeFormacion';

const op = (codigo: string, nombre: string) => ({ codigo, nombre });
const ESCUELA = op('ESCUELA', 'Escuela Renaser');
const DIPLOMADO = op('DIPLOMADO', 'Diplomado Renaser');
const CERTIFICACION = op('CERTIFICACION', 'Certificación Renaser');

const sesion = (parcial: Partial<FormacionDeLaSesion>): FormacionDeLaSesion => ({
  activa: ESCUELA,
  disponibles: [ESCUELA],
  puedeElegir: false,
  veTodas: false,
  sinFormacion: false,
  duracionDias: 90,
  fases: [],
  ...parcial,
});

describe('la ruta del aviso de un chat (spec 024)', () => {
  it('/chat/{id} es de la Escuela: el destino no trae formación', () => {
    expect(destinoDeRuta('/chat/abc')).toEqual({ tipo: 'chat', conversacionId: 'abc' });
    expect(destinoDeRuta('/chat/abc/')).toEqual({ tipo: 'chat', conversacionId: 'abc' });
  });

  it('/chat/{id}?formacion=DIPLOMADO trae el código', () => {
    expect(destinoDeRuta('/chat/abc?formacion=DIPLOMADO')).toEqual({ tipo: 'chat', conversacionId: 'abc', formacion: 'DIPLOMADO' });
    expect(destinoDeRuta('/chat/abc/?formacion=certificacion')).toEqual({ tipo: 'chat', conversacionId: 'abc', formacion: 'CERTIFICACION' });
  });

  it('un parámetro que no es un código, o con otros parámetros, no rompe el aviso', () => {
    expect(destinoDeRuta('/chat/abc?formacion=')).toEqual({ tipo: 'chat', conversacionId: 'abc' });
    expect(destinoDeRuta('/chat/abc?formacion=%E0%A4%A')).toEqual({ tipo: 'chat', conversacionId: 'abc' });
    expect(destinoDeRuta('/chat/abc?formacion=un%20texto%20raro')).toEqual({ tipo: 'chat', conversacionId: 'abc' });
    expect(destinoDeRuta('/chat/abc?otro=1&formacion=DIPLOMADO')).toEqual({ tipo: 'chat', conversacionId: 'abc', formacion: 'DIPLOMADO' });
    expect(destinoDeRuta('/chat/?formacion=DIPLOMADO')).toBeNull();
  });

  it('el aviso que llega con la app abierta reconoce el chat aunque lleve el parámetro', () => {
    expect(conversacionDelAviso({ route: '/chat/abc?formacion=DIPLOMADO' })).toBe('abc');
    expect(decidirAvisoDeChat({ route: '/chat/abc?formacion=DIPLOMADO' }, 'abc')).toBe('silencio');
    expect(decidirAvisoDeChat({ route: '/chat/abc?formacion=DIPLOMADO' }, 'otro')).toBe('sonarEnLaApp');
  });

  it('la pestaña recibe el id y, si hubo que cambiar de formación, la línea de aviso', () => {
    const solo = pestanaDelDestino({ tipo: 'chat', conversacionId: 'abc', formacion: 'DIPLOMADO' });
    expect(solo).toEqual({ pestana: 'Comunidad', params: { abrirChatConversacionId: 'abc' } });
    const conAviso = pestanaDelDestino({ tipo: 'chat', conversacionId: 'abc', formacion: 'DIPLOMADO', aviso: 'Cambiamos a Diplomado Renaser.' });
    expect(conAviso.params).toEqual({ abrirChatConversacionId: 'abc', abrirChatAviso: 'Cambiamos a Diplomado Renaser.' });
  });
});

describe('qué hacer con la formación del chat de un aviso (FR-032)', () => {
  const conVarias = sesion({ activa: ESCUELA, disponibles: [ESCUELA, DIPLOMADO], puedeElegir: true });

  it('el personal con varias abre el chat de su formación activa sin cambiar nada', () => {
    expect(decidirFormacionDelAviso(undefined, conVarias, null)).toEqual({ accion: 'seguir' });
    expect(decidirFormacionDelAviso('ESCUELA', conVarias, null)).toEqual({ accion: 'seguir' });
  });

  it('si el chat es de otra de sus formaciones, cambia la activa y avisa en una línea', () => {
    expect(decidirFormacionDelAviso('DIPLOMADO', conVarias, null)).toEqual({
      accion: 'cambiar-activa',
      codigo: 'DIPLOMADO',
      aviso: 'Cambiamos a Diplomado Renaser.',
    });
    // Sin parámetro es la Escuela: si su activa es el Diplomado, vuelve a la Escuela.
    expect(decidirFormacionDelAviso(undefined, { ...conVarias, activa: DIPLOMADO }, null)).toEqual({
      accion: 'cambiar-activa',
      codigo: 'ESCUELA',
      aviso: 'Cambiamos a Escuela Renaser.',
    });
  });

  it('si no tiene asignada la formación del chat, el aviso se descarta', () => {
    expect(decidirFormacionDelAviso('CERTIFICACION', conVarias, null)).toEqual({ accion: 'descartar' });
  });

  it('para los demás el parámetro se ignora: aprendiz, o personal con una sola formación', () => {
    expect(decidirFormacionDelAviso('DIPLOMADO', sesion({ activa: DIPLOMADO, disponibles: [DIPLOMADO] }), null)).toEqual({ accion: 'seguir' });
    expect(decidirFormacionDelAviso('CERTIFICACION', sesion({ activa: ESCUELA, disponibles: [ESCUELA] }), null)).toEqual({ accion: 'seguir' });
    expect(decidirFormacionDelAviso('DIPLOMADO', null, null)).toEqual({ accion: 'seguir' });
  });

  it('Administración: con «Todas» elegida abre tal cual; con otra formación elegida, pasa la elección a la del chat', () => {
    const admin = sesion({ activa: null, disponibles: [ESCUELA, DIPLOMADO, CERTIFICACION], veTodas: true });
    expect(decidirFormacionDelAviso('DIPLOMADO', admin, null)).toEqual({ accion: 'seguir' });
    expect(decidirFormacionDelAviso('DIPLOMADO', admin, 'DIPLOMADO')).toEqual({ accion: 'seguir' });
    expect(decidirFormacionDelAviso('DIPLOMADO', admin, 'ESCUELA')).toEqual({
      accion: 'cambiar-eleccion',
      codigo: 'DIPLOMADO',
      aviso: avisoDeCambioDeFormacion('Diplomado Renaser'),
    });
    expect(decidirFormacionDelAviso(undefined, admin, 'CERTIFICACION')).toMatchObject({ accion: 'cambiar-eleccion', codigo: 'ESCUELA' });
  });
});

describe('abrir el aviso de un chat de otra formación', () => {
  function armar(decision: DecisionDeApertura, cambio: boolean | Promise<boolean> = true) {
    let pendiente: DestinoDelChat | null = { tipo: 'chat', conversacionId: 'abc', formacion: 'DIPLOMADO' };
    const irAPestana = jest.fn<DependenciasDeApertura['irAPestana']>(() => true);
    const decidir = jest.fn<NonNullable<DependenciasDeApertura['decidirFormacionDelChat']>>(() => decision);
    const cambiar = jest.fn<NonNullable<DependenciasDeApertura['cambiarDeFormacion']>>(async () => cambio);
    const volverAAnotar = jest.fn<NonNullable<DependenciasDeApertura['volverAAnotar']>>(destino => {
      pendiente = destino;
    });
    const deps: DependenciasDeApertura = {
      hayCapaObligatoriaAbierta: () => false,
      pestanaDisponible: () => true,
      consumir: tipo => {
        if (tipo !== 'chat' || !pendiente) return null;
        const destino = pendiente;
        pendiente = null;
        return destino as Extract<DestinoDeAviso, { tipo: 'chat' }>;
      },
      irAPestana,
      decidirFormacionDelChat: decidir,
      cambiarDeFormacion: cambiar,
      volverAAnotar,
    };
    return { deps, irAPestana, decidir, cambiar, volverAAnotar, pendiente: () => pendiente };
  }

  it('sin nada que cambiar abre el chat de una vez', () => {
    const t = armar({ accion: 'seguir' });
    expect(intentarAbrirAvisoPendiente(t.deps)).toBe('abierto');
    expect(t.irAPestana).toHaveBeenCalledWith('Comunidad', { abrirChatConversacionId: 'abc' });
    expect(t.cambiar).not.toHaveBeenCalled();
  });

  it('un aviso de una formación que no es suya se descarta: no se abre nada y no queda esperando', () => {
    const t = armar({ accion: 'descartar' });
    expect(intentarAbrirAvisoPendiente(t.deps)).toBe('nada');
    expect(t.irAPestana).not.toHaveBeenCalled();
    expect(t.pendiente()).toBeNull();
  });

  it('cambia primero la formación, y recién entonces abre el chat con la línea de aviso', async () => {
    const t = armar({ accion: 'cambiar', codigo: 'DIPLOMADO', aviso: 'Cambiamos a Diplomado Renaser.', sobre: 'activa' });
    expect(intentarAbrirAvisoPendiente(t.deps)).toBe('esperando');
    expect(t.irAPestana).not.toHaveBeenCalled(); // todavía no: el cambio rearma las pestañas
    expect(t.cambiar).toHaveBeenCalledWith(expect.objectContaining({ codigo: 'DIPLOMADO', sobre: 'activa' }));
    await Promise.resolve();
    await Promise.resolve();
    expect(t.volverAAnotar).toHaveBeenCalledWith({ tipo: 'chat', conversacionId: 'abc', formacion: 'DIPLOMADO', aviso: 'Cambiamos a Diplomado Renaser.' });

    // El destino que vuelve ya trae su línea: no se decide de nuevo (evita un ciclo mientras la sesión se pone al día) y se abre.
    t.decidir.mockClear();
    expect(intentarAbrirAvisoPendiente(t.deps)).toBe('abierto');
    expect(t.decidir).not.toHaveBeenCalled();
    expect(t.irAPestana).toHaveBeenCalledWith('Comunidad', {
      abrirChatConversacionId: 'abc',
      abrirChatAviso: 'Cambiamos a Diplomado Renaser.',
    });
  });

  it('si el servidor no deja cambiar la formación, el aviso no se abre', async () => {
    const t = armar({ accion: 'cambiar', codigo: 'DIPLOMADO', aviso: 'Cambiamos a Diplomado Renaser.', sobre: 'activa' }, false);
    expect(intentarAbrirAvisoPendiente(t.deps)).toBe('esperando');
    await Promise.resolve();
    await Promise.resolve();
    expect(t.volverAAnotar).not.toHaveBeenCalled();
    expect(t.irAPestana).not.toHaveBeenCalled();
  });

  it('sin la decisión de formación (lo de siempre), el chat se abre como antes', () => {
    const t = armar({ accion: 'seguir' });
    const deps: DependenciasDeApertura = { ...t.deps, decidirFormacionDelChat: undefined, cambiarDeFormacion: undefined, volverAAnotar: undefined };
    expect(intentarAbrirAvisoPendiente(deps)).toBe('abierto');
    expect(t.irAPestana).toHaveBeenCalledWith('Comunidad', { abrirChatConversacionId: 'abc' });
  });
});
