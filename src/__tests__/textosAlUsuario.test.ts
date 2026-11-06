/**
 * Regla (issue #149, E2E de regresión del 06/11): ningún mensaje que vea la persona muestra el error crudo, nombres de excepción
 * (`java.`, `Exception`, `fetch failed`), direcciones `localhost` / `127.0.0.1` ni textos para quien programa («backend esté
 * corriendo»). Antes, al fallar la subida de la foto del Muro, el aviso decía «fetch failed: java.net.ConnectException: Failed to
 * connect to localhost/127.0.0.1:9002», y sin red «No se pudo conectar con el servidor. Revisa que el backend esté corriendo.».
 *
 * Dos partes: (1) los textos escritos en el código de los archivos que hablan con la red y arman esos mensajes, sin comentarios;
 * (2) lo que de verdad se le dice a la persona ante esos fallos, armado por las mismas funciones que usa la app.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('../services/storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: {
    guardarToken: jest.fn(async () => undefined),
    borrarToken: jest.fn(async () => undefined),
    leerToken: jest.fn(async () => null),
  },
}));

import { ApiError, apiFetch, mensajeDeError, setTokenSesion } from '../services/http/apiClient';
import { mensajeDeFalloAlPublicar } from '../features/community/utils/mensajeDeFalloAlPublicar';

/** Lo que nunca debe leer la persona. */
const PROHIBIDO = /java\.|Exception|fetch failed|localhost|127\.0\.0\.1|backend esté corriendo|backend/i;

/** Los archivos que hablan con la red y arman los mensajes de error que se muestran. */
const ARCHIVOS = [
  'services/http/apiClient.ts',
  'features/community/utils/mensajeDeFalloAlPublicar.ts',
  'features/community/api/fotoDelGrupoApi.ts',
];

/** Los textos entre comillas simples o invertidas del archivo, sin comentarios (en los comentarios se puede contar la historia). */
function textosDelCodigo(fuente: string): string[] {
  const sinComentarios = fuente
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  const textos: string[] = [];
  const patron = /'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  for (let m = patron.exec(sinComentarios); m; m = patron.exec(sinComentarios)) textos.push(m[1] ?? m[2] ?? '');
  return textos;
}

describe('textos al usuario: nunca el error crudo (issue #149)', () => {
  it.each(ARCHIVOS)('%s no escribe excepciones, direcciones locales ni textos de desarrollador', archivo => {
    const fuente = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');
    const malos = textosDelCodigo(fuente).filter(t => PROHIBIDO.test(t));
    expect(malos).toEqual([]);
  });

  it('el compositor del Muro no pasa el fallo a un Alert ni el error.message crudo', () => {
    const pantalla = fs.readFileSync(path.join(__dirname, '../screens/ComunidadScreen.tsx'), 'utf8');
    expect(pantalla).not.toMatch(/Alert\.alert\('No se pudo publicar'/);
    expect(pantalla).toMatch(/mensajeDeFalloAlPublicar\(error\)/);
  });
});

describe('lo que se le dice a la persona cuando la red falla (issue #149)', () => {
  const original = globalThis.fetch;
  afterEach(() => {
    (globalThis as unknown as { fetch: unknown }).fetch = original;
    setTokenSesion(null);
  });

  const CRUDO = 'fetch failed: java.net.ConnectException: Failed to connect to localhost/127.0.0.1:9002';

  it('sin conexión al servidor: apiFetch lanza un error que se puede mostrar tal cual', async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async () => {
      throw new TypeError(CRUDO);
    });
    const error = (await apiFetch('/api/v1/wall').catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).not.toMatch(PROHIBIDO);
    expect(mensajeDeError(error, 'algo falló')).not.toMatch(PROHIBIDO);
    expect(mensajeDeFalloAlPublicar(error)).not.toMatch(PROHIBIDO);
  });

  it('la foto que no sube a S3 (un fetch directo que falla) no muestra el error técnico', () => {
    expect(mensajeDeFalloAlPublicar(new TypeError(CRUDO))).not.toMatch(PROHIBIDO);
    expect(mensajeDeFalloAlPublicar(new Error('java.lang.IllegalStateException at localhost'))).not.toMatch(PROHIBIDO);
  });

  it('un 5xx con la excepción en el cuerpo no se muestra', () => {
    expect(mensajeDeFalloAlPublicar(new ApiError(500, 'java.lang.NullPointerException'))).not.toMatch(PROHIBIDO);
  });
});
