import { beforeEach, describe, expect, it } from '@jest/globals';

import type { OpcionDeRol } from '../../api/adminApi';
import type { OpcionesDeAceptacionApi } from '../../api/adminSchemas';
import {
  alElegirDuracion,
  alElegirFicha,
  alElegirRol,
  alMarcarFormacion,
  borradorInicial,
  descripcionDeLaAceptacion,
  textoDeLaAceptada,
  duracionesParaElegir,
  eleccionParaElPedido,
  frase,
  laUltimaEleccion,
  loQueFalta,
  modoDeFormacionDelRol,
  olvidarLaUltima,
  recordarLaUltima,
} from '../aceptarSolicitud';
import { OPCIONES_BASE } from '../rolesAsignables';

const OPCIONES: OpcionesDeAceptacionApi = {
  formations: [
    { code: 'ESCUELA', name: 'Escuela Renaser', durationsDays: [90], durationLabels: ['90 días'], defaultDurationDays: 90, termsPublished: true },
    { code: 'DIPLOMADO', name: 'Diplomado Renaser', durationsDays: [90, 365], durationLabels: ['3 meses', '1 año'], defaultDurationDays: 90, termsPublished: true },
    { code: 'CERTIFICACION', name: 'Certificación Renaser', durationsDays: [90], durationLabels: ['90 días'], defaultDurationDays: 90, termsPublished: true },
  ],
  diagnosisAvailable: true,
};
const rol = (clave: string): OpcionDeRol => OPCIONES_BASE.find(o => o.clave === clave) as OpcionDeRol;

describe('lo que viene marcado al aceptar (025-4 B)', () => {
  it('Escuela, Aprendiz y sin diagnóstico; la duración se aplica sola porque la Escuela ofrece una', () => {
    expect(borradorInicial(OPCIONES)).toEqual({ formaciones: ['ESCUELA'], duracionDias: 90, rolClave: 'TRAINEE', conDiagnostico: false });
  });

  it('sin las opciones del servidor no hay formaciones que marcar', () => {
    expect(borradorInicial(null).formaciones).toEqual([]);
    expect(eleccionParaElPedido(borradorInicial(null), null)).toBeNull();
  });
});

describe('cuántas formaciones pide cada rol', () => {
  it('el aprendiz una; mentor, guía y líder una o varias; Administración y Alquimista ninguna', () => {
    expect(modoDeFormacionDelRol('TRAINEE')).toBe('una');
    expect(modoDeFormacionDelRol('MENTOR')).toBe('varias');
    expect(modoDeFormacionDelRol('TRAINEE_GUIDE')).toBe('varias');
    expect(modoDeFormacionDelRol('MENTOR_LEAD')).toBe('varias');
    expect(modoDeFormacionDelRol('ADMIN')).toBe('ninguna');
    expect(modoDeFormacionDelRol('ALCHEMIST')).toBe('ninguna');
  });

  it('un rol personalizado se pide según su rol base', () => {
    const personalizado: OpcionDeRol = { clave: 'rp-1', nombre: 'Mentor junior', rolBase: 'MENTOR', rolPersonalizadoId: 'rp-1' };
    expect(modoDeFormacionDelRol(personalizado.rolBase)).toBe('varias');
  });
});

describe('elegir formación y duración', () => {
  it('el Diplomado pide la duración (3 meses o 1 año) y sin elegirla falta', () => {
    const b = alMarcarFormacion(borradorInicial(OPCIONES), 'una', 'DIPLOMADO', OPCIONES);
    expect(b.formaciones).toEqual(['DIPLOMADO']);
    expect(b.duracionDias).toBeNull();
    expect(duracionesParaElegir(b, 'una', OPCIONES)).toEqual([90, 365]);
    expect(loQueFalta(b, 'una', OPCIONES)).toBe('Elige la duración del programa.');
    expect(loQueFalta(alElegirDuracion(b, 365), 'una', OPCIONES)).toBeNull();
  });

  it('volver a una formación con una sola duración la aplica sola y no pregunta nada', () => {
    const diplomado = alElegirDuracion(alMarcarFormacion(borradorInicial(OPCIONES), 'una', 'DIPLOMADO', OPCIONES), 365);
    const certificacion = alMarcarFormacion(diplomado, 'una', 'CERTIFICACION', OPCIONES);
    expect(certificacion.duracionDias).toBe(90);
    expect(duracionesParaElegir(certificacion, 'una', OPCIONES)).toEqual([]);
  });

  it('el aprendiz marca una sola: elegir otra reemplaza a la anterior', () => {
    const b = alMarcarFormacion(alMarcarFormacion(borradorInicial(OPCIONES), 'una', 'CERTIFICACION', OPCIONES), 'una', 'ESCUELA', OPCIONES);
    expect(b.formaciones).toEqual(['ESCUELA']);
  });

  it('el personal suma y quita formaciones, siempre en el orden del catálogo; con ninguna falta elegir', () => {
    let b = alElegirRol(borradorInicial(OPCIONES), rol('MENTOR'), OPCIONES);
    b = alMarcarFormacion(b, 'varias', 'CERTIFICACION', OPCIONES);
    b = alMarcarFormacion(b, 'varias', 'DIPLOMADO', OPCIONES);
    expect(b.formaciones).toEqual(['ESCUELA', 'DIPLOMADO', 'CERTIFICACION']);
    b = alMarcarFormacion(alMarcarFormacion(alMarcarFormacion(b, 'varias', 'ESCUELA', OPCIONES), 'varias', 'DIPLOMADO', OPCIONES), 'varias', 'CERTIFICACION', OPCIONES);
    expect(b.formaciones).toEqual([]);
    expect(loQueFalta(b, 'varias', OPCIONES)).toBe('Elige al menos una formación.');
    expect(b.duracionDias).toBeNull();
  });
});

