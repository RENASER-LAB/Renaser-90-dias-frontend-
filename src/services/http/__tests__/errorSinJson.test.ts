/**
 * E-464: durante un despliegue CloudFront responde 504 con una página HTML, y la app la mostraba
 * entera en Comunidad → Tribu. Un cuerpo que no es JSON nunca llega a la pantalla.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: {
    guardarToken: jest.fn(async () => undefined),
    borrarToken: jest.fn(async () => undefined),
    leerToken: jest.fn(async () => null),
  },
}));

import { apiFetch, mensajeDeError, setTokenSesion } from '../apiClient';

const PAGINA_DE_CLOUDFRONT = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">'
  + '<HTML><HEAD><TITLE>ERROR: The request could not be satisfied</TITLE></HEAD>'
  + '<BODY><H1>504 Gateway Timeout ERROR</H1></BODY></HTML>';

function responder(status: number, cuerpo: string) {
  (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async () => ({
    ok: false, status, headers: { get: () => null }, text: async () => cuerpo,
  }));
}

async function mensajeAlFallar(): Promise<string> {
  try {
    await apiFetch('/api/v1/chat/cells/mine');
  } catch (error) {
    return mensajeDeError(error, 'No se pudo cargar.');
  }
  throw new Error('apiFetch no falló');
}

beforeEach(() => {
  setTokenSesion('sesion-1');
});

describe('error sin cuerpo JSON', () => {
  it('un 504 de CloudFront no muestra el HTML, dice que el servidor no responde', async () => {
    responder(504, PAGINA_DE_CLOUDFRONT);
    const mensaje = await mensajeAlFallar();
    expect(mensaje).not.toContain('<');
    expect(mensaje).toBe('El servidor no responde en este momento. Intenta de nuevo en unos segundos.');
  });

  it('un error con JSON del backend sigue mostrando su mensaje', async () => {
    responder(409, '{"message":"Tu objetivo de 90 días quedó fijo."}');
    expect(await mensajeAlFallar()).toBe('Tu objetivo de 90 días quedó fijo.');
  });
});
