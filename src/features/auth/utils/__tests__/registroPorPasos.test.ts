import { describe, expect, it } from '@jest/globals';
import {
  AYUDA_DE_LA_CONTRASENA,
  fuerzaDeLaContrasena,
  indiceAnterior,
  indiceSiguiente,
  pasosDelRegistro,
  primerNombre,
  primerPasoIncompleto,
  validarPasoDelRegistro,
  type DatosDelRegistro,
} from '../registroPorPasos';
import { MIN_CONTRASENA } from '../../hooks/useRegistroConOtp';

const sinRegla = () => null;
const datos = (parcial: Partial<DatosDelRegistro> = {}): DatosDelRegistro => ({
  nombres: 'Ana',
  apellidos: 'Quispe',
  email: 'ana@renaser.test',
  whatsapp: '+51 987654321',
  contrasena: 'una-clave-muy-larga',
  aceptaTerminos: true,
  ...parcial,
});

describe('los pasos de «Solicitar acceso»', () => {
  // spec 052 FR-001
  it('son cinco con el canal de WhatsApp y cuatro sin él; el contacto se verifica ANTES de la contraseña', () => {
    expect(pasosDelRegistro(true)).toEqual(['nombre', 'correo', 'whatsapp', 'verificar', 'contrasena']);
    expect(pasosDelRegistro(false)).toEqual(['nombre', 'correo', 'verificar', 'contrasena']);
    expect(validarPasoDelRegistro('verificar', datos(), sinRegla)).toBeNull();
  });

  // spec 052 FR-002
  it('cada paso dice qué falta, con el campo y el mensaje de siempre', () => {
    expect(validarPasoDelRegistro('nombre', datos({ nombres: ' ' }), sinRegla)).toEqual({
      campo: 'nombres',
      mensaje: 'Por favor ingresa tus nombres',
    });
    expect(validarPasoDelRegistro('nombre', datos({ apellidos: '' }), sinRegla)?.campo).toBe('apellidos');
    expect(validarPasoDelRegistro('correo', datos({ email: 'sin-arroba' }), sinRegla)).toEqual({
      campo: 'email',
      mensaje: 'Por favor ingresa un correo electrónico válido',
    });
    expect(validarPasoDelRegistro('nombre', datos(), sinRegla)).toBeNull();
    expect(validarPasoDelRegistro('correo', datos(), sinRegla)).toBeNull();
  });

  // spec 052 FR-002
  it('el WhatsApp usa la regla de la ficha y la forma internacional', () => {
    const regla = (v: string) => (v.trim() === '+51' ? { mensaje: 'WhatsApp requerido' } : null);
    expect(validarPasoDelRegistro('whatsapp', datos({ whatsapp: '+51' }), regla)?.mensaje).toBe('WhatsApp requerido');
    expect(validarPasoDelRegistro('whatsapp', datos({ whatsapp: '+51 12' }), sinRegla)?.campo).toBe('whatsapp');
    expect(validarPasoDelRegistro('whatsapp', datos(), sinRegla)).toBeNull();
  });

  // spec 052 FR-005
  it('la contraseña pide el mínimo del servidor y aceptar los términos', () => {
    expect(validarPasoDelRegistro('contrasena', datos({ contrasena: 'corta' }), sinRegla)?.campo).toBe('contrasena');
    expect(validarPasoDelRegistro('contrasena', datos({ aceptaTerminos: false }), sinRegla)).toEqual({
      campo: 'terminos',
      mensaje: 'Acepta los términos para continuar',
    });
    expect(validarPasoDelRegistro('contrasena', datos(), sinRegla)).toBeNull();
    expect(AYUDA_DE_LA_CONTRASENA).toContain(String(MIN_CONTRASENA));
  });

  // spec 052 FR-002
  it('al final se repasa todo y se vuelve al primer paso con algo pendiente', () => {
    const pasos = pasosDelRegistro(true);
    expect(primerPasoIncompleto(pasos, datos(), sinRegla)).toBeNull();
    expect(primerPasoIncompleto(pasos, datos({ email: '' }), sinRegla)?.indice).toBe(1);
    expect(primerPasoIncompleto(pasos, datos({ nombres: '', email: '' }), sinRegla)?.indice).toBe(0);
  });

  // spec 052 FR-003
  it('atrás va al paso anterior y, desde el primero, no hay (se sale al login)', () => {
    const pasos = pasosDelRegistro(true);
    expect(indiceAnterior(pasos, 2, false)).toBe(1);
    expect(indiceAnterior(pasos, 0, false)).toBeNull();
  });

  // spec 052 FR-006
  it('con el contacto ya verificado el paso del código se salta, de ida y de vuelta; sin verificar, no', () => {
    const pasos = pasosDelRegistro(true);
    expect(indiceSiguiente(pasos, 2, false)).toBe(3);
    expect(indiceSiguiente(pasos, 2, true)).toBe(4);
    expect(indiceAnterior(pasos, 4, true)).toBe(2);
    expect(indiceAnterior(pasos, 4, false)).toBe(3);
  });
});

describe('el medidor de la contraseña', () => {
  // spec 052 FR-005
  it('tiene tres segmentos: vacía, corta, aceptable y fuerte', () => {
    expect(fuerzaDeLaContrasena('')).toBe(0);
    expect(fuerzaDeLaContrasena('abc')).toBe(1);
    expect(fuerzaDeLaContrasena('a'.repeat(MIN_CONTRASENA))).toBe(2);
    expect(fuerzaDeLaContrasena('Abcdefgh1jkl')).toBe(3);
  });
});

describe('«Listo, <nombre>»', () => {
  // spec 052 FR-007
  it('usa el primer nombre', () => {
    expect(primerNombre('  Ana María ')).toBe('Ana');
    expect(primerNombre('')).toBe('');
  });
});