describe('cambiar el rol ajusta la formación (US2, escenario 4)', () => {
  it('de mentor con dos formaciones a aprendiz queda la primera, sin duración hasta elegirla si hace falta', () => {
    let b = alElegirRol(borradorInicial(OPCIONES), rol('MENTOR'), OPCIONES);
    b = alMarcarFormacion(b, 'varias', 'DIPLOMADO', OPCIONES);
    expect(b.formaciones).toEqual(['ESCUELA', 'DIPLOMADO']);
    const aprendiz = alElegirRol(b, rol('TRAINEE'), OPCIONES);
    expect(aprendiz.formaciones).toEqual(['ESCUELA']);
    expect(aprendiz.duracionDias).toBe(90);
  });

  it('a Administración no queda ninguna, y al volver a un rol con formación, la marcada por defecto', () => {
    const admin = alElegirRol(borradorInicial(OPCIONES), rol('ADMIN'), OPCIONES);
    expect(admin.formaciones).toEqual([]);
    expect(loQueFalta(admin, 'ninguna', OPCIONES)).toBeNull();
    const vuelve = alElegirRol(admin, rol('TRAINEE'), OPCIONES);
    expect(vuelve.formaciones).toEqual(['ESCUELA']);
  });

  it('conserva lo ya marcado cuando sigue siendo válido', () => {
    const diplomado = alElegirDuracion(alMarcarFormacion(borradorInicial(OPCIONES), 'una', 'DIPLOMADO', OPCIONES), 365);
    const mentor = alElegirRol(diplomado, rol('MENTOR'), OPCIONES);
    expect(mentor.formaciones).toEqual(['DIPLOMADO']);
    const otraVez = alElegirRol(mentor, rol('TRAINEE'), OPCIONES);
    expect(otraVez.formaciones).toEqual(['DIPLOMADO']);
    expect(otraVez.duracionDias).toBeNull();
  });

  it('sin opciones del servidor solo cambia el rol', () => {
    const b = alElegirRol(borradorInicial(null), rol('MENTOR'), null);
    expect(b).toEqual({ formaciones: [], duracionDias: null, rolClave: 'MENTOR', conDiagnostico: false });
    expect(loQueFalta(b, 'varias', null)).toBeNull();
  });
});

describe('el pedido', () => {
  it('manda las formaciones, la duración elegida y el diagnóstico', () => {
    const b = alElegirFicha(alElegirDuracion(alMarcarFormacion(borradorInicial(OPCIONES), 'una', 'DIPLOMADO', OPCIONES), 365), true);
    expect(eleccionParaElPedido(b, OPCIONES)).toEqual({ formaciones: ['DIPLOMADO'], duracionDias: 365, conDiagnostico: true });
  });
});

describe('la frase del resumen', () => {
  it('lo de siempre: la Escuela, Aprendiz, sin diagnóstico', () => {
    expect(frase('María', false, borradorInicial(OPCIONES), rol('TRAINEE'), OPCIONES)).toBe(
      'María entrará a la Escuela Renaser como Aprendiz, sin diagnóstico.',
    );
  });

  it('el Diplomado dice su duración y, aceptada, el verbo en pasado', () => {
    const b = alElegirFicha(alElegirDuracion(alMarcarFormacion(borradorInicial(OPCIONES), 'una', 'DIPLOMADO', OPCIONES), 365), true);
    expect(frase('María', false, b, rol('TRAINEE'), OPCIONES)).toBe('María entrará al Diplomado Renaser de 1 año como Aprendiz, con diagnóstico.');
    expect(frase('María', false, b, rol('TRAINEE'), OPCIONES, true)).toBe('María entró al Diplomado Renaser de 1 año como Aprendiz, con diagnóstico.');
  });

  it('varias personas y varias formaciones', () => {
    let b = alElegirRol(borradorInicial(OPCIONES), rol('MENTOR'), OPCIONES);
    b = alMarcarFormacion(b, 'varias', 'DIPLOMADO', OPCIONES);
    expect(frase('Las 3 personas', true, b, rol('MENTOR'), OPCIONES)).toBe(
      'Las 3 personas entrarán a la Escuela Renaser y el Diplomado Renaser como Mentor, sin diagnóstico.',
    );
  });

  it('Administración ve las tres formaciones', () => {
    const b = alElegirRol(borradorInicial(OPCIONES), rol('ADMIN'), OPCIONES);
    expect(frase('Luis', false, b, rol('ADMIN'), OPCIONES)).toBe('Luis entrará como Administrador y ve las tres formaciones, sin diagnóstico.');
  });

  it('sin opciones del servidor dice solo el rol', () => {
    expect(frase('Luis', false, borradorInicial(null), rol('MENTOR'), null)).toBe('Luis entrará como Mentor.');
  });
});

