/**
 * Las fotos del chat que el servidor sirve CON sesión: la del soporte (D-205, la tarjeta con el primer
 * nombre del aprendiz) y la tarjeta de cada integrante de la info del grupo (D-206). En Android/iOS
 * la pide el `Image` con la cabecera; en web se trae el blob y se muestra desde un object URL
 * guardado por ruta.
 *
 * Falla contra el código viejo: no existía, y el soporte mostraba la tarjeta sin nombre.
 * (Corregido 2026-09-27, D-206: se llamaba `fotoDelSoporte.test.ts`.)
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../../config/apiConfig', () => ({ API_CONFIG: { BASE_URL: 'http://localhost:8080' } }));

import {
  fotoParaWeb,
  fuenteNativaDeLaFoto,
  marcarQueFallo,
  olvidarFallidas,
  olvidarFotosWeb,
  yaFallo,
  type EntornoWeb,
} from '../fotoConSesion';

const RUTA = '/api/v1/chat/conversations/c-1/foto';

function entornoDePrueba(respuestas: Array<{ ok: boolean } | 'sin-red'>) {
  const pedidos: Array<{ url: string; headers: Record<string, string> }> = [];
  const liberadas: string[] = [];
  let creadas = 0;
  const entorno: EntornoWeb = {
    pedir: async (url, opciones) => {
      pedidos.push({ url, headers: opciones.headers });
      const respuesta = respuestas.shift() ?? { ok: true };
      if (respuesta === 'sin-red') throw new Error('sin red');
      return { ok: respuesta.ok, blob: async () => ({}) as Blob };
    },
    crearUrl: () => `blob:foto-${++creadas}`,
    liberarUrl: url => {
      liberadas.push(url);
    },
  };
  return { entorno, pedidos, liberadas };
}

beforeEach(() => {
  olvidarFotosWeb({ pedir: jest.fn() as never, crearUrl: jest.fn() as never, liberarUrl: () => {} });
  olvidarFallidas();
});

describe('Android/iOS: el Image pide la foto con la sesión', () => {
  it('la URL completa del backend y la sesión en X-Auth-Token', () => {
    expect(fuenteNativaDeLaFoto(RUTA, 'sesion-1')).toEqual({
      uri: 'http://localhost:8080/api/v1/chat/conversations/c-1/foto',
      headers: { 'X-Auth-Token': 'sesion-1' },
    });
  });

  it('sin sesión no hay nada que pedir: queda la tarjeta sin nombre', () => {
    expect(fuenteNativaDeLaFoto(RUTA, null)).toBeNull();
  });

  it('una foto que falló se recuerda en esa sesión, para no reintentar en cada fila', () => {
    marcarQueFallo(RUTA, 'sesion-1');

    expect(yaFallo(RUTA, 'sesion-1')).toBe(true);
    expect(yaFallo(RUTA, 'sesion-2')).toBe(false);
    expect(yaFallo('/api/v1/chat/conversations/c-2/foto', 'sesion-1')).toBe(false);
  });
});

describe('web: la foto se trae con la sesión y se guarda por conversación', () => {
  it('pide con X-Auth-Token y devuelve el object URL', async () => {
    const { entorno, pedidos } = entornoDePrueba([{ ok: true }]);

    await expect(fotoParaWeb(RUTA, 'sesion-1', entorno)).resolves.toBe('blob:foto-1');
    expect(pedidos).toEqual([
      { url: 'http://localhost:8080/api/v1/chat/conversations/c-1/foto', headers: { 'X-Auth-Token': 'sesion-1' } },
    ]);
  });

  it('la fila, la cabecera y la info piden la misma: un solo pedido', async () => {
    const { entorno, pedidos } = entornoDePrueba([{ ok: true }]);

    const [fila, cabecera, info] = await Promise.all([
      fotoParaWeb(RUTA, 'sesion-1', entorno),
      fotoParaWeb(RUTA, 'sesion-1', entorno),
      fotoParaWeb(RUTA, 'sesion-1', entorno),
    ]);

    expect(pedidos).toHaveLength(1);
    expect([fila, cabecera, info]).toEqual(['blob:foto-1', 'blob:foto-1', 'blob:foto-1']);
  });

  it('un 403 o sin red da null (tarjeta sin nombre) y no se reintenta en la sesión', async () => {
    const { entorno, pedidos } = entornoDePrueba([{ ok: false }, 'sin-red']);

    await expect(fotoParaWeb(RUTA, 'sesion-1', entorno)).resolves.toBeNull();
    await expect(fotoParaWeb(RUTA, 'sesion-1', entorno)).resolves.toBeNull();
    await expect(fotoParaWeb('/api/v1/chat/conversations/c-2/foto', 'sesion-1', entorno)).resolves.toBeNull();
    expect(pedidos).toHaveLength(2);
  });

  it('otra sesión libera las fotos de la anterior y las vuelve a pedir', async () => {
    const { entorno, pedidos, liberadas } = entornoDePrueba([{ ok: true }, { ok: true }]);

    await fotoParaWeb(RUTA, 'sesion-1', entorno);
    await expect(fotoParaWeb(RUTA, 'sesion-2', entorno)).resolves.toBe('blob:foto-2');
    await Promise.resolve();

    expect(pedidos.map(p => p.headers['X-Auth-Token'])).toEqual(['sesion-1', 'sesion-2']);
    expect(liberadas).toEqual(['blob:foto-1']);
  });

  it('la tarjeta de un integrante (D-206) va por el mismo camino, con su propia ruta', async () => {
    const { entorno, pedidos } = entornoDePrueba([{ ok: true }, { ok: true }]);
    const deRicardo = '/api/v1/chat/conversations/g-1/miembros/u-ricardo/foto';

    await expect(fotoParaWeb(RUTA, 'sesion-1', entorno)).resolves.toBe('blob:foto-1');
    await expect(fotoParaWeb(deRicardo, 'sesion-1', entorno)).resolves.toBe('blob:foto-2');
    await expect(fotoParaWeb(deRicardo, 'sesion-1', entorno)).resolves.toBe('blob:foto-2');

    expect(pedidos.map(p => p.url)).toEqual([
      'http://localhost:8080/api/v1/chat/conversations/c-1/foto',
      'http://localhost:8080/api/v1/chat/conversations/g-1/miembros/u-ricardo/foto',
    ]);
  });

  it('sin sesión no pide nada', async () => {
    const { entorno, pedidos } = entornoDePrueba([]);

    await expect(fotoParaWeb(RUTA, null, entorno)).resolves.toBeNull();
    expect(pedidos).toHaveLength(0);
  });
});
