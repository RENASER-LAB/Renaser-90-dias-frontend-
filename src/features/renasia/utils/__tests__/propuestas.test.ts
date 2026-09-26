/**
 * Reglas puras de las tarjetas de propuesta del acompañante (D-153 del backend).
 */
import { describe, expect, it } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';

import {
  cambioPorError,
  admiteAcciones,
  estadoTrasConfirmar,
  estadoVisible,
  propuestaDesdeEvento,
  quitarRespaldoDeFoto,
  quitarTextoDeRespaldo,
} from '../propuestas';

const RESUMEN = "Marcar 'Meditar' como hecho (+10 puntos si lo confirmas ahora)";
const AHORA = Date.parse('2026-09-23T15:00:00Z');

describe('quitarTextoDeRespaldo', () => {
  it('saca el "Propuesta: …" que el backend manda justo antes del evento', () => {
    const texto = `Listo, te lo dejo preparado.\n\nPropuesta: ${RESUMEN}`;

    expect(quitarTextoDeRespaldo(texto, RESUMEN)).toBe('Listo, te lo dejo preparado.');
  });

  it('si el texto no termina con ese respaldo, no toca nada', () => {
    const texto = `Propuesta: ${RESUMEN}. Y algo que dijo después el asistente.`;

    expect(quitarTextoDeRespaldo(texto, RESUMEN)).toBe(texto);
  });

  it('con dos propuestas seguidas, cada una saca solo la suya del final', () => {
    const otra = "Apagar 'Leer' el jueves 2026-09-24";
    const texto = `Hecho.\n\nPropuesta: ${RESUMEN}\n\nPropuesta: ${otra}`;

    const sinLaSegunda = quitarTextoDeRespaldo(texto, otra);
    expect(sinLaSegunda).toBe(`Hecho.\n\nPropuesta: ${RESUMEN}`);
    expect(quitarTextoDeRespaldo(sinLaSegunda, RESUMEN)).toBe('Hecho.');
  });
});

describe('estadoVisible', () => {
  const pendiente = propuestaDesdeEvento({
    tipo: 'propuesta',
    id: 'p-1',
    resumen: RESUMEN,
    venceEn: '2026-09-23T15:10:00Z',
  });

  it('una pendiente que no venció sigue pendiente', () => {
    expect(estadoVisible(pendiente, AHORA)).toBe('pendiente');
  });

  it('una pendiente cuyo vencimiento ya pasó se muestra vencida', () => {
    expect(estadoVisible(pendiente, Date.parse('2026-09-23T15:10:00Z'))).toBe('vencida');
  });

  it('lo que ya se resolvió no cambia con el reloj', () => {
    expect(estadoVisible({ ...pendiente, estado: 'confirmada' }, Date.parse('2026-12-31T00:00:00Z'))).toBe(
      'confirmada'
    );
  });

  it('un venceEn ilegible no esconde los botones: decide el servidor', () => {
    expect(estadoVisible({ ...pendiente, venceEn: 'no-es-fecha' }, AHORA)).toBe('pendiente');
  });
});

describe('estadoTrasConfirmar y admiteAcciones', () => {
  it('CONFIRMADA y FALLIDA del servidor se traducen a la tarjeta', () => {
    expect(estadoTrasConfirmar({ estado: 'CONFIRMADA', mensaje: 'ok' })).toBe('confirmada');
    expect(estadoTrasConfirmar({ estado: 'FALLIDA', mensaje: 'se vencio' })).toBe('fallida');
  });

  it('solo una pendiente acepta toques: mientras confirma, no hay doble toque', () => {
    expect(admiteAcciones('pendiente')).toBe(true);
    expect(admiteAcciones('confirmando')).toBe(false);
    expect(admiteAcciones('confirmada')).toBe(false);
  });
});

/**
 * Compartido por el chat y por las propuestas sobre el orbe (D-163): qué queda en la tarjeta si
 * confirmar o cancelar falla.
 */
describe('cambioPorError', () => {
  it('409 (venció o ya se canceló): la tarjeta se cierra como vencida con el motivo del servidor', () => {
    expect(cambioPorError(new ApiError(409, 'La propuesta venció'))).toEqual({
      estado: 'vencida',
      mensaje: 'La propuesta venció',
    });
  });

  it('otro error del servidor (403): se cierra como fallida', () => {
    expect(cambioPorError(new ApiError(403, 'No puedes confirmar esto')).estado).toBe('fallida');
  });

  it('sin red: vuelve a pendiente para poder reintentar', () => {
    expect(cambioPorError(new Error('Network request failed')).estado).toBe('pendiente');
  });
});

describe('quitarRespaldoDeFoto', () => {
  const respaldo = "\n\nFoto para registrar 'JUGO VERDE': si no ves el boton de la camara, subela desde Hoy.";

  it('saca el texto de respaldo del pedido de foto cuando está al final', () => {
    expect(quitarRespaldoDeFoto(`Dale, sácale foto.${respaldo}`, 'JUGO VERDE')).toBe('Dale, sácale foto.');
  });

  it('no toca nada si el título no coincide', () => {
    const texto = `Dale.${respaldo}`;
    expect(quitarRespaldoDeFoto(texto, 'AGUA TIBIA CON LIMÓN')).toBe(texto);
  });
});