describe('lo que dice una solicitud ya decidida (US4)', () => {
  it('formación con duración, rol y ficha', () => {
    expect(descripcionDeLaAceptacion({ formations: ['DIPLOMADO'], durationDays: 365, role: 'TRAINEE', withDiagnosis: true })).toBe(
      'Diplomado 1 año · Aprendiz · con diagnóstico',
    );
  });

  it('el personal con varias formaciones no lleva duración', () => {
    expect(descripcionDeLaAceptacion({ formations: ['ESCUELA', 'DIPLOMADO'], durationDays: null, role: 'MENTOR', withDiagnosis: false })).toBe(
      'Escuela y Diplomado · Mentor · sin diagnóstico',
    );
  });

  it('Administración ve las tres', () => {
    expect(descripcionDeLaAceptacion({ formations: [], durationDays: null, role: 'ADMIN', withDiagnosis: false })).toBe(
      'Ve las tres formaciones · Administrador · sin diagnóstico',
    );
  });

  it('lo aceptado antes de las formaciones dice «Escuela · sin diagnóstico» y nada más', () => {
    expect(descripcionDeLaAceptacion({ formations: ['ESCUELA'], durationDays: null, role: null, withDiagnosis: false })).toBe('Escuela · sin diagnóstico');
  });

  it('sin aceptación (pendiente o backend anterior) no hay nada que decir', () => {
    expect(descripcionDeLaAceptacion(null)).toBeNull();
    expect(descripcionDeLaAceptacion(undefined)).toBeNull();
  });
});

describe('el rol personalizado con el que se aceptó (V142)', () => {
  it('dice el nombre que tenía ese día y, entre paréntesis, su rol base', () => {
    expect(
      descripcionDeLaAceptacion({
        formations: ['ESCUELA'],
        durationDays: null,
        role: 'MENTOR',
        customRoleId: 'r-1',
        customRoleName: 'Mentor junior',
        withDiagnosis: false,
      }),
    ).toBe('Escuela · Mentor junior (Mentor) · sin diagnóstico');
  });

  it('un backend anterior no manda el rol personalizado y la línea es la de siempre', () => {
    expect(descripcionDeLaAceptacion({ formations: ['ESCUELA'], durationDays: null, role: 'MENTOR', withDiagnosis: false })).toBe(
      'Escuela · Mentor · sin diagnóstico',
    );
  });
});

describe('quién aceptó y cuándo: lo mismo en la lista y en la ficha (US4)', () => {
  const aceptacion = { formations: ['DIPLOMADO'], durationDays: 365, role: 'TRAINEE', withDiagnosis: true };

  it('«Aceptada por Ana el 31 de octubre» y debajo lo que se eligió', () => {
    expect(textoDeLaAceptada('Ana Quispe', '2026-10-31T15:00:00Z', aceptacion)).toEqual({
      titulo: 'Aceptada por Ana Quispe el 31 de octubre',
      detalle: 'Diplomado 1 año · Aprendiz · con diagnóstico',
    });
  });

  it('sin quién o sin cuándo (la cuenta ya no existe, o es de antes) solo dice lo que sabe', () => {
    expect(textoDeLaAceptada(null, null, aceptacion).titulo).toBe('Aceptada');
    expect(textoDeLaAceptada(undefined, '2026-10-31T15:00:00Z', aceptacion).titulo).toBe('Aceptada el 31 de octubre');
  });
});

describe('La misma que la última (US5)', () => {
  beforeEach(() => olvidarLaUltima());

  it('no hay nada que repetir hasta que se acepta a alguien', () => {
    expect(laUltimaEleccion()).toBeNull();
  });

  it('recuerda la última elección sin compartir la lista', () => {
    const b = alElegirFicha(alElegirDuracion(alMarcarFormacion(borradorInicial(OPCIONES), 'una', 'DIPLOMADO', OPCIONES), 365), true);
    recordarLaUltima(b);
    const leida = laUltimaEleccion();
    expect(leida).toEqual(b);
    leida?.formaciones.push('CERTIFICACION');
    expect(laUltimaEleccion()?.formaciones).toEqual(['DIPLOMADO']);
  });
});
