import { describe, expect, it } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import {
  LARGO_MAXIMO,
  acotarDiaPedido,
  debeBuscarEmergenciaEnElChat,
  mensajeDelErrorDelPedido,
  mostrarAccesoDeEmergencia,
  motivoDelAjuste,
  resumenParaSoporte,
  validarPedido,
} from '../pedidoDeEmergencia';

describe('el acceso «Tuve una emergencia»', () => {
  it('se ve desde el Día 1, o con un pedido abierto', () => {
    expect(mostrarAccesoDeEmergencia({ diaActual: 20, diaMaximo: 20, abierta: null })).toBe(true);
    expect(mostrarAccesoDeEmergencia({ diaActual: 0, diaMaximo: 0, abierta: null })).toBe(false);
    expect(
      mostrarAccesoDeEmergencia({
        diaActual: 0,
        diaMaximo: 0,
        abierta: { id: 'x', queOcurrio: 'a', diaPedido: 1, diaAlPedir: 1, estado: 'ABIERTA' },
      }),
    ).toBe(true);
  });

  it('no se ve si el servidor no respondió (staff, 403, sin red la primera vez)', () => {
    expect(mostrarAccesoDeEmergencia(null)).toBe(false);
  });
});

describe('el selector de día', () => {
  it('no sale de 1..día máximo', () => {
    expect(acotarDiaPedido(0, 20)).toBe(1);
    expect(acotarDiaPedido(21, 20)).toBe(20);
    expect(acotarDiaPedido(12, 20)).toBe(12);
    expect(acotarDiaPedido(Number.NaN, 20)).toBe(20);
  });
});

describe('validarPedido', () => {
  it('arma el cuerpo exacto del POST, con el texto sin espacios de más', () => {
    expect(validarPedido({ queOcurrio: '  Me operaron  ', diaPedido: 12, diaMaximo: 20 })).toEqual({
      ok: true,
      cuerpo: { queOcurrio: 'Me operaron', diaPedido: 12 },
    });
  });

  it('pide el texto y respeta el tope de 280', () => {
    expect(validarPedido({ queOcurrio: '   ', diaPedido: 3, diaMaximo: 20 })).toEqual({
      ok: false,
      error: 'Cuéntanos en pocas palabras qué pasó.',
    });
    expect(validarPedido({ queOcurrio: 'a'.repeat(LARGO_MAXIMO + 1), diaPedido: 3, diaMaximo: 20 }).ok).toBe(false);
    expect(validarPedido({ queOcurrio: 'a'.repeat(LARGO_MAXIMO), diaPedido: 3, diaMaximo: 20 }).ok).toBe(true);
  });

  it('el día va de 1 al de hoy, con los extremos', () => {
    expect(validarPedido({ queOcurrio: 'x', diaPedido: 1, diaMaximo: 20 }).ok).toBe(true);
    expect(validarPedido({ queOcurrio: 'x', diaPedido: 20, diaMaximo: 20 }).ok).toBe(true);
    expect(validarPedido({ queOcurrio: 'x', diaPedido: 21, diaMaximo: 20 })).toEqual({
      ok: false,
      error: 'Elige un día entre 1 y 20.',
    });
    expect(validarPedido({ queOcurrio: 'x', diaPedido: 0, diaMaximo: 20 }).ok).toBe(false);
  });
});

describe('errores del pedido', () => {
  it('un 409 muestra el motivo del servidor (ya hay un pedido abierto)', () => {
    expect(mensajeDelErrorDelPedido(new ApiError(409, 'Ya nos pediste ayuda.'))).toBe('Ya nos pediste ayuda.');
  });

  it('sin red lo dice', () => {
    expect(mensajeDelErrorDelPedido(new ApiError(0, 'x'))).toContain('Sin conexión');
  });

  it('un error cualquiera no muestra texto técnico', () => {
    expect(mensajeDelErrorDelPedido(new Error('TypeError: undefined'))).toBe('No se pudo enviar. Vuelve a intentar en un momento.');
  });
});

describe('para quien atiende soporte', () => {
  it('el motivo del ajuste lleva lo que pasó y entra en 280', () => {
    expect(motivoDelAjuste(' Me operaron ')).toBe('Emergencia: Me operaron');
    const largo = motivoDelAjuste('a'.repeat(280));
    expect(largo.length).toBe(LARGO_MAXIMO);
    expect(largo.endsWith('…')).toBe(true);
  });

  it('el resumen dice a qué día y en cuál está hoy', () => {
    expect(resumenParaSoporte({ diaPedido: 12, diaActual: 20 })).toBe('Pide volver al día 12 (hoy está en el día 20).');
  });
});

describe('debeBuscarEmergenciaEnElChat', () => {
  it('solo en un soporte con su aprendiz, para ADMIN o ALCHEMIST', () => {
    expect(debeBuscarEmergenciaEnElChat({ tipo: 'soporte', aprendizDelSoporte: 'a-1', miRol: 'ADMIN' })).toBe(true);
    expect(debeBuscarEmergenciaEnElChat({ tipo: 'soporte', aprendizDelSoporte: 'a-1', miRol: 'alchemist' })).toBe(true);
    expect(debeBuscarEmergenciaEnElChat({ tipo: 'soporte', aprendizDelSoporte: 'a-1', miRol: 'TRAINEE' })).toBe(false);
    expect(debeBuscarEmergenciaEnElChat({ tipo: 'soporte', aprendizDelSoporte: 'a-1', miRol: 'MENTOR' })).toBe(false);
    expect(debeBuscarEmergenciaEnElChat({ tipo: 'soporte', aprendizDelSoporte: null, miRol: 'ADMIN' })).toBe(false);
    expect(debeBuscarEmergenciaEnElChat({ tipo: 'celula', aprendizDelSoporte: 'a-1', miRol: 'ADMIN' })).toBe(false);
  });
});
