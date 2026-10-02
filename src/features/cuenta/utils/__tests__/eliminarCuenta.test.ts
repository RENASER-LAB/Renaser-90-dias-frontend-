import { describe, expect, it } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import {
  avisoDeCuentaCerrada,
  codigoCompleto,
  coincideElCorreo,
  correoConForma,
  etiquetaDeBorradoPendiente,
  fechaLegible,
  limpiarCodigo,
  mensajeDelFalloAlEliminar,
  puedeEliminarCuentaAjena,
  textoDeCuentaCerrada,
} from '../eliminarCuenta';

/** Eliminación de cuenta (backend D-243). Las pruebas corren en America/Lima (jest.config.js). */

describe('fechaLegible', () => {
  it('pasa un instante a la fecha LOCAL: las 03:00 UTC del 1/11 todavía son el 31/10 en Lima', () => {
    expect(fechaLegible('2026-11-01T03:00:00Z')).toBe('31 de octubre de 2026');
    expect(fechaLegible('2026-11-01T15:00:00Z')).toBe('1 de noviembre de 2026');
  });

  it('una fecha sola no se corre un día', () => {
    expect(fechaLegible('2026-11-01')).toBe('1 de noviembre de 2026');
    expect(fechaLegible('2026-11-01', { conAnio: false })).toBe('1 de noviembre');
  });

  it('sin fecha o ilegible: null', () => {
    expect(fechaLegible(null)).toBeNull();
    expect(fechaLegible('mañana')).toBeNull();
  });
});

describe('textoDeCuentaCerrada', () => {
  /* > **Corregido 2026-10-06 (D-245).** Decía «escríbele a soporte», sin contacto, y exigía que no
     > apareciera ningún «@» para no inventar uno. Con la cuenta cerrada ya no se entra al soporte de
     > la app, así que el aviso da el correo que entregó el dueño: renaserlab@gmail.com. */
  it('dice cuándo se borra y da el correo de contacto del dueño, sin teléfonos', () => {
    const texto = textoDeCuentaCerrada({ cerradaEn: '2026-10-02T15:00:00Z', seBorraEl: '2026-11-01T15:00:00Z', diasDeGracia: 30 });
    expect(texto).toBe('Se borrará el 1 de noviembre de 2026. Si cambias de opinión, escríbenos a renaserlab@gmail.com antes de esa fecha.');
    expect(texto).not.toMatch(/\+\d/);
  });
});

describe('campos', () => {
  it('el código queda en seis dígitos', () => {
    expect(limpiarCodigo(' 12a3-45 678')).toBe('123456');
    expect(codigoCompleto('123456')).toBe(true);
    expect(codigoCompleto('12345')).toBe(false);
  });

  it('el correo escrito coincide sin mayúsculas ni espacios en los extremos', () => {
    expect(coincideElCorreo('  Ana@Correo.COM ', 'ana@correo.com')).toBe(true);
    expect(coincideElCorreo('ana@correo.co', 'ana@correo.com')).toBe(false);
    expect(coincideElCorreo('', '')).toBe(false);
    expect(coincideElCorreo('ana@correo.com', null)).toBe(false);
  });

  it('forma mínima de un correo', () => {
    expect(correoConForma('ana@correo.com')).toBe(true);
    expect(correoConForma('ana@')).toBe(false);
  });
});

describe('mensajeDelFalloAlEliminar', () => {
  it('400 en la app: el motivo del servidor; sin motivo legible, un texto corto', () => {
    expect(mensajeDelFalloAlEliminar(new ApiError(400, 'La contraseña no es correcta.'), 'app')).toBe('La contraseña no es correcta.');
    expect(mensajeDelFalloAlEliminar(new ApiError(400, 'Error 400'), 'app')).toBe('La contraseña o el código no son correctos.');
  });

  it('400 en la web: siempre «Código incorrecto o vencido.»', () => {
    expect(mensajeDelFalloAlEliminar(new ApiError(400, 'Codigo vencido'), 'web')).toBe('Código incorrecto o vencido.');
  });

  it('409: el motivo del servidor (p. ej. única cuenta Admin activa)', () => {
    expect(mensajeDelFalloAlEliminar(new ApiError(409, 'Eres la única cuenta Admin activa.'), 'app')).toBe(
      'Eres la única cuenta Admin activa.',
    );
  });

  it('429 y sin red', () => {
    expect(mensajeDelFalloAlEliminar(new ApiError(429, 'Error 429'), 'app')).toBe('Demasiados intentos. Prueba más tarde.');
    expect(mensajeDelFalloAlEliminar(new ApiError(0, 'x'), 'app')).toBe('Sin conexión. Revisa tu red y vuelve a intentar.');
  });
});

describe('puedeEliminarCuentaAjena', () => {
  const base = { miId: 'yo', personaId: 'otra' };

  it('solo ADMIN o ALQUIMISTA', () => {
    expect(puedeEliminarCuentaAjena({ ...base, miRol: 'ADMIN', rolDePersona: 'TRAINEE' })).toBe(true);
    expect(puedeEliminarCuentaAjena({ ...base, miRol: 'ALCHEMIST', rolDePersona: 'TRAINEE' })).toBe(true);
    expect(puedeEliminarCuentaAjena({ ...base, miRol: 'MENTOR_LEAD', rolDePersona: 'TRAINEE' })).toBe(false);
    expect(puedeEliminarCuentaAjena({ ...base, miRol: 'MENTOR', rolDePersona: 'TRAINEE' })).toBe(false);
    expect(puedeEliminarCuentaAjena({ ...base, miRol: undefined, rolDePersona: 'TRAINEE' })).toBe(false);
  });

  it('nunca sobre sí mismo', () => {
    expect(puedeEliminarCuentaAjena({ miId: 'yo', personaId: 'yo', miRol: 'ADMIN', rolDePersona: 'ADMIN' })).toBe(false);
  });

  it('sobre un ADMIN o ALQUIMISTA, solo un ADMIN; con el rol sin conocer, igual', () => {
    expect(puedeEliminarCuentaAjena({ ...base, miRol: 'ADMIN', rolDePersona: 'ALCHEMIST' })).toBe(true);
    expect(puedeEliminarCuentaAjena({ ...base, miRol: 'ALCHEMIST', rolDePersona: 'ADMIN' })).toBe(false);
    expect(puedeEliminarCuentaAjena({ ...base, miRol: 'ALCHEMIST', rolDePersona: 'ALCHEMIST' })).toBe(false);
    expect(puedeEliminarCuentaAjena({ ...base, miRol: 'ALCHEMIST', rolDePersona: null })).toBe(false);
    expect(puedeEliminarCuentaAjena({ ...base, miRol: 'ADMIN', rolDePersona: null })).toBe(true);
  });
});

describe('borrado pendiente', () => {
  it('aviso de la ficha y etiqueta de la fila', () => {
    expect(avisoDeCuentaCerrada('2026-11-01T15:00:00Z')).toBe('Cerró su cuenta. Se borra el 1 de noviembre.');
    expect(etiquetaDeBorradoPendiente('2026-11-01T15:00:00Z')).toBe('Se elimina el 1 de noviembre');
    expect(avisoDeCuentaCerrada(null)).toBeNull();
    expect(etiquetaDeBorradoPendiente(undefined)).toBeNull();
  });
});
