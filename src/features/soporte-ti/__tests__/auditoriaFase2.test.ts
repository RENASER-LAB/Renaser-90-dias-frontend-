/**
 * La auditoría de la consola en palabras, fase 2 (contrato `fase-2.md` §3.4, §4.5 y §5): los escalones y probadores del
 * despliegue, los roles personalizados y «ver como». La fase 1 (prendida / apagada) sigue igual.
 */
import { describe, expect, it } from '@jest/globals';

import { nombreDeLaFilaDeAuditoria, resumenDelCambio, tipoDeCambio } from '../utils/consola';

const despliegue = (porcentaje: number, probadores: number) => ({ despliegue: { porcentaje, probadores } });

describe('despliegue', () => {
  it('escalones y probadores', () => {
    expect(resumenDelCambio({ tipo: 'MANUAL', clave: 'eventos', antes: despliegue(5, 3), despues: despliegue(25, 3) })).toBe('Despliegue 5 % → 25 %');
    expect(resumenDelCambio({ tipo: 'MANUAL', clave: 'eventos', antes: despliegue(25, 3), despues: despliegue(25, 4) })).toBe('Probadores 3 → 4');
    expect(resumenDelCambio({ tipo: 'MANUAL', clave: 'eventos', antes: despliegue(5, 0), despues: despliegue(0, 0) })).toBe('Despliegue 5 % → solo probadores');
    expect(resumenDelCambio({ tipo: 'MANUAL', clave: 'eventos', antes: despliegue(5, 2), despues: despliegue(25, 3) })).toBe('Despliegue 5 % → 25 % · Probadores 2 → 3');
  });

  it('empezar y terminar', () => {
    expect(resumenDelCambio({ tipo: 'MANUAL', clave: 'eventos', antes: { despliegue: null }, despues: despliegue(5, 0) })).toBe('Despliegue empezado: 5 %');
    expect(resumenDelCambio({ tipo: 'MANUAL', clave: 'eventos', antes: despliegue(50, 2), despues: { despliegue: null } })).toBe('Despliegue terminado: para todos');
  });

  it('un cambio de la fase 1 sigue leyéndose igual', () => {
    expect(resumenDelCambio({ tipo: 'MANUAL', antes: { prendidaGlobal: true }, despues: { prendidaGlobal: false } })).toBe('Prendida para todos → Apagada para todos');
  });
});

describe('roles personalizados', () => {
  const foto = (parcial: Record<string, unknown> = {}) => ({ nombre: 'Mentor junior', rolBase: 'MENTOR', activo: true, funcionalidades: ['chat', 'muro'], ...parcial });
  const cambio = (antes: unknown, despues: unknown) => ({ tipo: 'ROL_PERSONALIZADO', clave: 'rp:r-1', antes, despues });

  it('crear, borrar, desactivar, reactivar, renombrar y marcar funcionalidades', () => {
    expect(resumenDelCambio(cambio(null, foto()))).toBe('Rol “Mentor junior” creado');
    expect(resumenDelCambio(cambio(foto(), null))).toBe('Rol “Mentor junior” borrado');
    expect(resumenDelCambio(cambio(foto(), foto({ activo: false })))).toBe('Rol “Mentor junior” desactivado');
    expect(resumenDelCambio(cambio(foto({ activo: false }), foto()))).toBe('Rol “Mentor junior” reactivado');
    expect(resumenDelCambio(cambio(foto(), foto({ nombre: 'Mentor nuevo' })))).toBe('Rol “Mentor junior” renombrado a “Mentor nuevo”');
    expect(resumenDelCambio(cambio(foto(), foto({ funcionalidades: ['chat'] })))).toBe('Rol “Mentor junior”: funcionalidades 2 → 1');
    expect(resumenDelCambio(cambio(foto(), foto({ descripcion: 'Otra' })))).toBe('Rol “Mentor junior” editado');
  });

  it('el reemplazo en bloque, si el servidor manda cuántas personas se movieron', () => {
    expect(resumenDelCambio(cambio(foto(), { personasMovidas: 3 }))).toBe('Rol “Mentor junior”: 3 personas pasaron a otro rol');
  });

  it('el tipo en palabras, y la clave del rol no encabeza la fila', () => {
    expect(tipoDeCambio('ROL_PERSONALIZADO')).toBe('Rol personalizado');
    expect(tipoDeCambio('VER_COMO')).toBe('Ver como');
    const nombres = new Map([['eventos', 'Eventos']]);
    expect(nombreDeLaFilaDeAuditoria('rp:r-1', nombres)).toBeNull();
    expect(nombreDeLaFilaDeAuditoria('eventos', nombres)).toBe('Eventos');
    expect(nombreDeLaFilaDeAuditoria('otra', nombres)).toBe('otra');
  });
});

describe('ver como', () => {
  it('entrar con un rol base o uno personalizado, y salir', () => {
    expect(resumenDelCambio({ tipo: 'VER_COMO', despues: { rol: 'MENTOR' } })).toBe('Vio la app como Mentor');
    expect(resumenDelCambio({ tipo: 'VER_COMO', despues: { rolPersonalizado: { id: 'r-1', nombre: 'Mentor junior' } } })).toBe('Vio la app como Mentor junior');
    expect(resumenDelCambio({ tipo: 'VER_COMO', antes: { rol: 'TRAINEE' }, despues: null })).toBe('Dejó de ver la app como Aprendiz');
    expect(resumenDelCambio({ tipo: 'VER_COMO' })).toBe('Vio la app como otro rol');
  });
});
