import { describe, expect, it } from '@jest/globals';

import { leerFormacionDeLaSesion, leerDetalle, leerFormacionDeUnaPersona, aTarjetas } from '../api/formacionesSchemas';
import { aUsuario } from '../../auth/api/usuarioMapper';
import type { UsuarioApi } from '../../auth/types/auth.types';
import {
  codigoActivo,
  hayQueElegirAlEntrar,
  llaveDeLasVistas,
  noTieneFormacion,
  nombreQueSeMuestra,
} from '../utils/vistaDeFormacion';
import type { FormacionDeLaSesion } from '../types/formaciones.types';

const ESCUELA = { codigo: 'ESCUELA', nombre: 'Escuela Renaser' };
const DIPLOMADO = { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser' };

function sesion(parcial: Partial<FormacionDeLaSesion> = {}): FormacionDeLaSesion {
  return {
    activa: ESCUELA,
    disponibles: [ESCUELA],
    puedeElegir: false,
    veTodas: false,
    sinFormacion: false,
    duracionDias: 90,
    fases: [],
    ...parcial,
  };
}

describe('leerFormacionDeLaSesion (tolerante)', () => {
  it('lo que no viene o no es un objeto es «el servidor no la dijo»: null, nunca una inventada', () => {
    expect(leerFormacionDeLaSesion(undefined)).toBeNull();
    expect(leerFormacionDeLaSesion(null)).toBeNull();
    expect(leerFormacionDeLaSesion('ESCUELA')).toBeNull();
    expect(leerFormacionDeLaSesion([])).toBeNull();
  });

  it('lee la sesión completa del Diplomado de un año', () => {
    const leida = leerFormacionDeLaSesion({
      activa: DIPLOMADO,
      disponibles: [DIPLOMADO],
      puedeElegir: false,
      veTodas: false,
      sinFormacion: false,
      duracionDias: 365,
      fases: [{ numero: 1, primerDia: 1, ultimoDia: 28 }],
      campoNuevo: 'se deja pasar',
    });
    expect(leida?.activa).toEqual(DIPLOMADO);
    expect(leida?.duracionDias).toBe(365);
    expect(leida?.fases).toEqual([{ numero: 1, primerDia: 1, ultimoDia: 28 }]);
  });

  it('sin fases usa las de su duración; sin duración, 90; una opción rota se pierde sola', () => {
    const leida = leerFormacionDeLaSesion({ activa: ESCUELA, disponibles: [ESCUELA, { codigo: 5 }, 'x'] });
    expect(leida?.duracionDias).toBe(90);
    expect(leida?.fases.map(f => f.primerDia)).toEqual([1, 8, 35, 65]);
    expect(leida?.disponibles).toEqual([ESCUELA]);
    const anio = leerFormacionDeLaSesion({ activa: DIPLOMADO, disponibles: [DIPLOMADO], duracionDias: 365 });
    expect(anio?.fases.map(f => f.primerDia)).toEqual([1, 29, 138, 260]);
  });

  it('el personal sin formación y quien ve todas se leen como tales', () => {
    expect(leerFormacionDeLaSesion({ activa: null, disponibles: [], sinFormacion: true })?.sinFormacion).toBe(true);
    const admin = leerFormacionDeLaSesion({ activa: null, disponibles: [ESCUELA, DIPLOMADO], veTodas: true });
    expect(admin?.veTodas).toBe(true);
    expect(admin?.activa).toBeNull();
  });
});

describe('el usuario de la sesión', () => {
  const base: UsuarioApi = {
    id: 'u1',
    email: 'ana@renaser.pe',
    role: 'TRAINEE',
    status: 'ACTIVE',
    fullName: 'Ana Pérez',
    avatarUrl: null,
    bio: null,
    department: null,
  };

  it('contra un backend anterior no trae formación: queda en null y nada más cambia', () => {
    expect(aUsuario(base).formacion).toBeNull();
  });

  it('trae la formación leída con tolerancia', () => {
    const usuario = aUsuario({ ...base, formacion: { activa: DIPLOMADO, disponibles: [DIPLOMADO], duracionDias: 365 } });
    expect(usuario.formacion?.activa?.codigo).toBe('DIPLOMADO');
    expect(usuario.formacion?.duracionDias).toBe(365);
  });
});

describe('qué muestra la app de la formación', () => {
  it('el nombre solo aparece con varias formaciones o fuera de la Escuela', () => {
    expect(nombreQueSeMuestra(sesion())).toBeNull();
    expect(nombreQueSeMuestra(sesion({ activa: DIPLOMADO, disponibles: [DIPLOMADO] }))).toBe('Diplomado Renaser');
    expect(nombreQueSeMuestra(sesion({ disponibles: [ESCUELA, DIPLOMADO], puedeElegir: true }))).toBe('Escuela Renaser');
    expect(nombreQueSeMuestra(sesion({ veTodas: true, activa: null }))).toBeNull();
    expect(nombreQueSeMuestra(null)).toBeNull();
  });

  it('la pregunta de la primera vez es solo para quien puede elegir y todavía no eligió aquí', () => {
    const personal = sesion({ puedeElegir: true, disponibles: [ESCUELA, DIPLOMADO] });
    expect(hayQueElegirAlEntrar(personal, false)).toBe(true);
    expect(hayQueElegirAlEntrar(personal, true)).toBe(false);
    expect(hayQueElegirAlEntrar(sesion(), false)).toBe(false);
    expect(hayQueElegirAlEntrar(null, false)).toBe(false);
  });

  it('el personal sin formación ve el aviso; Administración no', () => {
    expect(noTieneFormacion(sesion({ activa: null, disponibles: [], sinFormacion: true }))).toBe(true);
    expect(noTieneFormacion(sesion({ activa: null, sinFormacion: true, veTodas: true }))).toBe(false);
    expect(noTieneFormacion(null)).toBe(false);
  });

  it('las vistas se arman de nuevo al cambiar de cuenta o de formación activa, y no de otra manera', () => {
    expect(llaveDeLasVistas('u1', null)).toBe('u1');
    expect(llaveDeLasVistas(null, null)).toBe('sin-cuenta');
    expect(llaveDeLasVistas('u1', sesion())).toBe('u1|ESCUELA');
    expect(llaveDeLasVistas('u1', sesion({ activa: DIPLOMADO }))).toBe('u1|DIPLOMADO');
    expect(llaveDeLasVistas('u1', sesion({ puedeElegir: true }))).toBe(llaveDeLasVistas('u1', sesion()));
    expect(codigoActivo(sesion({ activa: null }))).toBeNull();
  });
});

describe('lo que lee Administración', () => {
  it('una tarjeta rota se pierde ella y no el centro', () => {
    const buena = { resumen: { codigo: 'ESCUELA', nombre: 'Escuela Renaser', duracionesDias: [90] }, aprendicesActivos: 4, personal: 2, grupos: 1, porAtender: 3 };
    const tarjetas = aTarjetas([buena, { sinResumen: true }, 'x']);
    expect(tarjetas).toHaveLength(1);
    expect(tarjetas[0]).toMatchObject({ aprendicesActivos: 4, personal: 2, grupos: 1, porAtender: 3 });
    expect(tarjetas[0].resumen.etiquetasDeDuracion).toEqual(['3 meses']);
    expect(tarjetas[0].resumen.activa).toBe(true);
    expect(tarjetas[0].resumen.version).toBe(1);
  });

  it('las cifras que no llegan valen cero y la lectura sin forma es null', () => {
    const detalle = leerDetalle({
      resumen: { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser', duracionesDias: [90, 365], etiquetasDeDuracion: ['3 meses', '1 año'], version: 4 },
      personas: { aprendices: 7 },
      grupos: {},
      porAtender: { gruposSinMentor: 2 },
    });
    expect(detalle?.personas).toEqual({ aprendices: 7, porEmpezar: 0, enCurso: 0, terminaron: 0, personal: 0 });
    expect(detalle?.porAtender.gruposSinMentor).toBe(2);
    expect(detalle?.resumen.version).toBe(4);
    expect(leerDetalle({ nada: true })).toBeNull();
  });

  it('la formación de una persona trae su historial y sus asignaciones', () => {
    const persona = leerFormacionDeUnaPersona({
      formacion: 'DIPLOMADO',
      duracionDias: 365,
      programaActivado: true,
      formacionesDelPersonal: [{ formacion: 'ESCUELA', activa: true }, { roto: 1 }],
      historial: [{ formacion: 'ESCUELA', duracionDias: 90, fechaFin: '2026-10-30', diaFinal: 90, resultado: 'TERMINADA', trasladadoA: 'DIPLOMADO' }, 'x'],
    });
    expect(persona?.formacionesDelPersonal).toEqual([{ formacion: 'ESCUELA', activa: true }]);
    expect(persona?.historial).toHaveLength(1);
    expect(persona?.historial[0]).toMatchObject({ motivo: null, puntosLiga: null, diaFinal: 90 });
    expect(leerFormacionDeUnaPersona(7)).toBeNull();
  });
});
